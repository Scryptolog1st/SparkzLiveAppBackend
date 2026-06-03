import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  AdminRole,
  BanAppealStatus,
  EmailCategory,
  ModerationActionType,
  Prisma,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import { getAnonymousStaffLabel } from "../admin-users/admin-identity-utils";
import {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { EmailService } from "../email/email.service";
import { ModerationService } from "../moderation/moderation.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminBanAppealDecisionDto,
  AdminBanAppealInReviewDto,
  AdminBanAppealNoteDto,
  AdminBanAppealsQueryDto,
  SubmitBanAppealDto,
} from "./dto/ban-appeals.dto";

type AdminAuditRequestContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

@Injectable()
export class BanAppealsService {
  private readonly logger = new Logger(BanAppealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
    private readonly email: EmailService,
    private readonly adminAudit: AdminAuditService,
    private readonly adminRolePermissions: AdminRolePermissionsService,
  ) { }

  private normalizePage(value: string | number | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.floor(parsed);
  }

  private normalizePageSize(
    value: string | number | undefined,
    fallback: number,
  ) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(100, Math.floor(parsed));
  }

  private normalizeText(
    value: string | null | undefined,
    max = 2000,
  ): string | null {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, max) : null;
  }

  private normalizeAuditContext(context?: AdminAuditRequestContext | null) {
    return {
      requestPath: this.normalizeText(context?.requestPath, 500),
      ipAddress: this.normalizeText(context?.ipAddress, 120),
      userAgent: this.normalizeText(context?.userAgent, 1000),
      deviceLabel: this.normalizeText(context?.deviceLabel, 200),
    };
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private toIsoString(value: Date | null | undefined) {
    return value instanceof Date ? value.toISOString() : "";
  }

  private isPlatformBanActive(user: any) {
    if (!user?.isPlatformBanned) return false;

    const expiresAt =
      user.platformBanExpiresAt instanceof Date ? user.platformBanExpiresAt : null;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return false;
    }

    return true;
  }

  private async canViewRealBanAppealStaffIdentity(role: AdminRole) {
    const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

    return hasAdminPermission(
      permissions,
      ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
    );
  }

  private async requireAdmin(adminUserId: string) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!adminUser) {
      throw new UnauthorizedException("Admin account not found.");
    }

    if (!adminUser.isActive) {
      throw new ForbiddenException("Admin account is inactive.");
    }

    return adminUser;
  }

  private async findUserByIdentifier(identifier: string) {
    const trimmed = String(identifier || "").trim();
    const lower = trimmed.toLowerCase();

    if (!trimmed) {
      return null;
    }

    if (lower.includes("@")) {
      return this.prisma.user.findUnique({
        where: { email: lower },
        include: { profile: true },
      });
    }

    if (this.isUuid(trimmed)) {
      return this.prisma.user.findUnique({
        where: { id: trimmed },
        include: { profile: true },
      });
    }

    const byUsername = await this.prisma.user.findUnique({
      where: { username: trimmed },
      include: { profile: true },
    });

    if (byUsername) {
      return byUsername;
    }

    return this.prisma.user.findUnique({
      where: { publicId: trimmed },
      include: { profile: true },
    });
  }

  private async requireBannedUserFromCredentials(dto: SubmitBanAppealDto) {
    const user = await this.findUserByIdentifier(dto.emailOrUsername);

    if (!user) {
      throw new BadRequestException("Invalid credentials.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new BadRequestException("Invalid credentials.");
    }

    if (!this.isPlatformBanActive(user)) {
      throw new BadRequestException(
        "Only currently banned users can submit a ban appeal.",
      );
    }

    const latestBanAction = await this.prisma.moderationAction.findFirst({
      where: {
        targetUserId: user.id,
        action: ModerationActionType.USER_BAN,
      },
      include: {
        actorAdminUser: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { user, latestBanAction };
  }

  private mapAdminUser(adminUser: any, canViewRealStaffIdentity = false) {
    if (!adminUser) return null;

    if (!canViewRealStaffIdentity) {
      const anonymousName = getAnonymousStaffLabel(adminUser);

      return {
        id: null,
        email: "hidden",
        name: anonymousName,
        displayName: anonymousName,
        displayEmail: "Hidden",
        role: adminUser.role,
        isActive: adminUser.isActive,
        identityVisibility: "anonymous",
      };
    }

    return {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      displayName: adminUser.name,
      displayEmail: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.isActive,
      identityVisibility: "real",
    };
  }

  private mapUser(user: any) {
    if (!user) return null;

    return {
      id: user.id,
      publicId: user.publicId ?? null,
      email: user.email ?? null,
      username: user.username,
      displayName: user.profile?.displayName?.trim() || user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
      isPlatformBanned: Boolean(user.isPlatformBanned),
      platformBanIssuedAt: user.platformBanIssuedAt
        ? user.platformBanIssuedAt.toISOString()
        : null,
      platformBanExpiresAt: user.platformBanExpiresAt
        ? user.platformBanExpiresAt.toISOString()
        : null,
      platformBanReason: user.platformBanReason ?? null,
    };
  }

  private mapModerationAction(row: any, canViewRealStaffIdentity = false) {
    return {
      id: row.id,
      action: row.action,
      reason: row.reason ?? null,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      actorAdminUser: row.actorAdminUser
        ? this.mapAdminUser(row.actorAdminUser, canViewRealStaffIdentity)
        : null,
      stream: row.stream
        ? {
          id: row.stream.id,
          title: row.stream.title,
          status: row.stream.status,
        }
        : null,
    };
  }

  private mapAppealItem(appeal: any, canViewRealStaffIdentity = false) {
    return {
      id: appeal.id,
      userId: appeal.userId,
      status: appeal.status,
      appealMessage: appeal.appealMessage,
      contactNote: appeal.contactNote ?? null,
      adminNotes: appeal.adminNotes ?? null,
      decisionNotes: appeal.decisionNotes ?? null,
      banIssuedAtSnapshot: appeal.banIssuedAtSnapshot
        ? appeal.banIssuedAtSnapshot.toISOString()
        : null,
      banExpiresAtSnapshot: appeal.banExpiresAtSnapshot
        ? appeal.banExpiresAtSnapshot.toISOString()
        : null,
      banReasonSnapshot: appeal.banReasonSnapshot ?? null,
      reviewedByAdminUserId: canViewRealStaffIdentity
        ? appeal.reviewedByAdminUserId ?? null
        : null,
      reviewedAt: appeal.reviewedAt ? appeal.reviewedAt.toISOString() : null,
      createdAt: appeal.createdAt.toISOString(),
      updatedAt: appeal.updatedAt.toISOString(),
      user: appeal.user ? this.mapUser(appeal.user) : null,
      reviewedByAdminUser: appeal.reviewedByAdminUser
        ? this.mapAdminUser(appeal.reviewedByAdminUser, canViewRealStaffIdentity)
        : null,
      platformBanModerationAction: appeal.platformBanModerationAction
        ? this.mapModerationAction(
          appeal.platformBanModerationAction,
          canViewRealStaffIdentity,
        )
        : null,
    };
  }

  private buildBanAppealEmailVariables(appeal: any) {
    return {
      appealId: appeal.id,
      displayName:
        appeal.user?.profile?.displayName?.trim() ||
        appeal.user?.username ||
        "there",
      username: appeal.user?.username || "",
      email: appeal.user?.email || "",
      appealMessage: appeal.appealMessage || "",
      contactNote: appeal.contactNote || "",
      banReason: appeal.banReasonSnapshot || "",
      banIssuedAt: this.toIsoString(appeal.banIssuedAtSnapshot),
      banExpiresAt: this.toIsoString(appeal.banExpiresAtSnapshot),
      status: appeal.status || "",
      decisionNotes: appeal.decisionNotes || "",
      reviewedAt: this.toIsoString(appeal.reviewedAt),
    };
  }

  private async sendBanAppealEmailSafely(
    category: EmailCategory,
    appeal: any,
    options?: {
      initiatedByAdminUserId?: string | null;
      correlation?: Prisma.InputJsonValue;
    },
  ) {
    const recipientEmail = String(appeal?.user?.email || "")
      .trim()
      .toLowerCase();

    if (!recipientEmail) {
      this.logger.warn(
        `Skipping ${category} email for ban appeal ${appeal?.id} because the user has no email address.`,
      );
      return;
    }

    try {
      const result = await this.email.sendCategorizedEmail({
        category,
        recipientEmail,
        recipientUserId: appeal.userId ?? null,
        variables: this.buildBanAppealEmailVariables(appeal),
        initiatedByAdminUserId: options?.initiatedByAdminUserId ?? null,
        correlation: options?.correlation,
      });

      if (!result.success) {
        this.logger.warn(
          `${category} email failed for ban appeal ${appeal.id}. Delivery log: ${result.logId}. Error: ${result.error || "Unknown error."}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown email error.";

      this.logger.error(
        `Unexpected ${category} email error for ban appeal ${appeal?.id}: ${message}`,
      );
    }
  }

  private async addBanAppealAudit(args: {
    actorAdminUserId: string;
    appeal: any;
    actionType: "VIEW" | "UPDATE" | "STATUS_CHANGE";
    actionCode: string;
    actionLabel: string;
    metadata?: Record<string, unknown> | null;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    diff?: Record<string, unknown> | null;
    requestContext?: AdminAuditRequestContext | null;
  }) {
    const requestContext = this.normalizeAuditContext(args.requestContext);

    await this.adminAudit.logEvent({
      actorAdminUserId: args.actorAdminUserId,
      actionType: args.actionType,
      actionCode: args.actionCode,
      actionLabel: args.actionLabel,
      resourceType: "BAN_APPEAL",
      resourceId: args.appeal.id,
      target: {
        id: args.appeal.id,
        name: args.appeal.id,
        type: "BAN_APPEAL",
      },
      references: {
        targetUserId: args.appeal.userId ?? null,
      },
      requestPath: requestContext.requestPath,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      deviceLabel: requestContext.deviceLabel,
      metadata: {
        status: args.appeal.status ?? null,
        ...(args.metadata || {}),
      },
      beforeState: args.beforeState ?? undefined,
      afterState: args.afterState ?? undefined,
      diff: args.diff ?? undefined,
    });
  }

  async submit(dto: SubmitBanAppealDto) {
    const appealMessage = this.normalizeText(dto.appealMessage, 4000);
    if (!appealMessage || appealMessage.length < 10) {
      throw new BadRequestException(
        "Appeal message must be at least 10 characters.",
      );
    }

    const contactNote = this.normalizeText(dto.contactNote, 500);
    const { user, latestBanAction } = await this.requireBannedUserFromCredentials(
      dto,
    );

    const existingPending = await this.prisma.banAppeal.findFirst({
      where: {
        userId: user.id,
        status: {
          in: [BanAppealStatus.PENDING, BanAppealStatus.IN_REVIEW],
        },
        ...(latestBanAction?.id
          ? {
            platformBanModerationActionId: latestBanAction.id,
          }
          : {
            banIssuedAtSnapshot: user.platformBanIssuedAt ?? null,
          }),
      },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending) {
      return {
        success: true,
        created: false,
        duplicatePending: true,
        item: this.mapAppealItem(existingPending),
      };
    }

    const appeal = await this.prisma.banAppeal.create({
      data: {
        userId: user.id,
        platformBanModerationActionId: latestBanAction?.id ?? null,
        banIssuedAtSnapshot: user.platformBanIssuedAt ?? null,
        banExpiresAtSnapshot: user.platformBanExpiresAt ?? null,
        banReasonSnapshot: user.platformBanReason ?? null,
        appealMessage,
        contactNote,
      },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    await this.sendBanAppealEmailSafely("BAN_APPEAL_RECEIVED", appeal, {
      correlation: {
        type: "ban_appeal_submitted",
        banAppealId: appeal.id,
        userId: appeal.userId,
        platformBanModerationActionId:
          appeal.platformBanModerationActionId ?? null,
      } as Prisma.InputJsonValue,
    });

    return {
      success: true,
      created: true,
      duplicatePending: false,
      item: this.mapAppealItem(appeal),
    };
  }

  async getAdminSummary(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [pending, inReview, approvedToday, deniedToday] = await Promise.all([
      this.prisma.banAppeal.count({
        where: { status: BanAppealStatus.PENDING },
      }),
      this.prisma.banAppeal.count({
        where: { status: BanAppealStatus.IN_REVIEW },
      }),
      this.prisma.banAppeal.count({
        where: {
          status: BanAppealStatus.APPROVED,
          reviewedAt: { gte: todayStart },
        },
      }),
      this.prisma.banAppeal.count({
        where: {
          status: BanAppealStatus.DENIED,
          reviewedAt: { gte: todayStart },
        },
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      counts: {
        pending,
        inReview,
        approvedToday,
        deniedToday,
      },
    };
  }

  async listAdminAppeals(
    adminUserId: string,
    query: AdminBanAppealsQueryDto = {},
  ) {
    const actor = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealBanAppealStaffIdentity(
      actor.role,
    );

    const page = this.normalizePage(query.page, 1);
    const pageSize = this.normalizePageSize(query.pageSize, 20);
    const status = String(query.status || "all").trim().toUpperCase();
    const sort = String(query.sort || "newest").trim().toLowerCase();
    const search = String(query.search || "").trim();

    const andFilters: Prisma.BanAppealWhereInput[] = [];

    if (status !== "ALL") {
      andFilters.push({
        status: status as BanAppealStatus,
      });
    }

    if (search) {
      andFilters.push({
        OR: [
          { id: { equals: search } },
          {
            appealMessage: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            contactNote: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            user: {
              is: {
                username: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            user: {
              is: {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            user: {
              is: {
                publicId: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            user: {
              is: {
                profile: {
                  is: {
                    displayName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.BanAppealWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};

    const orderBy =
      sort === "oldest"
        ? [{ createdAt: "asc" as const }]
        : sort === "updated"
          ? [{ updatedAt: "desc" as const }]
          : [{ createdAt: "desc" as const }];

    const [total, items] = await Promise.all([
      this.prisma.banAppeal.count({ where }),
      this.prisma.banAppeal.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          reviewedByAdminUser: true,
          platformBanModerationAction: {
            include: { actorAdminUser: true },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((row: any) =>
        this.mapAppealItem(row, canViewRealStaffIdentity),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      filters: {
        search: search || null,
        status: query.status ?? "all",
        sort: sort || "newest",
      },
    };
  }

  async getAdminAppealById(
    adminUserId: string,
    appealId: string,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    const actor = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealBanAppealStaffIdentity(
      actor.role,
    );

    const appeal = await this.prisma.banAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException("Ban appeal not found.");
    }

    const [recentModerationActions, currentUser] = await Promise.all([
      this.prisma.moderationAction.findMany({
        where: { targetUserId: appeal.userId },
        include: {
          actorAdminUser: true,
          stream: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      this.prisma.user.findUnique({
        where: { id: appeal.userId },
        include: { profile: true },
      }),
    ]);

    await this.addBanAppealAudit({
      actorAdminUserId: adminUserId,
      appeal,
      actionType: "VIEW",
      actionCode: "ban_appeal.view",
      actionLabel: "Viewed ban appeal details",
      requestContext,
    });

    return {
      item: this.mapAppealItem(appeal, canViewRealStaffIdentity),
      currentPlatformBanActive: this.isPlatformBanActive(currentUser),
      recentModerationActions: recentModerationActions.map((row) =>
        this.mapModerationAction(row, canViewRealStaffIdentity),
      ),
    };
  }

  async saveAdminNote(
    adminUserId: string,
    appealId: string,
    dto: AdminBanAppealNoteDto,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    const actor = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealBanAppealStaffIdentity(
      actor.role,
    );

    const appeal = await this.prisma.banAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException("Ban appeal not found.");
    }

    const nextAdminNotes = this.normalizeText(dto.adminNotes, 2000);

    const updated = await this.prisma.banAppeal.update({
      where: { id: appealId },
      data: {
        adminNotes: nextAdminNotes,
      },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    await this.addBanAppealAudit({
      actorAdminUserId: adminUserId,
      appeal: updated,
      actionType: "UPDATE",
      actionCode: "ban_appeal.note.save",
      actionLabel: "Saved ban appeal admin note",
      metadata: {
        adminNotes: nextAdminNotes,
      },
      beforeState: {
        adminNotes: appeal.adminNotes ?? null,
      },
      afterState: {
        adminNotes: updated.adminNotes ?? null,
      },
      diff: {
        adminNotes: {
          before: appeal.adminNotes ?? null,
          after: updated.adminNotes ?? null,
        },
      },
      requestContext,
    });

    return {
      success: true,
      item: this.mapAppealItem(updated, canViewRealStaffIdentity),
    };
  }

  async moveToInReview(
    adminUserId: string,
    appealId: string,
    dto: AdminBanAppealInReviewDto = {},
    requestContext?: AdminAuditRequestContext | null,
  ) {
    const actor = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealBanAppealStaffIdentity(
      actor.role,
    );

    const appeal = await this.prisma.banAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException("Ban appeal not found.");
    }

    if (
      appeal.status === BanAppealStatus.APPROVED ||
      appeal.status === BanAppealStatus.DENIED
    ) {
      throw new BadRequestException(
        "Closed appeals cannot be moved back to in review.",
      );
    }

    const updated = await this.prisma.banAppeal.update({
      where: { id: appealId },
      data: {
        status: BanAppealStatus.IN_REVIEW,
        adminNotes:
          this.normalizeText(dto.adminNotes, 2000) ?? appeal.adminNotes ?? null,
      },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    await this.addBanAppealAudit({
      actorAdminUserId: adminUserId,
      appeal: updated,
      actionType: "STATUS_CHANGE",
      actionCode: "ban_appeal.review.start",
      actionLabel: "Moved ban appeal to in review",
      beforeState: {
        status: appeal.status,
        adminNotes: appeal.adminNotes ?? null,
      },
      afterState: {
        status: updated.status,
        adminNotes: updated.adminNotes ?? null,
      },
      diff: {
        status: {
          before: appeal.status,
          after: updated.status,
        },
      },
      requestContext,
    });

    return {
      success: true,
      item: this.mapAppealItem(updated, canViewRealStaffIdentity),
    };
  }

  async approve(
    adminUserId: string,
    appealId: string,
    dto: AdminBanAppealDecisionDto = {},
    requestContext?: AdminAuditRequestContext | null,
  ) {
    const actor = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealBanAppealStaffIdentity(
      actor.role,
    );

    const appeal = await this.prisma.banAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException("Ban appeal not found.");
    }

    if (
      appeal.status === BanAppealStatus.APPROVED ||
      appeal.status === BanAppealStatus.DENIED
    ) {
      throw new BadRequestException("This appeal has already been closed.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: appeal.userId },
    });

    const shouldUnban = (dto.approvalAction || "unban_now") === "unban_now";
    let unbannedNow = false;

    if (shouldUnban && user && this.isPlatformBanActive(user)) {
      await this.moderation.adminPlatformUnban({
        actorAdminUserId: adminUserId,
        targetUserId: appeal.userId,
        reason:
          this.normalizeText(dto.decisionNotes, 300) || "Ban appeal approved",
      });

      unbannedNow = true;
    }

    const updated = await this.prisma.banAppeal.update({
      where: { id: appealId },
      data: {
        status: BanAppealStatus.APPROVED,
        adminNotes:
          this.normalizeText(dto.adminNotes, 2000) ?? appeal.adminNotes ?? null,
        decisionNotes: this.normalizeText(dto.decisionNotes, 2000),
        reviewedByAdminUserId: adminUserId,
        reviewedAt: new Date(),
      },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    await this.sendBanAppealEmailSafely("BAN_APPEAL_APPROVED", updated, {
      initiatedByAdminUserId: adminUserId,
      correlation: {
        type: "ban_appeal_approved",
        banAppealId: updated.id,
        userId: updated.userId,
        reviewedByAdminUserId: adminUserId,
        approvalAction: dto.approvalAction || "unban_now",
        unbannedNow,
      } as Prisma.InputJsonValue,
    });

    await this.addBanAppealAudit({
      actorAdminUserId: adminUserId,
      appeal: updated,
      actionType: "STATUS_CHANGE",
      actionCode: "ban_appeal.approve",
      actionLabel: "Approved ban appeal",
      metadata: {
        approvalAction: dto.approvalAction || "unban_now",
        unbannedNow,
      },
      beforeState: {
        status: appeal.status,
        adminNotes: appeal.adminNotes ?? null,
        decisionNotes: appeal.decisionNotes ?? null,
      },
      afterState: {
        status: updated.status,
        adminNotes: updated.adminNotes ?? null,
        decisionNotes: updated.decisionNotes ?? null,
      },
      diff: {
        status: {
          before: appeal.status,
          after: updated.status,
        },
      },
      requestContext,
    });

    return {
      success: true,
      unbannedNow,
      item: this.mapAppealItem(updated, canViewRealStaffIdentity),
    };
  }

  async deny(
    adminUserId: string,
    appealId: string,
    dto: AdminBanAppealDecisionDto = {},
    requestContext?: AdminAuditRequestContext | null,
  ) {
    const actor = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealBanAppealStaffIdentity(
      actor.role,
    );

    const appeal = await this.prisma.banAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException("Ban appeal not found.");
    }

    if (
      appeal.status === BanAppealStatus.APPROVED ||
      appeal.status === BanAppealStatus.DENIED
    ) {
      throw new BadRequestException("This appeal has already been closed.");
    }

    const updated = await this.prisma.banAppeal.update({
      where: { id: appealId },
      data: {
        status: BanAppealStatus.DENIED,
        adminNotes:
          this.normalizeText(dto.adminNotes, 2000) ?? appeal.adminNotes ?? null,
        decisionNotes: this.normalizeText(dto.decisionNotes, 2000),
        reviewedByAdminUserId: adminUserId,
        reviewedAt: new Date(),
      },
      include: {
        user: { include: { profile: true } },
        reviewedByAdminUser: true,
        platformBanModerationAction: {
          include: { actorAdminUser: true },
        },
      },
    });

    await this.sendBanAppealEmailSafely("BAN_APPEAL_DENIED", updated, {
      initiatedByAdminUserId: adminUserId,
      correlation: {
        type: "ban_appeal_denied",
        banAppealId: updated.id,
        userId: updated.userId,
        reviewedByAdminUserId: adminUserId,
      } as Prisma.InputJsonValue,
    });

    await this.addBanAppealAudit({
      actorAdminUserId: adminUserId,
      appeal: updated,
      actionType: "STATUS_CHANGE",
      actionCode: "ban_appeal.deny",
      actionLabel: "Denied ban appeal",
      beforeState: {
        status: appeal.status,
        adminNotes: appeal.adminNotes ?? null,
        decisionNotes: appeal.decisionNotes ?? null,
      },
      afterState: {
        status: updated.status,
        adminNotes: updated.adminNotes ?? null,
        decisionNotes: updated.decisionNotes ?? null,
      },
      diff: {
        status: {
          before: appeal.status,
          after: updated.status,
        },
      },
      requestContext,
    });

    return {
      success: true,
      item: this.mapAppealItem(updated, canViewRealStaffIdentity),
    };
  }
}
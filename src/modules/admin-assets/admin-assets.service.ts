import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  AdminRole,
  AssetSubmissionStatus,
  AssetSubmissionType,
  Prisma,
  StreamStatus,
} from "@prisma/client";

import { getAnonymousStaffLabel } from "../admin-users/admin-identity-utils";
import {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminAssetsQueryDto,
  ApproveAssetSubmissionDto,
  BulkAdminAssetActionDto,
  RejectAssetSubmissionDto,
  UpdateAdminAssetNotesDto,
} from "./dto/admin-assets.dto";

type LiveStreamContext = {
  id: string;
  title: string;
  startedAt: Date;
};

type QueueContext = {
  liveStreamByUserId: Map<string, LiveStreamContext>;
  restrictionCountByUserId: Map<string, number>;
  moderationCountByUserId: Map<string, number>;
};

type AssetReviewPreset =
  | "any"
  | "needs_attention"
  | "live_targets"
  | "repeat_offenders";

@Injectable()
export class AdminAssetsService {
  private readonly allowedTypes: AssetSubmissionType[] = [
    AssetSubmissionType.PROFILE_AVATAR,
    AssetSubmissionType.PROFILE_BANNER,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminRolePermissions: AdminRolePermissionsService,
  ) { }

  private normalizePage(value: string | number | undefined, fallback: number) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private normalizePageSize(
    value: string | number | undefined,
    fallback: number,
  ) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }

    return Math.min(100, Math.floor(parsed));
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = String(value || "").trim();
    return normalized ? normalized : null;
  }

  private normalizeIdList(values: string[] | undefined | null) {
    return Array.from(
      new Set(
        (values || [])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );
  }

  private resolveNextNotes(
    existing: string | null | undefined,
    incoming?: string,
  ) {
    if (incoming === undefined) {
      return existing ?? null;
    }

    return this.normalizeOptionalString(incoming);
  }

  private resolveNextApprovedUrl(
    existing: string | null | undefined,
    originalUrl: string,
    incoming?: string,
  ) {
    if (incoming === undefined) {
      return existing ?? originalUrl;
    }

    return this.normalizeOptionalString(incoming) ?? originalUrl;
  }

  private parseStatus(raw?: string) {
    const value = String(raw || "").trim().toUpperCase();

    if (!value) {
      return undefined;
    }

    if (
      !Object.values(AssetSubmissionStatus).includes(
        value as AssetSubmissionStatus,
      )
    ) {
      throw new BadRequestException("Invalid asset review status.");
    }

    return value as AssetSubmissionStatus;
  }

  private parseType(raw?: string) {
    const value = String(raw || "").trim().toUpperCase();

    if (!value) {
      return undefined;
    }

    if (
      value !== AssetSubmissionType.PROFILE_AVATAR &&
      value !== AssetSubmissionType.PROFILE_BANNER
    ) {
      throw new BadRequestException("Invalid asset review type.");
    }

    return value as AssetSubmissionType;
  }

  private parsePreset(raw?: string): AssetReviewPreset {
    const value = String(raw || "").trim().toLowerCase();

    if (!value) {
      return "any";
    }

    if (
      value !== "any" &&
      value !== "needs_attention" &&
      value !== "live_targets" &&
      value !== "repeat_offenders"
    ) {
      throw new BadRequestException("Invalid asset review preset.");
    }

    return value;
  }

  private isSubmissionIdSearch(value: string) {
    const normalized = String(value || "").trim();

    return normalized.length >= 6 && normalized.length <= 64 && !/\s/.test(normalized);
  }

  private assetTypeScopeWhere(): Prisma.AssetSubmissionWhereInput {
    return {
      type: {
        in: this.allowedTypes,
      },
    };
  }

  private buildRepeatOffenderUserFilter(now: Date): Prisma.UserWhereInput {
    return {
      OR: [
        {
          moderationAsTarget: {
            some: {},
          },
        },
        {
          streamRestrictions: {
            some: {
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          },
        },
      ],
    };
  }

  private buildPresetWhereInput(
    preset: AssetReviewPreset,
    now: Date,
  ): Prisma.AssetSubmissionWhereInput | null {
    const attentionThreshold = new Date(now.getTime() - 24 * 60 * 60_000);

    switch (preset) {
      case "needs_attention":
        return {
          AND: [
            { status: AssetSubmissionStatus.PENDING },
            { createdAt: { lt: attentionThreshold } },
          ],
        };

      case "live_targets":
        return {
          AND: [
            { status: AssetSubmissionStatus.PENDING },
            {
              user: {
                is: {
                  hostedStreams: {
                    some: {
                      status: StreamStatus.LIVE,
                    },
                  },
                },
              },
            },
          ],
        };

      case "repeat_offenders":
        return {
          AND: [
            { status: AssetSubmissionStatus.PENDING },
            {
              user: {
                is: this.buildRepeatOffenderUserFilter(now),
              },
            },
          ],
        };

      case "any":
      default:
        return null;
    }
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

  private async canViewRealStaffIdentity(role: AdminRole) {
    const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

    return hasAdminPermission(
      permissions,
      ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
    );
  }

  private mapUser(user: any) {
    return {
      id: user.id,
      publicId: user.publicId ?? null,
      email: user.email ?? null,
      username: user.username,
      displayName: user.profile?.displayName?.trim() || user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
    };
  }

  private mapStaffIdentity(actor: any, canViewRealStaffIdentity: boolean) {
    if (!actor) {
      return null;
    }

    const fallbackName =
      actor.name?.trim?.() ||
      actor.profile?.displayName?.trim?.() ||
      actor.username ||
      "Staff agent";

    if (canViewRealStaffIdentity) {
      return {
        id: actor.id,
        email: actor.email ?? null,
        name: fallbackName,
        role: actor.role ?? null,
        isActive: actor.isActive ?? true,
        displayName: fallbackName,
        displayEmail: actor.email ?? "No email",
        identityVisibility: "real" as const,
      };
    }

    const anonymousName = getAnonymousStaffLabel({
      id: actor.id,
      role: actor.role,
    });

    return {
      id: null,
      email: "hidden",
      name: anonymousName,
      role: actor.role ?? null,
      isActive: actor.isActive ?? true,
      displayName: anonymousName,
      displayEmail: "Hidden",
      identityVisibility: "anonymous" as const,
    };
  }

  private mapQueueItem(item: any, context: QueueContext) {
    const liveStream = context.liveStreamByUserId.get(item.userId) ?? null;

    return {
      id: item.id,
      type: item.type,
      status: item.status,
      originalUrl: item.originalUrl,
      approvedUrl: item.approvedUrl ?? null,
      adminNotes: item.adminNotes ?? null,
      reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      user: item.user ? this.mapUser(item.user) : null,
      reviewedBy: item.reviewedBy ? this.mapUser(item.reviewedBy) : null,
      liveStream: liveStream
        ? {
          id: liveStream.id,
          title: liveStream.title,
          startedAt: liveStream.startedAt.toISOString(),
        }
        : null,
      activeRestrictionCount:
        context.restrictionCountByUserId.get(item.userId) ?? 0,
      moderationActionCount:
        context.moderationCountByUserId.get(item.userId) ?? 0,
    };
  }

  private mapRestriction(item: any, canViewRealStaffIdentity = false) {
    return {
      id: item.id,
      kind: item.kind,
      reason: item.reason ?? null,
      createdAt: item.createdAt.toISOString(),
      expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
      stream: item.stream
        ? {
          id: item.stream.id,
          title: item.stream.title,
        }
        : null,
      createdBy: item.createdBy ? this.mapUser(item.createdBy) : null,
      createdByAdminUser: this.mapStaffIdentity(
        item.createdByAdminUser,
        canViewRealStaffIdentity,
      ),
    };
  }

  private mapModerationAction(item: any, canViewRealStaffIdentity = false) {
    return {
      id: item.id,
      action: item.action,
      reason: item.reason ?? null,
      createdAt: item.createdAt.toISOString(),
      expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
      durationSeconds: item.durationSeconds ?? null,
      stream: item.stream
        ? {
          id: item.stream.id,
          title: item.stream.title,
        }
        : null,
      actor: item.actor ? this.mapUser(item.actor) : null,
      actorAdminUser: this.mapStaffIdentity(
        item.actorAdminUser,
        canViewRealStaffIdentity,
      ),
    };
  }

  private async buildQueueContext(userIds: string[]): Promise<QueueContext> {
    const uniqueUserIds = Array.from(
      new Set(
        (userIds || [])
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    );

    if (uniqueUserIds.length === 0) {
      return {
        liveStreamByUserId: new Map(),
        restrictionCountByUserId: new Map(),
        moderationCountByUserId: new Map(),
      };
    }

    const now = new Date();

    const [liveStreams, restrictionCounts, moderationCounts] = await Promise.all([
      this.prisma.stream.findMany({
        where: {
          hostUserId: { in: uniqueUserIds },
          status: StreamStatus.LIVE,
        },
        select: {
          id: true,
          title: true,
          startedAt: true,
          hostUserId: true,
        },
        orderBy: { startedAt: "desc" },
      }),
      this.prisma.streamUserRestriction.groupBy({
        by: ["userId"],
        where: {
          userId: { in: uniqueUserIds },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        _count: { _all: true },
      }),
      this.prisma.moderationAction.groupBy({
        by: ["targetUserId"],
        where: {
          targetUserId: { in: uniqueUserIds },
        },
        _count: { _all: true },
      }),
    ]);

    const liveStreamByUserId = new Map<string, LiveStreamContext>();

    for (const stream of liveStreams) {
      if (!liveStreamByUserId.has(stream.hostUserId)) {
        liveStreamByUserId.set(stream.hostUserId, {
          id: stream.id,
          title: stream.title,
          startedAt: stream.startedAt,
        });
      }
    }

    return {
      liveStreamByUserId,
      restrictionCountByUserId: new Map(
        restrictionCounts.map((row) => [row.userId, row._count._all]),
      ),
      moderationCountByUserId: new Map(
        moderationCounts.map((row) => [row.targetUserId, row._count._all]),
      ),
    };
  }

  private async bulkTransition(
    adminUserId: string,
    body: BulkAdminAssetActionDto,
    nextStatus: AssetSubmissionStatus,
  ) {
    await this.requireAdmin(adminUserId);

    const submissionIds = this.normalizeIdList(body.submissionIds);

    const existing = await this.prisma.assetSubmission.findMany({
      where: {
        id: { in: submissionIds },
        type: { in: this.allowedTypes },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const existingById = new Map(existing.map((row) => [row.id, row]));
    const missingIds = submissionIds.filter((id) => !existingById.has(id));
    const skippedIds = submissionIds.filter((id) => {
      const row = existingById.get(id);
      return Boolean(row && row.status === nextStatus);
    });
    const updatedIds = submissionIds.filter((id) => {
      const row = existingById.get(id);
      return Boolean(row && row.status !== nextStatus);
    });

    if (updatedIds.length > 0) {
      const now = new Date();

      const data: Prisma.AssetSubmissionUpdateManyMutationInput = {
        status: nextStatus,
        reviewedAt: now,
      };

      if (body.adminNotes !== undefined) {
        data.adminNotes = this.normalizeOptionalString(body.adminNotes);
      }

      await this.prisma.assetSubmission.updateMany({
        where: {
          id: { in: updatedIds },
          type: { in: this.allowedTypes },
        },
        data,
      });

      if (nextStatus === AssetSubmissionStatus.APPROVED) {
        const approvedItems = await this.prisma.assetSubmission.findMany({
          where: {
            id: { in: updatedIds },
            type: { in: this.allowedTypes },
          },
          select: {
            id: true,
            userId: true,
            type: true,
            originalUrl: true,
            approvedUrl: true,
          },
        });

        await this.prisma.$transaction(
          approvedItems.map((item) => {
            const approvedUrl = item.approvedUrl ?? item.originalUrl;

            if (item.type === AssetSubmissionType.PROFILE_AVATAR) {
              return this.prisma.profile.upsert({
                where: { userId: item.userId },
                create: {
                  userId: item.userId,
                  displayName: "",
                  avatarUrl: approvedUrl,
                  showBadgeOnProfile: true,
                },
                update: {
                  avatarUrl: approvedUrl,
                },
              });
            }

            return this.prisma.profile.upsert({
              where: { userId: item.userId },
              create: {
                userId: item.userId,
                displayName: "",
                bannerUrl: approvedUrl,
                showBadgeOnProfile: true,
              },
              update: {
                bannerUrl: approvedUrl,
              },
            });
          }),
        );
      }
    }

    return {
      success: true,
      requestedCount: submissionIds.length,
      updatedCount: updatedIds.length,
      updatedIds,
      skippedIds,
      missingIds,
    };
  }

  async getSummary(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const attentionThreshold = new Date(now.getTime() - 24 * 60 * 60_000);
    const repeatOffenderUserFilter = this.buildRepeatOffenderUserFilter(now);

    const baseScope = this.assetTypeScopeWhere();

    const [
      pending,
      approvedToday,
      rejectedToday,
      oldestPending,
      attentionRequired,
      pendingUsers,
      repeatOffendersPending,
    ] = await Promise.all([
      this.prisma.assetSubmission.count({
        where: {
          AND: [baseScope, { status: AssetSubmissionStatus.PENDING }],
        },
      }),
      this.prisma.assetSubmission.count({
        where: {
          AND: [
            baseScope,
            {
              status: AssetSubmissionStatus.APPROVED,
              reviewedAt: { gte: todayStart },
            },
          ],
        },
      }),
      this.prisma.assetSubmission.count({
        where: {
          AND: [
            baseScope,
            {
              status: AssetSubmissionStatus.REJECTED,
              reviewedAt: { gte: todayStart },
            },
          ],
        },
      }),
      this.prisma.assetSubmission.findFirst({
        where: {
          AND: [baseScope, { status: AssetSubmissionStatus.PENDING }],
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      this.prisma.assetSubmission.count({
        where: {
          AND: [
            baseScope,
            {
              status: AssetSubmissionStatus.PENDING,
              createdAt: { lt: attentionThreshold },
            },
          ],
        },
      }),
      this.prisma.assetSubmission.findMany({
        where: {
          AND: [baseScope, { status: AssetSubmissionStatus.PENDING }],
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.assetSubmission.count({
        where: {
          AND: [
            baseScope,
            {
              status: AssetSubmissionStatus.PENDING,
              user: {
                is: repeatOffenderUserFilter,
              },
            },
          ],
        },
      }),
    ]);

    const pendingUserIds = pendingUsers.map((row) => row.userId);

    const liveTargets =
      pendingUserIds.length > 0
        ? await this.prisma.stream.count({
          where: {
            hostUserId: { in: pendingUserIds },
            status: StreamStatus.LIVE,
          },
        })
        : 0;

    return {
      generatedAt: now.toISOString(),
      counts: {
        pending,
        attentionRequired,
        approvedToday,
        rejectedToday,
        liveTargets,
        repeatOffendersPending,
      },
      oldestPendingAt: oldestPending?.createdAt
        ? oldestPending.createdAt.toISOString()
        : null,
    };
  }

  async list(adminUserId: string, query: AdminAssetsQueryDto = {}) {
    await this.requireAdmin(adminUserId);

    const now = new Date();
    const page = this.normalizePage(query.page, 1);
    const pageSize = this.normalizePageSize(query.pageSize, 20);
    const status = this.parseStatus(query.status);
    const type = this.parseType(query.type);
    const preset = this.parsePreset(query.preset);
    const search = String(query.search || "").trim();
    const sort = String(query.sort || "newest").trim().toLowerCase();

    const andFilters: Prisma.AssetSubmissionWhereInput[] = [
      this.assetTypeScopeWhere(),
    ];

    if (status) {
      andFilters.push({ status });
    }

    if (type) {
      andFilters.push({ type });
    }

    const presetFilter = this.buildPresetWhereInput(preset, now);
    if (presetFilter) {
      andFilters.push(presetFilter);
    }

    if (search) {
      const orFilters: Prisma.AssetSubmissionWhereInput[] = [
        {
          user: {
            is: {
              username: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          user: {
            is: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          user: {
            is: {
              publicId: { contains: search, mode: "insensitive" },
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
      ];

      if (this.isSubmissionIdSearch(search)) {
        orFilters.unshift({
          id: { equals: search },
        });
      }

      andFilters.push({ OR: orFilters });
    }

    const where: Prisma.AssetSubmissionWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};

    const orderBy: Prisma.AssetSubmissionOrderByWithRelationInput[] =
      sort === "oldest" ? [{ createdAt: "asc" }] : [{ createdAt: "desc" }];

    const [total, items] = await Promise.all([
      this.prisma.assetSubmission.count({ where }),
      this.prisma.assetSubmission.findMany({
        where,
        include: {
          user: {
            include: { profile: true },
          },
          reviewedBy: {
            include: { profile: true },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const context = await this.buildQueueContext(items.map((item) => item.userId));

    return {
      items: items.map((item) => this.mapQueueItem(item, context)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      filters: {
        search: search || null,
        status: status ?? "all",
        type: type ?? "all",
        preset,
        sort: sort === "oldest" ? "oldest" : "newest",
      },
    };
  }

  async getById(adminUserId: string, id: string) {
    const admin = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(admin.role);

    const item = await this.prisma.assetSubmission.findUnique({
      where: { id },
      include: {
        user: {
          include: { profile: true },
        },
        reviewedBy: {
          include: { profile: true },
        },
      },
    });

    if (!item || !this.allowedTypes.includes(item.type)) {
      throw new NotFoundException("Asset review not found.");
    }

    const now = new Date();

    const [context, activeRestrictions, recentModerationActions, relatedSubmissions] =
      await Promise.all([
        this.buildQueueContext([item.userId]),
        this.prisma.streamUserRestriction.findMany({
          where: {
            userId: item.userId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          include: {
            stream: {
              select: {
                id: true,
                title: true,
              },
            },
            createdBy: {
              include: { profile: true },
            },
            createdByAdminUser: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        this.prisma.moderationAction.findMany({
          where: {
            targetUserId: item.userId,
          },
          include: {
            stream: {
              select: {
                id: true,
                title: true,
              },
            },
            actor: {
              include: { profile: true },
            },
            actorAdminUser: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        this.prisma.assetSubmission.findMany({
          where: {
            userId: item.userId,
            id: { not: id },
            type: { in: this.allowedTypes },
          },
          include: {
            user: {
              include: { profile: true },
            },
            reviewedBy: {
              include: { profile: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    return {
      item: {
        ...this.mapQueueItem(item, context),
        activeRestrictions: activeRestrictions.map((row) =>
          this.mapRestriction(row, canViewRealStaffIdentity),
        ),
        recentModerationActions: recentModerationActions.map((row) =>
          this.mapModerationAction(row, canViewRealStaffIdentity),
        ),
        relatedSubmissions: relatedSubmissions.map((row) =>
          this.mapQueueItem(row, context),
        ),
      },
    };
  }

  async updateNotes(
    adminUserId: string,
    id: string,
    body: UpdateAdminAssetNotesDto,
  ) {
    await this.requireAdmin(adminUserId);

    const existing = await this.prisma.assetSubmission.findUnique({
      where: { id },
      include: {
        user: {
          include: { profile: true },
        },
        reviewedBy: {
          include: { profile: true },
        },
      },
    });

    if (!existing || !this.allowedTypes.includes(existing.type)) {
      throw new NotFoundException("Asset review not found.");
    }

    const updated = await this.prisma.assetSubmission.update({
      where: { id },
      data: {
        adminNotes: this.resolveNextNotes(
          existing.adminNotes,
          body.adminNotes,
        ),
      },
      include: {
        user: {
          include: { profile: true },
        },
        reviewedBy: {
          include: { profile: true },
        },
      },
    });

    const context = await this.buildQueueContext([updated.userId]);

    return {
      success: true,
      item: this.mapQueueItem(updated, context),
    };
  }

  async approve(
    adminUserId: string,
    id: string,
    body: ApproveAssetSubmissionDto,
  ) {
    await this.requireAdmin(adminUserId);

    const existing = await this.prisma.assetSubmission.findUnique({
      where: { id },
      include: {
        user: {
          include: { profile: true },
        },
        reviewedBy: {
          include: { profile: true },
        },
      },
    });

    if (!existing || !this.allowedTypes.includes(existing.type)) {
      throw new NotFoundException("Asset review not found.");
    }

    const approvedUrl = this.resolveNextApprovedUrl(
      existing.approvedUrl,
      existing.originalUrl,
      body.approvedUrl,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.assetSubmission.update({
        where: { id },
        data: {
          status: AssetSubmissionStatus.APPROVED,
          adminNotes: this.resolveNextNotes(
            existing.adminNotes,
            body.adminNotes,
          ),
          approvedUrl,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            include: { profile: true },
          },
          reviewedBy: {
            include: { profile: true },
          },
        },
      });

      const displayName =
        existing.user.profile?.displayName?.trim() || existing.user.username;

      if (existing.type === AssetSubmissionType.PROFILE_AVATAR) {
        await tx.profile.upsert({
          where: { userId: existing.userId },
          create: {
            userId: existing.userId,
            displayName,
            avatarUrl: approvedUrl,
            showBadgeOnProfile: true,
          },
          update: {
            avatarUrl: approvedUrl,
          },
        });
      }

      if (existing.type === AssetSubmissionType.PROFILE_BANNER) {
        await tx.profile.upsert({
          where: { userId: existing.userId },
          create: {
            userId: existing.userId,
            displayName,
            bannerUrl: approvedUrl,
            showBadgeOnProfile: true,
          },
          update: {
            bannerUrl: approvedUrl,
          },
        });
      }

      return submission;
    });

    const context = await this.buildQueueContext([updated.userId]);

    return {
      success: true,
      item: this.mapQueueItem(updated, context),
    };
  }

  async reject(
    adminUserId: string,
    id: string,
    body: RejectAssetSubmissionDto,
  ) {
    await this.requireAdmin(adminUserId);

    const existing = await this.prisma.assetSubmission.findUnique({
      where: { id },
      include: {
        user: {
          include: { profile: true },
        },
        reviewedBy: {
          include: { profile: true },
        },
      },
    });

    if (!existing || !this.allowedTypes.includes(existing.type)) {
      throw new NotFoundException("Asset review not found.");
    }

    const updated = await this.prisma.assetSubmission.update({
      where: { id },
      data: {
        status: AssetSubmissionStatus.REJECTED,
        adminNotes: this.resolveNextNotes(
          existing.adminNotes,
          body.adminNotes,
        ),
        reviewedAt: new Date(),
      },
      include: {
        user: {
          include: { profile: true },
        },
        reviewedBy: {
          include: { profile: true },
        },
      },
    });

    const context = await this.buildQueueContext([updated.userId]);

    return {
      success: true,
      item: this.mapQueueItem(updated, context),
    };
  }

  async bulkApprove(
    adminUserId: string,
    body: BulkAdminAssetActionDto,
  ) {
    return this.bulkTransition(
      adminUserId,
      body,
      AssetSubmissionStatus.APPROVED,
    );
  }

  async bulkReject(
    adminUserId: string,
    body: BulkAdminAssetActionDto,
  ) {
    return this.bulkTransition(
      adminUserId,
      body,
      AssetSubmissionStatus.REJECTED,
    );
  }
}
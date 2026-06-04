import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { AdminRole } from "@prisma/client";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { StreamsService } from "../streams/streams.service";
import { VideoService } from "../video/video.service";
import { AdminStreamsListQueryDto } from "./dto/admin-streams.dto";

type AdminAuditRequestContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

@Injectable()
export class AdminStreamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streams: StreamsService,
    private readonly video: VideoService,
    private readonly adminAudit: AdminAuditService,
    private readonly adminRolePermissions: AdminRolePermissionsService,
  ) { }

  private normalizePage(value: string | number | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.floor(parsed);
  }

  private normalizePageSize(value: string | number | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(100, Math.floor(parsed));
  }

  private asBool(value?: string) {
    return String(value || "").trim().toLowerCase() === "true";
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = String(value || "").trim();
    return normalized ? normalized : null;
  }

  private normalizeAuditContext(context?: AdminAuditRequestContext | null) {
    return {
      requestPath: this.normalizeOptionalString(context?.requestPath),
      ipAddress: this.normalizeOptionalString(context?.ipAddress),
      userAgent: this.normalizeOptionalString(context?.userAgent),
      deviceLabel: this.normalizeOptionalString(context?.deviceLabel),
    };
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

  private looksFlagged(stream: any) {
    const title = String(stream?.title || "").toLowerCase();
    const tags = Array.isArray(stream?.tags)
      ? stream.tags.map((t: any) => String(t).toLowerCase())
      : [];

    return (
      title.includes("flag") ||
      tags.includes("flagged") ||
      tags.includes("review")
    );
  }

  private isPk(streamId: string, activeBattleStreamIds: Set<string>) {
    return activeBattleStreamIds.has(streamId);
  }

  private normalizeHost(host: any) {
    if (!host) return null;

    return {
      id: host.id,
      publicId: host.publicId ?? null,
      username: host.username,
      displayName: host.displayName ?? host.username,
      avatarUrl: host.avatarUrl ?? null,
    };
  }

  private async canViewRealStaffIdentity(role: AdminRole) {
    const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

    return hasAdminPermission(
      permissions,
      ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
    );
  }

  private mapStaffAdminId(
    id: string | null | undefined,
    canViewRealStaffIdentity = false,
  ) {
    return canViewRealStaffIdentity ? id ?? null : null;
  }

  private mapRecentChatMessage(message: any, canViewRealStaffIdentity = false) {
    const isDeleted = Boolean(message?.isDeleted);
    const deletionLabel =
      message?.deletionLabel?.trim() || "Message deleted by an Admin.";

    return {
      id: message.id,
      user: {
        id: message.user.id,
        username: message.user.username,
        displayName:
          message.user.profile?.displayName?.trim() || message.user.username,
        avatarUrl: message.user.profile?.avatarUrl ?? null,
      },
      text: isDeleted ? deletionLabel : message.text,
      replyToMessageId: message.replyToMessageId ?? null,
      createdAt: message.createdAt.toISOString(),
      isDeleted,
      deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
      deletedByAdminUserId: this.mapStaffAdminId(
        message.deletedByAdminUserId,
        canViewRealStaffIdentity,
      ),
      deletionLabel: isDeleted ? deletionLabel : null,
    };
  }

  private async addStreamAudit(args: {
    actorAdminUserId: string;
    streamId: string;
    hostUserId?: string | null;
    title?: string | null;
    actionType: "VIEW" | "UPDATE" | "MODERATION_ACTION";
    actionCode: string;
    actionLabel: string;
    status?: "SUCCESS" | "DENIED" | "FAILED";
    severity?: "INFO" | "WARNING" | "CRITICAL";
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
      status: args.status ?? "SUCCESS",
      severity: args.severity ?? "INFO",
      resourceType: "STREAM",
      resourceId: args.streamId,
      target: {
        id: args.streamId,
        name: args.title ?? args.streamId,
        type: "STREAM",
      },
      references: {
        targetStreamId: args.streamId,
        targetUserId: args.hostUserId ?? null,
      },
      requestPath: requestContext.requestPath,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      deviceLabel: requestContext.deviceLabel,
      metadata: args.metadata ?? undefined,
      beforeState: args.beforeState ?? undefined,
      afterState: args.afterState ?? undefined,
      diff: args.diff ?? undefined,
    });
  }

  async list(adminUserId: string, options: AdminStreamsListQueryDto = {}) {
    await this.requireAdmin(adminUserId);

    const page = this.normalizePage(options.page, 1);
    const pageSize = this.normalizePageSize(options.pageSize, 20);
    const search = String(options.search || "").trim().toLowerCase();
    const filterFlagged = this.asBool(options.flagged);
    const filterPk = this.asBool(options.pk);
    const sort = String(options.sort || "viewers").trim().toLowerCase();

    const [liveStreams, activeBattles] = await Promise.all([
      this.streams.listLive(),
      this.prisma.battle.findMany({
        where: {
          status: {
            in: ["PENDING", "ACTIVE"] as any,
          },
        },
        select: {
          id: true,
          streamId: true,
          opponentUserId: true,
          hostUserId: true,
          status: true,
        },
      }),
    ]);

    const activeBattleStreamIds = new Set(activeBattles.map((b) => b.streamId));
    const streamIds = liveStreams.map((stream: any) => stream.id);

    const since = new Date(Date.now() - 15 * 60 * 1000);

    const [participantCounts, recentChatCounts, recentGiftCounts] = await Promise.all([
      streamIds.length
        ? this.prisma.streamParticipant.groupBy({
          by: ["streamId"],
          where: {
            streamId: { in: streamIds },
            leftAt: null,
          },
          _count: { _all: true },
        })
        : [],
      streamIds.length
        ? this.prisma.chatMessage.groupBy({
          by: ["streamId"],
          where: {
            streamId: { in: streamIds },
            createdAt: { gte: since },
          },
          _count: { _all: true },
        })
        : [],
      streamIds.length
        ? this.prisma.giftTransaction.groupBy({
          by: ["streamId"],
          where: {
            streamId: { in: streamIds },
            createdAt: { gte: since },
          },
          _count: { _all: true },
        })
        : [],
    ]);

    const participantCountByStreamId = new Map(
      participantCounts.map((row) => [row.streamId, row._count._all]),
    );
    const recentChatCountByStreamId = new Map(
      recentChatCounts.map((row) => [row.streamId, row._count._all]),
    );
    const recentGiftCountByStreamId = new Map(
      recentGiftCounts.map((row) => [row.streamId, row._count._all]),
    );

    let items = liveStreams.map((stream: any) => {
      const flagged = this.looksFlagged(stream);
      const pk = this.isPk(stream.id, activeBattleStreamIds);

      return {
        ...stream,
        host: this.normalizeHost(stream.host),
        flagged,
        pk,
        participantCount: participantCountByStreamId.get(stream.id) ?? 0,
        recentChatCount: recentChatCountByStreamId.get(stream.id) ?? 0,
        recentGiftCount: recentGiftCountByStreamId.get(stream.id) ?? 0,
      };
    });

    if (search) {
      items = items.filter((stream: any) => {
        const hostUsername = String(stream?.host?.username || "").toLowerCase();
        const hostDisplayName = String(stream?.host?.displayName || "").toLowerCase();
        const title = String(stream?.title || "").toLowerCase();

        return (
          hostUsername.includes(search) ||
          hostDisplayName.includes(search) ||
          title.includes(search)
        );
      });
    }

    if (filterFlagged) {
      items = items.filter((stream: any) => stream.flagged);
    }

    if (filterPk) {
      items = items.filter((stream: any) => stream.pk);
    }

    items.sort((a: any, b: any) => {
      if (sort === "recent") {
        return String(b.startedAt).localeCompare(String(a.startedAt));
      }

      if (sort === "oldest") {
        return String(a.startedAt).localeCompare(String(b.startedAt));
      }

      return Number(b.viewerCount || 0) - Number(a.viewerCount || 0);
    });

    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paged,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getById(
    adminUserId: string,
    adminRole: AdminRole,
    streamId: string,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);

    const since = new Date(Date.now() - 15 * 60 * 1000);

    const [stream, chatPreview, activeBattle, participantCount, recentChatCount, recentGiftCount] =
      await Promise.all([
        this.streams.getStream(streamId),
        this.prisma.chatMessage.findMany({
          where: { streamId },
          include: {
            user: {
              include: { profile: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        this.prisma.battle.findFirst({
          where: {
            streamId,
            status: {
              in: ["PENDING", "ACTIVE"] as any,
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.streamParticipant.count({
          where: {
            streamId,
            leftAt: null,
          },
        }),
        this.prisma.chatMessage.count({
          where: {
            streamId,
            createdAt: { gte: since },
          },
        }),
        this.prisma.giftTransaction.count({
          where: {
            streamId,
            createdAt: { gte: since },
          },
        }),
      ]);

    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    await this.addStreamAudit({
      actorAdminUserId: adminUserId,
      streamId,
      hostUserId: (stream as any).hostUserId ?? null,
      title: (stream as any).title ?? streamId,
      actionType: "VIEW",
      actionCode: "stream.moderation.view",
      actionLabel: "Viewed live moderation stream details",
      metadata: {
        source: "admin_streams.getById",
      },
      requestContext,
    });

    return {
      stream: {
        ...stream,
        host: this.normalizeHost((stream as any).host),
      },
      flagged: this.looksFlagged(stream),
      pk: !!activeBattle,
      activeBattle,
      metrics: {
        participantCount,
        recentChatCount,
        recentGiftCount,
      },
      recentChat: chatPreview
        .reverse()
        .map((message) =>
          this.mapRecentChatMessage(message, canViewRealStaffIdentity),
        ),
    };
  }

  async watchSession(
    adminUserId: string,
    streamId: string,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        title: true,
        status: true,
        hostUserId: true,
      },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found.");
    }

    if (stream.status !== "LIVE") {
      throw new ForbiddenException("Stream is not live.");
    }

    const livekit = await this.video.issueAdminObserverToken({
      streamId: stream.id,
      adminUserId,
    });

    await this.addStreamAudit({
      actorAdminUserId: adminUserId,
      streamId: stream.id,
      hostUserId: stream.hostUserId,
      title: stream.title,
      actionType: "VIEW",
      actionCode: "stream.watch",
      actionLabel: "Started admin watch session",
      metadata: {
        ghost: true,
      },
      requestContext,
    });

    return {
      streamId: stream.id,
      title: stream.title,
      ghost: true,
      livekit,
    };
  }

  async removeGuestFromBox(
    adminUserId: string,
    streamId: string,
    guestUserId: string,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, hostUserId: true, status: true, title: true },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found.");
    }

    if (stream.status !== "LIVE") {
      throw new ForbiddenException("Stream is not live.");
    }

    const result = await this.streams.removeGuestFromBox(
      streamId,
      stream.hostUserId,
      guestUserId,
    );

    await this.addStreamAudit({
      actorAdminUserId: adminUserId,
      streamId,
      hostUserId: stream.hostUserId,
      title: stream.title,
      actionType: "MODERATION_ACTION",
      actionCode: "stream.guest.remove",
      actionLabel: "Removed guest from stream",
      metadata: {
        guestUserId,
      },
      requestContext,
    });

    return result;
  }

  async setGuestCameraState(
    adminUserId: string,
    streamId: string,
    guestUserId: string,
    state: boolean,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, hostUserId: true, status: true, title: true },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found.");
    }

    if (stream.status !== "LIVE") {
      throw new ForbiddenException("Stream is not live.");
    }

    if (state === false) {
      throw new BadRequestException(
        "Only the guest can turn their camera back on.",
      );
    }

    const result = await this.streams.updateGuestMediaState(
      streamId,
      guestUserId,
      { trackType: "video", state },
      stream.hostUserId,
    );

    await this.addStreamAudit({
      actorAdminUserId: adminUserId,
      streamId,
      hostUserId: stream.hostUserId,
      title: stream.title,
      actionType: "UPDATE",
      actionCode: "stream.guest.camera.update",
      actionLabel: "Disabled guest camera",
      metadata: {
        guestUserId,
        state,
        trackType: "video",
      },
      diff: {
        guestUserId,
        trackType: "video",
        state,
      },
      requestContext,
    });

    return result;
  }

  async terminate(
    adminUserId: string,
    streamId: string,
    reason: string,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, hostUserId: true, status: true, title: true },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    const normalizedReason = this.normalizeOptionalString(reason);

    if (stream.status === "ENDED") {
      await this.addStreamAudit({
        actorAdminUserId: adminUserId,
        streamId,
        hostUserId: stream.hostUserId,
        title: stream.title,
        actionType: "MODERATION_ACTION",
        actionCode: "stream.terminate",
        actionLabel: "Attempted to terminate stream",
        status: "FAILED",
        metadata: {
          alreadyEnded: true,
          reason: normalizedReason,
        },
        requestContext,
      });

      return { ok: true, alreadyEnded: true };
    }

    try {
      const result = await this.streams.endStreamAsAdmin(
        streamId,
        adminUserId,
        reason,
      );

      await this.addStreamAudit({
        actorAdminUserId: adminUserId,
        streamId,
        hostUserId: stream.hostUserId,
        title: stream.title,
        actionType: "MODERATION_ACTION",
        actionCode: "stream.terminate",
        actionLabel: "Terminated stream",
        severity: "WARNING",
        metadata: {
          reason: normalizedReason,
        },
        beforeState: {
          status: stream.status,
        },
        afterState: {
          status: "ENDED",
        },
        diff: {
          status: {
            before: stream.status,
            after: "ENDED",
          },
          reason: normalizedReason,
        },
        requestContext,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 1000) : "Unknown termination error";

      await this.addStreamAudit({
        actorAdminUserId: adminUserId,
        streamId,
        hostUserId: stream.hostUserId,
        title: stream.title,
        actionType: "MODERATION_ACTION",
        actionCode: "stream.terminate",
        actionLabel: "Failed to terminate stream",
        status: "FAILED",
        severity: "WARNING",
        metadata: {
          reason: normalizedReason,
          error: message,
        },
        beforeState: {
          status: stream.status,
        },
        diff: {
          reason: normalizedReason,
          error: message,
        },
        requestContext,
      });

      throw error;
    }
  }
}
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { AdminRole, StreamRole } from "@prisma/client";
import {
  ModerationActionType,
  Prisma,
  RestrictionKind,
} from "@prisma/client";

import {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { StreamsService } from "../streams/streams.service";
import { StreamStaffService } from "../stream-staff/stream-staff.service";
import {
  AdminModerationActionsQueryDto,
  AdminModerationHistoryQueryDto,
  AdminModerationRestrictionsQueryDto,
} from "./dto/admin-moderation.dto";

type AssignableRole = Extract<StreamRole, "GUEST" | "MODERATOR" | "VIEWER">;

type AssignRoleInput = {
  streamId: string;
  actorUserId: string;
  targetUserId: string;
  role: AssignableRole;
};

type ActionInput = {
  streamId: string;
  actorUserId: string;
  targetUserId: string;
  reason?: string;
  durationSeconds?: number;
  durationLabel?: string;
};

type AdminActionInput = {
  streamId: string;
  actorAdminUserId: string;
  targetUserId: string;
  reason?: string;
  durationSeconds?: number;
  durationLabel?: string;
};

type AdminPlatformBanInput = {
  actorAdminUserId: string;
  targetUserId: string;
  reason: string;
  durationSeconds?: number;
};

type AdminPlatformUnbanInput = {
  actorAdminUserId: string;
  targetUserId: string;
  reason?: string;
};

type HostBanManagerListInput = {
  streamId: string;
  actorUserId: string;
  search?: string;
};

type HostBanManagerUpdateInput = {
  streamId: string;
  actorUserId: string;
  targetUserId: string;
  reason?: string;
  durationSeconds?: number | null;
  durationLabel?: string | null;
};

type HostBanManagerUnbanInput = {
  streamId: string;
  actorUserId: string;
  targetUserId: string;
  reason?: string;
};

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly streams: StreamsService,
    private readonly streamStaff: StreamStaffService,
    private readonly adminRolePermissions: AdminRolePermissionsService,
  ) { }

  private room(streamId: string) {
    return `stream:${streamId}`;
  }

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

  private normalizeReason(reason?: string) {
    const r = (reason ?? "").trim();
    return r.length ? r.slice(0, 300) : null;
  }

  private computeExpires(durationSeconds?: number): Date | null {
    if (!durationSeconds) return null;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
    return new Date(Date.now() + durationSeconds * 1000);
  }

  private remainingSecondsFromExpiresAt(expiresAt?: Date | null) {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  }

  private async emitParticipantsAndStreamState(streamId: string) {
    this.realtime.emitParticipants(streamId, await this.getParticipants(streamId));

    try {
      const streamPayload = await this.streams.getStream(streamId);
      this.realtime.emitStreamStateUpdated({
        ...streamPayload,
        streamId,
      });
    } catch (error) {
      console.warn("[ModerationService] failed to emit stream state after moderation action", {
        streamId,
        error,
      });
    }
  }

  private clearStreamGuestMediaState(streamId: string, targetUserId: string) {
    const fn = (this.streams as any)?.clearGuestMediaStateForUser;

    if (typeof fn === "function") {
      fn.call(this.streams, streamId, targetUserId);
    }
  }

  private async disconnectLiveKitParticipantFromStream(streamId: string, targetUserId: string) {
    const fn = (this.streams as any)?.disconnectLiveKitParticipantFromStream;

    if (typeof fn !== "function") {
      return null;
    }

    return fn.call(this.streams, streamId, targetUserId).catch((error: any) => {
      console.warn("[ModerationService] failed to disconnect LiveKit participant", {
        streamId,
        targetUserId,
        error,
      });

      return null;
    });
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

  private async requireStream(streamId: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    return stream;
  }

  private async requireStreamHost(
    streamId: string,
    actorUserId: string,
    message = "Only the host can manage stream bans",
  ) {
    const stream = await this.requireStream(streamId);

    if (stream.hostUserId !== actorUserId) {
      throw new ForbiddenException(message);
    }

    return stream;
  }

  private async requireUser(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  private async getActiveHostedStream(targetUserId: string) {
    return this.prisma.stream.findFirst({
      where: {
        hostUserId: targetUserId,
        status: "LIVE",
      },
      select: {
        id: true,
        title: true,
      },
    });
  }

  private formatPlatformBanChatText(displayName: string, reason: string) {
    return `${displayName} was banned by an admin. Reason: ${reason}`;
  }

  private async actorRole(streamId: string, actorUserId: string): Promise<StreamRole> {
    const stream = await this.requireStream(streamId);

    if (stream.hostUserId === actorUserId) {
      return "HOST";
    }

    const participant = await this.prisma.streamParticipant.findFirst({
      where: { streamId, userId: actorUserId, leftAt: null },
      select: { role: true },
    });

    if (!participant) {
      throw new ForbiddenException("Join stream first");
    }

    return participant.role;
  }

  private ensureCanAssignRoles(actorRole: StreamRole) {
    if (actorRole !== "HOST") {
      throw new ForbiddenException("Only the host can assign participant roles");
    }
  }

  private adminRealtimeActorId(adminUserId: string) {
    return `admin:${adminUserId}`;
  }

  private async canViewRealStaffIdentity(role: AdminRole) {
    const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

    return hasAdminPermission(
      permissions,
      ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
    );
  }

  private mapAdminAccount(row: any, canViewRealStaffIdentity = false) {
    if (!row) return null;

    if (canViewRealStaffIdentity) {
      return {
        id: row.id,
        publicId: null,
        username: row.email,
        displayName: String(row.name || row.email).trim() || row.email,
        avatarUrl: null,
        displayEmail: row.email ?? "No email",
        identityVisibility: "real" as const,
      };
    }

    return {
      id: null,
      publicId: null,
      username: "hidden",
      displayName: "Staff agent",
      avatarUrl: null,
      displayEmail: "Hidden",
      identityVisibility: "anonymous" as const,
    };
  }

  private mapAdminUser(row: any) {
    if (!row) return null;

    return {
      id: row.id,
      publicId: row.publicId ?? null,
      username: row.username,
      displayName: row.profile?.displayName?.trim() || row.username,
      avatarUrl: row.profile?.avatarUrl ?? null,
    };
  }

  private mapAdminAction(row: any, canViewRealStaffIdentity = false) {
    return {
      id: row.id,
      streamId: row.streamId,
      action: row.action,
      reason: row.reason ?? null,
      durationSeconds: row.durationSeconds ?? null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      actor: row.actor
        ? this.mapAdminUser(row.actor)
        : row.actorAdminUser
          ? this.mapAdminAccount(row.actorAdminUser, canViewRealStaffIdentity)
          : null,
      target: this.mapAdminUser(row.target),
      stream: row.stream
        ? {
          id: row.stream.id,
          title: row.stream.title,
          host: row.stream.host ? this.mapAdminUser(row.stream.host) : null,
        }
        : null,
    };
  }

  private mapRestriction(row: any, canViewRealStaffIdentity = false) {
    return {
      id: row.id,
      streamId: row.streamId,
      userId: row.userId,
      kind: row.kind,
      reason: row.reason ?? null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      user: this.mapAdminUser(row.user),
      createdBy: row.createdBy
        ? this.mapAdminUser(row.createdBy)
        : row.createdByAdminUser
          ? this.mapAdminAccount(row.createdByAdminUser, canViewRealStaffIdentity)
          : null,
      stream: row.stream
        ? {
          id: row.stream.id,
          title: row.stream.title,
          host: row.stream.host ? this.mapAdminUser(row.stream.host) : null,
        }
        : null,
    };
  }

  private mapStreamBan(row: any, canViewRealStaffIdentity = false) {
    const expiresAt = row.expiresAt instanceof Date ? row.expiresAt : null;

    return {
      id: row.id,
      streamId: row.streamId,
      userId: row.userId,
      kind: row.kind,
      reason: row.reason ?? null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      remainingSeconds: this.remainingSecondsFromExpiresAt(expiresAt),
      isPermanent: !expiresAt,
      isExpired: !!expiresAt && expiresAt.getTime() <= Date.now(),
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      user: this.mapAdminUser(row.user),
      createdBy: row.createdBy
        ? this.mapAdminUser(row.createdBy)
        : row.createdByAdminUser
          ? this.mapAdminAccount(row.createdByAdminUser, canViewRealStaffIdentity)
          : null,
    };
  }

  private async getParticipants(streamId: string) {
    const fn = (this.streams as any)?.listParticipants;
    if (typeof fn === "function") {
      return fn.call(this.streams, streamId);
    }

    const rows = await this.prisma.streamParticipant.findMany({
      where: { streamId, leftAt: null },
      include: { user: { include: { profile: true } } },
      orderBy: { joinedAt: "asc" },
    });

    return rows.map((p) => ({
      user: {
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.profile?.displayName ?? p.user.username,
        avatarUrl: p.user.profile?.avatarUrl ?? null,
        level: null,
      },
      role: p.role,
      joinedAt: p.joinedAt.toISOString(),
    }));
  }

  private emitRoleAssigned(payload: {
    streamId: string;
    targetUserId: string;
    assignedRole: AssignableRole;
    assignedByUserId: string;
  }) {
    const fn = (this.realtime as any)?.emitRoleAssigned;
    if (typeof fn === "function") {
      return fn.call(this.realtime, payload);
    }

    this.realtime.server.emit("role.assigned", payload);
    this.realtime.server.to(this.room(payload.streamId)).emit("role.assigned", payload);
  }

  private emitModerationAction(payload: {
    streamId: string;
    actionId: string;
    action: "KICK" | "MUTE" | "BAN" | "UNMUTE" | "UNBAN" | "CHAT_MUTE" | "CHAT_UNMUTE";
    targetUserId: string;
    actorUserId: string;
    reason?: string | null;
    durationSeconds?: number | null;
    createdAt: string;
  }) {
    const fn = (this.realtime as any)?.emitModerationAction;
    if (typeof fn === "function") {
      return fn.call(this.realtime, payload);
    }

    this.realtime.server.emit("moderation.action", payload);
    this.realtime.server
      .to(this.room(payload.streamId))
      .emit("moderation.action", payload);
  }

  private emitParticipantRemoved(payload: {
    streamId: string;
    userId: string;
    action: "KICK" | "BAN";
    actionId: string;
  }) {
    const fn = (this.realtime as any)?.emitParticipantRemoved;
    if (typeof fn === "function") {
      return fn.call(this.realtime, payload);
    }

    this.realtime.server.emit("stream.participant.removed", payload);
    this.realtime.server
      .to(this.room(payload.streamId))
      .emit("stream.participant.removed", payload);
  }

  private async disconnectUserFromStream(
    streamId: string,
    targetUserId: string,
    message: string,
    reasonCode: "BLOCKED_BY_HOST" | "KICKED_FROM_STREAM" | "BANNED_FROM_STREAM" = "KICKED_FROM_STREAM",
    details?: {
      actionId?: string | null;
      expiresAt?: string | Date | null;
      durationSeconds?: number | null;
      durationLabel?: string | null;
      remainingSeconds?: number | null;
    },
  ) {
    const normalizedDetails = {
      ...details,
      expiresAt:
        details?.expiresAt instanceof Date
          ? details.expiresAt.toISOString()
          : details?.expiresAt ?? null,
    };

    const fn = (this.realtime as any)?.disconnectUserFromStream;
    if (typeof fn === "function") {
      return fn.call(
        this.realtime,
        streamId,
        targetUserId,
        message,
        reasonCode,
        150,
        normalizedDetails,
      );
    }

    try {
      const sockets = await this.realtime.server.in(this.room(streamId)).fetchSockets();

      for (const s of sockets) {
        const uid = (s.data as any)?.userId;
        if (uid === targetUserId) {
          s.emit("FORCE_KICK", {
            reason: reasonCode,
            targetUserId,
            streamId,
            message,
            ...normalizedDetails,
          });
          s.emit("system.toast", { type: "warning", message, streamId });
          try {
            s.leave(this.room(streamId));
          } catch {
            // ignore cleanup errors
          }
        }
      }
    } catch {
      // ignore
    }
  }

  async assignRole(input: AssignRoleInput) {
    const { streamId, actorUserId, targetUserId, role } = input;

    const stream = await this.requireStream(streamId);
    const actorRole = await this.actorRole(streamId, actorUserId);
    this.ensureCanAssignRoles(actorRole);

    if (targetUserId === actorUserId) {
      throw new BadRequestException("Cannot change your own role");
    }

    if (targetUserId === stream.hostUserId) {
      throw new BadRequestException("Cannot change host role");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRole.upsert({
        where: { streamId_userId: { streamId, userId: targetUserId } },
        create: {
          streamId,
          userId: targetUserId,
          role,
          assignedByUserId: actorUserId,
        },
        update: {
          role,
          assignedByUserId: actorUserId,
        },
      });

      await tx.streamParticipant.updateMany({
        where: { streamId, userId: targetUserId, leftAt: null },
        data: { role },
      });
    });

    this.emitRoleAssigned({
      streamId,
      targetUserId,
      assignedRole: role,
      assignedByUserId: actorUserId,
    });

    this.realtime.emitParticipants(streamId, await this.getParticipants(streamId));

    return { ok: true };
  }

  async mute(input: ActionInput) {
    const { streamId, actorUserId, targetUserId } = input;

    const stream = await this.requireStream(streamId);
    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "MUTE_CHAT",
      "Only the host or authorized staff can mute chat users",
    );

    if (targetUserId === actorUserId) {
      throw new BadRequestException("Cannot mute yourself");
    }

    if (targetUserId === stream.hostUserId) {
      throw new ForbiddenException("Cannot mute the host");
    }

    const reason = this.normalizeReason(input.reason);
    const expiresAt = this.computeExpires(input.durationSeconds);

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.upsert({
        where: {
          streamId_userId_kind: { streamId, userId: targetUserId, kind: "MUTE" },
        },
        create: {
          streamId,
          userId: targetUserId,
          kind: "MUTE",
          reason,
          expiresAt,
          createdByUserId: actorUserId,
        },
        update: {
          reason,
          expiresAt,
          createdByUserId: actorUserId,
        },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "MUTE",
          targetUserId,
          actorUserId,
          reason,
          durationSeconds: input.durationSeconds ?? null,
          expiresAt,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "MUTE",
      targetUserId,
      actorUserId,
      reason,
      durationSeconds: input.durationSeconds ?? null,
      createdAt: action.createdAt.toISOString(),
    });

    this.realtime.emitTimeoutStarted({
      userId: targetUserId,
      streamId,
      expiresAt: action.expiresAt ? action.expiresAt.toISOString() : null,
      remainingSeconds: this.remainingSecondsFromExpiresAt(action.expiresAt),
      message: "You have been timed out.",
    });

    return {
      ok: true,
      actionId: action.id,
      expiresAt: action.expiresAt?.toISOString() ?? null,
    };
  }

  async unmute(input: Omit<ActionInput, "durationSeconds">) {
    const { streamId, actorUserId, targetUserId } = input;

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "MUTE_CHAT",
      "Only the host or authorized staff can unmute chat users",
    );

    const reason = this.normalizeReason(input.reason);

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.deleteMany({
        where: { streamId, userId: targetUserId, kind: "MUTE" },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "UNMUTE",
          targetUserId,
          actorUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "UNMUTE",
      targetUserId,
      actorUserId,
      reason,
      durationSeconds: null,
      createdAt: action.createdAt.toISOString(),
    });

    this.realtime.emitTimeoutCleared({
      userId: targetUserId,
      streamId,
      message: "Your timeout has been lifted.",
    });

    return { ok: true };
  }

  async chatMute(input: Omit<ActionInput, "durationSeconds">) {
    const { streamId, actorUserId, targetUserId } = input;

    const stream = await this.requireStream(streamId);
    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "MUTE_CHAT",
      "Only the host or authorized staff can mute chat users",
    );

    if (targetUserId === actorUserId) {
      throw new BadRequestException("Cannot mute yourself in chat");
    }

    if (targetUserId === stream.hostUserId) {
      throw new ForbiddenException("Cannot mute the host in chat");
    }

    const reason = this.normalizeReason(input.reason);

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.upsert({
        where: {
          streamId_userId_kind: {
            streamId,
            userId: targetUserId,
            kind: "CHAT_MUTE",
          },
        },
        create: {
          streamId,
          userId: targetUserId,
          kind: "CHAT_MUTE",
          reason,
          expiresAt: null,
          createdByUserId: actorUserId,
        },
        update: {
          reason,
          expiresAt: null,
          createdByUserId: actorUserId,
        },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "CHAT_MUTE",
          targetUserId,
          actorUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        } as any,
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "CHAT_MUTE",
      targetUserId,
      actorUserId,
      reason,
      durationSeconds: null,
      createdAt: action.createdAt.toISOString(),
    });

    this.realtime.emitChatMuteStarted({
      userId: targetUserId,
      streamId,
      message: "You were muted in this live chat.",
    });

    return {
      ok: true,
      actionId: action.id,
      muted: true,
    };
  }

  async chatUnmute(input: Omit<ActionInput, "durationSeconds">) {
    const { streamId, actorUserId, targetUserId } = input;

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "MUTE_CHAT",
      "Only the host or authorized staff can unmute chat users",
    );

    const reason = this.normalizeReason(input.reason);

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.deleteMany({
        where: { streamId, userId: targetUserId, kind: "CHAT_MUTE" },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "CHAT_UNMUTE",
          targetUserId,
          actorUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        } as any,
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "CHAT_UNMUTE",
      targetUserId,
      actorUserId,
      reason,
      durationSeconds: null,
      createdAt: action.createdAt.toISOString(),
    });

    this.realtime.emitChatMuteCleared({
      userId: targetUserId,
      streamId,
      message: "You were unmuted in this live chat.",
    });

    return {
      ok: true,
      actionId: action.id,
      muted: false,
    };
  }

  async listStreamBans(input: HostBanManagerListInput) {
    const { streamId, actorUserId } = input;

    await this.requireStreamHost(
      streamId,
      actorUserId,
      "Only the host can view banned users",
    );

    const search = String(input.search || "").trim();
    const now = new Date();

    const andFilters: Prisma.StreamUserRestrictionWhereInput[] = [
      {
        streamId,
        kind: "BAN",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    ];

    if (search) {
      andFilters.push({
        OR: [
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

    const items = await this.prisma.streamUserRestriction.findMany({
      where: { AND: andFilters },
      include: {
        user: {
          include: { profile: true },
        },
        createdBy: {
          include: { profile: true },
        },
        createdByAdminUser: true,
      },
      orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      take: 250,
    });

    return {
      ok: true,
      items: items.map((item) => this.mapStreamBan(item)),
      total: items.length,
      search: search || null,
    };
  }

  async updateStreamBan(input: HostBanManagerUpdateInput) {
    const { streamId, actorUserId, targetUserId } = input;

    const stream = await this.requireStreamHost(
      streamId,
      actorUserId,
      "Only the host can update stream bans",
    );

    if (targetUserId === actorUserId) {
      throw new BadRequestException("Cannot update your own ban");
    }

    if (targetUserId === stream.hostUserId) {
      throw new ForbiddenException("Cannot ban the host");
    }

    await this.requireUser(targetUserId);

    const now = new Date();
    const existing = await this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId: targetUserId,
        kind: "BAN",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (!existing) {
      throw new NotFoundException("Active stream ban not found");
    }

    const durationSeconds =
      typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
        ? Math.floor(input.durationSeconds)
        : null;

    if (
      durationSeconds !== null &&
      (durationSeconds < 1 || durationSeconds > 60 * 60 * 24 * 30)
    ) {
      throw new BadRequestException("Ban duration must be between 1 second and 30 days");
    }

    const expiresAt = durationSeconds === null ? null : this.computeExpires(durationSeconds);
    const durationLabel = String(input.durationLabel || "").trim();
    const fallbackReason = durationLabel
      ? `Ban duration updated to ${durationLabel}.`
      : expiresAt
        ? "Ban duration updated."
        : "Ban changed to permanent.";
    const reason = this.normalizeReason(input.reason) ?? existing.reason ?? fallbackReason;

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.streamUserRestriction.update({
        where: { id: existing.id },
        data: {
          reason,
          expiresAt,
          createdByUserId: actorUserId,
          createdByAdminUserId: null,
        },
        include: {
          user: {
            include: { profile: true },
          },
          createdBy: {
            include: { profile: true },
          },
          createdByAdminUser: true,
        },
      });

      const action = await tx.moderationAction.create({
        data: {
          streamId,
          action: "BAN",
          targetUserId,
          actorUserId,
          reason,
          durationSeconds,
          expiresAt,
        },
      });

      return { updated, action };
    });

    this.emitModerationAction({
      streamId,
      actionId: result.action.id,
      action: "BAN",
      targetUserId,
      actorUserId,
      reason,
      durationSeconds,
      createdAt: result.action.createdAt.toISOString(),
    });

    return {
      ok: true,
      actionId: result.action.id,
      item: this.mapStreamBan(result.updated),
    };
  }

  async unbanStreamBan(input: HostBanManagerUnbanInput) {
    return this.unban({
      streamId: input.streamId,
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      reason: input.reason ?? "Unbanned by the stream host.",
    });
  }

  async ban(input: ActionInput) {
    const { streamId, actorUserId, targetUserId } = input;

    const stream = await this.requireStream(streamId);
    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "BAN_VIEWER",
      "Only the host or authorized staff can ban viewers",
    );

    if (targetUserId === actorUserId) {
      throw new BadRequestException("Cannot ban yourself");
    }

    if (targetUserId === stream.hostUserId) {
      throw new ForbiddenException("Cannot ban the host");
    }

    const reason = this.normalizeReason(input.reason);
    const expiresAt = this.computeExpires(input.durationSeconds);
    const now = new Date();

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.upsert({
        where: {
          streamId_userId_kind: { streamId, userId: targetUserId, kind: "BAN" },
        },
        create: {
          streamId,
          userId: targetUserId,
          kind: "BAN",
          reason,
          expiresAt,
          createdByUserId: actorUserId,
        },
        update: {
          reason,
          expiresAt,
          createdByUserId: actorUserId,
        },
      });

      await tx.streamParticipant.updateMany({
        where: { streamId, userId: targetUserId, leftAt: null },
        data: { leftAt: now },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "BAN",
          targetUserId,
          actorUserId,
          reason,
          durationSeconds: input.durationSeconds ?? null,
          expiresAt,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "BAN",
      targetUserId,
      actorUserId,
      reason,
      durationSeconds: input.durationSeconds ?? null,
      createdAt: action.createdAt.toISOString(),
    });

    this.emitParticipantRemoved({
      streamId,
      userId: targetUserId,
      action: "BAN",
      actionId: action.id,
    });

    this.clearStreamGuestMediaState(streamId, targetUserId);

    await this.disconnectUserFromStream(
      streamId,
      targetUserId,
      action.expiresAt
        ? `You were banned from this stream until ${action.expiresAt.toISOString()}.`
        : "You were permanently banned from this stream.",
      "BANNED_FROM_STREAM",
      {
        actionId: action.id,
        expiresAt: action.expiresAt ? action.expiresAt.toISOString() : null,
        durationSeconds: input.durationSeconds ?? null,
        durationLabel: input.durationLabel ?? null,
      },
    );

    await this.disconnectLiveKitParticipantFromStream(streamId, targetUserId);
    await this.emitParticipantsAndStreamState(streamId);

    return {
      ok: true,
      actionId: action.id,
      expiresAt: action.expiresAt?.toISOString() ?? null,
    };
  }

  async unban(input: Omit<ActionInput, "durationSeconds">) {
    const { streamId, actorUserId, targetUserId } = input;

    await this.requireStreamHost(
      streamId,
      actorUserId,
      "Only the host can unban viewers",
    );

    const reason = this.normalizeReason(input.reason);

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.deleteMany({
        where: { streamId, userId: targetUserId, kind: "BAN" },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "UNBAN",
          targetUserId,
          actorUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "UNBAN",
      targetUserId,
      actorUserId,
      reason,
      durationSeconds: null,
      createdAt: action.createdAt.toISOString(),
    });

    return { ok: true };
  }

  async kick(input: ActionInput) {
    const { streamId, actorUserId, targetUserId } = input;

    const stream = await this.requireStream(streamId);
    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "KICK_VIEWER",
      "Only the host or authorized staff can kick viewers",
    );

    if (targetUserId === actorUserId) {
      throw new BadRequestException("Cannot kick yourself");
    }

    if (targetUserId === stream.hostUserId) {
      throw new ForbiddenException("Cannot kick the host");
    }

    const reason = this.normalizeReason(input.reason);
    const now = new Date();

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.upsert({
        where: {
          streamId_userId_kind: { streamId, userId: targetUserId, kind: "KICKED" },
        },
        create: {
          streamId,
          userId: targetUserId,
          kind: "KICKED",
          reason: reason ?? "Kicked from stream",
          expiresAt: null,
          createdByUserId: actorUserId,
        },
        update: {
          reason: reason ?? "Kicked from stream",
          expiresAt: null,
          createdByUserId: actorUserId,
        },
      });

      await tx.streamParticipant.updateMany({
        where: { streamId, userId: targetUserId, leftAt: null },
        data: { leftAt: now },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "KICK",
          targetUserId,
          actorUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "KICK",
      targetUserId,
      actorUserId,
      reason,
      durationSeconds: null,
      createdAt: action.createdAt.toISOString(),
    });

    this.emitParticipantRemoved({
      streamId,
      userId: targetUserId,
      action: "KICK",
      actionId: action.id,
    });

    this.clearStreamGuestMediaState(streamId, targetUserId);

    await this.disconnectUserFromStream(
      streamId,
      targetUserId,
      "You were kicked from this stream and cannot return until it restarts.",
      "KICKED_FROM_STREAM",
      {
        actionId: action.id,
        expiresAt: null,
        durationSeconds: null,
        durationLabel: "Current stream",
      },
    );

    await this.disconnectLiveKitParticipantFromStream(streamId, targetUserId);
    await this.emitParticipantsAndStreamState(streamId);

    return {
      ok: true,
      actionId: action.id,
      expiresAt: null,
    };
  }

  async adminMute(input: AdminActionInput) {
    const { streamId, actorAdminUserId, targetUserId } = input;

    const stream = await this.requireStream(streamId);
    await this.requireAdmin(actorAdminUserId);

    if (targetUserId === stream.hostUserId) {
      throw new ForbiddenException("Cannot mute the host");
    }

    const reason = this.normalizeReason(input.reason);
    const expiresAt = this.computeExpires(input.durationSeconds);

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.upsert({
        where: {
          streamId_userId_kind: { streamId, userId: targetUserId, kind: "MUTE" },
        },
        create: {
          streamId,
          userId: targetUserId,
          kind: "MUTE",
          reason,
          expiresAt,
          createdByAdminUserId: actorAdminUserId,
        },
        update: {
          reason,
          expiresAt,
          createdByUserId: null,
          createdByAdminUserId: actorAdminUserId,
        },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "MUTE",
          targetUserId,
          actorUserId: null,
          actorAdminUserId,
          reason,
          durationSeconds: input.durationSeconds ?? null,
          expiresAt,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "MUTE",
      targetUserId,
      actorUserId: this.adminRealtimeActorId(actorAdminUserId),
      reason,
      durationSeconds: input.durationSeconds ?? null,
      createdAt: action.createdAt.toISOString(),
    });

    this.realtime.emitTimeoutStarted({
      userId: targetUserId,
      streamId,
      expiresAt: action.expiresAt ? action.expiresAt.toISOString() : null,
      remainingSeconds: this.remainingSecondsFromExpiresAt(action.expiresAt),
      message: "You have been timed out.",
    });

    return {
      ok: true,
      actionId: action.id,
      expiresAt: action.expiresAt?.toISOString() ?? null,
    };
  }

  async adminUnmute(input: Omit<AdminActionInput, "durationSeconds">) {
    const { streamId, actorAdminUserId, targetUserId } = input;

    await this.requireStream(streamId);
    await this.requireAdmin(actorAdminUserId);

    const reason = this.normalizeReason(input.reason);

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.deleteMany({
        where: { streamId, userId: targetUserId, kind: "MUTE" },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "UNMUTE",
          targetUserId,
          actorUserId: null,
          actorAdminUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "UNMUTE",
      targetUserId,
      actorUserId: this.adminRealtimeActorId(actorAdminUserId),
      reason,
      durationSeconds: null,
      createdAt: action.createdAt.toISOString(),
    });

    this.realtime.emitTimeoutCleared({
      userId: targetUserId,
      streamId,
      message: "Your timeout has been lifted.",
    });

    return { ok: true };
  }

  async adminBan(input: AdminActionInput) {
    const { streamId, actorAdminUserId, targetUserId } = input;

    const stream = await this.requireStream(streamId);
    await this.requireAdmin(actorAdminUserId);

    if (targetUserId === stream.hostUserId) {
      throw new ForbiddenException("Cannot ban the host");
    }

    const reason = this.normalizeReason(input.reason);
    const expiresAt = this.computeExpires(input.durationSeconds);
    const now = new Date();

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.upsert({
        where: {
          streamId_userId_kind: { streamId, userId: targetUserId, kind: "BAN" },
        },
        create: {
          streamId,
          userId: targetUserId,
          kind: "BAN",
          reason,
          expiresAt,
          createdByAdminUserId: actorAdminUserId,
        },
        update: {
          reason,
          expiresAt,
          createdByUserId: null,
          createdByAdminUserId: actorAdminUserId,
        },
      });

      await tx.streamParticipant.updateMany({
        where: { streamId, userId: targetUserId, leftAt: null },
        data: { leftAt: now },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "BAN",
          targetUserId,
          actorUserId: null,
          actorAdminUserId,
          reason,
          durationSeconds: input.durationSeconds ?? null,
          expiresAt,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "BAN",
      targetUserId,
      actorUserId: this.adminRealtimeActorId(actorAdminUserId),
      reason,
      durationSeconds: input.durationSeconds ?? null,
      createdAt: action.createdAt.toISOString(),
    });

    this.emitParticipantRemoved({
      streamId,
      userId: targetUserId,
      action: "BAN",
      actionId: action.id,
    });

    this.clearStreamGuestMediaState(streamId, targetUserId);

    await this.disconnectUserFromStream(
      streamId,
      targetUserId,
      action.expiresAt
        ? `You were banned from this stream until ${action.expiresAt.toISOString()}.`
        : "You were permanently banned from this stream.",
      "BANNED_FROM_STREAM",
      {
        actionId: action.id,
        expiresAt: action.expiresAt ? action.expiresAt.toISOString() : null,
        durationSeconds: input.durationSeconds ?? null,
        durationLabel: input.durationLabel ?? null,
      },
    );

    await this.disconnectLiveKitParticipantFromStream(streamId, targetUserId);
    await this.emitParticipantsAndStreamState(streamId);

    return {
      ok: true,
      actionId: action.id,
      expiresAt: action.expiresAt?.toISOString() ?? null,
    };
  }

  async adminPlatformBan(input: AdminPlatformBanInput) {
    const { actorAdminUserId, targetUserId } = input;

    await this.requireAdmin(actorAdminUserId);

    const targetUser = await this.requireUser(targetUserId);
    const liveHostStream = await this.getActiveHostedStream(targetUserId);

    const reason = this.normalizeReason(input.reason);
    if (!reason) {
      throw new BadRequestException("Ban reason is required");
    }

    const expiresAt = this.computeExpires(input.durationSeconds);
    const bannedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          isPlatformBanned: true,
          platformBanIssuedAt: bannedAt,
          platformBanExpiresAt: expiresAt,
          platformBanReason: reason,
          platformBannedByAdminUserId: actorAdminUserId,
          forceLogoutAt: bannedAt,
        } as any,
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: targetUserId,
          revokedAt: null,
        },
        data: {
          revokedAt: bannedAt,
        },
      });

      await tx.moderationAction.create({
        data: {
          ...(liveHostStream?.id ? { streamId: liveHostStream.id } : {}),
          action: "USER_BAN" as any,
          targetUserId,
          actorUserId: null,
          actorAdminUserId,
          reason,
          durationSeconds: input.durationSeconds ?? null,
          expiresAt,
        } as any,
      });
    });

    const globalBanPayload = {
      userId: targetUserId,
      reason,
      bannedAt: bannedAt.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      bannedByAdminUserId: actorAdminUserId,
      activeStreamId: liveHostStream?.id ?? null,
    };

    const displayName =
      targetUser.profile?.displayName?.trim() || targetUser.username;

    this.realtime.emitUserGloballyBanned(globalBanPayload);

    await this.realtime.broadcastSystemChatToAllLiveStreams({
      text: this.formatPlatformBanChatText(displayName, reason),
      kind: "ban_notice",
      severity: "danger",
      createdAt: bannedAt.toISOString(),
    });

    if (liveHostStream?.id) {
      await this.streams.endStreamAsAdmin(
        liveHostStream.id,
        actorAdminUserId,
        `Host account banned. ${reason}`,
      );
    }

    this.realtime.disconnectUserEverywhere(
      targetUserId,
      `Your account was banned. Reason: ${reason}`,
      250,
    );

    return {
      ok: true,
      targetUserId,
      activeStreamId: liveHostStream?.id ?? null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
  }

  async adminPlatformUnban(input: AdminPlatformUnbanInput) {
    const { actorAdminUserId, targetUserId } = input;

    await this.requireAdmin(actorAdminUserId);
    await this.requireUser(targetUserId);

    const reason = this.normalizeReason(input.reason);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          isPlatformBanned: false,
          platformBanIssuedAt: null,
          platformBanExpiresAt: null,
          platformBanReason: null,
          platformBannedByAdminUserId: null,
          forceLogoutAt: null,
        } as any,
      });

      await tx.moderationAction.create({
        data: {
          action: "USER_UNBAN" as any,
          targetUserId,
          actorUserId: null,
          actorAdminUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        } as any,
      });
    });

    this.realtime.server.to(`user:${targetUserId}`).emit("user.globally.unbanned", {
      userId: targetUserId,
      unbannedAt: now.toISOString(),
      reason: reason ?? null,
      unbannedByAdminUserId: actorAdminUserId,
    });

    return { ok: true, targetUserId };
  }

  async adminUnban(input: Omit<AdminActionInput, "durationSeconds">) {
    const { streamId, actorAdminUserId, targetUserId } = input;

    await this.requireStream(streamId);
    await this.requireAdmin(actorAdminUserId);

    const reason = this.normalizeReason(input.reason);

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.deleteMany({
        where: { streamId, userId: targetUserId, kind: "BAN" },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "UNBAN",
          targetUserId,
          actorUserId: null,
          actorAdminUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "UNBAN",
      targetUserId,
      actorUserId: this.adminRealtimeActorId(actorAdminUserId),
      reason,
      durationSeconds: null,
      createdAt: action.createdAt.toISOString(),
    });

    return { ok: true };
  }

  async adminKick(input: AdminActionInput) {
    const { streamId, actorAdminUserId, targetUserId } = input;

    const stream = await this.requireStream(streamId);
    await this.requireAdmin(actorAdminUserId);

    if (targetUserId === stream.hostUserId) {
      throw new ForbiddenException("Cannot kick the host");
    }

    const reason = this.normalizeReason(input.reason);
    const now = new Date();

    const action = await this.prisma.$transaction(async (tx) => {
      await tx.streamUserRestriction.upsert({
        where: {
          streamId_userId_kind: { streamId, userId: targetUserId, kind: "KICKED" },
        },
        create: {
          streamId,
          userId: targetUserId,
          kind: "KICKED",
          reason: reason ?? "Kicked from stream",
          expiresAt: null,
          createdByAdminUserId: actorAdminUserId,
        },
        update: {
          reason: reason ?? "Kicked from stream",
          expiresAt: null,
          createdByUserId: null,
          createdByAdminUserId: actorAdminUserId,
        },
      });

      await tx.streamParticipant.updateMany({
        where: { streamId, userId: targetUserId, leftAt: null },
        data: { leftAt: now },
      });

      return tx.moderationAction.create({
        data: {
          streamId,
          action: "KICK",
          targetUserId,
          actorUserId: null,
          actorAdminUserId,
          reason,
          durationSeconds: null,
          expiresAt: null,
        },
      });
    });

    this.emitModerationAction({
      streamId,
      actionId: action.id,
      action: "KICK",
      targetUserId,
      actorUserId: this.adminRealtimeActorId(actorAdminUserId),
      reason,
      durationSeconds: null,
      createdAt: action.createdAt.toISOString(),
    });

    this.emitParticipantRemoved({
      streamId,
      userId: targetUserId,
      action: "KICK",
      actionId: action.id,
    });

    this.clearStreamGuestMediaState(streamId, targetUserId);

    await this.disconnectUserFromStream(
      streamId,
      targetUserId,
      "You were kicked from this stream and cannot return until it restarts.",
      "KICKED_FROM_STREAM",
      {
        actionId: action.id,
        expiresAt: null,
        durationSeconds: null,
        durationLabel: "Current stream",
      },
    );

    await this.disconnectLiveKitParticipantFromStream(streamId, targetUserId);
    await this.emitParticipantsAndStreamState(streamId);

    return {
      ok: true,
      actionId: action.id,
      expiresAt: null,
    };
  }

  async getAdminActionsFeed(
    adminUserId: string,
    options: AdminModerationActionsQueryDto = {},
  ) {
    const admin = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(
      admin.role as AdminRole,
    );

    const page = this.normalizePage(options.page, 1);
    const pageSize = this.normalizePageSize(options.pageSize, 25);
    const search = String(options.search || "").trim();
    const streamId = String(options.streamId || "").trim();
    const actionValue = String(options.action || "").trim().toUpperCase();

    const where: Prisma.ModerationActionWhereInput = {};

    if (streamId) {
      where.streamId = streamId;
    }

    if (actionValue) {
      where.action = actionValue as ModerationActionType;
    }

    if (search) {
      where.OR = [
        {
          actor: {
            is: {
              username: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          actor: {
            is: {
              profile: {
                is: {
                  displayName: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        },
        {
          actorAdminUser: {
            is: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          actorAdminUser: {
            is: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          target: {
            is: {
              username: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          target: {
            is: {
              profile: {
                is: {
                  displayName: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        },
        {
          stream: {
            is: {
              title: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];

      if (!canViewRealStaffIdentity && Array.isArray(where.OR)) {
        where.OR = where.OR.filter(
          (clause: any) => !Object.prototype.hasOwnProperty.call(clause, "actorAdminUser"),
        );
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.moderationAction.count({ where }),
      this.prisma.moderationAction.findMany({
        where,
        include: {
          actor: {
            include: { profile: true },
          },
          actorAdminUser: true,
          target: {
            include: { profile: true },
          },
          stream: {
            include: {
              host: {
                include: { profile: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((item) =>
        this.mapAdminAction(item, canViewRealStaffIdentity),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getActiveRestrictions(
    adminUserId: string,
    options: AdminModerationRestrictionsQueryDto = {},
  ) {
    const admin = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(
      admin.role as AdminRole,
    );

    const page = this.normalizePage(options.page, 1);
    const pageSize = this.normalizePageSize(options.pageSize, 25);
    const search = String(options.search || "").trim();
    const streamId = String(options.streamId || "").trim();
    const kindValue = String(options.kind || "").trim().toUpperCase();

    const where: Prisma.StreamUserRestrictionWhereInput = {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    if (streamId) {
      where.streamId = streamId;
    }

    if (kindValue) {
      where.kind = kindValue as RestrictionKind;
    }

    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
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
                  profile: {
                    is: {
                      displayName: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              },
            },
            {
              createdBy: {
                is: {
                  username: { contains: search, mode: "insensitive" },
                },
              },
            },
            {
              createdBy: {
                is: {
                  profile: {
                    is: {
                      displayName: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              },
            },
            {
              createdByAdminUser: {
                is: {
                  email: { contains: search, mode: "insensitive" },
                },
              },
            },
            {
              createdByAdminUser: {
                is: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            },
            {
              stream: {
                is: {
                  title: { contains: search, mode: "insensitive" },
                },
              },
            },
          ],
        },
      ];

      if (!canViewRealStaffIdentity && Array.isArray(where.AND)) {
        for (const clause of where.AND as any[]) {
          if (Array.isArray(clause.OR)) {
            clause.OR = clause.OR.filter(
              (item: any) =>
                !Object.prototype.hasOwnProperty.call(item, "createdByAdminUser"),
            );
          }
        }
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.streamUserRestriction.count({ where }),
      this.prisma.streamUserRestriction.findMany({
        where,
        include: {
          user: {
            include: { profile: true },
          },
          createdBy: {
            include: { profile: true },
          },
          createdByAdminUser: true,
          stream: {
            include: {
              host: {
                include: { profile: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((item) =>
        this.mapRestriction(item, canViewRealStaffIdentity),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getAdminUserHistory(
    adminUserId: string,
    targetUserId: string,
    options: AdminModerationHistoryQueryDto = {},
  ) {
    const admin = await this.requireAdmin(adminUserId);
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(
      admin.role as AdminRole,
    );

    const page = this.normalizePage(options.page, 1);
    const pageSize = this.normalizePageSize(options.pageSize, 20);

    const [user, total, actions, activeRestrictions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { profile: true },
      }),
      this.prisma.moderationAction.count({
        where: { targetUserId },
      }),
      this.prisma.moderationAction.findMany({
        where: { targetUserId },
        include: {
          actor: {
            include: { profile: true },
          },
          actorAdminUser: true,
          target: {
            include: { profile: true },
          },
          stream: {
            include: {
              host: {
                include: { profile: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.streamUserRestriction.findMany({
        where: {
          userId: targetUserId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          user: {
            include: { profile: true },
          },
          createdBy: {
            include: { profile: true },
          },
          createdByAdminUser: true,
          stream: {
            include: {
              host: {
                include: { profile: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      user: this.mapAdminUser(user),
      actions: actions.map((action) =>
        this.mapAdminAction(action, canViewRealStaffIdentity),
      ),
      activeRestrictions: activeRestrictions.map((restriction) =>
        this.mapRestriction(restriction, canViewRealStaffIdentity),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}

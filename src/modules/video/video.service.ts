import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma, StreamRole } from "@prisma/client";

import { SystemLogEventsService } from "../api-observability/system-log-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { LiveKitAdapter } from "./providers/livekit.adapter";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import type { StreamTokenJoinMode, VideoActivePublisher, VideoRole, VideoTokenResponse } from "./video.types";

@Injectable()
export class VideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly systemLogEvents: SystemLogEventsService,
    private readonly realtime: RealtimeGateway,
  ) { }

  private writeLiveKitLog(params: {
    level: "INFO" | "WARN" | "ERROR";
    category: string;
    message: string;
    streamId?: string | null;
    roomName?: string | null;
    userId?: string | null;
    detailsJson?: Prisma.InputJsonValue;
  }) {
    void this.systemLogEvents.write({
      source: "LIVEKIT",
      level: params.level,
      category: params.category,
      message: params.message,
      streamId: params.streamId ?? null,
      roomName: params.roomName ?? null,
      userId: params.userId ?? null,
      ...(params.detailsJson !== undefined
        ? { detailsJson: params.detailsJson }
        : {}),
    });
  }

  private getLiveKitAdapter(): LiveKitAdapter {
    const url = (this.config.get<string>("LIVEKIT_PUBLIC_URL") || "").trim();
    const key = (this.config.get<string>("LIVEKIT_API_KEY") || "").trim();
    const secret = (this.config.get<string>("LIVEKIT_API_SECRET") || "").trim();

    if (!url || !key || !secret) {
      this.writeLiveKitLog({
        level: "ERROR",
        category: "CONFIG",
        message:
          "LiveKit is not configured. Set LIVEKIT_PUBLIC_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.",
        detailsJson: {
          hasUrl: Boolean(url),
          hasKey: Boolean(key),
          hasSecret: Boolean(secret),
        },
      });

      throw new ServiceUnavailableException(
        "LiveKit is not configured. Set LIVEKIT_PUBLIC_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.",
      );
    }

    return new LiveKitAdapter(url, key, secret);
  }

  private roomName(streamId: string) {
    return `stream-${streamId}`;
  }

  

  private battleRoomName(battleSessionId: string) {
    return `battle-${battleSessionId}`;
  }
private toVideoRole(role: StreamRole): VideoRole {
    return role as unknown as VideoRole;
  }

  private normalizeDeviceSessionId(value: unknown, userId: string): string {
    const raw = String(value ?? "").trim();
    const safe = raw.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 120);
    return safe || `legacy-${String(userId || "unknown").slice(0, 8)}`;
  }

  private normalizeJoinMode(value: unknown): StreamTokenJoinMode | null {
    const normalized = String(value ?? "").trim().toLowerCase();

    if (normalized === "publisher") return "publisher";
    if (normalized === "owner_viewer") return "owner_viewer";
    if (normalized === "viewer") return "viewer";

    return null;
  }

  private buildStableVideoIdentity(userId: string): string {
    return `user:${userId}`;
  }

  private buildPublisherVideoIdentity(streamId: string, userId: string, deviceSessionId: string): string {
    return `stream-publisher:${streamId}:${userId}:${deviceSessionId}`;
  }

  private buildOwnerViewerVideoIdentity(streamId: string, userId: string, deviceSessionId: string): string {
    return `stream-owner-viewer:${streamId}:${userId}:${deviceSessionId}`;
  }

  private buildPublisherSessionId(streamId: string, userId: string, deviceSessionId: string): string {
    return `${streamId}:${userId}:${deviceSessionId}`;
  }

  private activePublisherPayload(stream: any): VideoActivePublisher | null {
    const userId = String(stream?.activePublisherUserId ?? "").trim();
    const deviceSessionId = String(stream?.activePublisherDeviceId ?? "").trim();
    const participantIdentity = String(stream?.activePublisherIdentity ?? "").trim();
    const sessionId = String(stream?.activePublisherSessionId ?? "").trim();

    if (!userId && !deviceSessionId && !participantIdentity && !sessionId) {
      return null;
    }

    const transferredAt =
      stream?.activePublisherTransferredAt instanceof Date
        ? stream.activePublisherTransferredAt.toISOString()
        : typeof stream?.activePublisherTransferredAt === "string"
          ? stream.activePublisherTransferredAt
          : null;

    return {
      userId: userId || null,
      deviceSessionId: deviceSessionId || null,
      participantIdentity: participantIdentity || null,
      sessionId: sessionId || null,
      tokenVersion: Number(stream?.activePublisherTokenVersion ?? 0),
      transferredAt,
    };
  }

  private isSameActivePublisher(
    activePublisher: VideoActivePublisher | null,
    userId: string,
    deviceSessionId: string,
    identity: string,
  ) {
    return (
      activePublisher?.userId === userId &&
      activePublisher?.deviceSessionId === deviceSessionId &&
      activePublisher?.participantIdentity === identity
    );
  }

  private buildAdminObserverIdentity(adminUserId: string, streamId: string): string {
    return `admin-observer:${adminUserId}:${streamId}`;
  }

  private async assertNotPlatformBanned(userId: string) {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;

    if (!user?.isPlatformBanned) return;

    const expiresAt = user.platformBanExpiresAt instanceof Date ? user.platformBanExpiresAt : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return;
    }

    const reason =
      typeof user.platformBanReason === "string" && user.platformBanReason.trim()
        ? user.platformBanReason
        : null;

    throw new ForbiddenException({
      message: reason ? `Account banned: ${reason}` : "Account banned.",
      code: "ACCOUNT_BANNED",
      ban: {
        userId: user.id,
        reason,
        issuedAt:
          user.platformBanIssuedAt instanceof Date
            ? user.platformBanIssuedAt.toISOString()
            : null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      },
    });
  }

  private async isBlockedByHost(hostUserId: string, userId: string): Promise<boolean> {
    if (!hostUserId || !userId || hostUserId === userId) return false;

    const row = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: hostUserId,
          blockedId: userId,
        },
      },
    });

    return !!row;
  }

  private async isStreamBanned(streamId: string, userId: string): Promise<boolean> {
    const now = new Date();

    const row = await this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "BAN",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });

    return !!row;
  }

  private async isKickedFromStream(streamId: string, userId: string): Promise<boolean> {
    const row = await this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "KICKED",
      },
      select: { id: true },
    });

    return !!row;
  }

  private async getAssignedRole(streamId: string, userId: string): Promise<StreamRole | null> {
    const assigned = await this.prisma.streamUserRole.findUnique({
      where: { streamId_userId: { streamId, userId } },
      select: { role: true },
    });

    return assigned?.role ?? null;
  }

  private async ensureActiveParticipantForVideoToken(
    streamId: string,
    userId: string,
    role: StreamRole,
  ) {
    const updated = await this.prisma.streamParticipant.updateMany({
      where: {
        streamId,
        userId,
        leftAt: null,
      },
      data: { role },
    });

    if (updated.count === 0) {
      await this.prisma.streamParticipant.create({
        data: {
          streamId,
          userId,
          role,
        },
      });
    }
  }

  async issueStreamToken(params: {
    streamId: string;
    userId: string;
    deviceSessionId?: string;
    joinMode?: StreamTokenJoinMode | string | null;
    takeover?: boolean;
  }): Promise<VideoTokenResponse> {
    const streamId = String(params.streamId || "").trim();
    const userId = String(params.userId || "").trim();

    if (!streamId) {
      throw new NotFoundException("Stream not found");
    }

    if (!userId) {
      throw new ForbiddenException("Invalid user identity");
    }

    await this.assertNotPlatformBanned(userId);

    const stream = await (this.prisma as any).stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        status: true,
        hostUserId: true,
        videoRoomName: true,
        videoProvider: true,
        activePublisherUserId: true,
        activePublisherDeviceId: true,
        activePublisherIdentity: true,
        activePublisherSessionId: true,
        activePublisherTokenVersion: true,
        activePublisherTransferredAt: true,
      },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    if (stream.status !== "LIVE") {
      throw new ForbiddenException("Stream is not live");
    }

    const roomName = stream.videoRoomName || this.roomName(streamId);

    if (!stream.videoRoomName || !stream.videoProvider) {
      (this.prisma as any).stream
        .update({
          where: { id: streamId },
          data: {
            videoProvider: "LIVEKIT",
            videoRoomName: roomName,
          },
        })
        .catch((err: unknown) => console.error("Non-critical stream update failed:", err));
    }

    const isStreamOwner = stream.hostUserId === userId;
    const requestedJoinMode = this.normalizeJoinMode(params.joinMode);
    const deviceSessionId = this.normalizeDeviceSessionId(params.deviceSessionId, userId);
    const previousPublisher = this.activePublisherPayload(stream);

    let role: StreamRole;
    let tokenRole: StreamRole;
    let identity: string;
    let joinMode: StreamTokenJoinMode;
    let canPublish: boolean;
    let canPublishData: boolean;
    let ownerPromptRequired = false;
    let activePublisher = previousPublisher;

    if (isStreamOwner) {
      const hasDifferentActivePublisher =
        !!previousPublisher?.deviceSessionId &&
        previousPublisher.deviceSessionId !== deviceSessionId;

      const wantsOwnerViewer =
        requestedJoinMode === "owner_viewer" || requestedJoinMode === "viewer";

      const wantsPublisher =
        requestedJoinMode === "publisher" || params.takeover === true;

      const shouldPromptAsOwnerViewer =
        !requestedJoinMode && params.takeover !== true && hasDifferentActivePublisher;

      role = "HOST";

      if (wantsOwnerViewer || shouldPromptAsOwnerViewer) {
        tokenRole = "VIEWER";
        identity = this.buildOwnerViewerVideoIdentity(streamId, userId, deviceSessionId);
        joinMode = "owner_viewer";
        canPublish = false;
        canPublishData = false;
        ownerPromptRequired = shouldPromptAsOwnerViewer;
      } else {
        tokenRole = "HOST";
        identity = this.buildPublisherVideoIdentity(streamId, userId, deviceSessionId);
        joinMode = "publisher";
        canPublish = true;
        canPublishData = true;

        const nextTokenVersion = Number(stream.activePublisherTokenVersion ?? 0) + 1;
        const transferredAt = new Date();
        const sessionId = this.buildPublisherSessionId(streamId, userId, deviceSessionId);

        await (this.prisma as any).stream.update({
          where: { id: streamId },
          data: {
            activePublisherUserId: userId,
            activePublisherDeviceId: deviceSessionId,
            activePublisherIdentity: identity,
            activePublisherSessionId: sessionId,
            activePublisherTokenVersion: nextTokenVersion,
            activePublisherTransferredAt: transferredAt,
            videoProvider: "LIVEKIT",
            videoRoomName: roomName,
          },
        });

        activePublisher = {
          userId,
          deviceSessionId,
          participantIdentity: identity,
          sessionId,
          tokenVersion: nextTokenVersion,
          transferredAt: transferredAt.toISOString(),
        };

        const handoffReason = previousPublisher
          ? this.isSameActivePublisher(previousPublisher, userId, deviceSessionId, identity)
            ? "PUBLISHER_REFRESH"
            : "PUBLISHER_TAKEOVER"
          : "INITIAL_PUBLISHER";

        this.realtime.emitStreamPublisherChanged({
          streamId,
          hostUserId: userId,
          activePublisher: activePublisher as any,
          previousPublisher: previousPublisher as any,
          reason: handoffReason,
        });
      }
    } else {
      const [participant, assignedRole, blockedByHost, kickedFromStream, bannedFromStream] =
        await Promise.all([
          this.prisma.streamParticipant.findFirst({
            where: { streamId, userId, leftAt: null },
            select: { role: true },
          }),
          this.getAssignedRole(streamId, userId),
          this.isBlockedByHost(stream.hostUserId, userId),
          this.isKickedFromStream(streamId, userId),
          this.isStreamBanned(streamId, userId),
        ]);

      if (blockedByHost) {
        throw new ForbiddenException("Blocked by host");
      }

      if (kickedFromStream) {
        throw new ForbiddenException("Kicked from stream");
      }

      if (bannedFromStream) {
        throw new ForbiddenException("Banned");
      }

      role = participant?.role ?? assignedRole ?? "VIEWER";

      if (!participant) {
        await this.ensureActiveParticipantForVideoToken(streamId, userId, role);

        this.writeLiveKitLog({
          level: "INFO",
          category: "AUTO_JOIN_FOR_TOKEN",
          message: "Auto-created active stream participant before issuing video token.",
          streamId,
          roomName,
          userId,
          detailsJson: {
            role,
          },
        });
      }

      tokenRole = role;
      identity = this.buildStableVideoIdentity(userId);
      joinMode = "viewer";
      canPublish = role === "GUEST" || role === "MODERATOR";
      canPublishData = canPublish;
    }

    const adapter = this.getLiveKitAdapter();

    try {
      const tokenResponse = await adapter.getToken({
        streamId,
        userId,
        identity,
        role: this.toVideoRole(tokenRole),
        roomName,
        canPublish,
        canPublishData,
        metadata: {
          joinMode,
          isStreamOwner,
          deviceSessionId: isStreamOwner ? deviceSessionId : null,
          activePublisher,
          ownerPromptRequired,
        },
      });

      return {
        ...tokenResponse,
        identity,
        role: this.toVideoRole(tokenRole),
        canPublish,
        canPublishData,
        joinMode,
        isStreamOwner,
        ownerPromptRequired,
        activePublisher,
      };
    } catch (error) {
      this.writeLiveKitLog({
        level: "ERROR",
        category: "TOKEN_ISSUE",
        message:
          error instanceof Error
            ? error.message
            : "Failed to issue LiveKit stream token.",
        streamId,
        roomName,
        userId,
        detailsJson: {
          identity,
          role,
          tokenRole,
          joinMode,
          canPublish,
          deviceSessionId: isStreamOwner ? deviceSessionId : null,
          ownerPromptRequired,
          activePublisher,
        },
      });

      throw error;
    }
  }

  async issueBattleSessionToken(params: {
    battleSessionId: string;
    userId: string;
  }): Promise<VideoTokenResponse> {
    const battleSessionId = String(params.battleSessionId || "").trim();
    const userId = String(params.userId || "").trim();

    if (!battleSessionId) {
      throw new NotFoundException("Battle session not found");
    }

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    await this.assertNotPlatformBanned(userId);

    const battle = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: {
        sides: {
          include: {
            participants: true,
            stream: {
              select: {
                id: true,
                status: true,
                hostUserId: true,
                endedAt: true,
              },
            },
          },
        },
        participants: true,
      },
    });

    if (!battle) {
      throw new NotFoundException("Battle session not found");
    }

    const status = String(battle.status || "").toUpperCase();
    const mediaStatuses = new Set(["ACTIVE", "SUDDEN_DEATH", "REMATCH_ACTIVE", "COOLDOWN"]);

    if (!mediaStatuses.has(status)) {
      throw new ForbiddenException("Battle is not active");
    }

    const sides = Array.isArray(battle.sides) ? battle.sides : [];
    const participants = Array.isArray(battle.participants) ? battle.participants : [];

    const sideStreamIds: string[] = Array.from(
      new Set<string>(
        sides
          .map((side: any) => String(side?.streamId || "").trim())
          .filter((streamId: string): streamId is string => !!streamId),
      ),
    );

    const primaryStreamId = sideStreamIds[0] || battleSessionId;

    const isSideHost = sides.some((side: any) => String(side?.hostUserId || "") === userId);
    const isBattleParticipant =
      participants.some((participant: any) => {
        return (
          String(participant?.userId || "") === userId &&
          String(participant?.status || "").toUpperCase() === "ACCEPTED" &&
          !participant?.leftAt
        );
      }) ||
      sides.some((side: any) => {
        return (side?.participants || []).some((participant: any) => {
          return (
            String(participant?.userId || "") === userId &&
            String(participant?.status || "").toUpperCase() === "ACCEPTED" &&
            !participant?.leftAt
          );
        });
      });

    let isViewerOfBattleStream = false;

    if (!isSideHost && !isBattleParticipant && sideStreamIds.length > 0) {
      const streamParticipant = await (this.prisma as any).streamParticipant.findFirst({
        where: {
          streamId: { in: sideStreamIds },
          userId,
          leftAt: null,
        },
        select: { id: true },
      });

      isViewerOfBattleStream = !!streamParticipant;
    }

    if (!isSideHost && !isBattleParticipant && !isViewerOfBattleStream) {
      throw new ForbiddenException("Join one of the battle streams first");
    }

    const canPublish = (isSideHost || isBattleParticipant) && status !== "COOLDOWN";
    const roomName = this.battleRoomName(battleSessionId);
    const adapter = this.getLiveKitAdapter();
    const identity = this.buildStableVideoIdentity(userId);
    const role = (canPublish ? "HOST" : "VIEWER") as VideoRole;

    try {
      return await adapter.getToken({
        streamId: primaryStreamId,
        userId,
        identity,
        role,
        roomName,
      });
    } catch (error) {
      this.writeLiveKitLog({
        level: "ERROR",
        category: "BATTLE_TOKEN_ISSUE",
        message:
          error instanceof Error
            ? error.message
            : "Failed to issue LiveKit battle token.",
        streamId: primaryStreamId || null,
        roomName,
        userId,
        detailsJson: {
          battleSessionId,
          role,
          canPublish,
          sideStreamIds,
        },
      });

      throw error;
    }
  }


  async issueBattleOpponentStreamToken(params: {
    battleSessionId: string;
    targetStreamId: string;
    userId: string;
  }): Promise<VideoTokenResponse> {
    const battleSessionId = String(params.battleSessionId || "").trim();
    const targetStreamId = String(params.targetStreamId || "").trim();
    const userId = String(params.userId || "").trim();

    if (!battleSessionId) {
      throw new NotFoundException("Battle session not found");
    }

    if (!targetStreamId) {
      throw new NotFoundException("Target stream not found");
    }

    if (!userId) {
      throw new ForbiddenException("Missing user");
    }

    await this.assertNotPlatformBanned(userId);

    const battle = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: {
        sides: {
          include: {
            stream: {
              select: {
                id: true,
                status: true,
                hostUserId: true,
                videoRoomName: true,
                videoProvider: true,
                endedAt: true,
              },
            },
            participants: true,
          },
        },
        participants: true,
      },
    });

    if (!battle) {
      throw new NotFoundException("Battle session not found");
    }

    const status = String(battle.status || "").toUpperCase();
    const mediaStatuses = new Set(["ACTIVE", "SUDDEN_DEATH", "REMATCH_ACTIVE", "COOLDOWN"]);

    if (!mediaStatuses.has(status)) {
      throw new ForbiddenException("Battle is not active");
    }

    const sides = Array.isArray(battle.sides) ? battle.sides : [];
    const participants = Array.isArray(battle.participants) ? battle.participants : [];

    const sideStreamIds: string[] = Array.from(
      new Set<string>(
        sides
          .map((side: any) => String(side?.streamId || "").trim())
          .filter((streamId: string): streamId is string => !!streamId),
      ),
    );

    const targetSide = sides.find((side: any) => {
      return String(side?.streamId || "").trim() === targetStreamId;
    });

    const targetStream = targetSide?.stream;

    if (!targetSide || !targetStream) {
      throw new ForbiddenException("Target stream is not part of this battle");
    }

    if (String(targetStream.status || "").toUpperCase() !== "LIVE") {
      throw new ForbiddenException("Target stream is not live");
    }

    const isSideHost = sides.some((side: any) => String(side?.hostUserId || "") === userId);
    const isBattleParticipant =
      participants.some((participant: any) => {
        return (
          String(participant?.userId || "") === userId &&
          String(participant?.status || "").toUpperCase() === "ACCEPTED" &&
          !participant?.leftAt
        );
      }) ||
      sides.some((side: any) => {
        return (side?.participants || []).some((participant: any) => {
          return (
            String(participant?.userId || "") === userId &&
            String(participant?.status || "").toUpperCase() === "ACCEPTED" &&
            !participant?.leftAt
          );
        });
      });

    let isViewerOfBattleStream = false;

    if (!isSideHost && !isBattleParticipant && sideStreamIds.length > 0) {
      const streamParticipant = await (this.prisma as any).streamParticipant.findFirst({
        where: {
          streamId: { in: sideStreamIds },
          userId,
          leftAt: null,
        },
        select: { id: true },
      });

      isViewerOfBattleStream = !!streamParticipant;
    }

    if (!isSideHost && !isBattleParticipant && !isViewerOfBattleStream) {
      throw new ForbiddenException("Join one of the battle streams first");
    }

    if (targetStream.hostUserId !== userId) {
      const [blockedByTargetHost, kickedFromTargetStream, bannedFromTargetStream] =
        await Promise.all([
          this.isBlockedByHost(targetStream.hostUserId, userId),
          this.isKickedFromStream(targetStream.id, userId),
          this.isStreamBanned(targetStream.id, userId),
        ]);

      if (blockedByTargetHost) {
        throw new ForbiddenException("Blocked by host");
      }

      if (kickedFromTargetStream) {
        throw new ForbiddenException("Kicked from stream");
      }

      if (bannedFromTargetStream) {
        throw new ForbiddenException("Banned");
      }
    }

    const roomName = targetStream.videoRoomName || this.roomName(targetStream.id);

    if (!targetStream.videoRoomName || !targetStream.videoProvider) {
      this.prisma.stream
        .update({
          where: { id: targetStream.id },
          data: {
            videoProvider: "LIVEKIT",
            videoRoomName: roomName,
          },
        })
        .catch((err) => console.error("Non-critical stream update failed:", err));
    }

    const adapter = this.getLiveKitAdapter();
    const identity = this.buildStableVideoIdentity(userId);
    const role = "VIEWER" as VideoRole;

    try {
      return await adapter.getToken({
        streamId: targetStream.id,
        userId,
        identity,
        role,
        roomName,
      });
    } catch (error) {
      this.writeLiveKitLog({
        level: "ERROR",
        category: "BATTLE_OPPONENT_STREAM_TOKEN_ISSUE",
        message:
          error instanceof Error
            ? error.message
            : "Failed to issue LiveKit opponent stream token.",
        streamId: targetStream.id,
        roomName,
        userId,
        detailsJson: {
          battleSessionId,
          targetStreamId,
          sideStreamIds,
        },
      });

      throw error;
    }
  }

  async issueAdminObserverToken(params: {
    streamId: string;
    adminUserId: string;
  }): Promise<VideoTokenResponse> {
    const streamId = String(params.streamId || "").trim();
    const adminUserId = String(params.adminUserId || "").trim();

    if (!streamId) {
      throw new NotFoundException("Stream not found");
    }

    if (!adminUserId) {
      throw new ForbiddenException("Invalid admin identity");
    }

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        status: true,
        videoRoomName: true,
        videoProvider: true,
      },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    if (stream.status !== "LIVE") {
      throw new ForbiddenException("Stream is not live");
    }

    const roomName = stream.videoRoomName || this.roomName(streamId);

    if (!stream.videoRoomName || !stream.videoProvider) {
      this.prisma.stream
        .update({
          where: { id: streamId },
          data: {
            videoProvider: "LIVEKIT",
            videoRoomName: roomName,
          },
        })
        .catch((err) => console.error("Non-critical stream update failed:", err));
    }

    const adapter = this.getLiveKitAdapter();
    const identity = this.buildAdminObserverIdentity(adminUserId, streamId);
    const role = "VIEWER" as VideoRole;

    try {
      return await adapter.getToken({
        streamId,
        userId: adminUserId,
        identity,
        role,
        roomName,
      });
    } catch (error) {
      this.writeLiveKitLog({
        level: "ERROR",
        category: "ADMIN_OBSERVER_TOKEN_ISSUE",
        message:
          error instanceof Error
            ? error.message
            : "Failed to issue LiveKit admin observer token.",
        streamId,
        roomName,
        userId: adminUserId,
        detailsJson: {
          identity,
          role,
        },
      });

      throw error;
    }
  }
}

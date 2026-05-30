import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationsService } from "../notifications/notifications.service";
import { RoomServiceClient } from "livekit-server-sdk";
import type { Prisma, StreamVisibility, StreamRole } from "@prisma/client";
import { UpdateGuestMediaDto } from "./dto/update-guest-media.dto";
import { StreamStaffService } from "../stream-staff/stream-staff.service";
import { LiveKitAdapter } from "../video/providers/livekit.adapter";
import type { VideoTokenResponse } from "../video/video.types";

type StreamLeaderboardPeriod = "stream" | "daily" | "weekly" | "monthly" | "alltime";

const parseMsEnv = (name: string, fallbackMs: number, minMs = 0) => {
  const raw = process.env[name];
  const parsed = raw === undefined || raw === null || String(raw).trim() === ""
    ? NaN
    : Number(raw);

  const safe = Number.isFinite(parsed) ? parsed : fallbackMs;

  return Math.max(minMs, safe);
};

const isLiveKitRoomMissingError = (error: unknown) => {
  const code = String((error as any)?.code ?? "").toLowerCase();
  const message = String((error as any)?.message ?? "").toLowerCase();

  return code === "not_found" || message.includes("requested room does not exist");
};

const HOST_GHOST_SWEEP_GRACE_MS = parseMsEnv(
  "STREAM_HOST_GHOST_SWEEP_GRACE_MS",
  20_000,
);

const GUEST_GHOST_SWEEP_GRACE_MS = parseMsEnv(
  "STREAM_GUEST_GHOST_SWEEP_GRACE_MS",
  10_000,
);

const STREAM_GHOST_SWEEP_INTERVAL_MS = parseMsEnv(
  "STREAM_GHOST_SWEEP_INTERVAL_MS",
  5_000,
  5_000,
);

const HOST_GHOST_STARTUP_GRACE_MS = parseMsEnv(
  "STREAM_HOST_GHOST_STARTUP_GRACE_MS",
  HOST_GHOST_SWEEP_GRACE_MS + STREAM_GHOST_SWEEP_INTERVAL_MS,
  HOST_GHOST_SWEEP_GRACE_MS,
);

@Injectable()
export class StreamsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamsService.name);
  private ghostSweepTimer: NodeJS.Timeout | null = null;
  private ghostSweepRunning = false;
  private normalizeStreamCategoryLookupValue(value: unknown) {
    return String(value ?? "").trim();
  }

  private buildStreamCategorySlug(value: unknown) {
    return this.normalizeStreamCategoryLookupValue(value)
      .toLowerCase()
      .replace(/[_\s]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private async resolveStreamCategoryForCreate(input: {
    streamCategoryId?: string | null;
    categorySlug?: string | null;
    categoryName?: string | null;
    streamCategorySlug?: string | null;
    streamCategoryName?: string | null;
    tags?: unknown;
  }) {
    const id = this.normalizeStreamCategoryLookupValue(input.streamCategoryId);
    const slug = this.buildStreamCategorySlug(input.categorySlug ?? input.streamCategorySlug);
    const name = this.normalizeStreamCategoryLookupValue(input.categoryName ?? input.streamCategoryName);

    const tagValues = Array.isArray(input.tags)
      ? input.tags.map((tag) => this.normalizeStreamCategoryLookupValue(tag)).filter(Boolean)
      : [];

    const tagSlugValues = tagValues
      .map((tag) => this.buildStreamCategorySlug(tag))
      .filter(Boolean);

    const or: any[] = [];

    if (id) or.push({ id });
    if (slug) or.push({ slug });
    if (name) or.push({ name: { equals: name, mode: "insensitive" } });

    for (const tag of tagValues) {
      or.push({ name: { equals: tag, mode: "insensitive" } });
    }

    for (const tagSlug of tagSlugValues) {
      or.push({ slug: tagSlug });
    }

    if (or.length === 0) {
      return null;
    }

    return (this.prisma as any).streamCategory.findFirst({
      where: {
        isEnabled: true,
        OR: or,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  private mergeStreamCategoryTags(tags: unknown, category: any) {
    const values = Array.isArray(tags)
      ? tags.map((tag) => String(tag ?? "").trim()).filter(Boolean)
      : [];

    const next = [...values];

    for (const value of [category?.name, category?.slug]) {
      const normalized = String(value ?? "").trim();
      if (!normalized) continue;

      if (!next.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
        next.push(normalized);
      }
    }

    return Array.from(new Set(next)).slice(0, 12);
  }


  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
    private readonly streamStaff: StreamStaffService,
  ) { }

  onModuleInit() {
    this.logger.log(
      `Stream ghost cleanup started intervalMs=${STREAM_GHOST_SWEEP_INTERVAL_MS} hostGraceMs=${HOST_GHOST_SWEEP_GRACE_MS} guestGraceMs=${GUEST_GHOST_SWEEP_GRACE_MS} hostStartupGraceMs=${HOST_GHOST_STARTUP_GRACE_MS}`,
    );

    this.ghostSweepTimer = setInterval(() => {
      void this.runGhostSweepInterval();
    }, STREAM_GHOST_SWEEP_INTERVAL_MS);

    (this.ghostSweepTimer as any)?.unref?.();
  }

  onModuleDestroy() {
    if (this.ghostSweepTimer) {
      clearInterval(this.ghostSweepTimer);
      this.ghostSweepTimer = null;
    }
  }

  private async runGhostSweepInterval() {
    if (this.ghostSweepRunning) return;

    this.ghostSweepRunning = true;

    try {
      const sweptCount = await this.sweepGhostParticipants();

      if (sweptCount > 0) {
        this.logger.warn(`Stream ghost cleanup sweptCount=${sweptCount}`);
      }
    } catch (error) {
      this.logger.warn("Stream ghost cleanup sweep failed", error as any);
    } finally {
      this.ghostSweepRunning = false;
    }
  }

  private readonly guestLayoutOrder = [1, 2, 4, 6, 9, 12];

  private readonly guestMediaState = new Map<
    string,
    {
      isMuted?: boolean;
      isVideoOff?: boolean;
    }
  >();

  private guestMediaKey(streamId: string, userId: string) {
    return `${streamId}:${userId}`;
  }

  private getGuestMediaState(streamId: string, userId?: string | null) {
    if (!userId) return {};
    return this.guestMediaState.get(this.guestMediaKey(streamId, userId)) ?? {};
  }

  private setGuestMediaState(
    streamId: string,
    userId: string,
    patch: {
      isMuted?: boolean;
      isVideoOff?: boolean;
    },
  ) {
    const key = this.guestMediaKey(streamId, userId);
    const previous = this.guestMediaState.get(key) ?? {};
    const next = {
      ...previous,
      ...patch,
    };

    this.guestMediaState.set(key, next);
    return next;
  }

  private clearGuestMediaState(streamId: string, userId: string) {
    this.guestMediaState.delete(this.guestMediaKey(streamId, userId));
  }

  clearGuestMediaStateForUser(streamId: string, userId: string) {
    this.clearGuestMediaState(streamId, userId);
  }

  private applyGuestMediaState(streamId: string, guest: any) {
    const userId = String(guest?.userId || guest?.id || "").trim();
    const state = this.getGuestMediaState(streamId, userId);

    return {
      ...guest,
      isMuted: Boolean(state.isMuted),
      isVideoOff: Boolean(state.isVideoOff),
    };
  }

  private findLiveKitTrackSid(
    participant: any,
    trackType: "audio" | "video",
  ): string | null {
    const tracks = Array.isArray(participant?.tracks)
      ? participant.tracks
      : Array.isArray(participant?.trackPublications)
        ? participant.trackPublications
        : [];

    const wantedWords =
      trackType === "audio"
        ? ["audio", "microphone", "mic"]
        : ["video", "camera", "cam"];

    const match = tracks.find((track: any) => {
      const values = [
        track?.sid,
        track?.trackSid,
        track?.name,
        track?.trackName,
        track?.source,
        track?.type,
        track?.kind,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .filter(Boolean);

      return values.some((value) =>
        wantedWords.some((word) => value.includes(word)),
      );
    });

    return String(match?.sid || match?.trackSid || "").trim() || null;
  }

  private async muteLiveKitPublishedTrack(
    roomName: string,
    userId: string,
    trackType: "audio" | "video",
    muted: boolean,
  ) {
    const participant = await this.findLiveKitParticipant(roomName, userId);

    if (!participant?.identity) {
      return {
        ok: false,
        reason: "PARTICIPANT_NOT_CONNECTED",
      };
    }

    const trackSid = this.findLiveKitTrackSid(participant, trackType);

    if (!trackSid) {
      return {
        ok: false,
        reason: "TRACK_NOT_PUBLISHED",
        participantIdentity: participant.identity,
      };
    }

    const roomService = this.getRoomServiceClient();

    await roomService.mutePublishedTrack(
      roomName,
      participant.identity,
      trackSid,
      muted,
    );

    return {
      ok: true,
      participantIdentity: participant.identity,
      trackSid,
    };
  }

  private findLiveKitTrackSids(
    participant: any,
    trackType: "audio" | "video",
  ): string[] {
    const tracks = Array.isArray(participant?.tracks)
      ? participant.tracks
      : Array.isArray(participant?.trackPublications)
        ? participant.trackPublications
        : [];

    const wantedWords =
      trackType === "audio"
        ? ["audio", "microphone", "mic"]
        : ["video", "camera", "cam"];

    return Array.from(
      new Set(
        tracks
          .filter((track: any) => {
            const values = [
              track?.sid,
              track?.trackSid,
              track?.name,
              track?.trackName,
              track?.source,
              track?.type,
              track?.kind,
            ]
              .map((value) => String(value ?? "").toLowerCase())
              .filter(Boolean);

            return values.some((value) =>
              wantedWords.some((word) => value.includes(word)),
            );
          })
          .map((track: any) => String(track?.sid || track?.trackSid || "").trim())
          .filter(Boolean),
      ),
    );
  }

  private async muteLiveKitRoomVideoTracks(roomName: string, muted: boolean) {
    if (!roomName) return { ok: false, mutedTracks: 0 };

    const roomService = this.getRoomServiceClient();

    const participants = await roomService.listParticipants(roomName).catch((error) => {
      console.warn("[StreamsService] failed to list LiveKit participants for audio mode", {
        roomName,
        muted,
        error,
      });
      return [];
    });

    let mutedTracks = 0;

    for (const participant of participants as any[]) {
      const identity = participant?.identity;
      if (!identity) continue;

      const videoTrackSids = this.findLiveKitTrackSids(participant, "video");

      for (const trackSid of videoTrackSids) {
        try {
          await roomService.mutePublishedTrack(roomName, identity, trackSid, muted);
          mutedTracks++;
        } catch (error) {
          console.warn("[StreamsService] failed to update LiveKit video track mute state", {
            roomName,
            identity,
            trackSid,
            muted,
            error,
          });
        }
      }
    }

    return {
      ok: true,
      mutedTracks,
    };
  }

  private buildLiveKitIdentity(userId: string): string {
    return `user:${userId}`;
  }

  private normalizeDeviceSessionId(value: unknown, userId: string): string {
    const raw = String(value ?? "").trim();
    const safe = raw.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 120);
    return safe || `legacy-${String(userId || "unknown").slice(0, 8)}`;
  }

  private buildLiveKitPublisherIdentity(streamId: string, userId: string, deviceSessionId: string): string {
    return `stream-publisher:${streamId}:${userId}:${deviceSessionId}`;
  }

  private buildPublisherSessionId(streamId: string, userId: string, deviceSessionId: string): string {
    return `${streamId}:${userId}:${deviceSessionId}`;
  }

  private buildVideoRoomName(streamId: string): string {
    return `stream-${streamId}`;
  }

  private getLiveKitPublicUrl(): string {
    const url = String(
      process.env.LIVEKIT_PUBLIC_URL || process.env.LIVEKIT_URL || ""
    ).trim();

    if (!url) {
      throw new ServiceUnavailableException(
        "LiveKit public URL is not configured. Set LIVEKIT_PUBLIC_URL.",
      );
    }

    return url;
  }

  private getLiveKitApiUrl(): string {
    const url = String(
      process.env.LIVEKIT_API_URL || process.env.LIVEKIT_URL || ""
    ).trim();

    if (!url) {
      throw new ServiceUnavailableException(
        "LiveKit API URL is not configured. Set LIVEKIT_API_URL.",
      );
    }

    return url;
  }

  private getLiveKitAdapter(): LiveKitAdapter {
    const url = this.getLiveKitPublicUrl();
    const key = String(process.env.LIVEKIT_API_KEY || "").trim();
    const secret = String(process.env.LIVEKIT_API_SECRET || "").trim();

    if (!key || !secret) {
      throw new ServiceUnavailableException(
        "LiveKit is not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
      );
    }

    return new LiveKitAdapter(url, key, secret);
  }

  private getRoomServiceClient() {
    const url = this.getLiveKitApiUrl();
    const key = String(process.env.LIVEKIT_API_KEY || "").trim();
    const secret = String(process.env.LIVEKIT_API_SECRET || "").trim();

    if (!key || !secret) {
      throw new ServiceUnavailableException(
        "LiveKit is not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
      );
    }

    return new RoomServiceClient(url, key, secret);
  }

  private async findLiveKitParticipant(roomName: string, userId: string) {
    const roomService = this.getRoomServiceClient();
    const targetIdentity = this.buildLiveKitIdentity(userId);
    const participants = await roomService.listParticipants(roomName);

    return (
      participants.find((p) => p.identity === targetIdentity) ??
      participants.find((p) => p.identity?.endsWith(`:${userId}`)) ??
      participants.find((p) => p.identity?.includes(userId)) ??
      null
    );
  }

  private async isLiveKitParticipantConnectedForSweep(input: {
    streamId: string;
    videoRoomName?: string | null;
    userId: string;
  }) {
    const roomName = input.videoRoomName || this.buildVideoRoomName(input.streamId);

    try {
      const participant = await this.findLiveKitParticipant(roomName, input.userId);
      return !!participant?.identity;
    } catch (error) {
      if (isLiveKitRoomMissingError(error)) {
        this.logger.warn(
          `LiveKit room missing during ghost sweep; treating participant as disconnected streamId=${input.streamId} roomName=${roomName} userId=${input.userId}`,
        );
        return false;
      }

      // LiveKit API failures must not cause destructive ghost cleanup.
      this.logger.warn(
        `Failed to inspect LiveKit participant during ghost sweep; keeping participant alive streamId=${input.streamId} roomName=${roomName} userId=${input.userId}`,
        error as any,
      );
      return true;
    }
  }

  private async markParticipantSeen(participantId: string, seenAt = new Date()) {
    await this.prisma.streamParticipant.update({
      where: { id: participantId },
      data: { lastPingAt: seenAt },
    });
  }

  private getTimeMs(value: Date | string | number | null | undefined) {
    const time = value instanceof Date ? value.getTime() : new Date(value ?? NaN).getTime();
    return Number.isFinite(time) ? time : null;
  }

  private hasParticipantPingedAfterJoin(participant: {
    joinedAt?: Date | string | number | null;
    lastPingAt?: Date | string | number | null;
  }) {
    const joinedAt = this.getTimeMs(participant.joinedAt);
    const lastPingAt = this.getTimeMs(participant.lastPingAt);

    if (joinedAt === null || lastPingAt === null) {
      return false;
    }

    return lastPingAt > joinedAt + 1_000;
  }

  private isWithinHostStartupGrace(participant: {
    joinedAt?: Date | string | number | null;
  }) {
    const joinedAt = this.getTimeMs(participant.joinedAt);

    if (joinedAt === null) {
      return false;
    }

    return Date.now() - joinedAt < HOST_GHOST_STARTUP_GRACE_MS;
  }

  private async endGhostHostStream(input: {
    streamId: string;
    hostUserId: string;
    videoRoomName?: string | null;
    endedAt: Date;
  }) {
    const roomName = input.videoRoomName || this.buildVideoRoomName(input.streamId);

    const ended = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.stream.updateMany({
        where: {
          id: input.streamId,
          status: "LIVE",
        },
        data: {
          status: "ENDED",
          endedAt: input.endedAt,
          endedByAdminUserId: null,
          endReason: "HOST_DISCONNECTED",
        } as any,
      });

      if (updated.count === 0) {
        return false;
      }

      await tx.streamParticipant.updateMany({
        where: { streamId: input.streamId, leftAt: null },
        data: { leftAt: input.endedAt },
      });

      return true;
    });

    if (!ended) {
      return false;
    }

    const payload = {
      streamId: input.streamId,
      hostUserId: input.hostUserId,
      status: "ENDED",
      endedAt: input.endedAt.toISOString(),
      endedByAdmin: false,
      endedByAdminUserId: null,
      endReason: "HOST_DISCONNECTED",
    };

    this.realtime.emitStreamEnded(payload);
    this.realtime.emitStreamStateUpdated(payload);
    this.queueLiveKitRoomTeardown(roomName);

    this.logger.warn(
      `HOST_DISCONNECTED ghost stream ended streamId=${input.streamId} hostUserId=${input.hostUserId} roomName=${roomName}`,
    );

    return true;
  }

  async disconnectLiveKitParticipantFromStream(streamId: string, userId: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        videoRoomName: true,
        videoProvider: true,
      },
    });

    if (!stream) {
      return {
        ok: false,
        reason: "STREAM_NOT_FOUND",
      };
    }

    const roomName = stream.videoRoomName || this.buildVideoRoomName(streamId);

    const participant = await this.findLiveKitParticipant(roomName, userId).catch((error) => {
      console.warn("[StreamsService] failed to locate LiveKit participant for forced removal", {
        streamId,
        roomName,
        userId,
        error,
      });

      return null;
    });

    if (!participant?.identity) {
      return {
        ok: false,
        reason: "PARTICIPANT_NOT_CONNECTED",
        roomName,
      };
    }

    const roomService = this.getRoomServiceClient();

    try {
      await roomService.removeParticipant(roomName, participant.identity);
    } catch (error: any) {
      const status = Number(error?.status ?? error?.codeStatus ?? 0);
      const code = String(error?.code || "").toLowerCase();
      const message = String(error?.message || "").toLowerCase();

      if (
        status === 404 ||
        code === "not_found" ||
        message.includes("participant does not exist")
      ) {
        return {
          ok: false,
          reason: "PARTICIPANT_NOT_CONNECTED",
          roomName,
          participantIdentity: participant.identity,
        };
      }

      throw error;
    }

    return {
      ok: true,
      roomName,
      participantIdentity: participant.identity,
    };
  }

  private async setLiveKitParticipantPublishPermission(
    roomName: string,
    userId: string,
    canPublish: boolean,
    options?: { requireParticipant?: boolean; timeoutMs?: number },
  ) {
    const requireParticipant = !!options?.requireParticipant;
    const timeoutMs = Number(options?.timeoutMs ?? 4000);

    const roomService = this.getRoomServiceClient();
    const participant = await this.findLiveKitParticipant(roomName, userId);

    if (!participant) {
      if (requireParticipant) {
        throw new ServiceUnavailableException(
          "Guest is not connected to the LiveKit room right now.",
        );
      }
      return null;
    }

    await roomService.updateParticipant(
      roomName,
      participant.identity,
      participant.metadata || "",
      {
        canPublish,
        canPublishData: true,
        canSubscribe: true,
        hidden: false,
      },
    );

    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const refreshed = await this.findLiveKitParticipant(roomName, userId);

      if (!refreshed) {
        if (!canPublish) return null;
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }

      const actual = refreshed.permission?.canPublish === true;
      if (actual === canPublish) {
        return refreshed;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    throw new ServiceUnavailableException(
      canPublish
        ? "LiveKit publish permission did not become ready in time."
        : "LiveKit publish permission did not clear in time.",
    );
  }

  private async issueStreamTokenForRole(
    streamId: string,
    userId: string,
    role: StreamRole,
    options: { deviceSessionId?: string } = {},
  ): Promise<VideoTokenResponse> {
    const stream = await (this.prisma as any).stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        videoRoomName: true,
        videoProvider: true,
        activePublisherTokenVersion: true,
      },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    const roomName = stream.videoRoomName || this.buildVideoRoomName(streamId);
    const isHostPublisher = role === "HOST";
    const deviceSessionId = this.normalizeDeviceSessionId(options.deviceSessionId, userId);
    const identity = isHostPublisher
      ? this.buildLiveKitPublisherIdentity(streamId, userId, deviceSessionId)
      : this.buildLiveKitIdentity(userId);

    if (!stream.videoRoomName || !stream.videoProvider || isHostPublisher) {
      const nextTokenVersion = Number(stream.activePublisherTokenVersion ?? 0) + 1;
      const transferredAt = new Date();

      (this.prisma as any).stream
        .update({
          where: { id: streamId },
          data: {
            videoProvider: "LIVEKIT",
            videoRoomName: roomName,
            ...(isHostPublisher
              ? {
                  activePublisherUserId: userId,
                  activePublisherDeviceId: deviceSessionId,
                  activePublisherIdentity: identity,
                  activePublisherSessionId: this.buildPublisherSessionId(streamId, userId, deviceSessionId),
                  activePublisherTokenVersion: nextTokenVersion,
                  activePublisherTransferredAt: transferredAt,
                }
              : {}),
          },
        })
        .catch((err: unknown) => console.error("Non-critical stream update failed:", err));
    }

    const adapter = this.getLiveKitAdapter();

    return adapter.getToken({
      streamId,
      userId,
      identity,
      role: role as any,
      roomName,
      metadata: {
        joinMode: isHostPublisher ? "publisher" : "viewer",
        deviceSessionId: isHostPublisher ? deviceSessionId : null,
        isStreamOwner: isHostPublisher,
      },
    });
  }

  private normalizeEndReason(reason?: string): string | null {
    const value = String(reason ?? "").trim();
    return value ? value.slice(0, 300) : null;
  }

  private async teardownLiveKitRoom(roomName?: string | null) {
    if (!roomName) return;

    try {
      const roomService = this.getRoomServiceClient();
      await roomService.deleteRoom(roomName);
    } catch (error) {
      if (isLiveKitRoomMissingError(error)) {
        this.logger.log(`LiveKit room already gone during teardown roomName=${roomName}`);
        return;
      }

      this.logger.warn(`Failed to teardown LiveKit room roomName=${roomName}`, error as any);
    }
  }

  private queueLiveKitRoomTeardown(roomName?: string | null) {
    if (!roomName) return;

    setTimeout(() => {
      void this.teardownLiveKitRoom(roomName);
    }, 0);
  }

  private normalizeLayoutGridSize(value: any): number {
    const parsed = Number(value);
    if ([1, 2, 4, 6, 9, 12].includes(parsed)) {
      return parsed;
    }
    return 1;
  }

  private getGuestCapacity(layoutGridSize: number): number {
    return layoutGridSize === 1 ? 1 : Math.max(0, layoutGridSize - 1);
  }

  private getSmallestLayoutForGuestCount(guestCount: number): number {
    for (const layout of this.guestLayoutOrder) {
      if (this.getGuestCapacity(layout) >= guestCount) {
        return layout;
      }
    }

    return this.guestLayoutOrder[this.guestLayoutOrder.length - 1];
  }

  private getExpandedLayoutIfNeeded(
    currentLayoutGridSize: number,
    nextGuestCount: number,
  ): number {
    const currentCapacity = this.getGuestCapacity(currentLayoutGridSize);

    if (nextGuestCount <= currentCapacity) {
      return currentLayoutGridSize;
    }

    return this.getSmallestLayoutForGuestCount(nextGuestCount);
  }

  private async requireStream(streamId: string) {
    const s = await this.prisma.stream.findUnique({
      where: { id: streamId },
      include: { host: { include: { profile: true } } },
    });
    if (!s) throw new NotFoundException("Stream not found");
    return s;
  }

  private userSummary(user: any) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.profile?.displayName ?? user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
      level: null,
    };
  }

  private guestSummary(user: any) {
    const displayName = user.profile?.displayName ?? user.username;

    return {
      id: user.id,
      userId: user.id,
      username: user.username,
      name: displayName,
      displayName,
      avatarUrl: user.profile?.avatarUrl ?? null,
      isMuted: false,
      isVideoOff: false,
    };
  }

  private viewerListItem(
    user: any,
    extra?: {
      role?: string;
      staffRole?: string;
      joinedAt?: Date | null;
      leftAt?: Date | null;
      visitCount?: number;
    },
  ) {
    return {
      id: user.id,
      username: user.username,
      name: user.profile?.displayName ?? user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
      role: extra?.role,
      staffRole: extra?.staffRole,
      joinedAt: extra?.joinedAt ? extra.joinedAt.toISOString() : null,
      leftAt: extra?.leftAt ? extra.leftAt.toISOString() : null,
      visitCount: extra?.visitCount ?? 1,
    };
  }

  private async getStaffRoleMap(streamId: string, userIds: string[]) {
    const normalizedUserIds = Array.from(
      new Set(userIds.map((userId) => String(userId || "").trim()).filter(Boolean)),
    );

    const map = new Map<string, string>();

    if (normalizedUserIds.length === 0) {
      return map;
    }

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { hostUserId: true },
    });

    if (stream?.hostUserId) {
      map.set(stream.hostUserId, "HOST");
    }

    const staffRows = await this.prisma.streamStaffAssignment.findMany({
      where: {
        streamId,
        userId: { in: normalizedUserIds },
      },
      select: {
        userId: true,
        role: true,
      },
    });

    for (const row of staffRows) {
      map.set(row.userId, row.role);
    }

    const unresolvedUserIds = normalizedUserIds.filter((userId) => !map.has(userId));

    if (unresolvedUserIds.length > 0) {
      const legacyRows = await this.prisma.streamUserRole.findMany({
        where: {
          streamId,
          userId: { in: unresolvedUserIds },
          role: "MODERATOR",
        },
        select: {
          userId: true,
          role: true,
        },
      });

      for (const row of legacyRows) {
        map.set(row.userId, row.role);
      }
    }

    return map;
  }

  private resolveLeaderboardPeriod(period?: string): StreamLeaderboardPeriod {
    switch (String(period ?? "").toLowerCase()) {
      case "daily":
        return "daily";
      case "weekly":
        return "weekly";
      case "monthly":
        return "monthly";
      case "alltime":
        return "alltime";
      case "stream":
      default:
        return "stream";
    }
  }

  private resolveLeaderboardSince(period: StreamLeaderboardPeriod): Date | null {
    switch (period) {
      case "daily":
        return new Date(Date.now() - 24 * 60 * 60_000);
      case "weekly":
        return new Date(Date.now() - 7 * 24 * 60 * 60_000);
      case "monthly":
        return new Date(Date.now() - 30 * 24 * 60 * 60_000);
      case "alltime":
      case "stream":
      default:
        return null;
    }
  }

  private guestRequestSummary(request: any) {
    return {
      id: request.id,
      streamId: request.streamId,
      status: request.status,
      createdAt:
        request.createdAt instanceof Date
          ? request.createdAt.toISOString()
          : request.createdAt,
      user: {
        id: request.user.id,
        username: request.user.username,
        displayName: request.user.profile?.displayName ?? request.user.username,
        avatarUrl: request.user.profile?.avatarUrl ?? null,
      },
    };
  }

  private getStreamGuests(stream: any) {
    return Array.isArray((stream as any)?.guests) ? [...((stream as any).guests as any[])] : [];
  }

  private buildStreamStatePayload(stream: any, guestsOverride?: any[]) {
    const layoutGridSize = this.normalizeLayoutGridSize((stream as any)?.layoutGridSize);

    return {
      streamId: stream.id,
      id: stream.id,
      status: stream.status,
      title: stream.title,
      color: stream.color,
      hostUserId: stream.hostUserId,
      host: this.userSummary(stream.host),
      visibility: stream.visibility,
      tags: (stream.tagsJson as any[]) ?? [],
      streamCategoryId: (stream as any)?.streamCategoryId ?? null,
      guests: Array.isArray(guestsOverride) ? guestsOverride : this.getStreamGuests(stream),
      layoutGridSize,
      gridSize: layoutGridSize,
      streamGoal: Number((stream as any)?.streamGoal ?? 0),
      pinnedMessage: (stream as any)?.pinnedMessage ?? null,
      startedAt: stream.startedAt.toISOString(),
      endedAt: stream.endedAt ? stream.endedAt.toISOString() : null,
      endedByAdminUserId: (stream as any)?.endedByAdminUserId ?? null,
      endReason: (stream as any)?.endReason ?? null,
      endedByAdmin: Boolean((stream as any)?.endedByAdminUserId),
      isAudioOnly: Boolean((stream as any)?.isAudioOnly),
    };
  }

  private async getFavoriteAudienceUserIds(hostUserId: string): Promise<string[]> {
    const rows = await this.prisma.userFavorite.findMany({
      where: {
        favoriteUserId: hostUserId,
      },
      select: {
        userId: true,
      },
    });

    return Array.from(
      new Set(
        rows
          .map((row) => row.userId)
          .filter((userId) => !!userId && userId !== hostUserId),
      ),
    );
  }

  private async getActiveGuests(streamId: string) {
    const rows = await this.prisma.streamParticipant.findMany({
      where: {
        streamId,
        role: "GUEST",
        leftAt: null,
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return rows.map((row) =>
      this.applyGuestMediaState(streamId, this.guestSummary(row.user)),
    );
  }

  private async getActiveGuestsMap(streamIds: string[]) {
    const map = new Map<string, any[]>();

    if (!streamIds.length) return map;

    const rows = await this.prisma.streamParticipant.findMany({
      where: {
        streamId: { in: streamIds },
        role: "GUEST",
        leftAt: null,
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: [{ streamId: "asc" }, { joinedAt: "asc" }],
    });

    for (const row of rows) {
      const existing = map.get(row.streamId) ?? [];
      existing.push(
        this.applyGuestMediaState(row.streamId, this.guestSummary(row.user)),
      );
      map.set(row.streamId, existing);
    }

    return map;
  }

  private async isPlatformBannedUser(userId: string): Promise<boolean> {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;

    if (!user?.isPlatformBanned) return false;

    const expiresAt =
      user.platformBanExpiresAt instanceof Date ? user.platformBanExpiresAt : null;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return false;
    }

    return true;
  }

  private async assertUserCanUseLive(userId: string) {
    if (await this.isPlatformBannedUser(userId)) {
      throw new ForbiddenException("Account banned");
    }
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

  private async hasKickRestriction(streamId: string, userId: string): Promise<boolean> {
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

  async verifyPublishPermissions(streamId: string, userId: string) {
    await this.assertUserCanUseLive(userId);

    const stream = await this.requireStream(streamId);

    const normalizedHostId = stream.hostUserId.trim().toLowerCase();
    const normalizedUserId = userId.trim().toLowerCase();

    if (normalizedHostId === normalizedUserId) {
      return { canPublish: true };
    }

    const [bannedFromStream, kickedFromStream] = await Promise.all([
      this.isBanned(streamId, userId),
      this.hasKickRestriction(streamId, userId),
    ]);

    if (bannedFromStream) {
      throw new ForbiddenException({
        message: "Banned from stream",
        code: "STREAM_BAN_RESTRICTION",
      });
    }

    if (kickedFromStream) {
      throw new ForbiddenException({
        message: "Kicked from stream",
        code: "STREAM_KICK_RESTRICTION",
      });
    }

    const guestParticipant = await this.prisma.streamParticipant.findFirst({
      where: {
        streamId,
        userId,
        role: "GUEST",
        leftAt: null,
      },
    });

    if (!guestParticipant) {
      return { canPublish: false };
    }

    const roomName = stream.videoRoomName || this.buildVideoRoomName(streamId);
    const liveKitParticipant = await this.findLiveKitParticipant(roomName, userId);

    return {
      canPublish: !!liveKitParticipant?.permission?.canPublish,
    };
  }

  async createStreamWithVideo(params: {
    hostUserId: string;
    title: string;
    color?: string;
    visibility: StreamVisibility;
    tags?: string[];
    streamCategoryId?: string | null;
    categorySlug?: string | null;
    categoryName?: string | null;
    streamCategorySlug?: string | null;
    streamCategoryName?: string | null;
    layoutGridSize?: number;
    streamGoal?: number;
    isAudioOnly?: boolean;
    deviceSessionId?: string;
  }) {
    const stream = await this.createStream(params);
    const video = await this.issueStreamTokenForRole(stream.id, params.hostUserId, "HOST", {
      deviceSessionId: params.deviceSessionId,
    });

    return {
      ok: true,
      stream,
      video,
    };
  }

  async joinAndIssueVideoToken(
    streamId: string,
    userId: string,
    options: { deviceSessionId?: string } = {},
  ) {
    const joinResult = await this.join(streamId, userId);
    const [stream, video] = await Promise.all([
      this.getStream(streamId),
      this.issueStreamTokenForRole(streamId, userId, joinResult.role, {
        deviceSessionId: options.deviceSessionId,
      }),
    ]);

    return {
      ok: true,
      role: joinResult.role,
      stream,
      video,
    };
  }

  async updateGuestMediaState(
    streamId: string,
    guestUserId: string,
    dto: UpdateGuestMediaDto,
    requestingUserId: string,
  ) {
    const stream = await this.requireStream(streamId);

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    const normalizedTrackType =
      dto.trackType === "video" ? "video" : "audio";

    const targetState = Boolean(dto.state);
    const isSelfAction = String(requestingUserId) === String(guestUserId);
    const actorStaffState = await this.streamStaff.getMyState(streamId, requestingUserId);
    const actorRole = String(actorStaffState?.role || "").toUpperCase();
    const canUnlockGuestAudio =
      actorRole === "HOST" || actorRole === "SUPER_ADMIN";

    if (normalizedTrackType === "video" && targetState === false) {
      if (!isSelfAction) {
        throw new BadRequestException(
          "Only the guest can turn their camera back on.",
        );
      }
    } else if (normalizedTrackType === "audio" && targetState === false) {
      if (!canUnlockGuestAudio) {
        throw new ForbiddenException(
          "Only the host or a super admin can unmute a guest.",
        );
      }
    } else {
      await this.streamStaff.assertHasPermission(
        streamId,
        requestingUserId,
        "CONTROL_GUEST_MEDIA",
        "Only the host or authorized staff can manage guest media",
      );
    }

    const activeGuest = await this.prisma.streamParticipant.findFirst({
      where: {
        streamId,
        userId: guestUserId,
        role: "GUEST",
        leftAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!activeGuest) {
      throw new NotFoundException("Guest is not currently in the guest box");
    }

    const mediaPatch =
      normalizedTrackType === "audio"
        ? { isMuted: targetState }
        : { isVideoOff: targetState };

    this.setGuestMediaState(streamId, guestUserId, mediaPatch);

    const roomName = stream.videoRoomName || this.buildVideoRoomName(streamId);

    const liveKitResult = await this.muteLiveKitPublishedTrack(
      roomName,
      guestUserId,
      normalizedTrackType,
      targetState,
    ).catch((error) => {
      console.warn("Failed to mute LiveKit published guest track", {
        streamId,
        guestUserId,
        trackType: normalizedTrackType,
        targetState,
        error,
      });

      return {
        ok: false,
        reason: "LIVEKIT_ERROR",
      };
    });

    const refreshedStream = await this.requireStream(streamId);
    const guests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(
      refreshedStream,
      refreshedStream.host,
      guests,
    );

    this.realtime.emitParticipants(streamId, await this.listParticipants(streamId));
    this.realtime.emitStreamStateUpdated(payload);

    return {
      ok: true,
      stream: payload,
      guestUserId,
      trackType: normalizedTrackType,
      state: targetState,
      liveKit: liveKitResult,
    };
  }

  async updateAudioMode(streamId: string, actorUserId: string, isAudioOnly: boolean) {
    const stream = await this.requireStream(streamId);
    const actorStaffState = await this.streamStaff.getMyState(streamId, actorUserId);
    const actorRole = String(actorStaffState?.role || "").toUpperCase();
    const canToggleAudioMode =
      stream.hostUserId === actorUserId ||
      actorRole === "HOST" ||
      actorRole === "SUPER_ADMIN";

    if (!canToggleAudioMode) {
      throw new ForbiddenException("Only the host or a super admin can change Audio Mode");
    }

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    const nextAudioOnly = Boolean(isAudioOnly);

    const updated = await this.prisma.stream.update({
      where: { id: streamId },
      data: { isAudioOnly: nextAudioOnly } as any,
    });

    const roomName = stream.videoRoomName || this.buildVideoRoomName(streamId);

    const liveKitVideoMute = await this.muteLiveKitRoomVideoTracks(
      roomName,
      nextAudioOnly,
    ).catch((error) => {
      console.warn("[StreamsService] failed to update LiveKit room video tracks for audio mode", {
        streamId,
        roomName,
        nextAudioOnly,
        error,
      });

      return {
        ok: false,
        mutedTracks: 0,
      };
    });

    const guests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(updated, stream.host, guests);

    this.realtime.emitParticipants(streamId, await this.listParticipants(streamId));
    this.realtime.emitStreamStateUpdated(payload);

    return {
      ok: true,
      stream: payload,
      isAudioOnly: nextAudioOnly,
      liveKitVideoMute,
    };
  }

  async leaveGuestBox(streamId: string, userId: string) {
    const stream = await this.requireStream(streamId);

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    await this.prisma.streamParticipant.updateMany({
      where: {
        streamId,
        userId,
        role: "GUEST",
        leftAt: null,
      },
      data: {
        role: "VIEWER",
      },
    });

    this.clearGuestMediaState(streamId, userId);

    const roomName = stream.videoRoomName || this.buildVideoRoomName(streamId);

    await this.setLiveKitParticipantPublishPermission(roomName, userId, false, {
      requireParticipant: false,
      timeoutMs: 2500,
    }).catch((error) => {
      console.warn("Failed to downgrade participant on leave", error);
    });

    const refreshedStream = await this.requireStream(streamId);
    const guests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(
      refreshedStream,
      refreshedStream.host,
      guests,
    );

    this.realtime.emitParticipants(streamId, await this.listParticipants(streamId));
    this.realtime.emitStreamStateUpdated(payload);

    return {
      ok: true,
      stream: payload,
    };
  }

  async removeGuestFromBox(streamId: string, actorUserId: string, guestUserId: string) {
    const stream = await this.requireStream(streamId);

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "REMOVE_GUESTS",
      "Only the host or authorized staff can remove guests from the box",
    );

    const updatedCount = await this.prisma.streamParticipant.updateMany({
      where: {
        streamId,
        userId: guestUserId,
        role: "GUEST",
        leftAt: null,
      },
      data: {
        role: "VIEWER",
      },
    });

    if (updatedCount.count === 0) {
      throw new NotFoundException("Guest is not currently in the guest box");
    }

    this.clearGuestMediaState(streamId, guestUserId);

    const roomName = stream.videoRoomName || this.buildVideoRoomName(streamId);

    await this.setLiveKitParticipantPublishPermission(roomName, guestUserId, false, {
      requireParticipant: false,
      timeoutMs: 2500,
    }).catch((error) => {
      console.warn("Failed to downgrade participant on remove", error);
    });

    const refreshedStream = await this.requireStream(streamId);
    const guests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(
      refreshedStream,
      refreshedStream.host,
      guests,
    );

    this.realtime.emitParticipants(streamId, await this.listParticipants(streamId));
    this.realtime.emitStreamStateUpdated(payload);

    return {
      ok: true,
      stream: payload,
    };
  }

  private buildStreamPayload(stream: any, host: any, guests: any[]) {
    const layoutGridSize = this.normalizeLayoutGridSize(stream?.layoutGridSize);

    return {
      id: stream.id,
      streamId: stream.id,
      status: stream.status,
      title: stream.title,
      color: stream.color,
      hostUserId: stream.hostUserId,
      host: this.userSummary(host),
      visibility: stream.visibility,
      tags: (stream.tagsJson as any[]) ?? [],
      streamCategoryId: (stream as any)?.streamCategoryId ?? null,
      guests,
      layoutGridSize,
      gridSize: layoutGridSize,
      streamGoal: Number((stream as any)?.streamGoal ?? 0),
      pinnedMessage: (stream as any)?.pinnedMessage ?? null,
      startedAt: stream.startedAt.toISOString(),
      endedAt: stream.endedAt ? stream.endedAt.toISOString() : null,
      endedByAdminUserId: (stream as any)?.endedByAdminUserId ?? null,
      endReason: (stream as any)?.endReason ?? null,
      endedByAdmin: Boolean((stream as any)?.endedByAdminUserId),
      isAudioOnly: Boolean((stream as any)?.isAudioOnly),
    };
  }

  async listParticipants(streamId: string) {
    const rows = await this.prisma.streamParticipant.findMany({
      where: { streamId, leftAt: null },
      include: { user: { include: { profile: true } } },
      orderBy: { joinedAt: "asc" },
    });

    const staffRoleMap = await this.getStaffRoleMap(
      streamId,
      rows.map((row) => row.userId),
    );

    return rows.map((p) => ({
      user: this.userSummary(p.user),
      role: p.role,
      staffRole:
        staffRoleMap.get(p.userId) ??
        (p.role === "HOST" ? "HOST" : undefined),
      joinedAt: p.joinedAt.toISOString(),
    }));
  }

  async getViewerSnapshot(streamId: string) {
    const stream = await this.requireStream(streamId);

    const [liveRows, historyRows] = await Promise.all([
      this.prisma.streamParticipant.findMany({
        where: {
          streamId,
          leftAt: null,
          userId: { not: stream.hostUserId },
        },
        include: { user: { include: { profile: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      this.prisma.streamParticipant.findMany({
        where: {
          streamId,
          userId: { not: stream.hostUserId },
        },
        include: { user: { include: { profile: true } } },
        orderBy: { joinedAt: "asc" },
      }),
    ]);

    const staffRoleMap = await this.getStaffRoleMap(
      streamId,
      Array.from(
        new Set([...liveRows, ...historyRows].map((row) => row.userId)),
      ),
    );

    const live = liveRows.map((row) =>
      this.viewerListItem(row.user, {
        role: row.role,
        staffRole: staffRoleMap.get(row.userId),
        joinedAt: row.joinedAt,
        leftAt: row.leftAt,
      }),
    );

    const historyMap = new Map<string, any>();

    for (const row of historyRows) {
      const existing = historyMap.get(row.userId);

      if (!existing) {
        historyMap.set(
          row.userId,
          this.viewerListItem(row.user, {
            role: row.role,
            staffRole: staffRoleMap.get(row.userId),
            joinedAt: row.joinedAt,
            leftAt: row.leftAt,
            visitCount: 1,
          }),
        );
        continue;
      }

      existing.visitCount = Number(existing.visitCount || 1) + 1;
      existing.staffRole = existing.staffRole || staffRoleMap.get(row.userId);
      if (row.leftAt) {
        existing.leftAt = row.leftAt.toISOString();
      }
    }

    const history = Array.from(historyMap.values());

    return {
      live,
      totalViewers: live.length,
      history,
      allTimeViews: history.length,
    };
  }

  async getHeartSnapshot(streamId: string) {
    await this.requireStream(streamId);
    return this.realtime.getHeartSnapshot(streamId);
  }

  async getAllTimeHeartSnapshot(streamId: string, limit = 100) {
    const stream = await this.requireStream(streamId);
    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(100, Math.floor(limit)))
      : 100;

    const [grouped, totals] = await Promise.all([
      this.prisma.streamHeartStat.groupBy({
        by: ["senderUserId"],
        where: {
          hostUserId: stream.hostUserId,
        },
        _sum: {
          count: true,
        },
        orderBy: {
          _sum: {
            count: "desc",
          },
        },
        take: safeLimit,
      }),
      this.prisma.streamHeartStat.aggregate({
        where: {
          hostUserId: stream.hostUserId,
        },
        _sum: {
          count: true,
        },
      }),
    ]);

    const senderIds = grouped.map((row) => row.senderUserId);
    const users = senderIds.length
      ? await this.prisma.user.findMany({
        where: {
          id: { in: senderIds },
        },
        include: {
          profile: true,
        },
      })
      : [];

    const userMap = new Map(users.map((user) => [user.id, this.userSummary(user)]));

    const heartsList = grouped.map((row, index) => {
      const user =
        userMap.get(row.senderUserId) ??
        ({
          id: row.senderUserId,
          username: "unknown",
          displayName: "Unknown User",
          avatarUrl: null,
          level: null,
        } as const);

      return {
        rank: index + 1,
        id: user.id,
        username: user.username,
        name: user.displayName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        count: Number(row._sum.count ?? 0),
      };
    });

    return {
      streamId,
      hostUserId: stream.hostUserId,
      scope: "all_time",
      generatedAt: new Date().toISOString(),
      totalHearts: Number(totals._sum.count ?? 0),
      heartsList,
    };
  }

  async getDiamondLeaderboard(streamId: string, limit = 50, period?: string) {
    const stream = await this.requireStream(streamId);

    const resolvedPeriod = this.resolveLeaderboardPeriod(period);
    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(100, Math.floor(limit)))
      : 50;

    const where: Prisma.GiftTransactionWhereInput = {
      recipientUserId: stream.hostUserId,
    };

    if (resolvedPeriod === "stream") {
      where.streamId = streamId;
    } else {
      const since = this.resolveLeaderboardSince(resolvedPeriod);
      if (since) {
        where.createdAt = { gte: since };
      }
    }

    const [grouped, totals] = await Promise.all([
      this.prisma.giftTransaction.groupBy({
        by: ["senderUserId"],
        where,
        _sum: { diamondValue: true },
        orderBy: {
          _sum: { diamondValue: "desc" },
        },
        take: safeLimit,
      }),
      this.prisma.giftTransaction.aggregate({
        where,
        _sum: { diamondValue: true },
      }),
    ]);

    const senderIds = grouped.map((row) => row.senderUserId);

    const users = senderIds.length
      ? await this.prisma.user.findMany({
        where: { id: { in: senderIds } },
        include: { profile: true },
      })
      : [];

    const userMap = new Map(users.map((user) => [user.id, this.userSummary(user)]));

    const items = grouped.map((row, index) => {
      const user =
        userMap.get(row.senderUserId) ??
        ({
          id: row.senderUserId,
          username: "unknown",
          displayName: "Unknown User",
          avatarUrl: null,
          level: null,
        } as const);

      const diamonds = Number(row._sum.diamondValue ?? 0);

      return {
        rank: index + 1,
        user,
        diamonds,
        value: diamonds,
      };
    });

    return {
      streamId,
      hostUserId: stream.hostUserId,
      period: resolvedPeriod,
      generatedAt: new Date().toISOString(),
      totalDiamonds: Number(totals._sum.diamondValue ?? 0),
      items,
    };
  }

  private async getAssignedRole(streamId: string, userId: string): Promise<StreamRole | null> {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return null;
    if (stream.hostUserId === userId) return "HOST";

    const assigned = await this.prisma.streamUserRole.findUnique({
      where: { streamId_userId: { streamId, userId } },
    });

    return assigned?.role ?? null;
  }

  private async isBanned(streamId: string, userId: string): Promise<boolean> {
    const now = new Date();
    const ban = await this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "BAN",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    return !!ban;
  }

  async createStream(params: {
    hostUserId: string;
    title: string;
    color?: string;
    visibility: StreamVisibility;
    tags?: string[];
    streamCategoryId?: string | null;
    categorySlug?: string | null;
    categoryName?: string | null;
    streamCategorySlug?: string | null;
    streamCategoryName?: string | null;
    layoutGridSize?: number;
    streamGoal?: number;
    isAudioOnly?: boolean;
  }) {
    await this.assertUserCanUseLive(params.hostUserId);

    const host = await this.users.findByIdWithProfile(params.hostUserId);
    const layoutGridSize = this.normalizeLayoutGridSize(params.layoutGridSize);

    const streamCategory = await this.resolveStreamCategoryForCreate(params);
    const streamTags = this.mergeStreamCategoryTags(params.tags, streamCategory);

    const stream = await this.prisma.$transaction(async (tx) => {
      const s = await tx.stream.create({
        data: {
            streamCategoryId: streamCategory?.id ?? null,
          hostUserId: params.hostUserId,
          title: params.title,
          color: params.color,
          status: "LIVE",
          visibility: params.visibility,
          tagsJson: streamTags as any,
          layoutGridSize,
          isAudioOnly: !!params.isAudioOnly,
          streamGoal: Math.max(0, Number(params.streamGoal ?? 0) || 0),
          startedAt: new Date(),
        } as any,
      });

      await tx.streamUserRole.create({
        data: {
          streamId: s.id,
          userId: params.hostUserId,
          role: "HOST",
          assignedByUserId: params.hostUserId,
        },
      });

      await tx.streamParticipant.create({
        data: {
          streamId: s.id,
          userId: params.hostUserId,
          role: "HOST",
        },
      });

      const previousStreamWithStaff = await tx.stream.findFirst({
        where: {
          hostUserId: params.hostUserId,
          id: { not: s.id },
          OR: [
            { staffAssignments: { some: {} } },
            { staffRolePermissions: { some: {} } },
          ],
        },
        select: {
          id: true,
          staffAssignments: {
            select: {
              userId: true,
              role: true,
            },
          },
          staffRolePermissions: {
            select: {
              role: true,
              permission: true,
              enabled: true,
            },
          },
        },
        orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
      });

      if (previousStreamWithStaff?.staffAssignments?.length) {
        await tx.streamStaffAssignment.createMany({
          data: previousStreamWithStaff.staffAssignments.map((row) => ({
            streamId: s.id,
            userId: row.userId,
            role: row.role,
            assignedByUserId: params.hostUserId,
          })) as any,
        });
      }

      if (previousStreamWithStaff?.staffRolePermissions?.length) {
        await tx.streamStaffRolePermission.createMany({
          data: previousStreamWithStaff.staffRolePermissions.map((row) => ({
            streamId: s.id,
            role: row.role,
            permission: row.permission,
            enabled: row.enabled,
          })) as any,
        });
      }

      return s;
    });

    const payload = this.buildStreamPayload(stream, host, []);

    this.realtime.emitStreamStateUpdated(payload);
    this.realtime.emitParticipants(stream.id, await this.listParticipants(stream.id));

    if (params.visibility !== "PRIVATE") {
      try {
        const favoriteAudience = await this.getFavoriteAudienceUserIds(params.hostUserId);
        const hostDisplayName = host.profile?.displayName?.trim() || host.username;
        const hostAvatarUrl = host.profile?.avatarUrl ?? null;
        const livePushCopy = this.notifications.buildLiveStartedPushCopy({
          hostDisplayName,
          streamTitle: stream.title,
        });

        if (favoriteAudience.length > 0) {
          await this.notifications.createAndSendToUsers({
            userIds: favoriteAudience,
            notificationType: "STREAM_STARTED",
            title: livePushCopy.title,
            body: livePushCopy.body,
            payload: {
              streamId: stream.id,
              hostUserId: params.hostUserId,
              hostUsername: host.username,
              hostDisplayName,
              hostAvatarUrl,
              title: stream.title,
              visibility: stream.visibility,
              startedAt: stream.startedAt.toISOString(),
            },
            streamId: stream.id,
            dedupeKey: `stream-started:${stream.id}`,
          });
        }
      } catch (e) {
        console.warn("[StreamsService] stream-start notification hook failed:", e);
      }
    }

    return payload;
  }

  async updateLayout(streamId: string, actorUserId: string, rawLayoutGridSize: any) {
    const stream = await this.requireStream(streamId);

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "CHANGE_LAYOUT",
      "Only the host or authorized staff can change the stream layout",
    );

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    const layoutGridSize = this.normalizeLayoutGridSize(rawLayoutGridSize);
    const activeGuests = await this.getActiveGuests(streamId);
    const nextGuestCapacity = this.getGuestCapacity(layoutGridSize);

    const overflowGuests =
      activeGuests.length > nextGuestCapacity
        ? activeGuests.slice(nextGuestCapacity)
        : [];

    if (overflowGuests.length > 0) {
      const overflowGuestIds = overflowGuests
        .map((guest: any) => String((guest?.userId ?? guest?.id) || ""))
        .filter(Boolean);

      if (overflowGuestIds.length > 0) {
        await this.prisma.streamParticipant.updateMany({
          where: {
            streamId,
            role: "GUEST",
            leftAt: null,
            userId: { in: overflowGuestIds },
          },
          data: {
            role: "VIEWER",
          },
        });
      }
    }

    const updated = await this.prisma.stream.update({
      where: { id: streamId },
      data: { layoutGridSize } as any,
    });

    const refreshedGuests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(updated, stream.host, refreshedGuests);

    this.realtime.emitParticipants(streamId, await this.listParticipants(streamId));
    this.realtime.emitStreamStateUpdated(payload);

    return payload;
  }

  async updateStreamGoal(streamId: string, actorUserId: string, rawStreamGoal: any) {
    const stream = await this.requireStream(streamId);

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "EDIT_STREAM_GOAL",
      "Only the host or authorized staff can change the stream goal",
    );

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    const streamGoal = Math.max(0, Number(rawStreamGoal ?? 0) || 0);

    const updated = await this.prisma.stream.update({
      where: { id: streamId },
      data: { streamGoal } as any,
    });

    const activeGuests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(updated, stream.host, activeGuests);

    this.realtime.emitStreamStateUpdated(payload);

    return {
      ok: true,
      stream: payload,
    };
  }

  async updatePinnedMessage(streamId: string, actorUserId: string, text?: string) {
    const stream = await this.requireStream(streamId);

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "EDIT_PINNED_MESSAGE",
      "Only the host or authorized staff can pin messages",
    );

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    const pinnedMessage = text?.trim() || null;

    const updated = await this.prisma.stream.update({
      where: { id: streamId },
      data: { pinnedMessage } as any,
    });

    const activeGuests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(updated, stream.host, activeGuests);

    this.realtime.emitStreamStateUpdated(payload);

    return {
      ok: true,
      stream: payload,
    };
  }

  async updateStreamSettings(
    streamId: string,
    actorUserId: string,
    input: {
      title?: string;
      color?: string | null;
      tags?: string[];
      streamCategoryId?: string | null;
      categorySlug?: string | null;
      categoryName?: string | null;
      streamCategorySlug?: string | null;
      streamCategoryName?: string | null;
    },
  ) {
    const stream = await this.requireStream(streamId);

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "EDIT_PINNED_MESSAGE",
      "Only the host or authorized staff can edit stream info",
    );

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    const nextTitle = String(input?.title ?? stream.title ?? "").trim().slice(0, 120);
    if (!nextTitle) {
      throw new BadRequestException("Stream title is required");
    }

    const hasColor = Object.prototype.hasOwnProperty.call(input ?? {}, "color");
    const nextColor = hasColor
      ? String(input?.color ?? "").trim().slice(0, 30) || null
      : (stream as any).color;

    const categoryInput = input ?? {};
    const categoryUpdateRequested = [
      "streamCategoryId",
      "categorySlug",
      "categoryName",
      "streamCategorySlug",
      "streamCategoryName",
    ].some((field) => Object.prototype.hasOwnProperty.call(categoryInput, field));

    const categoryLookupRequested = [
      input?.streamCategoryId,
      input?.categorySlug,
      input?.categoryName,
      input?.streamCategorySlug,
      input?.streamCategoryName,
    ].some((value) => String(value ?? "").trim().length > 0);

    const selectedCategory = categoryLookupRequested
      ? await this.resolveStreamCategoryForCreate(input)
      : null;

    if (categoryLookupRequested && !selectedCategory) {
      throw new BadRequestException("Invalid stream category");
    }

    const existingTags = Array.isArray((stream as any)?.tagsJson)
      ? ((stream as any).tagsJson as any[]).map((tag) => String(tag ?? "").trim()).filter(Boolean)
      : [];

    const providedTags = Array.isArray(input?.tags)
      ? input.tags.map((tag) => String(tag ?? "").trim()).filter(Boolean)
      : existingTags;

    const streamTags = selectedCategory
      ? this.mergeStreamCategoryTags(providedTags, selectedCategory)
      : Array.from(new Set(providedTags)).slice(0, 12);

    const data: any = {
      title: nextTitle,
      color: nextColor,
      tagsJson: streamTags as any,
    };

    if (categoryUpdateRequested) {
      data.streamCategoryId = selectedCategory ? selectedCategory.id : null;
    }

    const updated = await this.prisma.stream.update({
      where: { id: streamId },
      data,
    });

    const activeGuests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(updated, stream.host, activeGuests);

    this.realtime.emitStreamStateUpdated(payload);

    return {
      ok: true,
      stream: payload,
    };
  }

  async endStream(streamId: string, actorUserId: string) {
    const stream = await this.requireStream(streamId);

    if (stream.hostUserId !== actorUserId) {
      throw new ForbiddenException("Only the host can end the stream");
    }

    if (stream.status === "ENDED") {
      return { ok: true, alreadyEnded: true };
    }

    const endedAt = new Date();
    const roomName = stream.videoRoomName || `stream-${streamId}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.stream.update({
        where: { id: streamId },
        data: {
          status: "ENDED",
          endedAt,
          endedByAdminUserId: null,
          endReason: null,
        } as any,
      });

      await tx.streamParticipant.updateMany({
        where: { streamId, leftAt: null },
        data: { leftAt: endedAt },
      });
    });

    const payload = {
      streamId,
      hostUserId: stream.hostUserId,
      status: "ENDED",
      endedAt: endedAt.toISOString(),
      endedByAdmin: false,
      endedByAdminUserId: null,
      endReason: null,
    };

    this.realtime.emitStreamEnded(payload);
    this.realtime.emitStreamStateUpdated(payload);
    this.queueLiveKitRoomTeardown(roomName);

    return { ok: true };
  }

  async endStreamAsAdmin(
    streamId: string,
    actorAdminUserId: string,
    reason: string,
  ) {
    const stream = await this.requireStream(streamId);

    if (stream.status === "ENDED") {
      return { ok: true, alreadyEnded: true };
    }

    const normalizedReason = this.normalizeEndReason(reason);

    if (!normalizedReason) {
      throw new BadRequestException("Termination reason is required");
    }

    const endedAt = new Date();
    const roomName = stream.videoRoomName || `stream-${streamId}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.stream.update({
        where: { id: streamId },
        data: {
          status: "ENDED",
          endedAt,
          endedByAdminUserId: actorAdminUserId,
          endReason: normalizedReason,
        } as any,
      });

      await tx.streamParticipant.updateMany({
        where: { streamId, leftAt: null },
        data: { leftAt: endedAt },
      });

      await tx.moderationAction.create({
        data: {
          streamId,
          action: "STREAM_TERMINATE" as any,
          targetUserId: stream.hostUserId,
          actorUserId: null,
          actorAdminUserId: actorAdminUserId,
          reason: normalizedReason,
          durationSeconds: null,
          expiresAt: null,
        },
      });
    });

    const payload = {
      streamId,
      hostUserId: stream.hostUserId,
      status: "ENDED",
      endedAt: endedAt.toISOString(),
      endedByAdmin: true,
      endedByAdminUserId: actorAdminUserId,
      endReason: normalizedReason,
    };

    this.realtime.emitAdminStreamTermination(payload);
    this.realtime.emitStreamEnded(payload);
    this.realtime.emitStreamStateUpdated(payload);

    this.realtime.disconnectUserFromStream(
      streamId,
      stream.hostUserId,
      "Your stream was ended by an admin.",
      150,
    );

    this.queueLiveKitRoomTeardown(roomName);

    return { ok: true };
  }

  async getStream(streamId: string) {
    const stream = await this.requireStream(streamId);
    const tags = (stream.tagsJson as any[]) ?? [];
    const layoutGridSize = this.normalizeLayoutGridSize((stream as any).layoutGridSize);
    const guests = await this.getActiveGuests(streamId);

    const [hostLifetimeTotals, streamTotals, hostStreamTotals] = await Promise.all([
      this.prisma.giftTransaction.aggregate({
        where: { recipientUserId: stream.hostUserId },
        _sum: { diamondValue: true },
      }),
      this.prisma.giftTransaction.aggregate({
        where: { streamId },
        _sum: { diamondValue: true },
      }),
      this.prisma.giftTransaction.aggregate({
        where: {
          streamId,
          recipientUserId: stream.hostUserId,
        },
        _sum: { diamondValue: true },
      }),
    ]);

    return {
      id: stream.id,
      hostUserId: stream.hostUserId,
      host: this.userSummary(stream.host),
      hostTotalDiamonds: Number(hostLifetimeTotals._sum.diamondValue ?? 0),
      streamTotalDiamonds: Number(streamTotals._sum.diamondValue ?? 0),
      hostStreamDiamonds: Number(hostStreamTotals._sum.diamondValue ?? 0),
      title: stream.title,
      color: stream.color,
      status: stream.status,
      visibility: stream.visibility,
      tags,
      guests,
      layoutGridSize,
      gridSize: layoutGridSize,
      streamGoal: Number((stream as any)?.streamGoal ?? 0),
      pinnedMessage: (stream as any)?.pinnedMessage ?? null,
      startedAt: stream.startedAt.toISOString(),
      endedAt: stream.endedAt ? stream.endedAt.toISOString() : null,
      endedByAdminUserId: (stream as any)?.endedByAdminUserId ?? null,
      endReason: (stream as any)?.endReason ?? null,
      endedByAdmin: Boolean((stream as any)?.endedByAdminUserId),
      isAudioOnly: Boolean((stream as any)?.isAudioOnly),
    };
  }

  async createGuestRequest(streamId: string, userId: string) {
    const stream = await this.requireStream(streamId);

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    if (stream.hostUserId === userId) {
      throw new BadRequestException("Host cannot request to join as guest");
    }

    const [bannedFromStream, kickedFromStream, blockedByHost] = await Promise.all([
      this.isBanned(streamId, userId),
      this.hasKickRestriction(streamId, userId),
      this.isBlockedByHost(stream.hostUserId, userId),
    ]);

    if (bannedFromStream) {
      throw new ForbiddenException("Cannot request guest box while banned from this stream");
    }

    if (kickedFromStream) {
      throw new ForbiddenException("Cannot request guest box after being kicked from this stream");
    }

    if (blockedByHost) {
      throw new ForbiddenException("Cannot request guest box while blocked by this host");
    }

    const activeGuests = await this.getActiveGuests(streamId);

    const alreadyGuest = activeGuests.some(
      (guest: any) => String(guest?.userId ?? guest?.id) === String(userId),
    );

    if (alreadyGuest) {
      throw new BadRequestException("You are already in a guest box");
    }

    const existingPending = await this.prisma.streamGuestRequest.findFirst({
      where: {
        streamId,
        userId,
        status: "PENDING",
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (existingPending) {
      return {
        ok: true,
        request: this.guestRequestSummary(existingPending),
      };
    }

    const created = await this.prisma.streamGuestRequest.create({
      data: {
        streamId,
        userId,
        status: "PENDING",
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    return {
      ok: true,
      request: this.guestRequestSummary(created),
    };
  }

  async listGuestRequests(streamId: string, actorUserId: string) {
    const stream = await this.requireStream(streamId);

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "APPROVE_GUEST_REQUESTS",
      "Only the host or authorized staff can view guest requests",
    );

    const requests = await this.prisma.streamGuestRequest.findMany({
      where: {
        streamId,
        status: "PENDING",
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      items: requests.map((request) => this.guestRequestSummary(request)),
    };
  }

  async approveGuestRequest(streamId: string, requestId: string, actorUserId: string) {
    const stream = await this.requireStream(streamId);

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "APPROVE_GUEST_REQUESTS",
      "Only the host or authorized staff can approve guest requests",
    );

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    const request = await this.prisma.streamGuestRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (!request || request.streamId !== streamId) {
      throw new NotFoundException("Guest request not found");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("Guest request is no longer pending");
    }

    const [bannedFromStream, kickedFromStream, blockedByHost] = await Promise.all([
      this.isBanned(streamId, request.user.id),
      this.hasKickRestriction(streamId, request.user.id),
      this.isBlockedByHost(stream.hostUserId, request.user.id),
    ]);

    if (bannedFromStream || kickedFromStream || blockedByHost) {
      await this.prisma.streamGuestRequest.update({
        where: { id: requestId },
        data: { status: "DENIED" },
      });

      if (bannedFromStream) {
        throw new ForbiddenException("Cannot approve guest request for a banned user");
      }

      if (kickedFromStream) {
        throw new ForbiddenException("Cannot approve guest request for a kicked user");
      }

      throw new ForbiddenException("Cannot approve guest request for a user blocked by the host");
    }

    const roomName = stream.videoRoomName || this.buildVideoRoomName(streamId);

    await this.setLiveKitParticipantPublishPermission(roomName, request.user.id, true, {
      requireParticipant: true,
      timeoutMs: 5000,
    });

    const currentLayoutGridSize = this.normalizeLayoutGridSize(
      (stream as any).layoutGridSize,
    );

    const activeGuests = await this.getActiveGuests(streamId);

    const alreadyGuest = activeGuests.some(
      (guest: any) => String(guest?.userId ?? guest?.id) === String(request.user.id),
    );

    const nextGuestCount = alreadyGuest ? activeGuests.length : activeGuests.length + 1;
    const nextLayoutGridSize = this.getExpandedLayoutIfNeeded(
      currentLayoutGridSize,
      nextGuestCount,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        const guestJoinedAt = new Date();

        const existingParticipant = await tx.streamParticipant.findFirst({
          where: {
            streamId,
            userId: request.user.id,
          },
          select: {
            id: true,
            role: true,
            joinedAt: true,
            leftAt: true,
          },
        });

        if (!existingParticipant) {
          await tx.streamParticipant.create({
            data: {
              streamId,
              userId: request.user.id,
              role: "GUEST",
              joinedAt: guestJoinedAt,
              lastPingAt: guestJoinedAt,
            },
          });
        } else {
          await tx.streamParticipant.update({
            where: { id: existingParticipant.id },
            data: {
              role: "GUEST",
              leftAt: null,
              joinedAt: existingParticipant.leftAt ? guestJoinedAt : existingParticipant.joinedAt,
              lastPingAt: guestJoinedAt,
            },
          });
        }

        if (nextLayoutGridSize !== currentLayoutGridSize) {
          await tx.stream.update({
            where: { id: streamId },
            data: { layoutGridSize: nextLayoutGridSize } as any,
          });
        }

        await tx.streamGuestRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED" },
        });

        await tx.streamGuestRequest.updateMany({
          where: {
            streamId,
            userId: request.user.id,
            status: "PENDING",
            id: { not: requestId },
          },
          data: { status: "DENIED" },
        });
      });
    } catch (error) {
      await this.setLiveKitParticipantPublishPermission(roomName, request.user.id, false, {
        requireParticipant: false,
        timeoutMs: 2500,
      }).catch(() => { });

      throw error;
    }

    this.clearGuestMediaState(streamId, request.user.id);

    const refreshedStream = await this.requireStream(streamId);
    const guests = await this.getActiveGuests(streamId);
    const payload = this.buildStreamPayload(refreshedStream, refreshedStream.host, guests);

    this.realtime.emitParticipants(streamId, await this.listParticipants(streamId));
    this.realtime.emitStreamStateUpdated(payload);

    return {
      ok: true,
      stream: payload,
      approvedRequest: this.guestRequestSummary(request),
    };
  }

  async denyGuestRequest(streamId: string, requestId: string, actorUserId: string) {
    const stream = await this.requireStream(streamId);

    await this.streamStaff.assertHasPermission(
      streamId,
      actorUserId,
      "APPROVE_GUEST_REQUESTS",
      "Only the host or authorized staff can deny guest requests",
    );

    const request = await this.prisma.streamGuestRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (!request || request.streamId !== streamId) {
      throw new NotFoundException("Guest request not found");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("Guest request is no longer pending");
    }

    await this.prisma.streamGuestRequest.update({
      where: { id: requestId },
      data: { status: "DENIED" },
    });

    return {
      ok: true,
      deniedRequest: this.guestRequestSummary(request),
    };
  }

  async listLive() {
    const streams = await this.prisma.stream.findMany({
      where: { status: "LIVE" },
      include: { host: { include: { profile: true } } },
      orderBy: { startedAt: "desc" },
    });

    const ids = streams.map((s) => s.id);
    const [counts, guestMap] = await Promise.all([
      this.prisma.streamParticipant.groupBy({
        by: ["streamId", "role"],
        where: { streamId: { in: ids }, leftAt: null },
        _count: { _all: true },
      }),
      this.getActiveGuestsMap(ids),
    ]);

    const countMap = new Map<string, number>();
    for (const c of counts) {
      if ((c as any).role === "HOST") continue;
      countMap.set(
        (c as any).streamId,
        (countMap.get((c as any).streamId) ?? 0) + (c as any)._count._all,
      );
    }

    return streams.map((s) => {
      const layoutGridSize = this.normalizeLayoutGridSize((s as any).layoutGridSize);

      return {
        id: s.id,
        title: s.title,
        color: s.color,
        host: this.userSummary(s.host),
        viewerCount: countMap.get(s.id) ?? 0,
        guests: guestMap.get(s.id) ?? [],
        layoutGridSize,
        gridSize: layoutGridSize,
        isAudioOnly: Boolean((s as any)?.isAudioOnly),
        streamGoal: Number((s as any)?.streamGoal ?? 0),
        pinnedMessage: (s as any)?.pinnedMessage ?? null,
        startedAt: s.startedAt.toISOString(),
        tags: (s.tagsJson as any[]) ?? [],
      };
    });
  }

  async join(streamId: string, userId: string) {
    await this.assertUserCanUseLive(userId);

    const [stream, banned, assignedRole, existingParticipant] = await Promise.all([
      this.requireStream(streamId),
      this.isBanned(streamId, userId),
      this.getAssignedRole(streamId, userId),
      this.prisma.streamParticipant.findFirst({
        where: { streamId, userId },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          leftAt: true,
        },
      }),
    ]);

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream is not live");
    }

    if (banned) {
      throw new ForbiddenException("Banned");
    }

    if (stream.hostUserId !== userId) {
      const [blockedByHost, kickedFromStream] = await Promise.all([
        this.isBlockedByHost(stream.hostUserId, userId),
        this.hasKickRestriction(streamId, userId),
      ]);

      if (blockedByHost) {
        throw new ForbiddenException("Blocked by host");
      }

      if (kickedFromStream) {
        throw new ForbiddenException("Kicked from stream");
      }
    }

    const role: StreamRole = assignedRole ?? existingParticipant?.role ?? "VIEWER";
    const now = new Date();
    const isFirstJoinOfThisStream = !existingParticipant;

    let joinedParticipant:
      | {
        id: string;
        joinedAt: Date;
      }
      | null = null;

    if (existingParticipant) {
      const wasInactive = !!existingParticipant.leftAt;

      const updatedParticipant = await this.prisma.streamParticipant.update({
        where: { id: existingParticipant.id },
        data: {
          role,
          leftAt: null,
          joinedAt: wasInactive ? now : existingParticipant.joinedAt,
          lastPingAt: now,
        },
        select: { id: true, joinedAt: true },
      });

      if (wasInactive) {
        joinedParticipant = updatedParticipant;
      }
    } else {
      joinedParticipant = await this.prisma.streamParticipant.create({
        data: {
          streamId,
          userId,
          role,
          joinedAt: now,
          lastPingAt: now,
        },
        select: { id: true, joinedAt: true },
      });
    }

    this.listParticipants(streamId)
      .then((parts) => {
        this.realtime.emitParticipants(streamId, parts);
      })
      .catch(() => { });

    if (joinedParticipant && isFirstJoinOfThisStream) {
      const joinedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (joinedUser) {
        const joinedUserSummary = this.userSummary(joinedUser);
        const joinedDisplayName =
          joinedUserSummary.displayName?.trim() || joinedUserSummary.username;

        this.realtime.emitChatMessage({
          streamId,
          message: {
            id: `stream-join-${streamId}-${joinedParticipant.id}`,
            user: joinedUserSummary,
            text: `${joinedDisplayName} Has joined`,
            type: "event",
            createdAt: joinedParticipant.joinedAt.toISOString(),
            replyToMessageId: null,
            badges: undefined,
          },
        });
      }
    }

    return { ok: true, role };
  }

  async leave(streamId: string, userId: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        status: true,
        hostUserId: true,
      },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    // The host leaving the socket/screen is NOT the same thing as ending the stream.
    // Manual stream ending must happen through /streams/:id/end.
    // App-kill auto-ending is handled by sweepGhostParticipants after the host grace window.
    if (stream.hostUserId === userId) {
      await this.prisma.streamParticipant.updateMany({
        where: {
          streamId,
          userId,
          leftAt: null,
          role: "HOST",
        },
        data: {
          lastPingAt: new Date(),
        },
      });

      this.realtime.emitParticipants(streamId, await this.listParticipants(streamId));

      return {
        ok: true,
        hostLeaveIgnored: true,
      };
    }

    const endedAt = new Date();

    await this.prisma.streamParticipant.updateMany({
      where: {
        streamId,
        userId,
        leftAt: null,
        role: { not: "HOST" },
      },
      data: { leftAt: endedAt },
    });

    this.realtime.emitParticipants(streamId, await this.listParticipants(streamId));
    return { ok: true };
  }

  async recordPing(streamId: string, userId: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        status: true,
        hostUserId: true,
      },
    });

    if (!stream || stream.status !== "LIVE") {
      return {
        ok: false,
        streamLive: false,
      };
    }

    if (stream.hostUserId !== userId) {
      const [bannedFromStream, kickedFromStream, blockedByHost] = await Promise.all([
        this.isBanned(streamId, userId),
        this.hasKickRestriction(streamId, userId),
        this.isBlockedByHost(stream.hostUserId, userId),
      ]);

      if (bannedFromStream || kickedFromStream || blockedByHost) {
        return {
          ok: false,
          streamLive: true,
          restrictedByKickOrBan: bannedFromStream || kickedFromStream,
          blockedByHost,
        };
      }
    }

    const role: StreamRole = stream.hostUserId === userId ? "HOST" : "VIEWER";
    const now = new Date();

    const updated = await this.prisma.streamParticipant.updateMany({
      where: {
        streamId,
        userId,
        leftAt: null,
      },
      data: {
        lastPingAt: now,
      },
    });

    // Pings must never create or reactivate stream participants.
    // /startup and /join are the only stream-entry paths that should activate a participant.
    // This preserves once-per-stream join notices and prevents background/delayed pings
    // from making join() think the user already entered the stream.
    if (updated.count === 0) {
      return {
        ok: false,
        streamLive: true,
        participantActive: false,
      };
    }

    return { ok: true };
  }

  async sweepGhostParticipants() {
    const now = Date.now();

    const hostCutoff = new Date(now - HOST_GHOST_SWEEP_GRACE_MS);
    const guestCutoff = new Date(now - GUEST_GHOST_SWEEP_GRACE_MS);

    const ghosts = await this.prisma.streamParticipant.findMany({
      where: {
        leftAt: null,
        OR: [
          {
            role: "HOST",
            lastPingAt: { lt: hostCutoff },
            stream: {
              status: "LIVE",
            },
          },
          {
            role: "GUEST",
            lastPingAt: { lt: guestCutoff },
            stream: {
              status: "LIVE",
            },
          },
        ],
      },
      include: {
        stream: {
          select: {
            id: true,
            status: true,
            hostUserId: true,
            videoRoomName: true,
          },
        },
      },
    });

    if (ghosts.length === 0) return 0;

    let sweptCount = 0;

    for (const ghost of ghosts) {
      if (ghost.stream?.status !== "LIVE") {
        continue;
      }

      if (ghost.role === "HOST") {
        if (!this.hasParticipantPingedAfterJoin(ghost) && this.isWithinHostStartupGrace(ghost)) {
          this.logger.log(
            `Skipping ghost host cleanup during startup grace streamId=${ghost.streamId} userId=${ghost.userId}`,
          );
          continue;
        }

        const liveKitConnected = await this.isLiveKitParticipantConnectedForSweep({
          streamId: ghost.streamId,
          videoRoomName: (ghost.stream as any)?.videoRoomName ?? null,
          userId: ghost.userId,
        });

        if (liveKitConnected) {
          await this.markParticipantSeen(ghost.id);
          continue;
        }

        if (ghost.stream.hostUserId === ghost.userId) {
          const endedGhostStream = await this.endGhostHostStream({
            streamId: ghost.streamId,
            hostUserId: ghost.userId,
            videoRoomName: (ghost.stream as any)?.videoRoomName ?? null,
            endedAt: new Date(),
          });

          if (endedGhostStream) {
            sweptCount++;
          } else {
            this.logger.log(
              `Skipped ghost host stream end because stream was already ended streamId=${ghost.streamId} hostUserId=${ghost.userId}`,
            );
          }

          continue;
        }

        await this.prisma.streamParticipant.update({
          where: { id: ghost.id },
          data: { leftAt: new Date() },
        });

        this.logger.warn(
          `Ghost host participant marked left streamId=${ghost.streamId} userId=${ghost.userId}`,
        );

        sweptCount++;
        continue;
      }

      if (ghost.role === "GUEST") {
        const liveKitConnected = await this.isLiveKitParticipantConnectedForSweep({
          streamId: ghost.streamId,
          videoRoomName: (ghost.stream as any)?.videoRoomName ?? null,
          userId: ghost.userId,
        });

        if (liveKitConnected) {
          await this.markParticipantSeen(ghost.id);
          continue;
        }

        await this.prisma.streamParticipant.update({
          where: { id: ghost.id },
          data: {
            role: "VIEWER",
            leftAt: new Date(),
          },
        });

        this.clearGuestMediaState(ghost.streamId, ghost.userId);

        this.logger.warn(
          `Ghost guest removed from guest box streamId=${ghost.streamId} userId=${ghost.userId}`,
        );

        const refreshedStream = await this.requireStream(ghost.streamId).catch(() => null);

        if (refreshedStream) {
          const activeGuests = await this.getActiveGuests(ghost.streamId);
          const payload = this.buildStreamPayload(
            refreshedStream,
            refreshedStream.host,
            activeGuests,
          );

          this.realtime.emitParticipants(
            ghost.streamId,
            await this.listParticipants(ghost.streamId),
          );

          this.realtime.emitStreamStateUpdated(payload);
        }

        sweptCount++;
      }
    }

    return sweptCount;
  }

  async getPublicStreamCategories() {
    const categories = await (this.prisma as any).streamCategory.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sortOrder: true,
        isEnabled: true,
        updatedAt: true,
      },
    });

    return {
      items: categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? null,
        sortOrder: Number(category.sortOrder ?? 0),
        isEnabled: Boolean(category.isEnabled),
        updatedAt: category.updatedAt instanceof Date ? category.updatedAt.toISOString() : category.updatedAt,
      })),
    };
  }

}

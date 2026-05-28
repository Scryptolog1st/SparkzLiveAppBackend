import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";

import { PresenceService } from "./presence.service";
import { PrismaService } from "../prisma/prisma.service";
import { SystemLogEventsService } from "../api-observability/system-log-events.service";

type JwtAccessPayload = {
  sub: string;
  username?: string;
};

type ChatSendBody = {
  streamId: string;
  text: string;
  replyToMessageId?: string | null;
};

type HeartBody = {
  streamId: string;
};

type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type HeartSenderState = {
  user: UserSummary;
  count: number;
};

type SocketUserData = {
  userId?: string;
  username?: string;
  userSummary?: UserSummary;
};

type ForceStreamRemovalReason =
  | "BLOCKED_BY_HOST"
  | "KICKED_FROM_STREAM"
  | "BANNED_FROM_STREAM";

type ForceStreamRemovalDetails = {
  actionId?: string | null;
  expiresAt?: string | null;
  durationSeconds?: number | null;
  durationLabel?: string | null;
  remainingSeconds?: number | null;
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly chatBuckets = new Map<string, number[]>();
  private readonly heartBuckets = new Map<string, number[]>();

  private readonly streamHeartTotals = new Map<string, number>();
  private readonly streamHeartSenders = new Map<
    string,
    Map<string, HeartSenderState>
  >();
  private readonly streamHeartActiveSenders = new Map<
    string,
    Map<string, number>
  >();

  private readonly defaultBlacklist = [
    "scam*",
    "free followers",
    "onlyfans.com/*",
    "cashapp me",
    "*slur1*",
    "*slur2*",
  ];

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly presence: PresenceService,
    private readonly prisma: PrismaService,
    private readonly systemLogEvents: SystemLogEventsService,
  ) { }

  private accessSecret(): string {
    return this.config.get<string>("JWT_ACCESS_SECRET")!;
  }

  private getToken(socket: Socket): string | null {
    const authToken = (socket.handshake.auth as any)?.token;
    if (typeof authToken === "string" && authToken.length > 0) {
      return authToken;
    }

    const header = socket.handshake.headers["authorization"];
    if (
      typeof header === "string" &&
      header.toLowerCase().startsWith("bearer ")
    ) {
      return header.slice(7);
    }

    return null;
  }

  private room(streamId: string) {
    return `stream:${streamId}`;
  }

  private toast(
    socket: Socket,
    type: "info" | "success" | "warning" | "error",
    message: string,
    streamId?: string,
  ) {
    socket.emit("system.toast", { type, message, streamId });
  }

  private buildForceRemovalPayload(
    reason: ForceStreamRemovalReason,
    targetUserId: string,
    streamId: string,
    message: string,
    details: ForceStreamRemovalDetails = {},
  ) {
    return {
      reason,
      targetUserId,
      streamId,
      message,
      actionId: details.actionId ?? null,
      expiresAt: details.expiresAt ?? null,
      durationSeconds: details.durationSeconds ?? null,
      durationLabel: details.durationLabel ?? null,
      remainingSeconds: details.remainingSeconds ?? null,
    };
  }

  private emitForceRemovalToSocket(
    socket: Socket,
    reason: ForceStreamRemovalReason,
    targetUserId: string,
    streamId: string,
    message: string,
    details: ForceStreamRemovalDetails = {},
  ) {
    socket.emit(
      "FORCE_KICK",
      this.buildForceRemovalPayload(reason, targetUserId, streamId, message, details),
    );
  }

  private emitToUser(
    userId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  private writeRealtimeLog(params: {
    level: "WARN" | "ERROR";
    category: string;
    message: string;
    streamId?: string | null;
    userId?: string | null;
    detailsJson?: Prisma.InputJsonValue;
  }) {
    void this.systemLogEvents.writeDeduped({
      source: "REALTIME",
      level: params.level,
      category: params.category,
      message: params.message,
      streamId: params.streamId ?? null,
      userId: params.userId ?? null,
      detailsJson: params.detailsJson,
      fingerprint: [
        params.category,
        params.message,
        params.streamId ?? "",
        params.userId ?? "",
      ].join("|"),
      dedupeWindowMs: 5 * 60 * 1000,
    });
  }

  private async getPlatformBanState(userId: string) {
    const row = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;

    if (!row?.isPlatformBanned) return null;

    const expiresAt =
      row.platformBanExpiresAt instanceof Date ? row.platformBanExpiresAt : null;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      isPlatformBanned: true,
      platformBanIssuedAt:
        row.platformBanIssuedAt instanceof Date ? row.platformBanIssuedAt : null,
      platformBanExpiresAt: expiresAt,
      platformBanReason:
        typeof row.platformBanReason === "string" ? row.platformBanReason : null,
      platformBannedByAdminUserId:
        typeof row.platformBannedByAdminUserId === "string"
          ? row.platformBannedByAdminUserId
          : null,
    };
  }

  emitUserGloballyBanned(payload: {
    userId: string;
    reason: string;
    bannedAt: string;
    expiresAt: string | null;
    bannedByAdminUserId?: string | null;
    activeStreamId?: string | null;
  }) {
    this.server.to(`user:${payload.userId}`).emit("user.globally.banned", payload);
  }

  disconnectUserEverywhere(
    targetUserId: string,
    toastMessage?: string,
    disconnectDelayMs = 150,
  ) {
    const sockets = (this.server as any)?.sockets?.sockets as
      | Map<string, Socket>
      | undefined;
    if (!sockets) return;

    for (const [socketId, s] of sockets.entries()) {
      const uid = (s.data as SocketUserData)?.userId;
      if (uid !== targetUserId) continue;

      if (toastMessage) {
        try {
          s.emit("system.toast", { type: "error", message: toastMessage });
        } catch (error) {
          this.writeRealtimeLog({
            level: "WARN",
            category: "EMIT_FAILURE",
            message:
              "Failed to emit disconnect toast while disconnecting user everywhere.",
            userId: targetUserId,
            detailsJson: {
              socketId,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }

      this.presence.leaveBySocket(socketId);

      const rooms = Array.from(
        (((s as any).rooms?.values?.() ?? []) as Iterable<string>),
      );

      for (const room of rooms) {
        if (room === socketId) continue;

        try {
          s.leave(room);
        } catch (error) {
          this.writeRealtimeLog({
            level: "WARN",
            category: "SOCKET_LEAVE_FAILURE",
            message: "Failed to force socket out of joined room.",
            userId: targetUserId,
            detailsJson: {
              socketId,
              room,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }

      if (disconnectDelayMs > 0) {
        setTimeout(() => {
          try {
            s.disconnect(true);
          } catch (error) {
            this.writeRealtimeLog({
              level: "WARN",
              category: "SOCKET_DISCONNECT_FAILURE",
              message: "Failed to disconnect realtime socket.",
              userId: targetUserId,
              detailsJson: {
                socketId,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            });
          }
        }, disconnectDelayMs);
      } else {
        try {
          s.disconnect(true);
        } catch (error) {
          this.writeRealtimeLog({
            level: "WARN",
            category: "SOCKET_DISCONNECT_FAILURE",
            message: "Failed to disconnect realtime socket.",
            userId: targetUserId,
            detailsJson: {
              socketId,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }
    }
  }

  async broadcastSystemChatToAllLiveStreams(input: {
    text: string;
    severity?: "danger" | "warning" | "info";
    kind?: string;
    createdAt?: string;
  }) {
    const liveStreams = await this.prisma.stream.findMany({
      where: { status: "LIVE" },
      select: { id: true },
    });

    const createdAt = input.createdAt ?? new Date().toISOString();

    for (const stream of liveStreams) {
      this.emitChatMessage({
        streamId: stream.id,
        message: {
          id: `system-${input.kind ?? "notice"}-${stream.id}-${Date.now()}`,
          user: {
            id: "system",
            username: "system",
            displayName: "System",
            avatarUrl: null,
          },
          text: input.text,
          type: "event",
          systemKind: input.kind ?? "notice",
          severity: input.severity ?? "info",
          createdAt,
          replyToMessageId: null,
          badges: undefined,
        },
      });
    }
  }

  emitChatDeleted(payload: { streamId: string; message: any }) {
    this.server.emit("chat.deleted", payload);
    this.server.to(this.room(payload.streamId)).emit("chat.deleted", payload);

    this.server.emit("chat.message.updated", payload);
    this.server
      .to(this.room(payload.streamId))
      .emit("chat.message.updated", payload);
  }

  emitTimeoutStarted(payload: {
    userId: string;
    streamId: string;
    expiresAt: string | null;
    remainingSeconds: number | null;
    message: string;
  }) {
    this.emitToUser(payload.userId, "user.timeout.started", payload);
  }

  emitTimeoutCleared(payload: {
    userId: string;
    streamId: string;
    message?: string;
  }) {
    this.emitToUser(payload.userId, "user.timeout.cleared", {
      message: payload.message ?? "Your timeout has been lifted.",
      ...payload,
    });
  }

  emitChatMuteStarted(payload: {
    userId: string;
    streamId: string;
    message: string;
  }) {
    this.emitToUser(payload.userId, "user.chatmute.started", payload);
  }

  emitChatMuteCleared(payload: {
    userId: string;
    streamId: string;
    message?: string;
  }) {
    this.emitToUser(payload.userId, "user.chatmute.cleared", {
      message: payload.message ?? "You were unmuted in this live chat.",
      ...payload,
    });
  }

  emitChatMuteBlocked(payload: {
    userId: string;
    streamId: string;
    message: string;
  }) {
    this.emitToUser(payload.userId, "user.chatmute.blocked", payload);
  }

  emitTimeoutBlocked(payload: {
    userId: string;
    streamId: string;
    expiresAt: string | null;
    remainingSeconds: number | null;
    message: string;
  }) {
    this.emitToUser(payload.userId, "user.timeout.blocked", payload);
  }

  private consume(
    bucket: Map<string, number[]>,
    key: string,
    limit: number,
    windowMs: number,
  ): boolean {
    const now = Date.now();
    const arr = bucket.get(key) ?? [];
    const fresh = arr.filter((t) => now - t <= windowMs);
    fresh.push(now);
    bucket.set(key, fresh);
    return fresh.length <= limit;
  }

  private async getMuteRestriction(streamId: string, userId: string) {
    const now = new Date();

    return this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "MUTE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  private async getKickRestriction(streamId: string, userId: string) {
    return this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "KICKED",
      },
    });
  }

  private async getBanRestriction(streamId: string, userId: string) {
    const now = new Date();

    return this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "BAN",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        reason: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  private async getChatMuteRestriction(streamId: string, userId: string) {
    return this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "CHAT_MUTE",
      },
    });
  }

  private remainingSecondsFromDate(expiresAt?: Date | null) {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  }

  private async isActiveParticipant(
    streamId: string,
    userId: string,
  ): Promise<boolean> {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return false;
    if (stream.status !== "LIVE") return false;

    if (stream.hostUserId === userId) return true;

    const participant = await this.prisma.streamParticipant.findFirst({
      where: { streamId, userId, leftAt: null },
    });

    return !!participant;
  }

  private userSummary(user: any): UserSummary {
    const displayName =
      typeof user?.profile?.displayName === "string"
        ? user.profile.displayName.trim()
        : "";

    return {
      id: user.id,
      username: user.username,
      displayName: displayName || user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
    };
  }

  private async findUserSummary(userId: string): Promise<UserSummary | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    return user ? this.userSummary(user) : null;
  }

  private async getSocketUserSummary(
    socket: Socket,
    userId: string,
  ): Promise<UserSummary | null> {
    const data = socket.data as SocketUserData;
    if (data.userSummary?.id === userId) {
      return data.userSummary;
    }

    const summary = await this.findUserSummary(userId);
    if (summary) {
      data.userSummary = summary;
      data.username = summary.username;
    }
    return summary;
  }

  private async emitParticipantsForStream(streamId: string) {
    const rows = await this.prisma.streamParticipant.findMany({
      where: { streamId, leftAt: null },
      include: { user: { include: { profile: true } } },
      orderBy: { joinedAt: "asc" },
    });

    this.emitParticipants(
      streamId,
      rows.map((p) => ({
        user: this.userSummary(p.user),
        role: p.role,
        joinedAt: p.joinedAt.toISOString(),
      })),
    );
  }

  private hasOtherSocketInRoom(
    streamId: string,
    userId: string,
    excludeSocketId?: string,
  ) {
    const room = this.room(streamId);
    const sockets = (this.server as any)?.sockets?.sockets as
      | Map<string, Socket>
      | undefined;
    if (!sockets) return false;

    for (const [socketId, socket] of sockets.entries()) {
      if (excludeSocketId && socketId === excludeSocketId) continue;
      if ((socket.data as SocketUserData)?.userId !== userId) continue;

      const inRoom = (socket as any).rooms?.has?.(room);
      if (inRoom) return true;
    }

    return false;
  }

  private pruneActiveHeartSenders(streamId: string, now = Date.now()) {
    const activeSenderMap =
      this.streamHeartActiveSenders.get(streamId) ?? new Map<string, number>();

    for (const [senderUserId, lastSeenAt] of activeSenderMap.entries()) {
      if (now - lastSeenAt > 1800) {
        activeSenderMap.delete(senderUserId);
      }
    }

    if (activeSenderMap.size > 0) {
      this.streamHeartActiveSenders.set(streamId, activeSenderMap);
    } else {
      this.streamHeartActiveSenders.delete(streamId);
    }

    return activeSenderMap;
  }

  private clearActiveHeartSender(streamId: string, userId?: string) {
    if (!userId) return;

    const activeSenderMap = this.streamHeartActiveSenders.get(streamId);
    if (!activeSenderMap) return;

    activeSenderMap.delete(userId);

    if (activeSenderMap.size > 0) {
      this.streamHeartActiveSenders.set(streamId, activeSenderMap);
    } else {
      this.streamHeartActiveSenders.delete(streamId);
    }
  }

  private recordHeart(streamId: string, user: UserSummary) {
    const now = Date.now();

    const totalHearts = (this.streamHeartTotals.get(streamId) ?? 0) + 1;
    this.streamHeartTotals.set(streamId, totalHearts);

    const senderMap =
      this.streamHeartSenders.get(streamId) ?? new Map<string, HeartSenderState>();
    const existing = senderMap.get(user.id);

    senderMap.set(user.id, {
      user,
      count: (existing?.count ?? 0) + 1,
    });

    this.streamHeartSenders.set(streamId, senderMap);

    const activeSenderMap = this.pruneActiveHeartSenders(streamId, now);
    activeSenderMap.set(user.id, now);
    this.streamHeartActiveSenders.set(streamId, activeSenderMap);

    return {
      totalHearts,
      userCount: senderMap.get(user.id)?.count ?? 1,
      activeHeartSenderCount: activeSenderMap.size,
    };
  }

  getHeartSnapshot(streamId: string) {
    const totalHearts = this.streamHeartTotals.get(streamId) ?? 0;
    const senderMap =
      this.streamHeartSenders.get(streamId) ?? new Map<string, HeartSenderState>();
    const activeSenderMap = this.pruneActiveHeartSenders(streamId);

    const heartsList = Array.from(senderMap.values())
      .map(({ user, count }) => ({
        id: user.id,
        username: user.username,
        name: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        count,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });

    return {
      totalHearts,
      heartsList,
      activeHeartSenderCount: activeSenderMap.size,
    };
  }

  async handleConnection(socket: Socket) {
    const token = this.getToken(socket);
    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = this.jwt.verify<JwtAccessPayload>(token, {
        secret: this.accessSecret(),
      });

      if (!payload.sub) {
        throw new Error("No user ID found in JWT payload");
      }

      const platformBan = await this.getPlatformBanState(payload.sub);
      if (platformBan) {
        socket.emit("user.globally.banned", {
          userId: payload.sub,
          reason: platformBan.platformBanReason ?? "Account banned.",
          bannedAt: platformBan.platformBanIssuedAt
            ? platformBan.platformBanIssuedAt.toISOString()
            : new Date().toISOString(),
          expiresAt: platformBan.platformBanExpiresAt
            ? platformBan.platformBanExpiresAt.toISOString()
            : null,
          bannedByAdminUserId: platformBan.platformBannedByAdminUserId ?? null,
          activeStreamId: null,
        });
        socket.disconnect(true);
        return;
      }

      const summary = await this.findUserSummary(payload.sub);
      if (!summary) {
        throw new Error("User not found for socket connection");
      }

      const data = socket.data as SocketUserData;
      data.userId = payload.sub;
      data.username = summary.username;
      data.userSummary = summary;

      socket.join(`user:${payload.sub}`);
      console.log(
        `[SOCKET] User ${payload.sub} connected and joined private room user:${payload.sub}.`,
      );
    } catch (error) {
      console.error("[SOCKET] Connection rejected:", error);
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket) {
    const data = socket.data as SocketUserData;
    const userId = data.userId;
    const userSummary = data.userSummary;
    const streamId = this.presence.leaveBySocket(socket.id);

    if (streamId) {
      const count = this.presence.count(streamId);
      const hasOtherSocket =
        !!userId && this.hasOtherSocketInRoom(streamId, userId, socket.id);
      if (userId && !hasOtherSocket) {
        // Patch 34R:
        // Ordinary socket disconnects can be Android background/reconnect events.
        // Do not mark streamParticipant.leftAt here, because that desyncs backend
        // participation from LiveKit media and causes actions such as gifts/chat
        // to fail with "Join stream first" after resume.
        //
        // Explicit stream.leave, kick/ban/remove-guest, stream end, and ghost sweep
        // remain responsible for marking participants as left.
        this.clearActiveHeartSender(streamId, userId);
      }

      this.emitViewerCount(streamId, count);
    }
  }

  private emitViewerCount(streamId: string, count: number) {
    this.server.emit("stream.viewerCount", { streamId, count });
    this.server
      .to(this.room(streamId))
      .emit("stream.viewerCount", { streamId, count });
  }

  private emitStreamJoined(
    streamId: string,
    payload: { user: UserSummary; role: string },
  ) {
    const event = { streamId, ...payload };
    this.server.emit("stream.joined", event);
    this.server.to(this.room(streamId)).emit("stream.joined", event);
  }

  private emitStreamLeft(
    streamId: string,
    userId: string | null,
    user?: UserSummary | null,
  ) {
    const payload = {
      streamId,
      userId,
      ...(user ? { user } : {}),
    };

    this.server.emit("stream.left", payload);
    this.server.to(this.room(streamId)).emit("stream.left", payload);
  }

  @SubscribeMessage("stream.join")
  async joinStream(
    @MessageBody() body: { streamId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const streamId = body?.streamId;
    const userId = (socket.data as SocketUserData).userId;
    if (!streamId || !userId) return;

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { hostUserId: true },
    });

    console.log(
      `[STREAM JOIN] User ${userId} attempting to join Stream ${streamId}`,
    );

    if (stream && stream.hostUserId !== userId) {
      const isBlocked = await this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: stream.hostUserId,
            blockedId: userId,
          },
        },
      });

      if (isBlocked) {
        console.log(`[BOUNCER] 🛑 Access Denied! User ${userId} is blocked.`);

        this.emitForceRemovalToSocket(
          socket,
          "BLOCKED_BY_HOST",
          userId,
          streamId,
          "You are blocked by this creator.",
        );

        this.toast(socket, "error", "You are blocked by this creator.");

        // Do not disconnect the user's whole authenticated app session.
        // This is a stream-level denial only; the client should stay logged in
        // and render the kicked/banned screen.
        try {
          socket.leave(this.room(streamId));
          this.presence.leave(streamId, socket.id);
        } catch {
          // ignore cleanup errors
        }

        return;
      }

      const banRestriction = await this.getBanRestriction(streamId, userId);
      if (banRestriction) {
        console.log(`[BOUNCER] 🛑 Access Denied! User ${userId} is banned from this stream.`);

        const expiresAt = banRestriction.expiresAt
          ? banRestriction.expiresAt.toISOString()
          : null;

        const remainingSeconds = banRestriction.expiresAt
          ? this.remainingSecondsFromDate(banRestriction.expiresAt)
          : null;

        const message = expiresAt
          ? `You were banned from this stream until ${expiresAt}.`
          : "You were permanently banned from this stream.";

        this.emitForceRemovalToSocket(
          socket,
          "BANNED_FROM_STREAM",
          userId,
          streamId,
          message,
          {
            expiresAt,
            remainingSeconds,
          },
        );

        this.toast(socket, "error", message, streamId);

        // Do not disconnect the user's whole authenticated app session.
        // This is a stream-level denial only; the client should stay logged in
        // and render the kicked/banned screen.
        try {
          socket.leave(this.room(streamId));
          this.presence.leave(streamId, socket.id);
        } catch {
          // ignore cleanup errors
        }

        return;
      }

      const kickRestriction = await this.getKickRestriction(streamId, userId);
      if (kickRestriction) {
        console.log(`[BOUNCER] 🛑 Access Denied! User ${userId} was kicked from this stream.`);

        this.emitForceRemovalToSocket(
          socket,
          "KICKED_FROM_STREAM",
          userId,
          streamId,
          "You were kicked from this stream and cannot return until it restarts.",
        );

        this.toast(
          socket,
          "error",
          "You were kicked from this stream and cannot return until it restarts.",
          streamId,
        );

        // Do not disconnect the user's whole authenticated app session.
        // This is a stream-level denial only; the client should stay logged in
        // and render the kicked/banned screen.
        try {
          socket.leave(this.room(streamId));
          this.presence.leave(streamId, socket.id);
        } catch {
          // ignore cleanup errors
        }

        return;
      }

      console.log("[BOUNCER] ✅ Access Granted. User is not blocked or kicked.");
    }

    socket.join(this.room(streamId));
    this.presence.join(streamId, socket.id);

    const participant = await this.prisma.streamParticipant.findFirst({
      where: { streamId, userId, leftAt: null },
      select: { role: true },
    });

    const summary = await this.getSocketUserSummary(socket, userId);
    if (summary) {
      this.emitStreamJoined(streamId, {
        user: summary,
        role: participant?.role ?? "VIEWER",
      });
    }

    const count = this.presence.count(streamId);
    this.emitViewerCount(streamId, count);
  }

  @SubscribeMessage("stream.leave")
  async leaveStream(
    @MessageBody() body: { streamId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const streamId = body?.streamId;
    const data = socket.data as SocketUserData;
    const userId = data.userId;
    const userSummary = data.userSummary;
    if (!streamId) return;

    socket.leave(this.room(streamId));
    this.presence.leave(streamId, socket.id);

    if (userId && !this.hasOtherSocketInRoom(streamId, userId, socket.id)) {
      await this.prisma.streamParticipant.updateMany({
        where: {
          streamId,
          userId,
          leftAt: null,
          role: { not: "HOST" },
        },
        data: { leftAt: new Date() },
      });

      this.clearActiveHeartSender(streamId, userId);
      await this.emitParticipantsForStream(streamId);
    }

    const count = this.presence.count(streamId);
    this.emitStreamLeft(streamId, userId ?? null, userSummary ?? null);
    this.emitViewerCount(streamId, count);
  }

  @SubscribeMessage("chat.send")
  async chatSend(
    @MessageBody() body: ChatSendBody,
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = (socket.data as SocketUserData).userId;
    if (!userId) throw new WsException("Unauthorized");

    const streamId = (body?.streamId ?? "").trim();
    const text = (body?.text ?? "").trim();
    const replyToMessageId = body?.replyToMessageId ?? null;

    if (!streamId || !text) {
      this.toast(socket, "warning", "Missing streamId or text", streamId || undefined);
      return;
    }

    if (text.length > 500) {
      this.toast(socket, "warning", "Message too long (max 500 chars)", streamId);
      return;
    }

    const blacklistMatch = await this.getBlacklistMatch(text);
    if (blacklistMatch) {
      this.toast(
        socket,
        "warning",
        `Message blocked by AutoMod rule: ${blacklistMatch}`,
        streamId,
      );
      return;
    }

    const okParticipant = await this.isActiveParticipant(streamId, userId);
    if (!okParticipant) {
      this.toast(socket, "warning", "Join the stream before chatting", streamId);
      return;
    }

    const activeMute = await this.getMuteRestriction(streamId, userId);
    if (activeMute) {
      const remainingSeconds = this.remainingSecondsFromDate(activeMute.expiresAt);

      this.emitTimeoutBlocked({
        userId,
        streamId,
        expiresAt: activeMute.expiresAt ? activeMute.expiresAt.toISOString() : null,
        remainingSeconds,
        message: "You are timed out and can not comment.",
      });

      this.toast(
        socket,
        "warning",
        remainingSeconds !== null
          ? `You are timed out and can not comment. ${remainingSeconds}s remaining.`
          : "You are timed out and can not comment.",
        streamId,
      );
      return;
    }

    const activeChatMute = await this.getChatMuteRestriction(streamId, userId);
    if (activeChatMute) {
      const message = "You are muted in this live chat.";

      this.emitChatMuteBlocked({
        userId,
        streamId,
        message,
      });

      this.toast(socket, "warning", message, streamId);
      return;
    }

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { hostUserId: true },
    });

    if (stream && stream.hostUserId !== userId) {
      const isBlocked = await this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: stream.hostUserId,
            blockedId: userId,
          },
        },
      });

      if (isBlocked) {
        this.toast(socket, "error", "You cannot chat in this stream.", streamId);
        return;
      }
    }

    if (!this.consume(this.chatBuckets, `${userId}:${streamId}`, 6, 3000)) {
      this.toast(socket, "warning", "You are sending messages too fast", streamId);
      return;
    }

    socket.join(this.room(streamId));

    const msg = await this.prisma.chatMessage.create({
      data: {
        streamId,
        userId,
        text,
        replyToMessageId,
        badgesJson: Prisma.JsonNull,
      },
    });

    const summary = await this.getSocketUserSummary(socket, userId);
    if (!summary) return;

    const payload = {
      streamId,
      message: {
        id: msg.id,
        user: summary,
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
        replyToMessageId: msg.replyToMessageId,
        badges: (msg.badgesJson as any) ?? undefined,
      },
    };

    this.server.to(this.room(streamId)).emit("chat.message", payload);
  }

  @SubscribeMessage("reaction.heart")
  async heart(
    @MessageBody() body: HeartBody,
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = (socket.data as SocketUserData).userId;
    if (!userId) throw new WsException("Unauthorized");

    const streamId = (body?.streamId ?? "").trim();
    if (!streamId) return;

    const activeStream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, hostUserId: true, status: true },
    });
    if (!activeStream || activeStream.status !== "LIVE") return;

    const okParticipant =
      activeStream.hostUserId === userId ||
      !!(await this.prisma.streamParticipant.findFirst({
        where: { streamId, userId, leftAt: null },
        select: { id: true },
      }));
    if (!okParticipant) return;

    if (!this.consume(this.heartBuckets, `${userId}:${streamId}`, 20, 2000)) {
      return;
    }

    socket.join(this.room(streamId));

    const summary = await this.getSocketUserSummary(socket, userId);
    if (!summary) return;

    const stats = this.recordHeart(streamId, summary);

    void this.prisma.streamHeartStat
      .upsert({
        where: {
          streamId_senderUserId: {
            streamId,
            senderUserId: userId,
          },
        },
        update: {
          hostUserId: activeStream.hostUserId,
          count: { increment: 1 },
        },
        create: {
          streamId,
          senderUserId: userId,
          hostUserId: activeStream.hostUserId,
          count: 1,
        },
      })
      .catch((error) => {
        this.writeRealtimeLog({
          level: "WARN",
          category: "STREAM_HEART_STAT_WRITE_FAILED",
          message: "Failed to persist stream heart stats.",
          streamId,
          userId,
          detailsJson: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      });

    const payload = {
      streamId,
      userId,
      user: summary,
      count: stats.userCount,
      totalHearts: stats.totalHearts,
      activeHeartSenderCount: stats.activeHeartSenderCount,
      createdAt: new Date().toISOString(),
    };

    this.server.to(this.room(streamId)).emit("reaction.heart", payload);
  }

  emitStreamStateUpdated(payload: any) {
    this.server.emit("stream.state.updated", payload);
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("stream.state.updated", payload);
    }
  }

  emitParticipants(streamId: string, participants: any[]) {
    const payload = { streamId, participants };
    this.server.emit("stream.participants", payload);
    this.server.to(this.room(streamId)).emit("stream.participants", payload);
  }

  emitAdminStreamTermination(payload: {
    streamId: string;
    hostUserId?: string | null;
    endedAt?: string | null;
    endedByAdmin?: boolean;
    endedByAdminUserId?: string | null;
    endReason?: string | null;
    status?: string;
  }) {
    const event = {
      endedByAdmin: true,
      status: "ENDED",
      ...payload,
    };

    this.server.emit("stream.admin.terminated", event);
    this.server
      .to(this.room(event.streamId))
      .emit("stream.admin.terminated", event);

    if (event.hostUserId) {
      this.server.to(`user:${event.hostUserId}`).emit("stream.admin.terminated", event);
    }
  }

  emitStreamEnded(
    payload:
      | string
      | {
        streamId: string;
        endedAt?: string | null;
        endedByAdmin?: boolean;
        endedByAdminUserId?: string | null;
        endReason?: string | null;
        hostUserId?: string | null;
        status?: string;
      },
  ) {
    const event = typeof payload === "string" ? { streamId: payload } : payload;

    this.server.emit("stream.ended", event);
    this.server.to(this.room(event.streamId)).emit("stream.ended", event);
  }

  emitChatMessage(payload: any) {
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("chat.message", payload);
      return;
    }

    this.server.emit("chat.message", payload);
  }

  emitRoleAssigned(payload: any) {
    this.server.emit("role.assigned", payload);
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("role.assigned", payload);
    }
  }

  emitModerationAction(payload: any) {
    this.server.emit("moderation.action", payload);
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("moderation.action", payload);
    }
  }

  emitParticipantRemoved(payload: any) {
    this.server.emit("stream.participant.removed", payload);
    if (payload?.streamId) {
      this.server
        .to(this.room(payload.streamId))
        .emit("stream.participant.removed", payload);
    }
  }

  emitGiftSent(payload: any) {
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("gift.sent", payload);
      return;
    }

    this.server.emit("gift.sent", payload);
  }

  emitGiftCatalogUpdated(payload: {
    version: string;
    updatedAt: string;
    reason: "admin_create" | "admin_update" | "admin_delete" | "admin_gift_category_create" | "admin_gift_category_update" | "admin_gift_category_delete";
  }) {
    this.server.emit("giftCatalog.updated", payload);
  }

  emitBattleStarted(payload: any) {
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("battle.started", payload);
    }
  }

  emitBattleScoreUpdated(payload: any) {
    if (payload?.streamId) {
      this.server
        .to(this.room(payload.streamId))
        .emit("battle.scoreUpdated", payload);
    }
  }

  emitBattleEnded(payload: any) {
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("battle.ended", payload);
    }
  }

  emitBattleMvp(payload: any) {
    if (payload?.streamId) {
      this.server.to(this.room(payload.streamId)).emit("battle.mvp", payload);
    }
  }

  emitDirectMessage(senderId: string, recipientId: string, payload: any) {
    this.server
      .to(`user:${senderId}`)
      .to(`user:${recipientId}`)
      .emit("dm.message", payload);
  }

  async disconnectUserFromStream(
    streamId: string,
    targetUserId: string,
    toastMessage?: string,
    reasonCodeOrDelay: ForceStreamRemovalReason | number = "KICKED_FROM_STREAM",
    disconnectDelayMsOrDetails: number | ForceStreamRemovalDetails = 150,
    maybeDetails: ForceStreamRemovalDetails = {},
  ) {
    const room = this.room(streamId);
    const sockets = (this.server as any)?.sockets?.sockets as
      | Map<string, Socket>
      | undefined;
    if (!sockets) return;

    let reasonCode: ForceStreamRemovalReason | null = null;
    let disconnectDelayMs = 150;
    let details: ForceStreamRemovalDetails = {};

    if (typeof reasonCodeOrDelay === "number") {
      disconnectDelayMs = reasonCodeOrDelay;
    } else if (reasonCodeOrDelay) {
      reasonCode = reasonCodeOrDelay;
    }

    if (typeof disconnectDelayMsOrDetails === "number") {
      disconnectDelayMs = disconnectDelayMsOrDetails;
    } else if (disconnectDelayMsOrDetails) {
      details = {
        ...details,
        ...disconnectDelayMsOrDetails,
      };
    }

    details = {
      ...details,
      ...maybeDetails,
    };

    let removedAnySocket = false;

    for (const [socketId, s] of sockets.entries()) {
      const uid = (s.data as SocketUserData)?.userId;
      if (uid !== targetUserId) continue;

      const inRoom = (s as any).rooms?.has?.(room);
      if (!inRoom) continue;

      removedAnySocket = true;

      if (reasonCode) {
        try {
          this.emitForceRemovalToSocket(
            s,
            reasonCode,
            targetUserId,
            streamId,
            toastMessage || "You were removed from the stream.",
            details,
          );
        } catch (error) {
          this.writeRealtimeLog({
            level: "WARN",
            category: "EMIT_FAILURE",
            message: "Failed to emit FORCE_KICK while disconnecting user from stream.",
            streamId,
            userId: targetUserId,
            detailsJson: {
              socketId,
              reasonCode,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }

      if (toastMessage) {
        try {
          s.emit("system.toast", {
            type: "error",
            message: toastMessage,
            streamId,
          });
        } catch (error) {
          this.writeRealtimeLog({
            level: "WARN",
            category: "EMIT_FAILURE",
            message: "Failed to emit stream disconnect toast.",
            streamId,
            userId: targetUserId,
            detailsJson: {
              socketId,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }

      this.presence.leaveBySocket(socketId);

      try {
        s.leave(room);
      } catch (error) {
        this.writeRealtimeLog({
          level: "WARN",
          category: "SOCKET_LEAVE_FAILURE",
          message: "Failed to remove realtime socket from stream room.",
          streamId,
          userId: targetUserId,
          detailsJson: {
            socketId,
            room,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }

      // Keep the socket connection alive after stream-level removal.
      // LiveKit is removed separately; realtime only leaves this stream room.
    }

    if (!removedAnySocket) {
      return;
    }

    await this.prisma.streamParticipant.updateMany({
      where: {
        streamId,
        userId: targetUserId,
        leftAt: null,
        role: { not: "HOST" },
      },
      data: { leftAt: new Date() },
    });

    this.clearActiveHeartSender(streamId, targetUserId);
    await this.emitParticipantsForStream(streamId);

    const count = this.presence.count(streamId);
    this.emitStreamLeft(streamId, targetUserId, null);
    this.emitViewerCount(streamId, count);
  }

  private escapeRegex(input: string) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private wildcardToRegex(pattern: string) {
    const escaped = pattern
      .split("*")
      .map((part) => this.escapeRegex(part))
      .join(".*");

    return new RegExp(escaped, "i");
  }

  private async getBlacklistEntries() {
    const row = await this.prisma.appConfig.findUnique({
      where: { key: "automod_blacklist" },
    });

    const raw = row?.valueJson;
    if (!Array.isArray(raw)) return this.defaultBlacklist;

    return raw
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  private async getBlacklistMatch(text: string): Promise<string | null> {
    const entries = await this.getBlacklistEntries();
    const normalized = String(text || "").trim();

    for (const entry of entries) {
      const regex = this.wildcardToRegex(entry);
      if (regex.test(normalized)) {
        return entry;
      }
    }

    return null;
  }
}

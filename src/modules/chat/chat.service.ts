import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

type ChatUserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) { }

  private readonly defaultBlacklist = [
    "scam*",
    "free followers",
    "onlyfans.com/*",
    "cashapp me",
    "*slur1*",
    "*slur2*",
  ];

  private parseCsvEnv(name: string) {
    return new Set(
      String(process.env[name] || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  private async requireAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException("Account not found.");
    }

    const adminIds = this.parseCsvEnv("ADMIN_USER_IDS");
    const adminEmails = this.parseCsvEnv("ADMIN_EMAILS");
    const adminUsernames = this.parseCsvEnv("ADMIN_USERNAMES");

    if (!adminIds.size && !adminEmails.size && !adminUsernames.size) {
      throw new ForbiddenException("Admin access is not configured.");
    }

    const allowed =
      adminIds.has(String(user.id).toLowerCase()) ||
      adminEmails.has(String(user.email).toLowerCase()) ||
      adminUsernames.has(String(user.username).toLowerCase());

    if (!allowed) {
      throw new ForbiddenException("Admin access denied.");
    }

    return user;
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

  private async getChatMuteRestriction(streamId: string, userId: string) {
    return this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "CHAT_MUTE",
      },
    });
  }

  private userSummary(user: any): ChatUserSummary {
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

  private async isMuted(streamId: string, userId: string): Promise<boolean> {
    const now = new Date();
    const mute = await this.prisma.streamUserRestriction.findFirst({
      where: {
        streamId,
        userId,
        kind: "MUTE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    return !!mute;
  }

  async getMessages(streamId: string, limit: number, before: Date | null) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException("Stream not found");

    const where: any = { streamId };
    if (before && !Number.isNaN(before.getTime())) {
      where.createdAt = { lt: before };
    }

    const rows = await this.prisma.chatMessage.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { include: { profile: true } } },
    });

    return rows.reverse().map((message) => ({
      id: message.id,
      user: this.userSummary(message.user),
      text: message.text,
      createdAt: message.createdAt.toISOString(),
      replyToMessageId: message.replyToMessageId,
      badges: (message.badgesJson as any) ?? undefined,
    }));
  }

  async sendMessage(params: {
    streamId: string;
    userId: string;
    username: string;
    text: string;
    replyToMessageId: string | null;
  }) {
    const { streamId, userId, text, replyToMessageId } = params;

    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException("Stream not found");
    if (stream.status !== "LIVE") throw new ForbiddenException("Stream is not live");

    if (await this.isMuted(streamId, userId)) {
      throw new ForbiddenException("Muted");
    }

    const chatMuteRestriction = await this.getChatMuteRestriction(streamId, userId);
    if (chatMuteRestriction) {
      this.realtime.emitChatMuteBlocked({
        userId,
        streamId,
        message: "You are muted in this live chat.",
      });

      throw new ForbiddenException("You are muted in this live chat.");
    }

    const trimmed = (text ?? "").trim();
    if (!trimmed) throw new BadRequestException("Message text is required");
    if (trimmed.length > 500) {
      throw new BadRequestException("Message too long (max 500)");
    }

    const blacklistMatch = await this.getBlacklistMatch(trimmed);
    if (blacklistMatch) {
      throw new ForbiddenException(`Message blocked by AutoMod rule: ${blacklistMatch}`);
    }

    if (stream.hostUserId !== userId) {
      const participant = await this.prisma.streamParticipant.findFirst({
        where: { streamId, userId, leftAt: null },
      });
      if (!participant) throw new ForbiddenException("Join stream first");
    }

    const msg = await this.prisma.chatMessage.create({
      data: {
        streamId,
        userId,
        text: trimmed,
        replyToMessageId,
        badgesJson: Prisma.JsonNull,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) throw new NotFoundException("User not found");

    const payload = {
      streamId,
      message: {
        id: msg.id,
        user: this.userSummary(user),
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
        replyToMessageId: msg.replyToMessageId,
        badges: (msg.badgesJson as any) ?? undefined,
      },
    };

    this.realtime.emitChatMessage(payload);

    return payload;
  }

  async deleteMessageAsAdmin(adminUserId: string, messageId: string) {
    await this.requireAdmin(adminUserId);

    const existing = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Chat message not found");
    }

    await this.prisma.chatMessage.delete({
      where: { id: messageId },
    });

    const payload = {
      streamId: existing.streamId,
      messageId: existing.id,
      deletedByUserId: adminUserId,
      userId: existing.userId,
      createdAt: new Date().toISOString(),
    };

    this.realtime.server.emit("chat.message.deleted", payload);
    this.realtime.server
      .to(`stream:${existing.streamId}`)
      .emit("chat.message.deleted", payload);

    return {
      success: true,
      deleted: {
        id: existing.id,
        streamId: existing.streamId,
        userId: existing.userId,
        text: existing.text,
        createdAt: existing.createdAt.toISOString(),
      },
    };
  }
}
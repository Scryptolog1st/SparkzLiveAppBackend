import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UnauthorizedException,
  ForbiddenException,
  UseGuards,
  Inject,
  forwardRef,
} from "@nestjs/common";
import type { Request } from "express";
import * as bcrypt from "bcryptjs";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsersService, type UserWithProfile } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  UpdateEmailDto,
  UpdatePasswordDto,
  UpdateNotificationPreferencesDto,
  TwoFactorVerifyDto,
} from "../../common/dto/user.dto";
import { TwoFactorService } from "../auth/2fa.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { ConflictException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { EmailService } from "../email/email.service";

type JwtReq = Request & { user?: { userId: string; username?: string } };

const NOTIFICATION_PREFERENCES_SELECT = {
  notificationPushEnabled: true,
  notificationLiveAlertsEnabled: true,
  notificationMarketingEnabled: true,
} as const;

type NotificationPreferencesRow = {
  notificationPushEnabled: boolean;
  notificationLiveAlertsEnabled: boolean;
  notificationMarketingEnabled: boolean;
};

const STREAM_OPTION_ORDER_SELECT = {
  streamOptionsOrder: true,
} as const;

const STREAM_OPTION_ALLOWED_IDS = new Set([
  "layout",
  "permissions",
  "manage_roles",
  "ban_manager",
  "pin",
  "goal",
  "enhance",
  "dms",
  "flip_cam",
  "audio_mode",
  "guests",
  "start_battle",
  "mute",
  "cam_toggle",
  "quality",
  "report",
  "join_box",
]);

function normalizeStreamOptionsOrder(value: any) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawId of value) {
    const id = String(rawId || "").trim();

    if (!id || seen.has(id) || !STREAM_OPTION_ALLOWED_IDS.has(id)) {
      continue;
    }

    seen.add(id);
    result.push(id);
  }

  return result;
}

function readStreamOptionsOrderPayload(body: any) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.streamOptionsOrder)) return body.streamOptionsOrder;
  if (Array.isArray(body?.order)) return body.order;
  return null;
}

@Controller()
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly tfa: TwoFactorService,
    private readonly email: EmailService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway: RealtimeGateway,
  ) { }

  private getVipMonthTimezone(): string {
    const raw = String(process.env.VIP_MONTH_TIMEZONE || "America/New_York").trim();

    try {
      new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(new Date());
      return raw;
    } catch {
      return "America/New_York";
    }
  }

  private getVipPeriodKey(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.getVipMonthTimezone(),
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";

    return `${year}-${month}`;
  }

  private mapScheduleRows(rows: any[]) {
    const mapped = rows.map((r) => ({
      id: r.id,
      isRecurring: r.isRecurring,
      title: r.title,
      description: r.description ?? null,
      timezone: r.timezone,
      dayOfWeek: r.dayOfWeek ?? null,
      time24h: r.time24h ?? null,
      startAt: r.startAt ? r.startAt.toISOString() : null,
      endAt: r.endAt ? r.endAt.toISOString() : null,
    }));

    mapped.sort((a, b) => {
      if (a.isRecurring !== b.isRecurring) return a.isRecurring ? -1 : 1;
      if (a.isRecurring && b.isRecurring) {
        const da = a.dayOfWeek ?? 0;
        const db = b.dayOfWeek ?? 0;
        if (da !== db) return da - db;
        return (a.time24h ?? "").localeCompare(b.time24h ?? "");
      }
      return (a.startAt ?? "").localeCompare(b.startAt ?? "");
    });

    return mapped;
  }

  private buildMeResponse(user: UserWithProfile, streamSchedule: any[], vipMonth: any | null) {
    const baseProfile = user.profile
      ? this.users.toProfileDto(user.profile, {
        streamSchedule,
      })
      : null;

    const currentPeriodKey = this.getVipPeriodKey();

    return {
      user: {
        ...this.users.toUserDto(user),
        twoFactorEnabled: !!user.twoFactorEnabled,
        backupCodesCount: Array.isArray(user.twoFactorBackupCodes)
          ? user.twoFactorBackupCodes.length
          : 0,
      },
      profile: baseProfile
        ? {
          ...baseProfile,
          vipDisplayBadgeKey: user.profile?.vipDisplayBadgeKey ?? null,
          vipLockedBadgeKey: user.profile?.vipLockedBadgeKey ?? null,
          vipLiveBadgeKey: user.profile?.vipLiveBadgeKey ?? null,
          vipLockedPeriodKey: user.profile?.vipLockedPeriodKey ?? null,
        }
        : null,
      vip: {
        currentPeriodKey,
        currentSpendCents: Number(vipMonth?.spendCents ?? 0),
        currentHighestColorBadge: vipMonth?.highestColorBadge ?? null,
        displayBadgeKey: user.profile?.vipDisplayBadgeKey ?? null,
        lockedBadgeKey: user.profile?.vipLockedBadgeKey ?? null,
        liveBadgeKey: user.profile?.vipLiveBadgeKey ?? null,
        lockedPeriodKey: user.profile?.vipLockedPeriodKey ?? null,
      },
    };
  }

  private mapBlockedUser(user: any) {
    return {
      id: user.id,
      publicId: user.publicId ?? null,
      username: user.username,
      displayName: user.profile?.displayName?.trim() || user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
    };
  }

  private mapNotificationPreferences(row: NotificationPreferencesRow) {
    return {
      pushEnabled: !!row.notificationPushEnabled,
      liveAlertsEnabled: !!row.notificationLiveAlertsEnabled,
      marketingEmailsEnabled: !!row.notificationMarketingEnabled,
    };
  }

  private normalizeEmail(value: string): string {
    return String(value || "").trim().toLowerCase();
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private createOpaqueToken(): string {
    return randomBytes(32).toString("hex");
  }

  private getEmailVerificationTtlMs(): number {
    return 24 * 60 * 60 * 1000;
  }

  private getAppWebUrl(): string {
    const raw = String(process.env.APP_WEB_URL || "http://localhost:3000").trim();

    try {
      return new URL(raw).toString().replace(/\/$/, "");
    } catch {
      return "http://localhost:3000";
    }
  }

  private buildAppUrl(
    path: string,
    query: Record<string, string | null | undefined>,
  ) {
    const url = new URL(path.replace(/^\//, ""), `${this.getAppWebUrl()}/`);

    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && String(value).trim()) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private async sendEmailChangeVerificationSafely(user: any, pendingEmail: string) {
    try {
      const rawToken = this.createOpaqueToken();
      const expiresAt = new Date(Date.now() + this.getEmailVerificationTtlMs());

      await this.prisma.emailVerificationToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          email: pendingEmail,
          tokenHash: this.hashToken(rawToken),
          expiresAt,
        },
      });

      await this.email.sendCategorizedEmail({
        category: "AUTH_EMAIL_CHANGE_VERIFY",
        recipientEmail: pendingEmail,
        recipientUserId: user.id,
        variables: {
          displayName: user.profile?.displayName?.trim() || user.username,
          username: user.username,
          email: pendingEmail,
          currentEmail: user.email,
          userId: user.id,
          publicId: user.publicId ?? "",
          token: rawToken,
          verifyUrl: this.buildAppUrl("/verify-email", { token: rawToken }),
          expiresAt: expiresAt.toISOString(),
        },
        correlation: {
          type: "auth_email_change_verify",
          userId: user.id,
          currentEmail: user.email,
          pendingEmail,
        } as any,
      });
    } catch (error) {
      console.error("[EMAIL] AUTH_EMAIL_CHANGE_VERIFY send failed:", error);
    }
  }

  private async sendAccountDeletedEmailSafely(user: any) {
    try {
      await this.email.sendCategorizedEmail({
        category: "ACCOUNT_DELETED",
        recipientEmail: user.email,
        recipientUserId: user.id,
        variables: {
          displayName: user.profile?.displayName?.trim() || user.username,
          username: user.username,
          email: user.email,
          userId: user.id,
          publicId: user.publicId ?? "",
          deletedAt: new Date().toISOString(),
        },
        correlation: {
          type: "account_deleted",
          userId: user.id,
          email: user.email,
        } as any,
      });
    } catch (error) {
      console.error("[EMAIL] ACCOUNT_DELETED send failed:", error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me")
  async me(@Req() req: JwtReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true },
    });

    if (!user) throw new UnauthorizedException();

    const scheduleRows = await this.prisma.streamSchedule.findMany({
      where: { userId: user.id },
    });

    const currentPeriodKey = this.getVipPeriodKey();
    const vipMonth = await this.prisma.userVipMonth.findUnique({
      where: {
        userId_periodKey: {
          userId,
          periodKey: currentPeriodKey,
        },
      },
      select: {
        spendCents: true,
        highestColorBadge: true,
      },
    });

    const streamSchedule = this.mapScheduleRows(scheduleRows);
    return this.buildMeResponse(user, streamSchedule, vipMonth);
  }


  // Patch 37B: backend persistence for StreamOptionsModal custom order.
  @UseGuards(JwtAuthGuard)
  @Get("/me/stream-options-order")
  async getStreamOptionsOrder(@Req() req: JwtReq) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException("Unauthorized");
    }

    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: STREAM_OPTION_ORDER_SELECT,
    });

    if (!row) {
      throw new UnauthorizedException("Account not found.");
    }

    return {
      streamOptionsOrder: normalizeStreamOptionsOrder(row.streamOptionsOrder),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put("/me/stream-options-order")
  async updateStreamOptionsOrder(@Req() req: JwtReq, @Body() body: any) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException("Unauthorized");
    }

    const rawOrder = readStreamOptionsOrderPayload(body);

    if (!Array.isArray(rawOrder)) {
      throw new BadRequestException("streamOptionsOrder must be an array.");
    }

    const streamOptionsOrder = normalizeStreamOptionsOrder(rawOrder);

    const row = await this.prisma.user.update({
      where: { id: userId },
      data: { streamOptionsOrder },
      select: STREAM_OPTION_ORDER_SELECT,
    });

    return {
      streamOptionsOrder: normalizeStreamOptionsOrder(row.streamOptionsOrder),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me/notification-preferences")
  async getNotificationPreferences(@Req() req: JwtReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: NOTIFICATION_PREFERENCES_SELECT,
    });

    if (!user) throw new UnauthorizedException();
    return this.mapNotificationPreferences(user);
  }

  @UseGuards(JwtAuthGuard)
  @Put("/me/notification-preferences")
  async updateNotificationPreferences(
    @Req() req: JwtReq,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: NOTIFICATION_PREFERENCES_SELECT,
    });

    if (!existing) throw new UnauthorizedException();

    const data: Record<string, boolean> = {};

    if (dto.pushEnabled !== undefined) {
      data.notificationPushEnabled = dto.pushEnabled;
    }

    if (dto.liveAlertsEnabled !== undefined) {
      data.notificationLiveAlertsEnabled = dto.liveAlertsEnabled;
    }

    if (dto.marketingEmailsEnabled !== undefined) {
      data.notificationMarketingEnabled = dto.marketingEmailsEnabled;
    }

    if (Object.keys(data).length === 0) {
      return this.mapNotificationPreferences(existing);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: NOTIFICATION_PREFERENCES_SELECT,
    });

    return this.mapNotificationPreferences(updated);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/update-email")
  async updateEmail(@Req() req: JwtReq, @Body() dto: UpdateEmailDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) throw new UnauthorizedException();

    const normalizedEmail = this.normalizeEmail(dto.email);
    if (!normalizedEmail) {
      throw new BadRequestException("Email cannot be empty");
    }

    if (normalizedEmail === this.normalizeEmail(user.email)) {
      return {
        success: true,
        currentEmail: user.email,
        pendingEmail: null,
        requiresVerification: false,
      };
    }

    if (user.emailUpdatedAt) {
      const nextAllowed =
        user.emailUpdatedAt.getTime() + 90 * 24 * 60 * 60 * 1000;

      if (Date.now() < nextAllowed) {
        throw new BadRequestException(
          `Email can only be changed once every 3 months. Next available: ${new Date(nextAllowed).toLocaleDateString()}`,
        );
      }
    }

    const taken = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id: userId },
      },
    });

    if (taken) {
      throw new ConflictException("Email already in use");
    }

    await this.sendEmailChangeVerificationSafely(user, normalizedEmail);

    return {
      success: true,
      currentEmail: user.email,
      pendingEmail: normalizedEmail,
      requiresVerification: true,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/update-password")
  async updatePassword(@Req() req: JwtReq, @Body() dto: UpdatePasswordDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.users.updatePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/2fa/generate")
  async generate2FA(@Req() req: JwtReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const { secret, qrCodeDataUrl } = await this.tfa.generateSecret(user.email);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { qrCode: qrCodeDataUrl };
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/2fa/enable")
  async enable2FA(@Req() req: JwtReq, @Body() dto: TwoFactorVerifyDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException("2FA setup has not been initiated.");
    }

    const isValid = await this.tfa.verifyToken(dto.token, user.twoFactorSecret);
    if (!isValid) throw new BadRequestException("Invalid code.");

    const { plain, hashed } = await this.tfa.generateBackupCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashed,
      },
    });

    return { success: true, backupCodes: plain };
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/2fa/regenerate")
  async regenerateBackupCodes(@Req() req: JwtReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException("2FA must be enabled to regenerate codes.");
    }

    const { plain, hashed } = await this.tfa.generateBackupCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: hashed },
    });

    return { success: true, backupCodes: plain };
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/2fa/disable")
  async disable2FA(@Req() req: JwtReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/delete")
  async deleteAccount(@Req() req: JwtReq, @Body() dto: { password?: string }) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) throw new UnauthorizedException();

    if (!dto.password) {
      throw new BadRequestException(
        "Verification password is required to delete account.",
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new ForbiddenException("Incorrect password. Account deletion aborted.");
    }

    await this.sendAccountDeletedEmailSafely(user);
    await this.prisma.user.delete({ where: { id: userId } });

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me/blocks")
  async getBlockedUsers(@Req() req: JwtReq) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { include: { profile: true } },
      },
    });

    return blocks.map((b) => this.mapBlockedUser(b.blocked));
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/blocks/add")
  async blockUser(@Req() req: JwtReq, @Body() dto: { targetId: string }) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    if (userId === dto.targetId) throw new BadRequestException("Self-block not allowed.");

    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: dto.targetId } },
      create: { blockerId: userId, blockedId: dto.targetId },
      update: {},
    });

    try {
      await this.prisma.userFavorite.deleteMany({
        where: {
          OR: [
            { userId: dto.targetId, favoriteUserId: userId },
            { userId, favoriteUserId: dto.targetId },
          ],
        },
      });
    } catch (e) {
      console.warn("[BLOCK] Auto-unfavorite failed.", e);
    }

    try {
      const activeStreams = await this.prisma.stream.findMany({
        where: { hostUserId: userId, status: "LIVE" },
        select: { id: true },
      });

      this.realtimeGateway.server.emit("FORCE_KICK", {
        reason: "BLOCKED_BY_HOST",
        targetUserId: dto.targetId,
      });

      setTimeout(() => {
        for (const stream of activeStreams) {
          this.realtimeGateway.disconnectUserFromStream(
            stream.id,
            dto.targetId,
            "You have been removed by the host.",
          );
        }
      }, 500);
    } catch (e) {
      console.error("[BLOCK ACTION] Failed to eject blocked user:", e);
    }

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/blocks/unblock")
  async unblockUser(@Req() req: JwtReq, @Body() dto: { targetId: string }) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    await this.prisma.userBlock.delete({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: dto.targetId },
      },
    });

    return { success: true };
  }
}
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "crypto";

import {
  UsersService,
  type UserWithProfile,
} from "../users/users.service";
import { PrismaService } from "../prisma/prisma.service";
import { TwoFactorService } from "./2fa.service";
import { EmailService } from "../email/email.service";
import { AppConfigService } from "../app-config/app-config.service";

type JwtAccessPayload = { sub: string; username: string };
type JwtRefreshPayload = { sub: string; rid: string };

type SignupInput = {
  email: string;
  username: string;
  password: string;
};

type LoginInput = {
  emailOrUsername: string;
  password: string;
};

type Login2FAInput = {
  userId: string;
  token: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tfa: TwoFactorService,
    private readonly email: EmailService,
    private readonly appConfig: AppConfigService,
  ) { }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private createOpaqueToken(): string {
    return randomBytes(32).toString("hex");
  }

  private normalizeEmail(value: string): string {
    return String(value || "").trim().toLowerCase();
  }

  private normalizeLoginGateCharacteristicKey(value: unknown) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_:-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private badgeCharacteristicAllowsLogin(
    characteristics: unknown,
    allowedCharacteristics: string[],
  ) {
    if (!Array.isArray(characteristics)) return false;

    const allowed = new Set(
      allowedCharacteristics
        .map((item) => this.normalizeLoginGateCharacteristicKey(item))
        .filter(Boolean),
    );

    if (allowed.size === 0) allowed.add("APP_LOGIN_ACCESS");

    return characteristics.some((entry) => {
      if (!entry || typeof entry !== "object") return false;

      const item = entry as Record<string, any>;
      const key = this.normalizeLoginGateCharacteristicKey(item.key ?? item.name);
      const enabled = item.enabled !== false;

      return Boolean(enabled && key && allowed.has(key));
    });
  }

  private buildLoginGateBlockedPayload(config: {
    message?: string | null;
    allowedCharacteristics?: string[];
  }) {
    return {
      code: "APP_LOGIN_GATED",
      message:
        String(config.message || "").trim() ||
        "SparkzLive alpha testing is invite-only right now.",
      loginGate: {
        enabled: true,
        allowedCharacteristics: Array.isArray(config.allowedCharacteristics)
          ? config.allowedCharacteristics
          : ["APP_LOGIN_ACCESS"],
      },
    };
  }

  private async userHasLoginGateAccess(userId: string, allowedCharacteristics: string[]) {
    const now = new Date();

    const assignments = await this.prisma.userBadge.findMany({
      where: {
        userId,
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        badge: {
          status: "ACTIVE",
          deletedAt: null,
        },
      },
      include: {
        badge: true,
      },
      take: 100,
    });

    return assignments.some((assignment: any) =>
      this.badgeCharacteristicAllowsLogin(
        assignment?.badge?.characteristicsJson,
        allowedCharacteristics,
      ),
    );
  }

  private async enforceLoginGateAccess(user: UserWithProfile) {
    const config = await this.appConfig.getLoginGateConfigForAuth();

    if (!config.enabled) return;

    const allowedCharacteristics =
      Array.isArray(config.allowedCharacteristics) && config.allowedCharacteristics.length > 0
        ? config.allowedCharacteristics
        : ["APP_LOGIN_ACCESS"];

    const hasAccess = await this.userHasLoginGateAccess(user.id, allowedCharacteristics);

    if (!hasAccess) {
      throw new ForbiddenException(this.buildLoginGateBlockedPayload(config));
    }
  }

  private emailVerificationTtlMs(): number {
    return 24 * 60 * 60 * 1000;
  }

  private passwordResetTtlMs(): number {
    return 60 * 60 * 1000;
  }

  private appWebUrl(): string {
    const raw = String(
      this.config.get<string>("APP_WEB_URL") || "http://localhost:3000",
    ).trim();

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
    const url = new URL(path.replace(/^\//, ""), `${this.appWebUrl()}/`);

    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && String(value).trim()) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private async findUserByIdentifier(identifier: string) {
    const value = String(identifier || "").trim();
    if (!value) return null;

    const byEmail = value.includes("@");
    return byEmail
      ? this.users.findByEmail(this.normalizeEmail(value))
      : this.users.findByUsername(value);
  }

  private async issueEmailVerificationToken(userId: string, email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const rawToken = this.createOpaqueToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.emailVerificationTtlMs());

    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    });

    return { rawToken, expiresAt };
  }

  private async issuePasswordResetToken(userId: string, email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const rawToken = this.createOpaqueToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.passwordResetTtlMs());

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    });

    return { rawToken, expiresAt };
  }

  private async sendAccountCreatedEmailSafely(user: UserWithProfile) {
    try {
      await this.email.sendCategorizedEmail({
        category: "ACCOUNT_CREATED",
        recipientEmail: user.email,
        recipientUserId: user.id,
        variables: {
          displayName: user.profile?.displayName?.trim() || user.username,
          username: user.username,
          email: user.email,
          userId: user.id,
          publicId: (user as any).publicId || "",
          createdAt: user.createdAt?.toISOString?.() || "",
        },
        correlation: {
          type: "account_created",
          userId: user.id,
        } as any,
      });
    } catch (error) {
      console.error("[EMAIL] Account created send failed:", error);
    }
  }

  private async sendVerifyEmailSafely(
    user: UserWithProfile,
    category: "AUTH_VERIFY_EMAIL" | "AUTH_EMAIL_CHANGE_VERIFY",
    targetEmail: string,
  ) {
    try {
      const { rawToken, expiresAt } = await this.issueEmailVerificationToken(
        user.id,
        targetEmail,
      );

      await this.email.sendCategorizedEmail({
        category,
        recipientEmail: targetEmail,
        recipientUserId: user.id,
        variables: {
          displayName: user.profile?.displayName?.trim() || user.username,
          username: user.username,
          email: targetEmail,
          currentEmail: user.email,
          userId: user.id,
          publicId: (user as any).publicId || "",
          token: rawToken,
          verifyUrl: this.buildAppUrl("/verify-email", { token: rawToken }),
          expiresAt: expiresAt.toISOString(),
        },
        correlation: {
          type:
            category === "AUTH_VERIFY_EMAIL"
              ? "auth_verify_email"
              : "auth_email_change_verify",
          userId: user.id,
          email: targetEmail,
        } as any,
      });
    } catch (error) {
      console.error(`[EMAIL] ${category} send failed:`, error);
    }
  }

  private async sendPasswordResetEmailSafely(user: UserWithProfile) {
    try {
      const { rawToken, expiresAt } = await this.issuePasswordResetToken(
        user.id,
        user.email,
      );

      await this.email.sendCategorizedEmail({
        category: "AUTH_PASSWORD_RESET",
        recipientEmail: user.email,
        recipientUserId: user.id,
        variables: {
          displayName: user.profile?.displayName?.trim() || user.username,
          username: user.username,
          email: user.email,
          userId: user.id,
          publicId: (user as any).publicId || "",
          token: rawToken,
          resetUrl: this.buildAppUrl("/reset-password", { token: rawToken }),
          expiresAt: expiresAt.toISOString(),
        },
        correlation: {
          type: "auth_password_reset",
          userId: user.id,
          email: user.email,
        } as any,
      });
    } catch (error) {
      console.error("[EMAIL] AUTH_PASSWORD_RESET send failed:", error);
    }
  }

  private accessSecret(): string {
    return this.config.get<string>("JWT_ACCESS_SECRET")!;
  }

  private refreshSecret(): string {
    return this.config.get<string>("JWT_REFRESH_SECRET")!;
  }

  private accessTtlSeconds(): number {
    return this.config.get<number>("JWT_ACCESS_TTL_SECONDS")!;
  }

  private refreshTtlSeconds(): number {
    return this.config.get<number>("JWT_REFRESH_TTL_SECONDS")!;
  }

  private buildUserPayload(user: UserWithProfile) {
    return {
      ...this.users.toUserDto(user),
      twoFactorEnabled: !!user.twoFactorEnabled,
      backupCodesCount: Array.isArray(user.twoFactorBackupCodes)
        ? user.twoFactorBackupCodes.length
        : 0,
    };
  }

  private buildProfilePayload(user: UserWithProfile) {
    return user.profile ? this.users.toProfileDto(user.profile) : null;
  }

  private buildAuthPayload(
    user: UserWithProfile,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    return {
      ...tokens,
      user: this.buildUserPayload(user),
      profile: this.buildProfilePayload(user),
    };
  }

  private async issueTokens(params: { userId: string; username: string }) {
    const { userId, username } = params;

    const accessPayload: JwtAccessPayload = { sub: userId, username };
    const accessToken = this.jwt.sign(accessPayload, {
      secret: this.accessSecret(),
      expiresIn: `${this.accessTtlSeconds()}s`,
    });

    const rid = randomUUID();
    const refreshPayload: JwtRefreshPayload = { sub: userId, rid };
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.refreshSecret(),
      expiresIn: `${this.refreshTtlSeconds()}s`,
    });

    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds() * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: rid,
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private buildEmailNotVerifiedPayload(user: UserWithProfile) {
    return {
      message: "Please verify your email address before signing in.",
      code: "EMAIL_NOT_VERIFIED",
      email: user.email,
      userId: user.id,
      emailVerifiedAt: user.emailVerifiedAt
        ? user.emailVerifiedAt.toISOString()
        : null,
    };
  }

  private assertEmailVerified(user: UserWithProfile) {
    if (user.emailVerifiedAt) return;

    throw new ForbiddenException(this.buildEmailNotVerifiedPayload(user));
  }

  async signup(dto: SignupInput) {
    const email = this.normalizeEmail(dto.email);
    const username = dto.username.trim();

    const existingEmail = await this.users.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException("Email already in use");
    }

    const existingUsername = await this.users.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException("Username already in use");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.users.createUser({
      email,
      username,
      passwordHash,
    });

    await this.sendAccountCreatedEmailSafely(user);
    await this.sendVerifyEmailSafely(user, "AUTH_VERIFY_EMAIL", user.email);

    return {
      success: true,
      requiresEmailVerification: true,
      userId: user.id,
      email: user.email,
    };
  }

  async resendVerifyEmail(emailOrUsername: string) {
    const user = await this.findUserByIdentifier(emailOrUsername);

    if (!user) {
      return { success: true, sent: false };
    }

    if (user.emailVerifiedAt) {
      return { success: true, sent: false, alreadyVerified: true };
    }

    await this.sendVerifyEmailSafely(user, "AUTH_VERIFY_EMAIL", user.email);

    return {
      success: true,
      sent: true,
      email: user.email,
    };
  }

  async confirmEmailVerification(token: string) {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) {
      throw new BadRequestException("Verification token is required.");
    }

    const record = await this.prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash: this.hashToken(normalizedToken),
      },
    });

    if (
      !record ||
      record.consumedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException("Invalid or expired verification token.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired verification token.");
    }

    const targetEmail = this.normalizeEmail(record.email);
    const currentEmail = this.normalizeEmail(user.email);
    const emailChanged = targetEmail !== currentEmail;

    if (emailChanged) {
      const taken = await this.prisma.user.findFirst({
        where: {
          email: targetEmail,
          NOT: { id: user.id },
        },
      });

      if (taken) {
        throw new ConflictException("Email already in use");
      }
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });

      await tx.emailVerificationToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: emailChanged
          ? {
            email: targetEmail,
            emailUpdatedAt: now,
            emailVerifiedAt: now,
          }
          : {
            emailVerifiedAt: now,
          },
      });
    });

    return {
      success: true,
      email: targetEmail,
      emailChanged,
      verifiedAt: now.toISOString(),
    };
  }

  async requestPasswordReset(emailOrUsername: string) {
    const user = await this.findUserByIdentifier(emailOrUsername);

    if (!user) {
      return { success: true };
    }

    await this.sendPasswordResetEmailSafely(user);

    return { success: true };
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    const normalizedToken = String(token || "").trim();
    const normalizedPassword = String(newPassword || "");

    if (!normalizedToken) {
      throw new BadRequestException("Password reset token is required.");
    }

    if (normalizedPassword.length < 8) {
      throw new BadRequestException(
        "New password must be at least 8 characters long.",
      );
    }

    const record = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash: this.hashToken(normalizedToken),
      },
    });

    if (
      !record ||
      record.consumedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException("Invalid or expired password reset token.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired password reset token.");
    }

    if (this.normalizeEmail(user.email) !== this.normalizeEmail(record.email)) {
      throw new BadRequestException("Password reset token is no longer valid.");
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 12);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
        },
      });
    });

    return { success: true };
  }

  async login(dto: LoginInput) {
    const identifier = dto.emailOrUsername.trim();
    const byEmail = identifier.includes("@");
    const normalizedEmail = byEmail ? this.normalizeEmail(identifier) : identifier;

    const user = byEmail
      ? await this.users.findByEmail(normalizedEmail)
      : await this.users.findByUsername(identifier);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }

    this.assertNotPlatformBanned(user);
    this.assertEmailVerified(user);

    if (user.twoFactorEnabled) {
      return {
        mfaRequired: true,
        userId: user.id,
      };
    }

    return this.finalizeLogin(user);
  }

  async login2FA(dto: Login2FAInput) {
    const token = dto.token.trim();
    const user = await this.users.findByIdWithProfile(dto.userId);

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException("2FA is not enabled for this account");
    }

    this.assertNotPlatformBanned(user);
    this.assertEmailVerified(user);

    const isBackupFormat = token.includes("-");

    if (!isBackupFormat && token.length === 6 && user.twoFactorSecret) {
      try {
        const isTotpValid = await this.tfa.verifyToken(
          token,
          user.twoFactorSecret,
        );
        if (isTotpValid) {
          return this.finalizeLogin(user);
        }
      } catch {
        // fall through to backup-code validation below
      }
    }

    if (isBackupFormat) {
      const backupCodes = user.twoFactorBackupCodes || [];

      for (const hashedCode of backupCodes) {
        const isMatch = await bcrypt.compare(token, hashedCode);
        if (isMatch) {
          const updatedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorBackupCodes: backupCodes.filter(
                (code: string) => code !== hashedCode,
              ),
            },
            include: { profile: true, wallet: true },
          });

          this.assertNotPlatformBanned(updatedUser as UserWithProfile);
          this.assertEmailVerified(updatedUser as UserWithProfile);
          return this.finalizeLogin(updatedUser as UserWithProfile);
        }
      }
    }

    throw new UnauthorizedException("Invalid verification code.");
  }

  private isPlatformBanActive(user: any) {
    if (!(user as any)?.isPlatformBanned) return false;

    const expiresAt = (user as any)?.platformBanExpiresAt;
    if (expiresAt instanceof Date && expiresAt.getTime() <= Date.now()) {
      return false;
    }

    return true;
  }

  private buildBanExceptionPayload(user: any) {
    const reason =
      typeof (user as any)?.platformBanReason === "string"
        ? (user as any).platformBanReason
        : null;

    return {
      message: reason ? `Account banned: ${reason}` : "Account banned.",
      code: "ACCOUNT_BANNED",
      ban: {
        userId: user?.id ?? null,
        reason,
        issuedAt:
          user?.platformBanIssuedAt instanceof Date
            ? user.platformBanIssuedAt.toISOString()
            : null,
        expiresAt:
          user?.platformBanExpiresAt instanceof Date
            ? user.platformBanExpiresAt.toISOString()
            : null,
      },
    };
  }

  private assertNotPlatformBanned(user: any) {
    if (!this.isPlatformBanActive(user)) return;

    throw new ForbiddenException(this.buildBanExceptionPayload(user));
  }

  async revokeAllRefreshTokensForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private async finalizeLogin(user: UserWithProfile) {
    this.assertNotPlatformBanned(user);
    this.assertEmailVerified(user);

    const refreshedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      include: { profile: true, wallet: true },
    });

    this.assertNotPlatformBanned(refreshedUser as UserWithProfile);
    this.assertEmailVerified(refreshedUser as UserWithProfile);
    await this.enforceLoginGateAccess(refreshedUser as UserWithProfile);

    const tokens = await this.issueTokens({
      userId: refreshedUser.id,
      username: refreshedUser.username,
    });

    return this.buildAuthPayload(refreshedUser as UserWithProfile, tokens);
  }

  async refresh(refreshToken: string) {
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwt.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: payload.rid },
    });

    if (!record) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (record.revokedAt) {
      throw new UnauthorizedException("Refresh token revoked");
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const incomingHash = this.hashToken(refreshToken);
    if (incomingHash !== record.tokenHash) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.users.findByIdWithProfile(payload.sub);

    this.assertNotPlatformBanned(user);
    await this.enforceLoginGateAccess(user);
    if (this.isPlatformBanActive(user)) {
      await this.revokeAllRefreshTokensForUser(payload.sub);
      throw new ForbiddenException(this.buildBanExceptionPayload(user));
    }

    if (!user.emailVerifiedAt) {
      await this.revokeAllRefreshTokensForUser(payload.sub);
      throw new ForbiddenException(this.buildEmailNotVerifiedPayload(user));
    }

    const tokens = await this.issueTokens({
      userId: user.id,
      username: user.username,
    });

    return this.buildAuthPayload(user, tokens);
  }

  async logout(refreshToken: string) {
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwt.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: payload.rid },
    });

    if (!record) {
      return { ok: true };
    }

    const incomingHash = this.hashToken(refreshToken);
    if (incomingHash !== record.tokenHash) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (!record.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
    }

    return { ok: true };
  }
}
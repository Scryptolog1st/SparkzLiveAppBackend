import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdminRole, BadgeStatus, Prisma, VipBadgeKey } from "@prisma/client";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  BADGE_CHARACTERISTIC_KEYS,
  BADGE_STATUS_VALUES,
  AdminBadgeUserSearchDto,
  AdminBadgesQueryDto,
  AssignUserBadgeDto,
  CreateAdminBadgeDto,
  RevokeUserBadgeDto,
  UpdateAdminBadgeDto,
  UpdateUserBadgeDto,
} from "./dto/admin-badges.dto";

type BadgeCharacteristic = {
  key: string;
  label: string;
  enabled: boolean;
  value?: unknown;
  metadata?: Record<string, unknown> | null;
};

type AuditContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

const ACTIVE_USER_BADGE_WHERE = {
  revokedAt: null,
} satisfies Prisma.UserBadgeWhereInput;

type SystemVipBadgeMeta = {
  key: VipBadgeKey;
  label: string;
  compatibilityTone: string;
  displayRank: number;
  minSpendCents?: number;
  topPercent?: number;
};

const VIP_SYSTEM_BADGE_META: SystemVipBadgeMeta[] = [
  { key: VipBadgeKey.GREEN, label: "Green", compatibilityTone: "green", displayRank: 1, minSpendCents: 10_000 },
  { key: VipBadgeKey.YELLOW, label: "Yellow", compatibilityTone: "yellow", displayRank: 2, minSpendCents: 25_000 },
  { key: VipBadgeKey.ORANGE, label: "Orange", compatibilityTone: "orange", displayRank: 3, minSpendCents: 50_000 },
  { key: VipBadgeKey.RED, label: "Red", compatibilityTone: "red", displayRank: 4, minSpendCents: 90_000 },
  { key: VipBadgeKey.PINK, label: "Pink", compatibilityTone: "pink", displayRank: 5, minSpendCents: 140_000 },
  { key: VipBadgeKey.PURPLE, label: "Purple", compatibilityTone: "purple", displayRank: 6, minSpendCents: 210_000 },
  { key: VipBadgeKey.BLACK, label: "Black", compatibilityTone: "neutral", displayRank: 7, minSpendCents: 300_000 },
  { key: VipBadgeKey.GOLD, label: "Gold", compatibilityTone: "amber", displayRank: 8, minSpendCents: 500_000, topPercent: 40 },
  { key: VipBadgeKey.PLATINUM, label: "Platinum", compatibilityTone: "slate", displayRank: 9, minSpendCents: 1_000_000, topPercent: 30 },
  { key: VipBadgeKey.DIAMOND, label: "Diamond", compatibilityTone: "cyan", displayRank: 10, minSpendCents: 2_000_000, topPercent: 20 },
  { key: VipBadgeKey.ANODIZED_TITANIUM, label: "Anodized Titanium", compatibilityTone: "indigo", displayRank: 11, minSpendCents: 4_000_000, topPercent: 10 },
];

@Injectable()
export class AdminBadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAudit: AdminAuditService,
    private readonly adminRolePermissions: AdminRolePermissionsService,
  ) {}

  private now() {
    return new Date();
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
    canViewRealStaffIdentity: boolean,
  ) {
    return canViewRealStaffIdentity ? id ?? null : null;
  }

  private normalizeOptionalString(value: unknown, maxLength = 1000) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return null;
    return text.slice(0, maxLength);
  }

  private normalizeRequiredString(value: unknown, label: string, maxLength = 120) {
    const text = this.normalizeOptionalString(value, maxLength);
    if (!text) {
      throw new BadRequestException(`${label} is required.`);
    }
    return text;
  }

  private slugify(value: string) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 140);
  }

  private normalizeSlug(value: unknown, fallbackName: string) {
    const explicit = this.slugify(String(value || ""));
    const fallback = this.slugify(fallbackName);
    const slug = explicit || fallback;
    if (!slug) {
      throw new BadRequestException("Badge slug could not be generated.");
    }
    return slug;
  }

  private async buildUniqueBadgeSlug(
    value: unknown,
    fallbackName: string,
    currentBadgeId?: string,
  ) {
    const base = this.normalizeSlug(value, fallbackName);
    let candidate = base;

    for (let suffix = 1; suffix <= 999; suffix += 1) {
      const existing = await this.prisma.badge.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === currentBadgeId) {
        return candidate;
      }

      const suffixText = `-${suffix + 1}`;
      const maxBaseLength = Math.max(1, 140 - suffixText.length);
      const trimmedBase = base.slice(0, maxBaseLength).replace(/-+$/g, "");
      candidate = `${trimmedBase || "badge"}${suffixText}`;
    }

    throw new BadRequestException("Badge slug could not be made unique.");
  }

  private parseLimit(value: unknown, fallback = 50, max = 100) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, max);
  }

  private parseOffset(value: unknown) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  }

  private normalizeStatus(value: unknown, fallback: BadgeStatus = BadgeStatus.DRAFT) {
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized) return fallback;
    if (!BADGE_STATUS_VALUES.includes(normalized as any)) {
      throw new BadRequestException("Invalid badge status.");
    }
    return normalized as BadgeStatus;
  }

  private parseDate(value: unknown, label: string) {
    const text = this.normalizeOptionalString(value, 80);
    if (!text) return null;

    const date = new Date(text);
    if (!Number.isFinite(date.getTime())) {
      throw new BadRequestException(`${label} must be a valid date.`);
    }

    return date;
  }

  private normalizeJsonObject(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException("Metadata must be a JSON object.");
    }
    return value as Record<string, unknown>;
  }

  private normalizeCharacteristics(value: unknown): BadgeCharacteristic[] {
    if (value === undefined || value === null) return [];

    if (!Array.isArray(value)) {
      throw new BadRequestException("Badge characteristics must be an array.");
    }

    return value.slice(0, 30).map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new BadRequestException(`Badge characteristic ${index + 1} must be an object.`);
      }

      const raw = item as Record<string, unknown>;
      const key = String(raw.key || "").trim().toUpperCase();
      if (!BADGE_CHARACTERISTIC_KEYS.includes(key as any)) {
        throw new BadRequestException(`Invalid badge characteristic key: ${key || "(blank)"}`);
      }

      const label =
        this.normalizeOptionalString(raw.label, 160) ||
        key
          .split("_")
          .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
          .join(" ");

      const metadata =
        raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
          ? (raw.metadata as Record<string, unknown>)
          : null;

      return {
        key,
        label,
        enabled: raw.enabled === undefined ? true : Boolean(raw.enabled),
        value: raw.value === undefined ? null : raw.value,
        metadata,
      };
    });
  }

  private activeAssignmentWindowWhere(now = this.now()): Prisma.UserBadgeWhereInput {
    return {
      ...ACTIVE_USER_BADGE_WHERE,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      startsAt: { lte: now },
    };
  }

  private mapSystemVipBadge(
    meta: SystemVipBadgeMeta,
    assignmentCount = 0,
    canViewRealStaffIdentity = false,
  ) {
    const slug = `vip-${String(meta.key).toLowerCase().replace(/_/g, "-")}`;

    return {
      id: `system-${slug}`,
      name: `${meta.label} VIP`,
      slug,
      description:
        meta.topPercent
          ? `System-managed VIP badge awarded by monthly coin spend and top ${meta.topPercent}% VIP rollover rules.`
          : `System-managed VIP badge awarded automatically after reaching $${((meta.minSpendCents ?? 0) / 100).toLocaleString()} in monthly coin spend.`,
      assetUrl: null,
      assetMimeType: null,
      assetOriginalName: null,
      assetSize: null,
      status: BadgeStatus.ACTIVE,
      sortOrder: -10_000 + meta.displayRank,
      characteristics: [
        {
          key: "PROFILE_BADGE",
          label: "Profile badge",
          enabled: true,
          value: { source: "VIP_SYSTEM", vipKey: meta.key },
          metadata: null,
        },
        {
          key: "LIVE_BADGE",
          label: "Live badge",
          enabled: true,
          value: { source: "VIP_SYSTEM", vipKey: meta.key },
          metadata: null,
        },
      ],
      metadata: {
        source: "VIP_SYSTEM",
        systemManaged: true,
        readOnly: true,
        vipKey: meta.key,
        compatibilityTone: meta.compatibilityTone,
        displayRank: meta.displayRank,
        minSpendCents: meta.minSpendCents ?? null,
        topPercent: meta.topPercent ?? null,
      },
      source: "VIP_SYSTEM",
      systemManaged: true,
      readOnly: true,
      vipKey: meta.key,
      compatibilityTone: meta.compatibilityTone,
      minSpendCents: meta.minSpendCents ?? null,
      topPercent: meta.topPercent ?? null,
      assignmentCount,
      createdByAdminUserId: this.mapStaffAdminId(null, canViewRealStaffIdentity),
      updatedByAdminUserId: this.mapStaffAdminId(null, canViewRealStaffIdentity),
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  private async listSystemVipBadges(canViewRealStaffIdentity = false) {
    const counts = await this.prisma.profile.groupBy({
      by: ["vipDisplayBadgeKey"],
      where: {
        vipDisplayBadgeKey: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    });

    const countByKey = new Map<string, number>();
    counts.forEach((row: any) => {
      if (row.vipDisplayBadgeKey) {
        countByKey.set(String(row.vipDisplayBadgeKey), Number(row._count?._all ?? 0));
      }
    });

    return VIP_SYSTEM_BADGE_META.map((meta) =>
      this.mapSystemVipBadge(
        meta,
        countByKey.get(String(meta.key)) ?? 0,
        canViewRealStaffIdentity,
      ),
    );
  }

  private async getSystemVipBadgeById(
    idOrSlug: string,
    canViewRealStaffIdentity = false,
  ) {
    const normalized = String(idOrSlug || "").trim().toLowerCase();

    if (!normalized) return null;

    const meta = VIP_SYSTEM_BADGE_META.find((item) => {
      const slug = `vip-${String(item.key).toLowerCase().replace(/_/g, "-")}`;
      return normalized === slug || normalized === `system-${slug}` || normalized === String(item.key).toLowerCase();
    });

    if (!meta) return null;

    const count = await this.prisma.profile.count({
      where: {
        vipDisplayBadgeKey: meta.key,
      },
    });

    return this.mapSystemVipBadge(meta, count, canViewRealStaffIdentity);
  }

  private getVipMonthTimezone(): string {
    return String(process.env.VIP_MONTH_TIMEZONE || "America/New_York").trim() || "America/New_York";
  }

  private getVipPeriodKey(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.getVipMonthTimezone(),
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value || String(date.getUTCFullYear());
    const month = parts.find((part) => part.type === "month")?.value || String(date.getUTCMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  }

  private getSystemVipSlug(key: VipBadgeKey) {
    return `vip-${String(key).toLowerCase().replace(/_/g, "-")}`;
  }

  private resolveSystemVipMetaFromBadgeId(idOrSlug: string | null | undefined) {
    const normalized = String(idOrSlug || "").trim().toLowerCase();
    if (!normalized) return null;

    return VIP_SYSTEM_BADGE_META.find((item) => {
      const slug = this.getSystemVipSlug(item.key);
      const key = String(item.key).toLowerCase();

      return (
        normalized === key ||
        normalized === slug ||
        normalized === `system-${slug}` ||
        normalized === `system-vip-${key.replace(/_/g, "-")}`
      );
    }) ?? null;
  }

  private buildSystemVipAssignmentId(meta: SystemVipBadgeMeta, userId: string) {
    return `system-vip-assignment-${this.getSystemVipSlug(meta.key)}-${userId}`;
  }

  private resolveSystemVipAssignmentId(assignmentId: string | null | undefined) {
    const value = String(assignmentId || "").trim();

    for (const meta of VIP_SYSTEM_BADGE_META) {
      const prefix = `system-vip-assignment-${this.getSystemVipSlug(meta.key)}-`;

      if (value.startsWith(prefix)) {
        const userId = value.slice(prefix.length).trim();

        if (userId) {
          return { meta, userId };
        }
      }
    }

    return null;
  }

  private userSelectForBadgeAssignment() {
    return {
      id: true,
      publicId: true,
      username: true,
      email: true,
      createdAt: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
          badgeLabel: true,
          badgeTone: true,
          vipDisplayBadgeKey: true,
          vipLockedBadgeKey: true,
          vipLiveBadgeKey: true,
          vipLockedPeriodKey: true,
          showBadgeOnProfile: true,
        },
      },
    } satisfies Prisma.UserSelect;
  }

  private mapSystemVipAssignment(
    user: any,
    meta: SystemVipBadgeMeta,
    options: {
      active?: boolean;
      assignedByAdminUserId?: string | null;
      revokedByAdminUserId?: string | null;
      revokedReason?: string | null;
      note?: string | null;
      startsAt?: Date | string | null;
      revokedAt?: Date | string | null;
      metadata?: Record<string, unknown> | null;
    } = {},
    canViewRealStaffIdentity = false,
  ) {
    const badge = this.mapSystemVipBadge(meta, 0, canViewRealStaffIdentity);
    const startsAt = options.startsAt ?? null;
    const revokedAt = options.revokedAt ?? null;

    return {
      id: this.buildSystemVipAssignmentId(meta, user.id),
      userId: user.id,
      badgeId: badge.id,
      user: this.mapUser(user),
      badge,
      startsAt: startsAt instanceof Date ? startsAt.toISOString() : startsAt,
      expiresAt: null,
      revokedAt: revokedAt instanceof Date ? revokedAt.toISOString() : revokedAt,
      revokedReason: options.revokedReason ?? null,
      assignedByAdminUserId: this.mapStaffAdminId(
        options.assignedByAdminUserId,
        canViewRealStaffIdentity,
      ),
      revokedByAdminUserId: this.mapStaffAdminId(
        options.revokedByAdminUserId,
        canViewRealStaffIdentity,
      ),
      note: options.note ?? "Manual VIP system badge override",
      metadata: {
        source: "VIP_SYSTEM",
        manualOverride: true,
        vipKey: meta.key,
        compatibilityTone: meta.compatibilityTone,
        ...(options.metadata ?? {}),
      },
      active: options.active ?? !revokedAt,
      createdAt: startsAt instanceof Date ? startsAt.toISOString() : startsAt,
      updatedAt: new Date().toISOString(),
    };
  }

  private async assignSystemVipBadge(
    adminUserId: string,
    adminRole: AdminRole,
    userId: string,
    meta: SystemVipBadgeMeta,
    dto: AssignUserBadgeDto,
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelectForBadgeAssignment(),
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const now = this.now();
    const periodKey = this.getVipPeriodKey(now);
    const note = this.normalizeOptionalString(dto.note, 500) || "Manual VIP system badge override";
    const beforeState = this.mapUser(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.profile.upsert({
        where: { userId },
        create: {
          userId,
          displayName: user.profile?.displayName?.trim() || user.username || "User",
          showBadgeOnProfile: true,
          vipDisplayBadgeKey: meta.key,
          vipLockedBadgeKey: meta.key,
          vipLiveBadgeKey: meta.key,
          vipLockedPeriodKey: periodKey,
          badgeLabel: meta.label,
          badgeTone: meta.compatibilityTone,
        },
        update: {
          showBadgeOnProfile: true,
          vipDisplayBadgeKey: meta.key,
          vipLockedBadgeKey: meta.key,
          vipLiveBadgeKey: meta.key,
          vipLockedPeriodKey: periodKey,
          badgeLabel: meta.label,
          badgeTone: meta.compatibilityTone,
        },
      });

      await tx.userVipMonth.upsert({
        where: {
          userId_periodKey: {
            userId,
            periodKey,
          },
        },
        create: {
          userId,
          periodKey,
          spendCents: 0,
          highestColorBadge: meta.key,
          highestColorReachedAt: now,
          finalizedBadgeKey: meta.key,
        },
        update: {
          highestColorBadge: meta.key,
          highestColorReachedAt: now,
          finalizedBadgeKey: meta.key,
        },
      });
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelectForBadgeAssignment(),
    });

    if (!updatedUser) {
      throw new NotFoundException("User not found after VIP badge assignment.");
    }

    const assignment = this.mapSystemVipAssignment(updatedUser, meta, {
      active: true,
      assignedByAdminUserId: adminUserId,
      note,
      startsAt: now,
      metadata: {
        periodKey,
        assignmentType: "manual_admin_vip_override",
      },
    }, canViewRealStaffIdentity);

    await this.auditSafely({
      adminUserId,
      actionCode: "vip_badge.manual_assign",
      actionLabel: "Manually assigned system VIP badge",
      resourceType: "VIP_BADGE",
      resourceId: assignment.id,
      targetUserId: userId,
      metadata: {
        userId,
        vipKey: meta.key,
        periodKey,
        note,
      },
      beforeState,
      afterState: this.mapUser(updatedUser),
      context,
    });

    return {
      success: true,
      assignment,
    };
  }

  private async revokeSystemVipBadge(
    adminUserId: string,
    adminRole: AdminRole,
    assignmentId: string,
    dto: RevokeUserBadgeDto = {},
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const resolved = this.resolveSystemVipAssignmentId(assignmentId);

    if (!resolved) {
      return null;
    }

    const { meta, userId } = resolved;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelectForBadgeAssignment(),
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const now = this.now();
    const periodKey = this.getVipPeriodKey(now);
    const reason = this.normalizeOptionalString(dto.reason, 500) || "System VIP badge manually revoked by admin";
    const beforeState = this.mapUser(user);

    await this.prisma.$transaction(async (tx) => {
      await tx.profile.updateMany({
        where: { userId },
        data: {
          vipDisplayBadgeKey: null,
          vipLockedBadgeKey: null,
          vipLiveBadgeKey: null,
          vipLockedPeriodKey: null,
          badgeLabel: null,
          badgeTone: null,
        },
      });

      await tx.userVipMonth.updateMany({
        where: {
          userId,
          periodKey,
        },
        data: {
          highestColorBadge: null,
          highestColorReachedAt: null,
          finalizedBadgeKey: null,
        },
      });
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelectForBadgeAssignment(),
    });

    if (!updatedUser) {
      throw new NotFoundException("User not found after VIP badge revocation.");
    }

    const assignment = this.mapSystemVipAssignment(updatedUser, meta, {
      active: false,
      revokedAt: now,
      revokedByAdminUserId: adminUserId,
      revokedReason: reason,
      note: "Manual VIP system badge override revoked",
      metadata: {
        periodKey,
        assignmentType: "manual_admin_vip_override",
      },
    }, canViewRealStaffIdentity);

    await this.auditSafely({
      adminUserId,
      actionCode: "vip_badge.manual_revoke",
      actionLabel: "Manually revoked system VIP badge",
      resourceType: "VIP_BADGE",
      resourceId: assignment.id,
      targetUserId: userId,
      metadata: {
        userId,
        vipKey: meta.key,
        periodKey,
        reason,
      },
      beforeState,
      afterState: this.mapUser(updatedUser),
      context,
    });

    return {
      success: true,
      assignment,
    };
  }

  private mapBadge(row: any, canViewRealStaffIdentity = false) {
    const characteristics = Array.isArray(row.characteristicsJson)
      ? row.characteristicsJson
      : [];

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      assetUrl: row.assetUrl ?? null,
      assetMimeType: row.assetMimeType ?? null,
      assetOriginalName: row.assetOriginalName ?? null,
      assetSize: row.assetSize ?? null,
      status: row.status,
      sortOrder: row.sortOrder ?? 0,
      characteristics,
      metadata: row.metadataJson ?? null,
      assignmentCount: row._count?.assignments ?? undefined,
      createdByAdminUserId: this.mapStaffAdminId(
        row.createdByAdminUserId,
        canViewRealStaffIdentity,
      ),
      updatedByAdminUserId: this.mapStaffAdminId(
        row.updatedByAdminUserId,
        canViewRealStaffIdentity,
      ),
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  private mapUser(row: any) {
    return {
      id: row.id,
      publicId: row.publicId ?? null,
      username: row.username,
      email: row.email ?? null,
      displayName: row.profile?.displayName?.trim() || row.username,
      avatarUrl: row.profile?.avatarUrl ?? null,
      badgeLabel: row.profile?.badgeLabel ?? null,
      badgeTone: row.profile?.badgeTone ?? null,
      vipDisplayBadgeKey: row.profile?.vipDisplayBadgeKey ?? null,
      showBadgeOnProfile:
        typeof row.profile?.showBadgeOnProfile === "boolean"
          ? row.profile.showBadgeOnProfile
          : true,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    };
  }

  private mapAssignment(row: any, canViewRealStaffIdentity = false) {
    const badge = row.badge
      ? this.mapBadge(row.badge, canViewRealStaffIdentity)
      : null;
    const user = row.user ? this.mapUser(row.user) : null;

    const now = this.now();
    const startsAt = row.startsAt ? new Date(row.startsAt) : null;
    const expiresAt = row.expiresAt ? new Date(row.expiresAt) : null;

    const active =
      !row.revokedAt &&
      (!startsAt || startsAt.getTime() <= now.getTime()) &&
      (!expiresAt || expiresAt.getTime() > now.getTime()) &&
      (!badge || badge.status === BadgeStatus.ACTIVE);

    return {
      id: row.id,
      userId: row.userId,
      badgeId: row.badgeId,
      user,
      badge,
      startsAt: row.startsAt?.toISOString?.() ?? row.startsAt ?? null,
      expiresAt: row.expiresAt?.toISOString?.() ?? row.expiresAt ?? null,
      revokedAt: row.revokedAt?.toISOString?.() ?? row.revokedAt ?? null,
      revokedReason: row.revokedReason ?? null,
      assignedByAdminUserId: this.mapStaffAdminId(
        row.assignedByAdminUserId,
        canViewRealStaffIdentity,
      ),
      revokedByAdminUserId: this.mapStaffAdminId(
        row.revokedByAdminUserId,
        canViewRealStaffIdentity,
      ),
      note: row.note ?? null,
      metadata: row.metadataJson ?? null,
      active,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  private async auditSafely(input: {
    adminUserId: string;
    actionCode: string;
    actionLabel: string;
    resourceType: string;
    resourceId?: string | null;
    targetUserId?: string | null;
    metadata?: Record<string, unknown>;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    context?: AuditContext;
  }) {
    try {
      await this.adminAudit.logEvent({
        actorAdminUserId: input.adminUserId,
        actionType: "ADMIN_ACTION",
        actionCode: input.actionCode,
        actionLabel: input.actionLabel,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        references: {
          targetUserId: input.targetUserId ?? undefined,
        },
        metadata: input.metadata ?? {},
        beforeState: input.beforeState ?? undefined,
        afterState: input.afterState ?? undefined,
        requestPath: input.context?.requestPath,
        ipAddress: input.context?.ipAddress,
        userAgent: input.context?.userAgent,
        deviceLabel: input.context?.deviceLabel,
      } as any);
    } catch (error) {
      console.warn("[AdminBadges] Failed to write audit log:", error);
    }
  }

  async listBadges(adminRole: AdminRole, query: AdminBadgesQueryDto = {}) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const limit = this.parseLimit(query.limit, 50, 100);
    const offset = this.parseOffset(query.offset);
    const search = this.normalizeOptionalString(query.search, 120);
    const status = String(query.status || "all").trim().toUpperCase();

    const andFilters: Prisma.BadgeWhereInput[] = [{ deletedAt: null }];

    if (search) {
      andFilters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (status && status !== "ALL") {
      andFilters.push({ status: this.normalizeStatus(status) });
    }

    const where: Prisma.BadgeWhereInput =
      andFilters.length === 1 ? andFilters[0] : { AND: andFilters };

    const [total, items, systemVipBadges] = await Promise.all([
      this.prisma.badge.count({ where }),
      this.prisma.badge.findMany({
        where,
        include: { _count: { select: { assignments: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      this.listSystemVipBadges(canViewRealStaffIdentity),
    ]);

    const systemMatches = systemVipBadges.filter((badge) => {
      if (status && status !== "ALL" && badge.status !== status) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        badge.name,
        badge.slug,
        badge.description,
        badge.vipKey,
        badge.compatibilityTone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search.toLowerCase());
    });

    return {
      total: total + systemMatches.length,
      limit,
      offset,
      items: [...systemMatches, ...items.map((item) => this.mapBadge(item, canViewRealStaffIdentity))],
    };
  }

  async getBadge(adminRole: AdminRole, id: string) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const systemVipBadge = await this.getSystemVipBadgeById(id, canViewRealStaffIdentity);
    if (systemVipBadge) {
      return { badge: systemVipBadge };
    }

    const badge = await this.prisma.badge.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { assignments: true } } },
    });

    if (!badge) {
      throw new NotFoundException("Badge not found.");
    }

    return { badge: this.mapBadge(badge, canViewRealStaffIdentity) };
  }

  async createBadge(
    adminUserId: string,
    adminRole: AdminRole,
    dto: CreateAdminBadgeDto,
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const name = this.normalizeRequiredString(dto.name, "Badge name");
    const slug = await this.buildUniqueBadgeSlug(dto.slug, name);
    const characteristics = this.normalizeCharacteristics(dto.characteristics);
    const metadata = this.normalizeJsonObject(dto.metadata);
    const sortOrder = Number.parseInt(String(dto.sortOrder ?? "0"), 10) || 0;

    const badge = await this.prisma.badge.create({
      data: {
        name,
        slug,
        description: this.normalizeOptionalString(dto.description, 1000),
        assetUrl: this.normalizeOptionalString(dto.assetUrl, 1000),
        status: this.normalizeStatus(dto.status, BadgeStatus.DRAFT),
        sortOrder,
        characteristicsJson: characteristics as Prisma.InputJsonValue,
        metadataJson: metadata as Prisma.InputJsonValue | undefined,
        createdByAdminUserId: adminUserId,
        updatedByAdminUserId: adminUserId,
      },
      include: { _count: { select: { assignments: true } } },
    });

    await this.auditSafely({
      adminUserId,
      actionCode: "badge.create",
      actionLabel: "Created badge",
      resourceType: "BADGE",
      resourceId: badge.id,
      metadata: { badgeSlug: badge.slug, status: badge.status },
      afterState: this.mapBadge(badge, canViewRealStaffIdentity),
      context,
    });

    return {
      success: true,
      badge: this.mapBadge(badge, canViewRealStaffIdentity),
    };
  }

  async updateBadge(
    adminUserId: string,
    adminRole: AdminRole,
    id: string,
    dto: UpdateAdminBadgeDto,
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const existing = await this.prisma.badge.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { assignments: true } } },
    });

    if (!existing) {
      throw new NotFoundException("Badge not found.");
    }

    const data: Prisma.BadgeUpdateInput = {
      updatedByAdminUserId: adminUserId,
    };

    if (dto.name !== undefined) {
      data.name = this.normalizeRequiredString(dto.name, "Badge name");
    }

    if (dto.slug !== undefined) {
      data.slug = await this.buildUniqueBadgeSlug(
        dto.slug,
        String(data.name || existing.name),
        id,
      );
    }

    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalString(dto.description, 1000);
    }

    if (dto.assetUrl !== undefined) {
      data.assetUrl = this.normalizeOptionalString(dto.assetUrl, 1000);
    }

    if (dto.status !== undefined) {
      data.status = this.normalizeStatus(dto.status, existing.status);
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = Number.parseInt(String(dto.sortOrder ?? "0"), 10) || 0;
    }

    if (dto.characteristics !== undefined) {
      data.characteristicsJson = this.normalizeCharacteristics(dto.characteristics) as Prisma.InputJsonValue;
    }

    if (dto.metadata !== undefined) {
      const metadataJson = this.normalizeJsonObject(dto.metadata);
      data.metadataJson =
        metadataJson === null
          ? Prisma.JsonNull
          : (metadataJson as Prisma.InputJsonValue | undefined);
    }

    const updated = await this.prisma.badge.update({
      where: { id },
      data,
      include: { _count: { select: { assignments: true } } },
    });

    await this.auditSafely({
      adminUserId,
      actionCode: "badge.update",
      actionLabel: "Updated badge",
      resourceType: "BADGE",
      resourceId: id,
      metadata: { badgeSlug: updated.slug, status: updated.status },
      beforeState: this.mapBadge(existing, canViewRealStaffIdentity),
      afterState: this.mapBadge(updated, canViewRealStaffIdentity),
      context,
    });

    return {
      success: true,
      badge: this.mapBadge(updated, canViewRealStaffIdentity),
    };
  }

  async softDeleteBadge(
    adminUserId: string,
    adminRole: AdminRole,
    id: string,
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const existing = await this.prisma.badge.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { assignments: true } } },
    });

    if (!existing) {
      throw new NotFoundException("Badge not found.");
    }

    const now = this.now();
    const updated = await this.prisma.badge.update({
      where: { id },
      data: {
        status: BadgeStatus.DISABLED,
        deletedAt: now,
        updatedByAdminUserId: adminUserId,
      },
      include: { _count: { select: { assignments: true } } },
    });

    await this.auditSafely({
      adminUserId,
      actionCode: "badge.delete",
      actionLabel: "Deleted badge",
      resourceType: "BADGE",
      resourceId: id,
      metadata: { badgeSlug: existing.slug },
      beforeState: this.mapBadge(existing, canViewRealStaffIdentity),
      afterState: this.mapBadge(updated, canViewRealStaffIdentity),
      context,
    });

    return {
      success: true,
      badge: this.mapBadge(updated, canViewRealStaffIdentity),
    };
  }

  async updateBadgeAsset(
    adminUserId: string,
    adminRole: AdminRole,
    id: string,
    file: Express.Multer.File,
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    if (!file) {
      throw new BadRequestException("No badge asset file uploaded.");
    }

    const existing = await this.prisma.badge.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { assignments: true } } },
    });

    if (!existing) {
      throw new NotFoundException("Badge not found.");
    }

    const assetUrl = `/uploads/badges/${file.filename}`;

    const updated = await this.prisma.badge.update({
      where: { id },
      data: {
        assetUrl,
        assetMimeType: file.mimetype || null,
        assetOriginalName: file.originalname || null,
        assetSize: file.size || null,
        updatedByAdminUserId: adminUserId,
      },
      include: { _count: { select: { assignments: true } } },
    });

    await this.auditSafely({
      adminUserId,
      actionCode: "badge.asset_upload",
      actionLabel: "Uploaded badge asset",
      resourceType: "BADGE",
      resourceId: id,
      metadata: {
        assetUrl,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      beforeState: this.mapBadge(existing, canViewRealStaffIdentity),
      afterState: this.mapBadge(updated, canViewRealStaffIdentity),
      context,
    });

    return {
      success: true,
      asset: {
        assetUrl,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      badge: this.mapBadge(updated, canViewRealStaffIdentity),
    };
  }

  async searchUsers(query: AdminBadgeUserSearchDto = {}) {
    const search = this.normalizeOptionalString(query.search, 120);
    const limit = this.parseLimit(query.limit, 25, 50);

    if (!search || search.length < 2) {
      return { items: [] };
    }

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { publicId: { contains: search, mode: "insensitive" } },
          { profile: { is: { displayName: { contains: search, mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        publicId: true,
        username: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            badgeLabel: true,
            badgeTone: true,
            vipDisplayBadgeKey: true,
            vipLockedBadgeKey: true,
            vipLiveBadgeKey: true,
            vipLockedPeriodKey: true,
            showBadgeOnProfile: true,
          },
        },
      },
      orderBy: [{ username: "asc" }],
      take: limit,
    });

    return {
      items: users.map((user) => this.mapUser(user)),
    };
  }

  async listUserBadges(adminRole: AdminRole, userId: string) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        publicId: true,
        username: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            badgeLabel: true,
            badgeTone: true,
            vipDisplayBadgeKey: true,
            vipLockedBadgeKey: true,
            vipLiveBadgeKey: true,
            vipLockedPeriodKey: true,
            showBadgeOnProfile: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const assignments = await this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: { include: { _count: { select: { assignments: true } } } },
        user: {
          select: {
            id: true,
            publicId: true,
            username: true,
            email: true,
            createdAt: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                badgeLabel: true,
                badgeTone: true,
                vipDisplayBadgeKey: true,
                vipLockedBadgeKey: true,
                vipLiveBadgeKey: true,
                vipLockedPeriodKey: true,
                showBadgeOnProfile: true,
              },
            },
          },
        },
      },
      orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    });

    const mappedAssignments = assignments.map((assignment) =>
      this.mapAssignment(assignment, canViewRealStaffIdentity),
    );
    const currentVipKey = user.profile?.vipDisplayBadgeKey as VipBadgeKey | null | undefined;
    const currentVipMeta = currentVipKey
      ? VIP_SYSTEM_BADGE_META.find((meta) => meta.key === currentVipKey)
      : null;

    if (currentVipMeta) {
      mappedAssignments.unshift(
        this.mapSystemVipAssignment(user, currentVipMeta, {
          active: true,
          note: "Current system VIP badge",
          metadata: {
            assignmentType: "system_vip_profile_state",
            vipDisplayBadgeKey: currentVipKey,
            vipLockedBadgeKey: user.profile?.vipLockedBadgeKey ?? null,
            vipLiveBadgeKey: user.profile?.vipLiveBadgeKey ?? null,
            vipLockedPeriodKey: user.profile?.vipLockedPeriodKey ?? null,
          },
        }, canViewRealStaffIdentity),
      );
    }

    return {
      user: this.mapUser(user),
      items: mappedAssignments,
    };
  }

  async assignBadge(
    adminUserId: string,
    adminRole: AdminRole,
    userId: string,
    dto: AssignUserBadgeDto,
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const systemVipMeta = this.resolveSystemVipMetaFromBadgeId(dto.badgeId);

    if (systemVipMeta) {
      return this.assignSystemVipBadge(
        adminUserId,
        adminRole,
        userId,
        systemVipMeta,
        dto,
        context,
      );
    }

    const [user, badge] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          publicId: true,
          username: true,
          email: true,
          createdAt: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              badgeLabel: true,
              badgeTone: true,
              vipDisplayBadgeKey: true,
              vipLockedBadgeKey: true,
              vipLiveBadgeKey: true,
              vipLockedPeriodKey: true,
              showBadgeOnProfile: true,
            },
          },
        },
      }),
      this.prisma.badge.findFirst({
        where: { id: dto.badgeId, deletedAt: null },
        include: { _count: { select: { assignments: true } } },
      }),
    ]);

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (!badge) {
      throw new NotFoundException("Badge not found.");
    }

    if (badge.status === BadgeStatus.DISABLED) {
      throw new BadRequestException("Disabled badges cannot be assigned.");
    }

    const startsAt = this.parseDate(dto.startsAt, "startsAt") ?? this.now();
    const expiresAt = this.parseDate(dto.expiresAt, "expiresAt");

    if (expiresAt && expiresAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException("expiresAt must be after startsAt.");
    }

    const activeDuplicate = await this.prisma.userBadge.findFirst({
      where: {
        userId,
        badgeId: dto.badgeId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: this.now() } }],
      },
    });

    if (activeDuplicate) {
      throw new BadRequestException("This user already has an active assignment for that badge.");
    }

    const metadata = this.normalizeJsonObject(dto.metadata);
    const assignment = await this.prisma.userBadge.create({
      data: {
        userId,
        badgeId: dto.badgeId,
        startsAt,
        expiresAt,
        note: this.normalizeOptionalString(dto.note, 500),
        metadataJson: metadata as Prisma.InputJsonValue | undefined,
        assignedByAdminUserId: adminUserId,
      },
      include: {
        badge: { include: { _count: { select: { assignments: true } } } },
        user: {
          select: {
            id: true,
            publicId: true,
            username: true,
            email: true,
            createdAt: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                badgeLabel: true,
                badgeTone: true,
                vipDisplayBadgeKey: true,
                vipLockedBadgeKey: true,
                vipLiveBadgeKey: true,
                vipLockedPeriodKey: true,
                showBadgeOnProfile: true,
              },
            },
          },
        },
      },
    });

    await this.auditSafely({
      adminUserId,
      actionCode: "badge.assign",
      actionLabel: "Assigned badge to user",
      resourceType: "USER_BADGE",
      resourceId: assignment.id,
      targetUserId: userId,
      metadata: {
        userId,
        badgeId: badge.id,
        badgeSlug: badge.slug,
        startsAt: assignment.startsAt?.toISOString?.() ?? assignment.startsAt,
        expiresAt: assignment.expiresAt?.toISOString?.() ?? assignment.expiresAt,
      },
      afterState: this.mapAssignment(assignment, canViewRealStaffIdentity),
      context,
    });

    return {
      success: true,
      assignment: this.mapAssignment(assignment, canViewRealStaffIdentity),
    };
  }

  async updateUserBadge(
    adminUserId: string,
    adminRole: AdminRole,
    assignmentId: string,
    dto: UpdateUserBadgeDto,
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const existing = await this.prisma.userBadge.findUnique({
      where: { id: assignmentId },
      include: {
        badge: { include: { _count: { select: { assignments: true } } } },
        user: {
          select: {
            id: true,
            publicId: true,
            username: true,
            email: true,
            createdAt: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                badgeLabel: true,
                badgeTone: true,
                vipDisplayBadgeKey: true,
                vipLockedBadgeKey: true,
                vipLiveBadgeKey: true,
                vipLockedPeriodKey: true,
                showBadgeOnProfile: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Badge assignment not found.");
    }

    const data: Prisma.UserBadgeUpdateInput = {};

    if (dto.startsAt !== undefined) {
      const startsAt = this.parseDate(dto.startsAt, "startsAt");
      if (startsAt) data.startsAt = startsAt;
    }

    if (dto.clearExpiration) {
      data.expiresAt = null;
    } else if (dto.expiresAt !== undefined) {
      data.expiresAt = this.parseDate(dto.expiresAt, "expiresAt");
    }

    if (dto.note !== undefined) {
      data.note = this.normalizeOptionalString(dto.note, 500);
    }

    if (dto.metadata !== undefined) {
      const metadataJson = this.normalizeJsonObject(dto.metadata);
      data.metadataJson =
        metadataJson === null
          ? Prisma.JsonNull
          : (metadataJson as Prisma.InputJsonValue | undefined);
    }

    const updated = await this.prisma.userBadge.update({
      where: { id: assignmentId },
      data,
      include: {
        badge: { include: { _count: { select: { assignments: true } } } },
        user: {
          select: {
            id: true,
            publicId: true,
            username: true,
            email: true,
            createdAt: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                badgeLabel: true,
                badgeTone: true,
                vipDisplayBadgeKey: true,
                vipLockedBadgeKey: true,
                vipLiveBadgeKey: true,
                vipLockedPeriodKey: true,
                showBadgeOnProfile: true,
              },
            },
          },
        },
      },
    });

    await this.auditSafely({
      adminUserId,
      actionCode: "badge.assignment.update",
      actionLabel: "Updated user badge assignment",
      resourceType: "USER_BADGE",
      resourceId: assignmentId,
      targetUserId: updated.userId,
      beforeState: this.mapAssignment(existing, canViewRealStaffIdentity),
      afterState: this.mapAssignment(updated, canViewRealStaffIdentity),
      context,
    });

    return {
      success: true,
      assignment: this.mapAssignment(updated, canViewRealStaffIdentity),
    };
  }

  async revokeUserBadge(
    adminUserId: string,
    adminRole: AdminRole,
    assignmentId: string,
    dto: RevokeUserBadgeDto = {},
    context: AuditContext = {},
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const systemVipRevocation = await this.revokeSystemVipBadge(
      adminUserId,
      adminRole,
      assignmentId,
      dto,
      context,
    );

    if (systemVipRevocation) {
      return systemVipRevocation;
    }

    const existing = await this.prisma.userBadge.findUnique({
      where: { id: assignmentId },
      include: {
        badge: { include: { _count: { select: { assignments: true } } } },
        user: {
          select: {
            id: true,
            publicId: true,
            username: true,
            email: true,
            createdAt: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                badgeLabel: true,
                badgeTone: true,
                vipDisplayBadgeKey: true,
                vipLockedBadgeKey: true,
                vipLiveBadgeKey: true,
                vipLockedPeriodKey: true,
                showBadgeOnProfile: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Badge assignment not found.");
    }

    const updated = await this.prisma.userBadge.update({
      where: { id: assignmentId },
      data: {
        revokedAt: this.now(),
        revokedByAdminUserId: adminUserId,
        revokedReason: this.normalizeOptionalString(dto.reason, 500),
      },
      include: {
        badge: { include: { _count: { select: { assignments: true } } } },
        user: {
          select: {
            id: true,
            publicId: true,
            username: true,
            email: true,
            createdAt: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
                badgeLabel: true,
                badgeTone: true,
                vipDisplayBadgeKey: true,
                vipLockedBadgeKey: true,
                vipLiveBadgeKey: true,
                vipLockedPeriodKey: true,
                showBadgeOnProfile: true,
              },
            },
          },
        },
      },
    });

    await this.auditSafely({
      adminUserId,
      actionCode: "badge.revoke",
      actionLabel: "Revoked user badge assignment",
      resourceType: "USER_BADGE",
      resourceId: assignmentId,
      targetUserId: updated.userId,
      metadata: {
        reason: updated.revokedReason ?? null,
      },
      beforeState: this.mapAssignment(existing, canViewRealStaffIdentity),
      afterState: this.mapAssignment(updated, canViewRealStaffIdentity),
      context,
    });

    return {
      success: true,
      assignment: this.mapAssignment(updated, canViewRealStaffIdentity),
    };
  }

  async getActiveProfileBadges(userId: string) {
    const now = this.now();

    const rows = await this.prisma.userBadge.findMany({
      where: {
        userId,
        ...this.activeAssignmentWindowWhere(now),
        badge: {
          status: BadgeStatus.ACTIVE,
          deletedAt: null,
        },
      },
      include: {
        badge: { include: { _count: { select: { assignments: true } } } },
      },
      orderBy: [
        { badge: { sortOrder: "asc" } },
        { createdAt: "asc" },
      ],
      take: 30,
    });

    return rows.map((row) => ({
      assignmentId: row.id,
      assignedAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      startsAt: row.startsAt?.toISOString?.() ?? row.startsAt ?? null,
      expiresAt: row.expiresAt?.toISOString?.() ?? row.expiresAt ?? null,
      ...this.mapBadge(row.badge),
    }));
  }
}

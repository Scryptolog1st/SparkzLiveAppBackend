import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  DiscoveryBoostDto,
  DiscoveryControlsQueryDto,
  DiscoveryHideDto,
} from "./dto/app-config.dto";

type FeatureFlagRecord = {
  key: string;
  enabled: boolean;
  updatedAt?: string | null;
};

type DiscoveryBoostRecord = {
  userId: string;
  username: string;
  expiresAt: string;
};

type DiscoveryHiddenRecord = {
  userId: string;
  username: string;
  reason: string | null;
  hiddenAt: string;
};

type DiscoveryControlItem = {
  userId: string;
  username: string;
  hidden: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
  boosted: boolean;
  boostExpiresAt: string | null;
  boostActive: boolean;
};

type AdminAuditRequestContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

type AppLoginGateConfig = {
  enabled: boolean;
  mode: "BADGE_GATE";
  allowedCharacteristics: string[];
  message: string;
  updatedAt?: string | null;
};

const APP_LOGIN_GATE_CONFIG_KEY = "app_login_gate";

const DEFAULT_APP_LOGIN_GATE_CONFIG: AppLoginGateConfig = {
  enabled: false,
  mode: "BADGE_GATE",
  allowedCharacteristics: ["APP_LOGIN_ACCESS"],
  message: "SparkzLive alpha testing is invite-only right now.",
  updatedAt: null,
};

@Injectable()
export class AppConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAudit: AdminAuditService,
  ) { }

  private readonly defaultFlags = [
    {
      key: "global_pk_battles_enabled",
      label: "Global PK Battles Enabled",
      enabled: true,
    },
    {
      key: "ar_beauty_filters_ios",
      label: "AR Beauty Filters (iOS)",
      enabled: true,
    },
    {
      key: "gacha_gift_animations",
      label: "Gacha Gift Animations",
      enabled: true,
    },
    {
      key: "guest_box_multistream",
      label: "Guest Box (Multi-Stream)",
      enabled: false,
    },
  ];

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

  private async getConfigRecord<T = any>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.appConfig.findUnique({
      where: { key },
    });

    if (!row) return fallback;
    return row.valueJson as T;
  }

  private async setConfigRecord(key: string, value: any) {
    return this.prisma.appConfig.upsert({
      where: { key },
      create: {
        key,
        valueJson: value,
      },
      update: {
        valueJson: value,
      },
    });
  }

  private normalizeLoginGateCharacteristicKey(value: unknown) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_:-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private normalizeLoginGateConfig(value: unknown): AppLoginGateConfig {
    const raw =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, any>)
        : {};

    const allowedCharacteristics = Array.isArray(raw.allowedCharacteristics)
      ? raw.allowedCharacteristics
          .map((item) => this.normalizeLoginGateCharacteristicKey(item))
          .filter(Boolean)
      : DEFAULT_APP_LOGIN_GATE_CONFIG.allowedCharacteristics;

    return {
      enabled: Boolean(raw.enabled),
      mode: "BADGE_GATE",
      allowedCharacteristics:
        allowedCharacteristics.length > 0
          ? Array.from(new Set(allowedCharacteristics))
          : DEFAULT_APP_LOGIN_GATE_CONFIG.allowedCharacteristics,
      message:
        typeof raw.message === "string" && raw.message.trim()
          ? raw.message.trim().slice(0, 500)
          : DEFAULT_APP_LOGIN_GATE_CONFIG.message,
      updatedAt:
        typeof raw.updatedAt === "string" && raw.updatedAt.trim()
          ? raw.updatedAt.trim()
          : null,
    };
  }

  async getLoginGateConfigForAuth(): Promise<AppLoginGateConfig> {
    const config = await this.getConfigRecord<AppLoginGateConfig>(
      APP_LOGIN_GATE_CONFIG_KEY,
      DEFAULT_APP_LOGIN_GATE_CONFIG,
    );

    return this.normalizeLoginGateConfig(config);
  }

  async getLoginGate(adminUserId: string, _context: AdminAuditRequestContext = {}) {
    await this.requireAdmin(adminUserId);
    const config = await this.getLoginGateConfigForAuth();

    return { config };
  }

  async updateLoginGate(
    adminUserId: string,
    input: Partial<AppLoginGateConfig> = {},
    _context: AdminAuditRequestContext = {},
  ) {
    await this.requireAdmin(adminUserId);

    const current = await this.getLoginGateConfigForAuth();
    const next = this.normalizeLoginGateConfig({
      ...current,
      ...input,
      enabled:
        typeof input.enabled === "boolean"
          ? input.enabled
          : current.enabled,
      updatedAt: new Date().toISOString(),
    });

    await this.setConfigRecord(APP_LOGIN_GATE_CONFIG_KEY, next);

    return { config: next };
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

  private async resolveTargetUser(input: { username?: string; userId?: string }) {
    if (input.userId) {
      return this.prisma.user.findUnique({
        where: { id: input.userId },
        include: { profile: true },
      });
    }

    if (input.username) {
      return this.prisma.user.findUnique({
        where: { username: input.username.trim() },
        include: { profile: true },
      });
    }

    return null;
  }

  private buildDiscoveryControlItems(
    hidden: DiscoveryHiddenRecord[],
    boosts: DiscoveryBoostRecord[],
    includeExpiredBoosts: boolean,
  ) {
    const now = Date.now();

    const boostByUserId = new Map<string, DiscoveryBoostRecord>();
    for (const row of boosts) {
      if (!includeExpiredBoosts) {
        const expiresAtMs = new Date(row.expiresAt).getTime();
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
          continue;
        }
      }
      boostByUserId.set(row.userId, row);
    }

    const hiddenByUserId = new Map<string, DiscoveryHiddenRecord>();
    for (const row of hidden) {
      hiddenByUserId.set(row.userId, row);
    }

    const allUserIds = new Set<string>([
      ...hiddenByUserId.keys(),
      ...boostByUserId.keys(),
    ]);

    const items: DiscoveryControlItem[] = [];

    for (const userId of allUserIds) {
      const hiddenRow = hiddenByUserId.get(userId) ?? null;
      const boostRow = boostByUserId.get(userId) ?? null;
      const boostExpiresAtMs = boostRow ? new Date(boostRow.expiresAt).getTime() : NaN;

      items.push({
        userId,
        username: hiddenRow?.username || boostRow?.username || userId,
        hidden: Boolean(hiddenRow),
        hiddenAt: hiddenRow?.hiddenAt ?? null,
        hiddenReason: hiddenRow?.reason ?? null,
        boosted: Boolean(boostRow),
        boostExpiresAt: boostRow?.expiresAt ?? null,
        boostActive:
          Boolean(boostRow) &&
          Number.isFinite(boostExpiresAtMs) &&
          boostExpiresAtMs > Date.now(),
      });
    }

    return items;
  }

  private async addSystemAudit(args: {
    actorAdminUserId: string;
    actionType?: "VIEW" | "SYSTEM_ACTION";
    actionCode: string;
    actionLabel: string;
    metadata?: Record<string, unknown> | null;
    target?: {
      id: string;
      name?: string | null;
      type?: string | null;
    } | null;
    references?: {
      targetUserId?: string | null;
    } | null;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    diff?: Record<string, unknown> | null;
    requestContext?: AdminAuditRequestContext | null;
  }) {
    const requestContext = this.normalizeAuditContext(args.requestContext);

    await this.adminAudit.logEvent({
      actorAdminUserId: args.actorAdminUserId,
      actionType: args.actionType ?? "SYSTEM_ACTION",
      actionCode: args.actionCode,
      actionLabel: args.actionLabel,
      resourceType: "SYSTEM",
      resourceId: args.target?.id ?? args.actionCode,
      target: args.target ?? {
        id: args.actionCode,
        name: args.actionLabel,
        type: "SYSTEM_CONFIG",
      },
      references: {
        targetUserId: args.references?.targetUserId ?? null,
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

  async getFeatureFlags(
    adminUserId: string,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const storedFlags = await this.getConfigRecord<FeatureFlagRecord[]>(
      "feature_flags",
      [],
    );

    const byKey = new Map(storedFlags.map((row) => [row.key, row]));

    const items = this.defaultFlags.map((flag) => {
      const stored = byKey.get(flag.key);

      return {
        key: flag.key,
        label: flag.label,
        enabled: stored?.enabled ?? flag.enabled,
        updatedAt: stored?.updatedAt ?? null,
      };
    });

    await this.addSystemAudit({
      actorAdminUserId: adminUserId,
      actionType: "VIEW",
      actionCode: "settings.feature_flags.view",
      actionLabel: "Viewed feature flags",
      target: {
        id: "feature_flags",
        name: "Feature Flags",
        type: "SYSTEM_CONFIG",
      },
      metadata: {
        count: items.length,
      },
      requestContext,
    });

    return {
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  async updateFeatureFlag(
    adminUserId: string,
    key: string,
    enabled: boolean,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const normalizedKey = String(key || "").trim();
    const definition = this.defaultFlags.find((item) => item.key === normalizedKey);

    if (!definition) {
      throw new BadRequestException("Unknown feature flag.");
    }

    const storedFlags = await this.getConfigRecord<FeatureFlagRecord[]>(
      "feature_flags",
      [],
    );

    const byKey = new Map(storedFlags.map((row) => [row.key, row]));
    const previous = byKey.get(normalizedKey) ?? {
      key: normalizedKey,
      enabled: definition.enabled,
      updatedAt: null,
    };

    const nextItem: FeatureFlagRecord = {
      key: normalizedKey,
      enabled: Boolean(enabled),
      updatedAt: new Date().toISOString(),
    };

    byKey.set(normalizedKey, nextItem);

    await this.setConfigRecord("feature_flags", Array.from(byKey.values()));

    await this.addSystemAudit({
      actorAdminUserId: adminUserId,
      actionCode: "settings.feature_flag.update",
      actionLabel: "Updated feature flag",
      target: {
        id: normalizedKey,
        name: definition.label,
        type: "FEATURE_FLAG",
      },
      metadata: {
        key: normalizedKey,
        label: definition.label,
      },
      beforeState: {
        enabled: previous.enabled,
      },
      afterState: {
        enabled: nextItem.enabled,
      },
      diff: {
        enabled: {
          before: previous.enabled,
          after: nextItem.enabled,
        },
      },
      requestContext,
    });

    return {
      success: true,
      item: {
        key: normalizedKey,
        label: definition.label,
        enabled: nextItem.enabled,
        updatedAt: nextItem.updatedAt,
      },
    };
  }

  async boostUser(
    adminUserId: string,
    body: DiscoveryBoostDto,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const targetUser = await this.resolveTargetUser(body);

    if (!targetUser) {
      throw new BadRequestException("Target user not found.");
    }

    const boosts = await this.getConfigRecord<DiscoveryBoostRecord[]>(
      "discovery_boosts",
      [],
    );

    const durationMinutes = Math.max(1, Number(body.durationMinutes || 60));
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const nextRow: DiscoveryBoostRecord = {
      userId: targetUser.id,
      username: targetUser.username,
      expiresAt,
    };

    const nextBoosts = [
      ...boosts.filter((row) => row.userId !== targetUser.id),
      nextRow,
    ];

    await this.setConfigRecord("discovery_boosts", nextBoosts);

    await this.addSystemAudit({
      actorAdminUserId: adminUserId,
      actionCode: "settings.discovery.boost",
      actionLabel: "Boosted user in discovery controls",
      target: {
        id: targetUser.id,
        name: targetUser.username,
        type: "USER",
      },
      references: {
        targetUserId: targetUser.id,
      },
      metadata: {
        username: targetUser.username,
        durationMinutes,
        expiresAt,
      },
      afterState: nextRow,
      requestContext,
    });

    return {
      success: true,
      item: nextRow,
    };
  }

  async clearBoost(
    adminUserId: string,
    userId: string,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const boosts = await this.getConfigRecord<DiscoveryBoostRecord[]>(
      "discovery_boosts",
      [],
    );

    const target = boosts.find((row) => row.userId === userId) ?? null;
    const nextBoosts = boosts.filter((row) => row.userId !== userId);

    await this.setConfigRecord("discovery_boosts", nextBoosts);

    await this.addSystemAudit({
      actorAdminUserId: adminUserId,
      actionCode: "settings.discovery.boost.clear",
      actionLabel: "Cleared discovery boost",
      target: {
        id: userId,
        name: target?.username ?? userId,
        type: "USER",
      },
      references: {
        targetUserId: userId,
      },
      beforeState: target ?? undefined,
      afterState: null,
      requestContext,
    });

    return {
      success: true,
      clearedUserId: userId,
    };
  }

  async hideUser(
    adminUserId: string,
    body: DiscoveryHideDto,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const targetUser = await this.resolveTargetUser(body);

    if (!targetUser) {
      throw new BadRequestException("Target user not found.");
    }

    const hidden = await this.getConfigRecord<DiscoveryHiddenRecord[]>(
      "discovery_hidden",
      [],
    );

    const nextRow: DiscoveryHiddenRecord = {
      userId: targetUser.id,
      username: targetUser.username,
      reason: this.normalizeOptionalString((body as any).reason),
      hiddenAt: new Date().toISOString(),
    };

    const nextHidden = [
      ...hidden.filter((row) => row.userId !== targetUser.id),
      nextRow,
    ];

    await this.setConfigRecord("discovery_hidden", nextHidden);

    await this.addSystemAudit({
      actorAdminUserId: adminUserId,
      actionCode: "settings.discovery.hide",
      actionLabel: "Hid user from discovery",
      target: {
        id: targetUser.id,
        name: targetUser.username,
        type: "USER",
      },
      references: {
        targetUserId: targetUser.id,
      },
      metadata: {
        username: targetUser.username,
        reason: nextRow.reason,
      },
      afterState: nextRow,
      requestContext,
    });

    return {
      success: true,
      item: nextRow,
    };
  }

  async unhideUser(
    adminUserId: string,
    userId: string,
    requestContext?: AdminAuditRequestContext | null,
  ) {
    await this.requireAdmin(adminUserId);

    const hidden = await this.getConfigRecord<DiscoveryHiddenRecord[]>(
      "discovery_hidden",
      [],
    );

    const previous = hidden.find((row) => row.userId === userId) ?? null;
    const nextHidden = hidden.filter((row) => row.userId !== userId);

    await this.setConfigRecord("discovery_hidden", nextHidden);

    await this.addSystemAudit({
      actorAdminUserId: adminUserId,
      actionCode: "settings.discovery.unhide",
      actionLabel: "Restored user to discovery",
      target: {
        id: userId,
        name: previous?.username ?? userId,
        type: "USER",
      },
      references: {
        targetUserId: userId,
      },
      beforeState: previous ?? undefined,
      afterState: null,
      requestContext,
    });

    return {
      success: true,
      restoredUserId: userId,
    };
  }

  async getDiscoveryControls(
    adminUserId: string,
    query: DiscoveryControlsQueryDto = {},
  ) {
    await this.requireAdmin(adminUserId);

    const [boosts, hidden] = await Promise.all([
      this.getConfigRecord<DiscoveryBoostRecord[]>("discovery_boosts", []),
      this.getConfigRecord<DiscoveryHiddenRecord[]>("discovery_hidden", []),
    ]);

    const now = Date.now();
    const includeExpiredBoosts = query.includeExpiredBoosts === true;
    const search = String(query.search || "").trim().toLowerCase();
    const state = String(query.state || "all").trim().toLowerCase();

    const activeBoosts = boosts.filter((row) => {
      const expiresAtMs = new Date(row.expiresAt).getTime();
      return Number.isFinite(expiresAtMs) && expiresAtMs > now;
    });

    let items = this.buildDiscoveryControlItems(
      hidden,
      boosts,
      includeExpiredBoosts,
    );

    if (search) {
      items = items.filter((item) => {
        return (
          item.userId.toLowerCase().includes(search) ||
          item.username.toLowerCase().includes(search) ||
          String(item.hiddenReason || "").toLowerCase().includes(search)
        );
      });
    }

    if (state === "hidden") {
      items = items.filter((item) => item.hidden);
    } else if (state === "boosted") {
      items = items.filter((item) => item.boosted && item.boostActive);
    } else if (state === "both") {
      items = items.filter((item) => item.hidden && item.boosted);
    }

    items.sort((a, b) => {
      const aTime = Math.max(
        a.hiddenAt ? new Date(a.hiddenAt).getTime() : 0,
        a.boostExpiresAt ? new Date(a.boostExpiresAt).getTime() : 0,
      );
      const bTime = Math.max(
        b.hiddenAt ? new Date(b.hiddenAt).getTime() : 0,
        b.boostExpiresAt ? new Date(b.boostExpiresAt).getTime() : 0,
      );

      return bTime - aTime || a.username.localeCompare(b.username);
    });

    return {
      boosts: includeExpiredBoosts ? boosts : activeBoosts,
      hidden,
      items,
      summary: {
        hiddenCount: hidden.length,
        activeBoostCount: activeBoosts.length,
        totalReviewItems: items.length,
      },
      filters: {
        search: query.search ?? null,
        state,
        includeExpiredBoosts,
      },
    };
  }
}
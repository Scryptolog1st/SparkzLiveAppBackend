import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import {
  AdminInAppAlertsQueryDto,
  CreateInAppAlertDto,
  DueInAppAlertsQueryDto,
  InAppAlertActionDto,
  InAppAlertCadenceDto,
  InAppAlertEventDto,
  InAppAlertStatusDto,
  UpdateInAppAlertDto,
} from "./dto/in-app-alerts.dto";

type InAppAlertRow = Record<string, any>;
type InAppAlertDeliveryRow = Record<string, any>;

const DEFAULT_CONFIRM_LABEL = "OK";
const DEFAULT_EVENT_KEY = "app_start";

@Injectable()
export class InAppAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  private client() {
    return this.prisma as any;
  }

  private now() {
    return new Date();
  }

  private trim(value: unknown) {
    return String(value ?? "").trim();
  }

  private optionalString(value: unknown) {
    const normalized = this.trim(value);
    return normalized.length ? normalized : null;
  }

  private normalizeStatus(value: unknown, fallback: InAppAlertStatusDto = "DRAFT") {
    const normalized = this.trim(value || fallback).toUpperCase();
    if (["DRAFT", "ACTIVE", "DISABLED", "EXPIRED"].includes(normalized)) {
      return normalized as InAppAlertStatusDto;
    }
    return fallback;
  }

  private normalizeCadence(value: unknown, fallback: InAppAlertCadenceDto = "ONCE_EVER") {
    const normalized = this.trim(value || fallback).toUpperCase();
    if (
      [
        "ONCE_EVER",
        "ONCE_DAILY",
        "EVERY_APP_START",
        "CRON",
        "EVENT_TRIGGERED",
        "EVENT_ONCE",
      ].includes(normalized)
    ) {
      return normalized as InAppAlertCadenceDto;
    }
    return fallback;
  }

  private normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => this.trim(item)).filter(Boolean);
  }

  private normalizePlatform(value: unknown) {
    return this.trim(value).toLowerCase();
  }

  private parseDate(value: unknown, fallback?: Date) {
    if (value == null || value === "") return fallback ?? null;
    const date = new Date(String(value));
    if (!Number.isFinite(date.getTime())) {
      throw new BadRequestException(`Invalid date: ${value}`);
    }
    return date;
  }

  private compareAppVersions(current?: string | null, expected?: string | null) {
    const a = this.trim(current);
    const b = this.trim(expected);
    if (!a || !b) return 0;

    const left = a.split(".").map((part) => Number.parseInt(part, 10));
    const right = b.split(".").map((part) => Number.parseInt(part, 10));
    const length = Math.max(left.length, right.length);

    for (let index = 0; index < length; index += 1) {
      const l = Number.isFinite(left[index]) ? left[index] : 0;
      const r = Number.isFinite(right[index]) ? right[index] : 0;
      if (l > r) return 1;
      if (l < r) return -1;
    }

    return 0;
  }

  private mapAlert(alert: InAppAlertRow, stats?: Record<string, unknown>) {
    return {
      id: alert.id,
      title: alert.title,
      body: alert.body,
      footerText: alert.footerText ?? null,
      confirmButtonLabel: alert.confirmButtonLabel || DEFAULT_CONFIRM_LABEL,
      status: alert.status,
      priority: alert.priority ?? 0,
      startAt: alert.startAt?.toISOString?.() ?? alert.startAt,
      endAt: alert.endAt?.toISOString?.() ?? alert.endAt ?? null,
      cadence: alert.cadence,
      cronExpression: alert.cronExpression ?? null,
      eventTriggerKey: alert.eventTriggerKey ?? null,
      targetAllUsers: Boolean(alert.targetAllUsers),
      targetRoles: Array.isArray(alert.targetRoles) ? alert.targetRoles : [],
      targetUserIds: Array.isArray(alert.targetUserIds) ? alert.targetUserIds : [],
      targetPlatforms: Array.isArray(alert.targetPlatforms) ? alert.targetPlatforms : [],
      minAppVersion: alert.minAppVersion ?? null,
      maxAppVersion: alert.maxAppVersion ?? null,
      metadata: alert.metadataJson ?? null,
      deletedAt: alert.deletedAt?.toISOString?.() ?? alert.deletedAt ?? null,
      createdAt: alert.createdAt?.toISOString?.() ?? alert.createdAt,
      updatedAt: alert.updatedAt?.toISOString?.() ?? alert.updatedAt,
      stats: stats ?? {
        totalImpressions: 0,
        totalAcknowledgments: 0,
        totalDismissals: 0,
        lastShownAt: null,
        activeNow: this.isActiveNow(alert, this.now()),
      },
    };
  }

  private mapMobileAlert(alert: InAppAlertRow) {
    return {
      id: alert.id,
      title: alert.title,
      body: alert.body,
      footerText: alert.footerText ?? null,
      confirmButtonLabel: alert.confirmButtonLabel || DEFAULT_CONFIRM_LABEL,
      priority: alert.priority ?? 0,
      cadence: alert.cadence,
      eventTriggerKey: alert.eventTriggerKey ?? null,
      metadata: alert.metadataJson ?? null,
    };
  }

  private buildCreateData(dto: CreateInAppAlertDto, adminUserId: string) {
    const startAt = this.parseDate(dto.startAt, this.now());
    const endAt = this.parseDate(dto.endAt, undefined);
    if (endAt && startAt && endAt < startAt) {
      throw new BadRequestException("Alert endAt must be after startAt.");
    }

    const eventTriggerKey = this.optionalString(dto.eventTriggerKey);
    const cadence = this.normalizeCadence(dto.cadence);

    if ((cadence === "EVENT_TRIGGERED" || cadence === "EVENT_ONCE") && !eventTriggerKey) {
      throw new BadRequestException("Event-triggered alerts require eventTriggerKey.");
    }

    return {
      title: this.trim(dto.title),
      body: this.trim(dto.body),
      footerText: this.optionalString(dto.footerText),
      confirmButtonLabel: this.optionalString(dto.confirmButtonLabel) || DEFAULT_CONFIRM_LABEL,
      status: this.normalizeStatus(dto.status),
      priority: Number.isFinite(Number(dto.priority)) ? Number(dto.priority) : 0,
      startAt,
      endAt,
      cadence,
      cronExpression: this.optionalString(dto.cronExpression),
      eventTriggerKey,
      targetAllUsers: dto.targetAllUsers !== false,
      targetRoles: this.normalizeStringArray(dto.targetRoles),
      targetUserIds: this.normalizeStringArray(dto.targetUserIds),
      targetPlatforms: this.normalizeStringArray(dto.targetPlatforms).map((platform) =>
        platform.toLowerCase(),
      ),
      minAppVersion: this.optionalString(dto.minAppVersion),
      maxAppVersion: this.optionalString(dto.maxAppVersion),
      metadataJson: dto.metadata ?? null,
      createdByAdminUserId: adminUserId,
      updatedByAdminUserId: adminUserId,
    };
  }

  private buildUpdateData(dto: UpdateInAppAlertDto, adminUserId: string) {
    const data: Record<string, unknown> = {
      updatedByAdminUserId: adminUserId,
    };

    if (dto.title !== undefined) data.title = this.trim(dto.title);
    if (dto.body !== undefined) data.body = this.trim(dto.body);
    if (dto.footerText !== undefined) data.footerText = this.optionalString(dto.footerText);
    if (dto.confirmButtonLabel !== undefined) {
      data.confirmButtonLabel = this.optionalString(dto.confirmButtonLabel) || DEFAULT_CONFIRM_LABEL;
    }
    if (dto.status !== undefined) data.status = this.normalizeStatus(dto.status);
    if (dto.priority !== undefined) data.priority = Number(dto.priority);
    if (dto.startAt !== undefined) data.startAt = this.parseDate(dto.startAt);
    if (dto.endAt !== undefined) data.endAt = this.parseDate(dto.endAt);
    if (dto.cadence !== undefined) data.cadence = this.normalizeCadence(dto.cadence);
    if (dto.cronExpression !== undefined) data.cronExpression = this.optionalString(dto.cronExpression);
    if (dto.eventTriggerKey !== undefined) data.eventTriggerKey = this.optionalString(dto.eventTriggerKey);
    if (dto.targetAllUsers !== undefined) data.targetAllUsers = dto.targetAllUsers !== false;
    if (dto.targetRoles !== undefined) data.targetRoles = this.normalizeStringArray(dto.targetRoles);
    if (dto.targetUserIds !== undefined) data.targetUserIds = this.normalizeStringArray(dto.targetUserIds);
    if (dto.targetPlatforms !== undefined) {
      data.targetPlatforms = this.normalizeStringArray(dto.targetPlatforms).map((platform) =>
        platform.toLowerCase(),
      );
    }
    if (dto.minAppVersion !== undefined) data.minAppVersion = this.optionalString(dto.minAppVersion);
    if (dto.maxAppVersion !== undefined) data.maxAppVersion = this.optionalString(dto.maxAppVersion);
    if (dto.metadata !== undefined) data.metadataJson = dto.metadata ?? null;

    const startAt = data.startAt instanceof Date ? data.startAt : null;
    const endAt = data.endAt instanceof Date ? data.endAt : null;
    if (startAt && endAt && endAt < startAt) {
      throw new BadRequestException("Alert endAt must be after startAt.");
    }

    const cadence = typeof data.cadence === "string" ? data.cadence : undefined;
    const eventTriggerKey =
      typeof data.eventTriggerKey === "string" ? data.eventTriggerKey : undefined;
    if ((cadence === "EVENT_TRIGGERED" || cadence === "EVENT_ONCE") && !eventTriggerKey) {
      throw new BadRequestException("Event-triggered alerts require eventTriggerKey.");
    }

    return data;
  }

  private isActiveNow(alert: InAppAlertRow, now: Date) {
    if (alert.deletedAt) return false;
    if (alert.status !== "ACTIVE") return false;

    const startAt = alert.startAt ? new Date(alert.startAt) : null;
    const endAt = alert.endAt ? new Date(alert.endAt) : null;

    if (startAt && startAt > now) return false;
    if (endAt && endAt < now) return false;

    return true;
  }

  private getDayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private isCronWindowDue(alert: InAppAlertRow, now: Date) {
    const expression = this.trim(alert.cronExpression);
    if (!expression) {
      return true;
    }

    if (expression === "* * * * *") {
      return true;
    }

    if (expression === "0 * * * *") {
      return now.getUTCMinutes() === 0;
    }

    const dailyAt = expression.match(/^(\d{1,2}):(\d{2})$/);
    if (dailyAt) {
      return now.getUTCHours() === Number(dailyAt[1]) && now.getUTCMinutes() === Number(dailyAt[2]);
    }

    const cronParts = expression.split(/\s+/);
    if (cronParts.length === 5) {
      const [minute, hour] = cronParts;
      const minuteOk = minute === "*" || Number(minute) === now.getUTCMinutes();
      const hourOk = hour === "*" || Number(hour) === now.getUTCHours();
      return minuteOk && hourOk;
    }

    return true;
  }

  private matchesEvent(alert: InAppAlertRow, eventKey: string) {
    const normalizedEvent = this.trim(eventKey || DEFAULT_EVENT_KEY).toLowerCase();
    const trigger = this.trim(alert.eventTriggerKey).toLowerCase();

    if (normalizedEvent === DEFAULT_EVENT_KEY) {
      return !trigger || trigger === DEFAULT_EVENT_KEY;
    }

    return trigger === normalizedEvent;
  }

  private matchesTarget(alert: InAppAlertRow, userId: string, query: DueInAppAlertsQueryDto | InAppAlertEventDto) {
    const targetUserIds = Array.isArray(alert.targetUserIds) ? alert.targetUserIds : [];
    const targetPlatforms = Array.isArray(alert.targetPlatforms) ? alert.targetPlatforms : [];
    const platform = this.normalizePlatform(query.platform);
    const appVersion = this.optionalString(query.appVersion);

    if (targetPlatforms.length > 0) {
      if (!platform || !targetPlatforms.map((item: string) => item.toLowerCase()).includes(platform)) {
        return false;
      }
    }

    if (alert.minAppVersion && this.compareAppVersions(appVersion, alert.minAppVersion) < 0) {
      return false;
    }

    if (alert.maxAppVersion && this.compareAppVersions(appVersion, alert.maxAppVersion) > 0) {
      return false;
    }

    if (alert.targetAllUsers) {
      return true;
    }

    if (targetUserIds.includes(userId)) {
      return true;
    }

    return false;
  }

  private isDueForCadence(alert: InAppAlertRow, delivery: InAppAlertDeliveryRow | null, now: Date) {
    switch (alert.cadence) {
      case "ONCE_EVER":
        return !delivery?.acknowledgedAt && !delivery?.dismissedAt;
      case "ONCE_DAILY": {
        const lastShownAt = delivery?.lastShownAt ? new Date(delivery.lastShownAt) : null;
        return !lastShownAt || this.getDayKey(lastShownAt) !== this.getDayKey(now);
      }
      case "EVERY_APP_START":
        return true;
      case "CRON":
        return this.isCronWindowDue(alert, now);
      case "EVENT_TRIGGERED":
        return true;
      case "EVENT_ONCE":
        return !delivery?.lastShownAt && !delivery?.acknowledgedAt && !delivery?.dismissedAt;
      default:
        return false;
    }
  }

  private async statsForAlertIds(alertIds: string[]) {
    if (alertIds.length === 0) return new Map<string, Record<string, unknown>>();

    const rows = await this.client().inAppAlertDelivery.findMany({
      where: { alertId: { in: alertIds } },
      select: {
        alertId: true,
        impressionCount: true,
        acknowledgedAt: true,
        dismissedAt: true,
        lastShownAt: true,
      },
    });

    const map = new Map<string, any>();

    for (const row of rows as any[]) {
      const current = map.get(row.alertId) ?? {
        totalImpressions: 0,
        totalAcknowledgments: 0,
        totalDismissals: 0,
        lastShownAt: null,
      };

      current.totalImpressions += Number(row.impressionCount || 0);
      if (row.acknowledgedAt) current.totalAcknowledgments += 1;
      if (row.dismissedAt) current.totalDismissals += 1;

      const rowShown = row.lastShownAt ? new Date(row.lastShownAt) : null;
      const currentShown = current.lastShownAt ? new Date(current.lastShownAt) : null;
      if (rowShown && (!currentShown || rowShown > currentShown)) {
        current.lastShownAt = rowShown.toISOString();
      }

      map.set(row.alertId, current);
    }

    return map;
  }

  async listAdminAlerts(query: AdminInAppAlertsQueryDto = {}) {
    const limit = Math.max(1, Math.min(100, Number(query.limit || 50)));
    const offset = Math.max(0, Number(query.offset || 0));
    const search = this.trim(query.search);
    const status = this.trim(query.status || "all").toUpperCase();
    const cadence = this.trim(query.cadence || "all").toUpperCase();
    const eventKey = this.trim(query.eventKey);

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status && status !== "ALL") where.status = status;
    if (cadence && cadence !== "ALL") where.cadence = cadence;
    if (eventKey) where.eventTriggerKey = eventKey;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
        { eventTriggerKey: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, alerts] = await Promise.all([
      this.client().inAppAlert.count({ where }),
      this.client().inAppAlert.findMany({
        where,
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        skip: offset,
        take: limit,
      }),
    ]);

    const stats = await this.statsForAlertIds((alerts as any[]).map((alert: any) => alert.id));

    return {
      total,
      limit,
      offset,
      items: (alerts as any[]).map((alert: any) => {
        const itemStats = stats.get(alert.id) ?? {};
        return this.mapAlert(alert, {
          totalImpressions: Number(itemStats.totalImpressions || 0),
          totalAcknowledgments: Number(itemStats.totalAcknowledgments || 0),
          totalDismissals: Number(itemStats.totalDismissals || 0),
          lastShownAt: itemStats.lastShownAt ?? null,
          activeNow: this.isActiveNow(alert, this.now()),
        });
      }),
    };
  }

  async getAdminAlert(id: string) {
    const alert = await this.client().inAppAlert.findFirst({
      where: { id, deletedAt: null },
    });

    if (!alert) {
      throw new NotFoundException("In-app alert not found.");
    }

    const stats = await this.statsForAlertIds([id]);
    const itemStats = stats.get(id) ?? {};

    return {
      alert: this.mapAlert(alert, {
        totalImpressions: Number(itemStats.totalImpressions || 0),
        totalAcknowledgments: Number(itemStats.totalAcknowledgments || 0),
        totalDismissals: Number(itemStats.totalDismissals || 0),
        lastShownAt: itemStats.lastShownAt ?? null,
        activeNow: this.isActiveNow(alert, this.now()),
      }),
    };
  }

  async createAdminAlert(adminUserId: string, dto: CreateInAppAlertDto) {
    const data = this.buildCreateData(dto, adminUserId);

    const alert = await this.client().inAppAlert.create({
      data,
    });

    return {
      success: true,
      alert: this.mapAlert(alert),
    };
  }

  async updateAdminAlert(adminUserId: string, id: string, dto: UpdateInAppAlertDto) {
    await this.getAdminAlert(id);

    const alert = await this.client().inAppAlert.update({
      where: { id },
      data: this.buildUpdateData(dto, adminUserId),
    });

    return {
      success: true,
      alert: this.mapAlert(alert),
    };
  }

  async setAdminAlertEnabled(adminUserId: string, id: string, enabled: boolean) {
    await this.getAdminAlert(id);

    const alert = await this.client().inAppAlert.update({
      where: { id },
      data: {
        status: enabled ? "ACTIVE" : "DISABLED",
        updatedByAdminUserId: adminUserId,
      },
    });

    return {
      success: true,
      alert: this.mapAlert(alert),
    };
  }

  async deleteAdminAlert(adminUserId: string, id: string) {
    await this.getAdminAlert(id);

    const alert = await this.client().inAppAlert.update({
      where: { id },
      data: {
        status: "DISABLED",
        deletedAt: this.now(),
        updatedByAdminUserId: adminUserId,
      },
    });

    return {
      success: true,
      alert: this.mapAlert(alert),
    };
  }

  async getDueAlerts(userId: string, query: DueInAppAlertsQueryDto = {}) {
    const now = this.now();
    const eventKey = this.trim(query.eventKey || DEFAULT_EVENT_KEY).toLowerCase();
    const limit = Math.max(1, Math.min(10, Number(query.limit || 3)));

    const alerts = await this.client().inAppAlert.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 100,
    });

    if ((alerts as any[]).length === 0) {
      return { eventKey, items: [] };
    }

    const deliveries = await this.client().inAppAlertDelivery.findMany({
      where: {
        userId,
        alertId: { in: (alerts as any[]).map((alert: any) => alert.id) },
      },
    });

    const deliveryByAlertId = new Map<string, InAppAlertDeliveryRow>();
    for (const delivery of deliveries as any[]) {
      deliveryByAlertId.set(delivery.alertId, delivery);
    }

    const due = (alerts as any[])
      .filter((alert: any) => this.matchesEvent(alert, eventKey))
      .filter((alert: any) => this.matchesTarget(alert, userId, query))
      .filter((alert: any) => this.isDueForCadence(alert, deliveryByAlertId.get(alert.id) ?? null, now))
      .slice(0, limit)
      .map((alert: any) => this.mapMobileAlert(alert));

    return {
      eventKey,
      items: due,
    };
  }

  async getDueAlertsForEvent(userId: string, eventKey: string, dto: InAppAlertEventDto = {}) {
    return this.getDueAlerts(userId, {
      ...dto,
      eventKey,
    });
  }

  async recordShown(userId: string, alertId: string, dto: InAppAlertActionDto = {}) {
    const alert = await this.client().inAppAlert.findFirst({
      where: {
        id: alertId,
        deletedAt: null,
      },
    });

    if (!alert) {
      throw new NotFoundException("In-app alert not found.");
    }

    const now = this.now();

    const delivery = await this.client().inAppAlertDelivery.upsert({
      where: {
        alertId_userId: {
          alertId,
          userId,
        },
      },
      create: {
        alertId,
        userId,
        eventTriggerKey: this.optionalString(dto.eventKey) ?? alert.eventTriggerKey ?? DEFAULT_EVENT_KEY,
        firstShownAt: now,
        lastShownAt: now,
        impressionCount: 1,
        lastAction: "SHOWN",
        metadataJson: dto.metadata ?? null,
      },
      update: {
        eventTriggerKey: this.optionalString(dto.eventKey) ?? alert.eventTriggerKey ?? DEFAULT_EVENT_KEY,
        firstShownAt: undefined,
        lastShownAt: now,
        impressionCount: { increment: 1 },
        lastAction: "SHOWN",
        metadataJson: dto.metadata ?? undefined,
      },
    });

    return {
      success: true,
      delivery: {
        alertId: delivery.alertId,
        userId: delivery.userId,
        impressionCount: delivery.impressionCount,
        firstShownAt: delivery.firstShownAt?.toISOString?.() ?? delivery.firstShownAt ?? null,
        lastShownAt: delivery.lastShownAt?.toISOString?.() ?? delivery.lastShownAt ?? null,
      },
    };
  }

  async acknowledge(userId: string, alertId: string, dto: InAppAlertActionDto = {}) {
    await this.recordShown(userId, alertId, dto).catch(() => null);

    const now = this.now();
    const delivery = await this.client().inAppAlertDelivery.upsert({
      where: {
        alertId_userId: {
          alertId,
          userId,
        },
      },
      create: {
        alertId,
        userId,
        eventTriggerKey: this.optionalString(dto.eventKey),
        firstShownAt: now,
        lastShownAt: now,
        impressionCount: 1,
        acknowledgedAt: now,
        lastAction: "ACKNOWLEDGED",
        metadataJson: dto.metadata ?? null,
      },
      update: {
        acknowledgedAt: now,
        dismissedAt: null,
        lastAction: "ACKNOWLEDGED",
        metadataJson: dto.metadata ?? undefined,
      },
    });

    return {
      success: true,
      delivery: {
        alertId: delivery.alertId,
        acknowledgedAt: delivery.acknowledgedAt?.toISOString?.() ?? delivery.acknowledgedAt,
      },
    };
  }

  async dismiss(userId: string, alertId: string, dto: InAppAlertActionDto = {}) {
    await this.recordShown(userId, alertId, dto).catch(() => null);

    const now = this.now();
    const delivery = await this.client().inAppAlertDelivery.upsert({
      where: {
        alertId_userId: {
          alertId,
          userId,
        },
      },
      create: {
        alertId,
        userId,
        eventTriggerKey: this.optionalString(dto.eventKey),
        firstShownAt: now,
        lastShownAt: now,
        impressionCount: 1,
        dismissedAt: now,
        lastAction: "DISMISSED",
        metadataJson: dto.metadata ?? null,
      },
      update: {
        dismissedAt: now,
        lastAction: "DISMISSED",
        metadataJson: dto.metadata ?? undefined,
      },
    });

    return {
      success: true,
      delivery: {
        alertId: delivery.alertId,
        dismissedAt: delivery.dismissedAt?.toISOString?.() ?? delivery.dismissedAt,
      },
    };
  }
}

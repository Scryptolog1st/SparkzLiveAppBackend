import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  CreateLiveopsBannerDto,
  CreateLiveopsEventDto,
  UpdateLiveopsBannerDto,
  UpdateLiveopsEventDto,
} from "./dto/liveops.dto";
import { PrismaService } from "../prisma/prisma.service";

type LiveopsEventRecord = {
  id: string;
  name: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type LiveopsBannerRecord = {
  id: string;
  name: string;
  imageUrl: string;
  startsAt: string | null;
  endsAt: string | null;
  linkUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class LiveopsService {
  constructor(private readonly prisma: PrismaService) { }

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

  private async getConfigRecord<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.appConfig.findUnique({
      where: { key },
    });

    if (!row) return fallback;
    return row.valueJson as T;
  }

  private async setConfigRecord(key: string, value: unknown) {
    return this.prisma.appConfig.upsert({
      where: { key },
      create: {
        key,
        valueJson: value as any,
      },
      update: {
        valueJson: value as any,
      },
    });
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = String(value || "").trim();
    return normalized ? normalized : null;
  }

  private normalizeRequiredString(name: string, value?: string | null) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException(`${name} is required.`);
    }
    return normalized;
  }

  private normalizeDate(value?: string | null) {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date: ${value}`);
    }

    return parsed.toISOString();
  }

  private validateDateWindow(startsAt: string | null, endsAt: string | null) {
    if (!startsAt || !endsAt) return;

    const startsAtMs = new Date(startsAt).getTime();
    const endsAtMs = new Date(endsAt).getTime();

    if (endsAtMs < startsAtMs) {
      throw new BadRequestException("endsAt must be greater than or equal to startsAt.");
    }
  }

  private isCurrentlyActive(item: {
    active: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }) {
    if (!item.active) return false;

    const now = Date.now();
    const startsAt = item.startsAt ? new Date(item.startsAt).getTime() : null;
    const endsAt = item.endsAt ? new Date(item.endsAt).getTime() : null;

    if (startsAt !== null && now < startsAt) return false;
    if (endsAt !== null && now > endsAt) return false;

    return true;
  }

  async listEvents(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const items = await this.getConfigRecord<LiveopsEventRecord[]>(
      "liveops_events",
      [],
    );

    return {
      items: items
        .slice()
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    };
  }

  async createEvent(adminUserId: string, body: CreateLiveopsEventDto) {
    await this.requireAdmin(adminUserId);

    const items = await this.getConfigRecord<LiveopsEventRecord[]>(
      "liveops_events",
      [],
    );

    const startsAt = this.normalizeDate(body.startsAt);
    const endsAt = this.normalizeDate(body.endsAt);
    this.validateDateWindow(startsAt, endsAt);

    const now = new Date().toISOString();
    const next: LiveopsEventRecord = {
      id: randomUUID(),
      name: this.normalizeRequiredString("name", body.name),
      description: this.normalizeOptionalString(body.description),
      startsAt,
      endsAt,
      ctaLabel: this.normalizeOptionalString(body.ctaLabel),
      ctaUrl: this.normalizeOptionalString(body.ctaUrl),
      active: body.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    items.push(next);
    await this.setConfigRecord("liveops_events", items);

    return { success: true, item: next };
  }

  async updateEvent(
    adminUserId: string,
    id: string,
    body: UpdateLiveopsEventDto,
  ) {
    await this.requireAdmin(adminUserId);

    const items = await this.getConfigRecord<LiveopsEventRecord[]>(
      "liveops_events",
      [],
    );

    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException("Event not found.");
    }

    const current = items[index];

    const startsAt =
      body.startsAt !== undefined
        ? this.normalizeDate(body.startsAt)
        : current.startsAt;

    const endsAt =
      body.endsAt !== undefined
        ? this.normalizeDate(body.endsAt)
        : current.endsAt;

    this.validateDateWindow(startsAt, endsAt);

    const updated: LiveopsEventRecord = {
      ...current,
      name:
        body.name !== undefined
          ? this.normalizeRequiredString("name", body.name)
          : current.name,
      description:
        body.description !== undefined
          ? this.normalizeOptionalString(body.description)
          : current.description,
      startsAt,
      endsAt,
      ctaLabel:
        body.ctaLabel !== undefined
          ? this.normalizeOptionalString(body.ctaLabel)
          : current.ctaLabel,
      ctaUrl:
        body.ctaUrl !== undefined
          ? this.normalizeOptionalString(body.ctaUrl)
          : current.ctaUrl,
      active: body.active !== undefined ? body.active : current.active,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    await this.setConfigRecord("liveops_events", items);

    return { success: true, item: updated };
  }

  async listBanners(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const items = await this.getConfigRecord<LiveopsBannerRecord[]>(
      "liveops_banners",
      [],
    );

    return {
      items: items
        .slice()
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    };
  }

  async createBanner(adminUserId: string, body: CreateLiveopsBannerDto) {
    await this.requireAdmin(adminUserId);

    const items = await this.getConfigRecord<LiveopsBannerRecord[]>(
      "liveops_banners",
      [],
    );

    const startsAt = this.normalizeDate(body.startsAt);
    const endsAt = this.normalizeDate(body.endsAt);
    this.validateDateWindow(startsAt, endsAt);

    const now = new Date().toISOString();
    const next: LiveopsBannerRecord = {
      id: randomUUID(),
      name: this.normalizeRequiredString("name", body.name),
      imageUrl: this.normalizeRequiredString("imageUrl", body.imageUrl),
      startsAt,
      endsAt,
      linkUrl: this.normalizeOptionalString(body.linkUrl),
      active: body.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    items.push(next);
    await this.setConfigRecord("liveops_banners", items);

    return { success: true, item: next };
  }

  async updateBanner(
    adminUserId: string,
    id: string,
    body: UpdateLiveopsBannerDto,
  ) {
    await this.requireAdmin(adminUserId);

    const items = await this.getConfigRecord<LiveopsBannerRecord[]>(
      "liveops_banners",
      [],
    );

    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundException("Banner not found.");
    }

    const current = items[index];

    const startsAt =
      body.startsAt !== undefined
        ? this.normalizeDate(body.startsAt)
        : current.startsAt;

    const endsAt =
      body.endsAt !== undefined
        ? this.normalizeDate(body.endsAt)
        : current.endsAt;

    this.validateDateWindow(startsAt, endsAt);

    const updated: LiveopsBannerRecord = {
      ...current,
      name:
        body.name !== undefined
          ? this.normalizeRequiredString("name", body.name)
          : current.name,
      imageUrl:
        body.imageUrl !== undefined
          ? this.normalizeRequiredString("imageUrl", body.imageUrl)
          : current.imageUrl,
      startsAt,
      endsAt,
      linkUrl:
        body.linkUrl !== undefined
          ? this.normalizeOptionalString(body.linkUrl)
          : current.linkUrl,
      active: body.active !== undefined ? body.active : current.active,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    await this.setConfigRecord("liveops_banners", items);

    return { success: true, item: updated };
  }

  async deleteBanner(adminUserId: string, id: string) {
    await this.requireAdmin(adminUserId);

    const items = await this.getConfigRecord<LiveopsBannerRecord[]>(
      "liveops_banners",
      [],
    );

    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) {
      throw new NotFoundException("Banner not found.");
    }

    await this.setConfigRecord("liveops_banners", next);

    return { success: true, deletedId: id };
  }

  async listPublicEvents() {
    const items = await this.getConfigRecord<LiveopsEventRecord[]>(
      "liveops_events",
      [],
    );

    return {
      items: items
        .filter((item) => this.isCurrentlyActive(item))
        .sort((a, b) => {
          const aStart = a.startsAt || "";
          const bStart = b.startsAt || "";
          return aStart.localeCompare(bStart);
        }),
    };
  }

  async listPublicBanners() {
    const items = await this.getConfigRecord<LiveopsBannerRecord[]>(
      "liveops_banners",
      [],
    );

    return {
      items: items
        .filter((item) => this.isCurrentlyActive(item))
        .sort((a, b) => {
          const aStart = a.startsAt || "";
          const bStart = b.startsAt || "";
          return aStart.localeCompare(bStart);
        }),
    };
  }
}
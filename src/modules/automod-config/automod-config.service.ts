import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

type AutomodThresholdConfig = {
  nsfwDetection: number;
  violenceWeapons: number;
  drugParaphernalia: number;
};

@Injectable()
export class AutomodConfigService {
  constructor(private readonly prisma: PrismaService) { }

  private readonly defaultThresholds: AutomodThresholdConfig = {
    nsfwDetection: 95,
    violenceWeapons: 95,
    drugParaphernalia: 95,
  };

  private readonly defaultBlacklist = [
    "scam*",
    "free followers",
    "onlyfans.com/*",
    "cashapp me",
    "*slur1*",
    "*slur2*",
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

  private normalizeThreshold(name: string, value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${name} must be a number.`);
    }

    if (parsed < 50 || parsed > 100) {
      throw new BadRequestException(`${name} must be between 50 and 100.`);
    }

    return Math.round(parsed);
  }

  async getConfig(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const thresholds = await this.getConfigRecord<AutomodThresholdConfig>(
      "automod_thresholds",
      this.defaultThresholds,
    );

    return {
      thresholds: {
        nsfwDetection:
          typeof thresholds.nsfwDetection === "number"
            ? thresholds.nsfwDetection
            : this.defaultThresholds.nsfwDetection,
        violenceWeapons:
          typeof thresholds.violenceWeapons === "number"
            ? thresholds.violenceWeapons
            : this.defaultThresholds.violenceWeapons,
        drugParaphernalia:
          typeof thresholds.drugParaphernalia === "number"
            ? thresholds.drugParaphernalia
            : this.defaultThresholds.drugParaphernalia,
      },
    };
  }

  async updateConfig(
    adminUserId: string,
    input: {
      nsfwDetection?: number;
      violenceWeapons?: number;
      drugParaphernalia?: number;
    },
  ) {
    await this.requireAdmin(adminUserId);

    const current = await this.getConfigRecord<AutomodThresholdConfig>(
      "automod_thresholds",
      this.defaultThresholds,
    );

    const next: AutomodThresholdConfig = {
      nsfwDetection:
        input.nsfwDetection !== undefined
          ? this.normalizeThreshold("nsfwDetection", input.nsfwDetection)
          : current.nsfwDetection,
      violenceWeapons:
        input.violenceWeapons !== undefined
          ? this.normalizeThreshold("violenceWeapons", input.violenceWeapons)
          : current.violenceWeapons,
      drugParaphernalia:
        input.drugParaphernalia !== undefined
          ? this.normalizeThreshold("drugParaphernalia", input.drugParaphernalia)
          : current.drugParaphernalia,
    };

    await this.setConfigRecord("automod_thresholds", next);

    return {
      success: true,
      thresholds: next,
    };
  }

  async getBlacklist(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const entries = await this.getConfigRecord<string[]>(
      "automod_blacklist",
      this.defaultBlacklist,
    );

    return {
      entries: Array.isArray(entries) ? entries : this.defaultBlacklist,
    };
  }

  async putBlacklist(adminUserId: string, entries: string[]) {
    await this.requireAdmin(adminUserId);

    if (!Array.isArray(entries)) {
      throw new BadRequestException("entries must be an array of strings.");
    }

    const cleaned = entries
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .slice(0, 2000);

    await this.setConfigRecord("automod_blacklist", cleaned);

    return {
      success: true,
      count: cleaned.length,
      entries: cleaned,
    };
  }
}
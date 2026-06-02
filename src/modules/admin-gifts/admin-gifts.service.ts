import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { GiftMediaType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import {
  CreateAdminGiftDto,
  UpdateAdminGiftDto,
  type AdminGiftMediaTypeInput,
  type AdminGiftEffectSizeInput,
} from "./dto/admin-gifts.dto";
import { CreateAdminCategoryDto, UpdateAdminCategoryDto } from "./dto/admin-categories.dto";

type GiftWithUsage = {
  id: string;
  name: string;
  diamondValue: number;
  coinCost: number;
  mediaUrl: string;
  mediaType: GiftMediaType;
  isBigGift: boolean;
  isEnabled: boolean;
  effectSize: string | null;
  giftCategoryId: string | null;
  giftCategory?: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    sortOrder?: number | null;
    isEnabled?: boolean | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    giftTransactions?: number;
    usersRequiringAsDmUnlock?: number;
  };
};

@Injectable()
export class AdminGiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private async getGiftCatalogMetadata() {
    const [
      total,
      enabled,
      latestGift,
      totalCategories,
      enabledCategories,
      latestCategory,
    ] = await Promise.all([
      this.prisma.gift.count(),
      (this.prisma.gift as any).count({ where: { isEnabled: true } }),
      (this.prisma.gift as any).findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      (this.prisma as any).giftCategory.count(),
      (this.prisma as any).giftCategory.count({ where: { isEnabled: true } }),
      (this.prisma as any).giftCategory.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

    const latestTimes = [latestGift?.updatedAt, latestCategory?.updatedAt]
      .filter((value): value is Date => value instanceof Date)
      .map((value) => value.getTime());

    const updatedAt = latestTimes.length > 0
      ? new Date(Math.max(...latestTimes)).toISOString()
      : new Date(0).toISOString();

    return {
      version: [
        updatedAt,
        `gifts:${total}`,
        `enabled:${enabled}`,
        `categories:${totalCategories}`,
        `enabledCategories:${enabledCategories}`,
      ].join(":"),
      updatedAt,
    };
  }

  private async emitGiftCatalogUpdated(
    reason: "admin_create" | "admin_update" | "admin_delete" | "admin_gift_category_create" | "admin_gift_category_update" | "admin_gift_category_delete",
  ) {
    try {
      const metadata = await this.getGiftCatalogMetadata();
      this.realtime.emitGiftCatalogUpdated({
        ...metadata,
        reason,
      });
    } catch (error) {
      console.warn("[AdminGiftsService] failed to emit giftCatalog.updated:", error);
    }
  }

  private async requireAdmin(adminUserId: string) {
    if (!adminUserId) {
      throw new UnauthorizedException("Missing admin user context.");
    }

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

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException("Admin account is not active.");
    }

    return adminUser;
  }

  private normalizeString(value: string, field: string) {
    const normalized = String(value || "").trim();

    if (!normalized) {
      throw new BadRequestException(`${field} is required.`);
    }

    return normalized;
  }

  private normalizeCategoryName(value: unknown, field = "name") {
    const clean = String(value || "").trim().replace(/\s+/g, " ");

    if (!clean) {
      throw new BadRequestException(`${field} is required.`);
    }

    if (clean.length > 80) {
      throw new BadRequestException(`${field} must be 80 characters or fewer.`);
    }

    return clean;
  }

  private normalizeOptionalCategoryText(value: unknown, maxLength: number, field: string) {
    if (value === null || value === undefined) return null;

    const clean = String(value || "").trim().replace(/\s+/g, " ");

    if (!clean) return null;

    if (clean.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or fewer.`);
    }

    return clean;
  }

  private slugifyCategory(value: unknown) {
    const raw = String(value || "").trim().toLowerCase();

    const slug = raw
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    if (!slug) {
      throw new BadRequestException("Category slug is required.");
    }

    return slug;
  }

  private mapAdminCategory(row: any) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
      isEnabled: Boolean(row.isEnabled ?? row.is_enabled ?? true),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      giftsCount: Number(row._count?.gifts ?? 0),
      streamsCount: Number(row._count?.streams ?? 0),
    };
  }

  private async resolveGiftCategoryIdFromDto(dto: {
    giftCategoryId?: string | null;
    categorySlug?: string | null;
    categoryName?: string | null;
  }) {
    if (dto.giftCategoryId === null || dto.categorySlug === null || dto.categoryName === null) {
      return null;
    }

    const rawId = String(dto.giftCategoryId || "").trim();
    if (rawId) {
      const category = await (this.prisma as any).giftCategory.findUnique({
        where: { id: rawId },
        select: { id: true },
      });

      if (!category) {
        throw new BadRequestException("Gift category not found.");
      }

      return category.id;
    }

    const rawSlug = String(dto.categorySlug || "").trim();
    const rawName = String(dto.categoryName || "").trim();

    if (!rawSlug && !rawName) {
      const fallback = await (this.prisma as any).giftCategory.upsert({
        where: { slug: "featured" },
        update: {},
        create: {
          name: "Featured",
          slug: "featured",
          description: "Default featured gifts.",
          sortOrder: 0,
          isEnabled: true,
        },
        select: { id: true },
      });

      return fallback.id;
    }

    const slug = this.slugifyCategory(rawSlug || rawName);
    const name = rawName ? this.normalizeCategoryName(rawName, "categoryName") : slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    const category = await (this.prisma as any).giftCategory.upsert({
      where: { slug },
      update: { name },
      create: {
        name,
        slug,
        sortOrder: 100,
        isEnabled: true,
      },
      select: { id: true },
    });

    return category.id;
  }

  private normalizeMediaType(value: AdminGiftMediaTypeInput | GiftMediaType) {
    const normalized = String(value || "").trim().toUpperCase();

    if (!["IMAGE", "GIF", "VIDEO", "LOTTIE"].includes(normalized)) {
      throw new BadRequestException(
        "mediaType must be one of IMAGE, GIF, VIDEO, or LOTTIE.",
      );
    }

    return normalized as GiftMediaType;
  }

  private normalizeEffectSize(value?: AdminGiftEffectSizeInput | string | null) {
    const normalized = String(value || "MEDIUM").trim().toUpperCase();

    if (!["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"].includes(normalized)) {
      throw new BadRequestException(
        "effectSize must be one of SMALL, MEDIUM, LARGE, or EXTRA_LARGE.",
      );
    }

    return normalized as AdminGiftEffectSizeInput;
  }

  private normalizeMediaUrl(value: string, mediaType: GiftMediaType) {
    const normalized = this.normalizeString(value, "mediaUrl");

    if (!normalized.startsWith("/") && !/^https?:\/\//i.test(normalized)) {
      throw new BadRequestException(
        "mediaUrl must be an absolute http(s) URL or an app-relative / path.",
      );
    }

    if (mediaType === "LOTTIE") {
      const pathOnly = normalized.split("?")[0].split("#")[0].toLowerCase();
      if (!pathOnly.endsWith(".json")) {
        throw new BadRequestException(
          "LOTTIE gifts must use a .json mediaUrl for now.",
        );
      }
    }

    return normalized;
  }

  private mapGift(gift: GiftWithUsage) {
    const transactionsCount = Number(gift._count?.giftTransactions ?? 0);
    const dmUnlockUserCount = Number(gift._count?.usersRequiringAsDmUnlock ?? 0);

    return {
      id: gift.id,
      name: gift.name,
      diamondValue: gift.diamondValue,
      coinCost: gift.coinCost,
      mediaUrl: gift.mediaUrl,
      mediaType: gift.mediaType,
      publicMediaType: this.mediaTypeToPublic(gift.mediaType),
      isBigGift: gift.isBigGift,
      isEnabled: gift.isEnabled !== false,
      effectSize: this.normalizeEffectSize(
        gift.effectSize ?? (gift.isBigGift ? "LARGE" : "MEDIUM"),
      ),
      categoryId: gift.giftCategoryId ?? gift.giftCategory?.id ?? null,
      categoryName: gift.giftCategory?.name ?? "Featured",
      categorySlug: gift.giftCategory?.slug ?? "featured",
      category: gift.giftCategory?.name ?? "Featured",
      giftCategory: gift.giftCategory
        ? {
            id: gift.giftCategory.id,
            name: gift.giftCategory.name,
            slug: gift.giftCategory.slug,
            description: gift.giftCategory.description ?? null,
            sortOrder: Number(gift.giftCategory.sortOrder ?? 0),
            isEnabled: Boolean(gift.giftCategory.isEnabled ?? true),
          }
        : null,
      usage: {
        transactionsCount,
        dmUnlockUserCount,
        canDelete: transactionsCount === 0 && dmUnlockUserCount === 0,
      },
      createdAt: gift.createdAt.toISOString(),
      updatedAt: gift.updatedAt.toISOString(),
    };
  }

  private mediaTypeToPublic(mediaType: GiftMediaType) {
    switch (mediaType) {
      case "VIDEO":
        return "video";
      case "LOTTIE":
        return "lottie";
      case "GIF":
        return "gif";
      case "IMAGE":
      default:
        return "image";
    }
  }

  async list(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const gifts = await (this.prisma.gift as any).findMany({
      orderBy: [{ coinCost: "asc" }, { name: "asc" }],
      include: {
        giftCategory: true,
        _count: {
          select: {
            giftTransactions: true,
            usersRequiringAsDmUnlock: true,
          },
        },
      },
    });

    return {
      items: gifts.map((gift: any) => this.mapGift(gift as GiftWithUsage)),
      total: gifts.length,
      supportedMediaTypes: ["IMAGE", "GIF", "VIDEO", "LOTTIE"],
      supportedEffectSizes: ["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"],
      reservedFutureMediaTypes: ["MODEL3D"],
    };
  }

  async summary(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const [total, byMediaType] = await Promise.all([
      this.prisma.gift.count(),
      this.prisma.gift.groupBy({
        by: ["mediaType"],
        _count: {
          _all: true,
        },
      }),
    ]);

    return {
      total,
      byMediaType: byMediaType.reduce<Record<string, number>>((acc, row) => {
        acc[row.mediaType] = row._count._all;
        return acc;
      }, {}),
      supportedMediaTypes: ["IMAGE", "GIF", "VIDEO", "LOTTIE"],
      reservedFutureMediaTypes: ["MODEL3D"],
    };
  }

  async getById(adminUserId: string, giftId: string) {
    await this.requireAdmin(adminUserId);

    const gift = await (this.prisma.gift as any).findUnique({
      where: { id: giftId },
      include: {
        giftCategory: true,
        _count: {
          select: {
            giftTransactions: true,
            usersRequiringAsDmUnlock: true,
          },
        },
      },
    });

    if (!gift) {
      throw new NotFoundException("Gift not found.");
    }

    return {
      item: this.mapGift(gift as GiftWithUsage),
    };
  }

  async create(adminUserId: string, dto: CreateAdminGiftDto) {
    await this.requireAdmin(adminUserId);

    const id = this.normalizeString(dto.id, "id").toLowerCase();
    const name = this.normalizeString(dto.name, "name");
    const mediaType = this.normalizeMediaType(dto.mediaType);
    const mediaUrl = this.normalizeMediaUrl(dto.mediaUrl, mediaType);
    const effectSize = this.normalizeEffectSize(
      dto.effectSize ?? (dto.isBigGift ? "LARGE" : "MEDIUM"),
    );

    const existing = await (this.prisma.gift as any).findUnique({
      where: { id },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException("A gift with this id already exists.");
    }

    const giftCategoryId = await this.resolveGiftCategoryIdFromDto(dto);

    const created = await (this.prisma.gift as any).create({
      data: {
        id,
        name,
        diamondValue: dto.diamondValue,
        coinCost: dto.coinCost,
        mediaUrl,
        mediaType,
        effectSize,
        isBigGift: Boolean(dto.isBigGift) || effectSize === "LARGE" || effectSize === "EXTRA_LARGE",
        giftCategoryId,
        isEnabled: dto.isEnabled !== false,
      },
      include: {
        giftCategory: true,
        _count: {
          select: {
            giftTransactions: true,
            usersRequiringAsDmUnlock: true,
          },
        },
      },
    });

    const result = {
      success: true,
      item: this.mapGift(created as GiftWithUsage),
    };

    await this.emitGiftCatalogUpdated("admin_create");

    return result;
  }

  async update(adminUserId: string, giftId: string, dto: UpdateAdminGiftDto) {
    await this.requireAdmin(adminUserId);

    const existing = await (this.prisma.gift as any).findUnique({
      where: { id: giftId },
    });

    if (!existing) {
      throw new NotFoundException("Gift not found.");
    }

    const nextMediaType = dto.mediaType
      ? this.normalizeMediaType(dto.mediaType)
      : existing.mediaType;

    const nextEffectSize = dto.effectSize !== undefined
      ? this.normalizeEffectSize(dto.effectSize)
      : undefined;

    const data: {
      name?: string;
      diamondValue?: number;
      coinCost?: number;
      mediaUrl?: string;
      mediaType?: GiftMediaType;
      effectSize?: string;
      isBigGift?: boolean;
      giftCategoryId?: string | null;
      isEnabled?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeString(dto.name, "name");
    }

    if (dto.diamondValue !== undefined) {
      data.diamondValue = dto.diamondValue;
    }

    if (dto.coinCost !== undefined) {
      data.coinCost = dto.coinCost;
    }

    if (dto.mediaType !== undefined) {
      data.mediaType = nextMediaType;
    }

    if (dto.mediaUrl !== undefined) {
      data.mediaUrl = this.normalizeMediaUrl(dto.mediaUrl, nextMediaType);
    }

    if (nextEffectSize !== undefined) {
      data.effectSize = nextEffectSize;
    }

    if (dto.isBigGift !== undefined) {
      data.isBigGift = Boolean(dto.isBigGift);
    }

    if (
      dto.giftCategoryId !== undefined ||
      dto.categorySlug !== undefined ||
      dto.categoryName !== undefined
    ) {
      data.giftCategoryId = await this.resolveGiftCategoryIdFromDto(dto);
    }

    if (dto.isEnabled !== undefined) {
      data.isEnabled = Boolean(dto.isEnabled);
    }

    const updated = await (this.prisma.gift as any).update({
      where: { id: giftId },
      data,
      include: {
        giftCategory: true,
        _count: {
          select: {
            giftTransactions: true,
            usersRequiringAsDmUnlock: true,
          },
        },
      },
    });

    const result = {
      success: true,
      item: this.mapGift(updated as GiftWithUsage),
    };

    await this.emitGiftCatalogUpdated("admin_update");

    return result;
  }

  async delete(adminUserId: string, giftId: string) {
    await this.requireAdmin(adminUserId);

    const existing = await (this.prisma.gift as any).findUnique({
      where: { id: giftId },
      include: {
        giftCategory: true,
        _count: {
          select: {
            giftTransactions: true,
            usersRequiringAsDmUnlock: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Gift not found.");
    }

    const transactionsCount = Number(existing._count.giftTransactions ?? 0);
    const dmUnlockUserCount = Number(existing._count.usersRequiringAsDmUnlock ?? 0);

    if (transactionsCount > 0 || dmUnlockUserCount > 0) {
      throw new BadRequestException(
        "This gift has usage history and cannot be deleted safely. Edit the gift instead.",
      );
    }

    await (this.prisma.gift as any).delete({
      where: { id: giftId },
    });

    await this.emitGiftCatalogUpdated("admin_delete");

    return {
      success: true,
      deletedId: giftId,
    };
  }
  async listGiftCategories(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const items = await (this.prisma as any).giftCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { gifts: true },
        },
      },
    });

    return { items: items.map((item: any) => this.mapAdminCategory(item)) };
  }

  async createGiftCategory(adminUserId: string, dto: CreateAdminCategoryDto) {
    await this.requireAdmin(adminUserId);

    const name = this.normalizeCategoryName(dto.name);
    const slug = this.slugifyCategory(dto.slug || name);
    const description = this.normalizeOptionalCategoryText(dto.description, 240, "description");

    const created = await (this.prisma as any).giftCategory.create({
      data: {
        name,
        slug,
        description,
        sortOrder: Number(dto.sortOrder ?? 100),
        isEnabled: dto.isEnabled !== undefined ? Boolean(dto.isEnabled) : true,
      },
      include: {
        _count: {
          select: { gifts: true },
        },
      },
    });

    await this.emitGiftCatalogUpdated("admin_gift_category_create");

    return { item: this.mapAdminCategory(created) };
  }

  async updateGiftCategory(adminUserId: string, categoryId: string, dto: UpdateAdminCategoryDto) {
    await this.requireAdmin(adminUserId);

    const data: any = {};

    if (dto.name !== undefined) data.name = this.normalizeCategoryName(dto.name);
    if (dto.slug !== undefined) data.slug = this.slugifyCategory(dto.slug);
    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalCategoryText(dto.description, 240, "description");
    }
    if (dto.sortOrder !== undefined) data.sortOrder = Number(dto.sortOrder);
    if (dto.isEnabled !== undefined) data.isEnabled = Boolean(dto.isEnabled);

    const updated = await (this.prisma as any).giftCategory.update({
      where: { id: categoryId },
      data,
      include: {
        _count: {
          select: { gifts: true },
        },
      },
    });

    await this.emitGiftCatalogUpdated("admin_gift_category_update");

    return { item: this.mapAdminCategory(updated) };
  }

  async deleteGiftCategory(adminUserId: string, categoryId: string) {
    await this.requireAdmin(adminUserId);

    const fallback = await (this.prisma as any).giftCategory.upsert({
      where: { slug: "featured" },
      update: {},
      create: {
        name: "Featured",
        slug: "featured",
        description: "Default featured gifts.",
        sortOrder: 0,
        isEnabled: true,
      },
      select: { id: true },
    });

    if (fallback.id === categoryId) {
      throw new BadRequestException("The Featured gift category cannot be deleted.");
    }

    await (this.prisma as any).gift.updateMany({
      where: { giftCategoryId: categoryId },
      data: { giftCategoryId: fallback.id },
    });

    await (this.prisma as any).giftCategory.delete({
      where: { id: categoryId },
    });

    await this.emitGiftCatalogUpdated("admin_gift_category_delete");

    return { success: true, deletedId: categoryId, movedGiftsToCategoryId: fallback.id };
  }

  async listStreamCategories(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const items = await (this.prisma as any).streamCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { streams: true },
        },
      },
    });

    return { items: items.map((item: any) => this.mapAdminCategory(item)) };
  }

  async createStreamCategory(adminUserId: string, dto: CreateAdminCategoryDto) {
    await this.requireAdmin(adminUserId);

    const name = this.normalizeCategoryName(dto.name);
    const slug = this.slugifyCategory(dto.slug || name);
    const description = this.normalizeOptionalCategoryText(dto.description, 240, "description");

    const created = await (this.prisma as any).streamCategory.create({
      data: {
        name,
        slug,
        description,
        sortOrder: Number(dto.sortOrder ?? 100),
        isEnabled: dto.isEnabled !== undefined ? Boolean(dto.isEnabled) : true,
      },
      include: {
        _count: {
          select: { streams: true },
        },
      },
    });

    return { item: this.mapAdminCategory(created) };
  }

  async updateStreamCategory(adminUserId: string, categoryId: string, dto: UpdateAdminCategoryDto) {
    await this.requireAdmin(adminUserId);

    const data: any = {};

    if (dto.name !== undefined) data.name = this.normalizeCategoryName(dto.name);
    if (dto.slug !== undefined) data.slug = this.slugifyCategory(dto.slug);
    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalCategoryText(dto.description, 240, "description");
    }
    if (dto.sortOrder !== undefined) data.sortOrder = Number(dto.sortOrder);
    if (dto.isEnabled !== undefined) data.isEnabled = Boolean(dto.isEnabled);

    const updated = await (this.prisma as any).streamCategory.update({
      where: { id: categoryId },
      data,
      include: {
        _count: {
          select: { streams: true },
        },
      },
    });

    return { item: this.mapAdminCategory(updated) };
  }

  async deleteStreamCategory(adminUserId: string, categoryId: string) {
    await this.requireAdmin(adminUserId);

    await (this.prisma as any).stream.updateMany({
      where: { streamCategoryId: categoryId },
      data: { streamCategoryId: null },
    });

    await (this.prisma as any).streamCategory.delete({
      where: { id: categoryId },
    });

    return { success: true, deletedId: categoryId };
  }

}

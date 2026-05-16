import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AdvertisementBillingEventStatus,
  AdvertisementBillingEventType,
  AdvertisementMediaType,
  AdvertisementPaymentCurrency,
  AdvertisementRevisionStatus,
  AdvertisementStatus,
  LedgerEntryType,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as path from "path";
import { promisify } from "util";

import { PrismaService } from "../prisma/prisma.service";
import {
  ADVERTISEMENT_CATEGORIES,
  AdvertisementListQueryDto,
  BoostAdvertisementDto,
  CreateAdvertisementDto,
  MyAdvertisementsQueryDto,
  UpdateAdvertisementDto,
} from "./dto/advertisements.dto";

const execFileAsync = promisify(execFile);

const DEFAULT_RULES = [
  "Advertisements must offer a real creative, streaming, event, moderation, promotion, or creator-service offering.",
  "All new ads and all edits to approved ads must be approved by an admin before they go live.",
  "Users can pay with diamonds or coins. 1 diamond = $0.01, and 2 coins = 1 diamond.",
  "Photos and videos must represent the service accurately. Videos may be up to 30 seconds.",
  "No scams, impersonation, adult services, hateful content, illegal services, or misleading guarantees.",
  "Contact must happen through SparkzLive DMs once available. External contact links/contact info are not allowed in advertisements.",
  "Billing starts only after approval when the ad becomes live. Monthly renewals bill on the live/republish date.",
];

const SETTINGS_ID = "default";

type AdvertisementWithContent = Prisma.AdvertisementGetPayload<{
  include: {
    owner: { include: { profile: true } };
    revisions: {
      include: { media: true };
      orderBy: { createdAt: "desc" };
    };
    billingEvents: {
      orderBy: { createdAt: "desc" };
      take: 10;
    };
  };
}>;

type SaveMediaResult = {
  mediaType: AdvertisementMediaType;
  url: string;
  storageKey: string;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number;
  durationSeconds: number | null;
};

type MediaCreateCandidate = {
  mediaType: AdvertisementMediaType;
  url: string;
  thumbnailUrl?: string | null;
  storageKey: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  sourceKey?: string | null;
};

@Injectable()
export class AdvertisementsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeText(value: unknown, max = 1000) {
    return String(value ?? "").trim().slice(0, max);
  }

  private normalizeOptionalText(value: unknown, max = 1000) {
    const text = this.normalizeText(value, max);
    return text || null;
  }

  private parseJsonArray(value: unknown) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);

    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  private normalizeCoverMediaKey(value: unknown) {
    return this.normalizeText(value, 160);
  }

  private sortMediaForDisplay(media: any[] = []) {
    return [...media].sort((a, b) => {
      if (Boolean(a.isCover) !== Boolean(b.isCover)) {
        return a.isCover ? -1 : 1;
      }

      return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
    });
  }

  private assignMediaOrderAndCover(
    items: MediaCreateCandidate[],
    coverMediaKey?: unknown,
  ): Prisma.AdvertisementMediaCreateWithoutRevisionInput[] {
    const requestedCoverKey = this.normalizeCoverMediaKey(coverMediaKey);

    const requestedCoverIndex = requestedCoverKey
      ? items.findIndex((item) => item.mediaType === AdvertisementMediaType.IMAGE && item.sourceKey === requestedCoverKey)
      : -1;

    const fallbackCoverIndex = items.findIndex((item) => item.mediaType === AdvertisementMediaType.IMAGE);
    const selectedCoverIndex = requestedCoverIndex >= 0 ? requestedCoverIndex : fallbackCoverIndex;

    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .sort((a, b) => {
        if (selectedCoverIndex < 0) {
          return a.originalIndex - b.originalIndex;
        }

        if (a.originalIndex === selectedCoverIndex) return -1;
        if (b.originalIndex === selectedCoverIndex) return 1;

        return a.originalIndex - b.originalIndex;
      })
      .map(({ item }, sortOrder) => ({
        mediaType: item.mediaType,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl ?? null,
        storageKey: item.storageKey,
        originalFileName: item.originalFileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        durationSeconds: item.durationSeconds,
        sortOrder,
        isCover: sortOrder === 0 && item.mediaType === AdvertisementMediaType.IMAGE,
      }));
  }

  private normalizeLimit(value: unknown, fallback = 24) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(1, Math.min(100, Math.floor(parsed)));
  }

  private normalizeCurrency(value: unknown): AdvertisementPaymentCurrency {
    return String(value || "DIAMONDS").toUpperCase() === "COINS"
      ? AdvertisementPaymentCurrency.COINS
      : AdvertisementPaymentCurrency.DIAMONDS;
  }

  private normalizeBoostCurrency(value: unknown, fallback: AdvertisementPaymentCurrency): AdvertisementPaymentCurrency {
    const normalized = String(value || fallback || AdvertisementPaymentCurrency.DIAMONDS).toUpperCase();

    return normalized === "COINS"
      ? AdvertisementPaymentCurrency.COINS
      : AdvertisementPaymentCurrency.DIAMONDS;
  }

  private addHours(date: Date, hours: number) {
    return new Date(date.getTime() + Math.max(1, Math.floor(hours)) * 60 * 60 * 1000);
  }

  private normalizeCategory(value: unknown) {
    const text = this.normalizeText(value, 80);
    if (!text) return "Other";
    return ADVERTISEMENT_CATEGORIES.includes(text as any) ? text : "Other";
  }

  private requestedDurationToCycles(value: unknown) {
    const text = String(value || "ONGOING").trim().toUpperCase();
    if (!text || text === "ONGOING") return null;

    const number = Number(text);
    if (!Number.isFinite(number) || number < 1) return null;
    return Math.min(120, Math.floor(number));
  }

  private addMonthsWithAnchor(date: Date, months: number, anchorDay: number) {
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(utcYear, utcMonth + 1, 0)).getUTCDate();
    const day = Math.min(anchorDay, lastDay);

    const output = new Date(date);
    output.setUTCFullYear(utcYear, utcMonth, day);
    return output;
  }

  private getUploadRoot() {
    return path.resolve(
      process.env.ADVERTISEMENT_UPLOAD_DIR ||
      path.join(process.cwd(), "uploads", "advertisements"),
    );
  }

  private getUploadPublicPrefix() {
    return String(process.env.ADVERTISEMENT_PUBLIC_PATH || "/uploads/advertisements")
      .trim()
      .replace(/\/$/, "");
  }

  private async ensureSettings(tx: Prisma.TransactionClient = this.prisma) {
    const existing = await tx.advertisementSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (existing) return existing;

    return tx.advertisementSettings.create({
      data: {
        id: SETTINGS_ID,
        rules: DEFAULT_RULES,
      },
    });
  }


  private normalizePromoDiscountType(value: unknown) {
    const normalized = String(value || "PERCENT").trim().toUpperCase();
    return normalized === "FIXED_DIAMONDS" ? "FIXED_DIAMONDS" : "PERCENT";
  }

  private parseOptionalDate(value: unknown) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private calculatePromoPrice(originalDiamondPrice: number, settings: any, now: Date = new Date()) {
    const original = Math.max(1, Math.floor(Number(originalDiamondPrice || 0)));
    const discountType = this.normalizePromoDiscountType(settings?.promoDiscountType);
    const discountValue = Math.max(0, Math.floor(Number(settings?.promoDiscountValue || 0)));
    const startsAt = this.parseOptionalDate(settings?.promoStartsAt);
    const endsAt = this.parseOptionalDate(settings?.promoEndsAt);

    const activeWindow =
      (!startsAt || startsAt <= now) &&
      (!endsAt || endsAt >= now);

    let discount = 0;

    if (Boolean(settings?.promoEnabled) && discountValue > 0 && activeWindow) {
      discount = discountType === "PERCENT"
        ? Math.floor(original * Math.min(100, discountValue) / 100)
        : discountValue;
    }

    discount = Math.max(0, Math.min(original - 1, discount));
    const finalDiamondPrice = Math.max(1, original - discount);

    return {
      promoApplied: finalDiamondPrice < original,
      promoLabel: String(settings?.promoLabel || "").trim() || null,
      promoDiscountType: discountType,
      promoDiscountValue: discountValue,
      promoStartsAt: startsAt?.toISOString?.() ?? null,
      promoEndsAt: endsAt?.toISOString?.() ?? null,
      originalDiamondPrice: original,
      finalDiamondPrice,
      discountDiamondAmount: original - finalDiamondPrice,
    };
  }

  private buildBoostPromoMetadata(
    boostDurationHours: number,
    promo: ReturnType<typeof this.calculatePromoPrice>,
    extra: Record<string, unknown> = {},
  ) {
    return {
      ...extra,
      boostDurationHours,
      promoApplied: promo.promoApplied,
      promoLabel: promo.promoLabel,
      promoDiscountType: promo.promoDiscountType,
      promoDiscountValue: promo.promoDiscountValue,
      originalDiamondPrice: promo.originalDiamondPrice,
      finalDiamondPrice: promo.finalDiamondPrice,
      discountDiamondAmount: promo.discountDiamondAmount,
    };
  }
  private normalizeAdvertisementPromoDiscountType(value: unknown) {
    const normalized = String(value || "PERCENT").trim().toUpperCase();

    return normalized === "FIXED_DIAMONDS" ? "FIXED_DIAMONDS" : "PERCENT";
  }

  private parseAdvertisementPromoDate(value: unknown) {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private calculateAdvertisementPromoPrice(originalDiamondPrice: number, settings: any, now = new Date()) {
    const original = Math.max(0, Math.floor(Number(originalDiamondPrice || 0)));
    const coinToDiamondRate = Math.max(1, Math.floor(Number(settings?.coinToDiamondRate || 2)));
    const discountType = this.normalizeAdvertisementPromoDiscountType(settings?.promoDiscountType);
    const discountValue = Math.max(0, Math.floor(Number(settings?.promoDiscountValue || 0)));
    const startsAt = this.parseAdvertisementPromoDate(settings?.promoStartsAt);
    const endsAt = this.parseAdvertisementPromoDate(settings?.promoEndsAt);

    const promoEnabled = Boolean(settings?.promoEnabled);
    const promoFreeAdCreation = Boolean(settings?.promoFreeAdCreation);
    const promoActive = promoEnabled && (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);

    let discountDiamondAmount = 0;

    if (promoActive) {
      if (promoFreeAdCreation) {
        discountDiamondAmount = original;
      } else if (discountValue > 0) {
        discountDiamondAmount = discountType === "FIXED_DIAMONDS"
          ? discountValue
          : Math.floor(original * Math.min(100, discountValue) / 100);
      }
    }

    discountDiamondAmount = Math.max(0, Math.min(original, discountDiamondAmount));

    const finalDiamondPrice = Math.max(0, original - discountDiamondAmount);
    const originalCoinPrice = original * coinToDiamondRate;
    const finalCoinPrice = finalDiamondPrice * coinToDiamondRate;

    return {
      promoActive,
      promoApplied: finalDiamondPrice < original,
      promoFreeAdCreation: promoActive && promoFreeAdCreation,
      promoLabel: String(settings?.promoLabel || "").trim() || null,
      promoDiscountType: discountType,
      promoDiscountValue: discountValue,
      promoStartsAt: startsAt?.toISOString?.() ?? null,
      promoEndsAt: endsAt?.toISOString?.() ?? null,
      originalDiamondPrice: original,
      finalDiamondPrice,
      discountDiamondAmount,
      originalCoinPrice,
      finalCoinPrice,
      discountCoinAmount: originalCoinPrice - finalCoinPrice,
    };
  }

  private buildAdvertisementBoostMetadata(
    boostDurationHours: number,
    promo: ReturnType<typeof this.calculateAdvertisementPromoPrice>,
    extra: Record<string, unknown> = {},
  ) {
    return {
      ...extra,
      boostDurationHours,
      promoApplied: promo.promoApplied,
      promoLabel: promo.promoLabel,
      promoDiscountType: promo.promoDiscountType,
      promoDiscountValue: promo.promoDiscountValue,
      promoStartsAt: promo.promoStartsAt,
      promoEndsAt: promo.promoEndsAt,
      originalDiamondPrice: promo.originalDiamondPrice,
      finalDiamondPrice: promo.finalDiamondPrice,
      discountDiamondAmount: promo.discountDiamondAmount,
    };
  }  private mapSettings(settings: any) {
    const rules = Array.isArray(settings.rules) && settings.rules.length > 0
      ? settings.rules
      : DEFAULT_RULES;

    const monthlyDiamondPrice = Math.max(1, Number(settings.monthlyDiamondPrice || 250));
    const coinToDiamondRate = Math.max(1, Number(settings.coinToDiamondRate || 2));
    const monthlyPromo = this.calculateAdvertisementPromoPrice(monthlyDiamondPrice, settings);
    const monthlyFinalDiamondPrice = monthlyPromo.finalDiamondPrice;
    const monthlyFinalCoinPrice = monthlyPromo.finalCoinPrice;

    const boostDiamondPrice = Math.max(1, Number(settings.boostDiamondPrice || 100));
    const boostCoinPrice = boostDiamondPrice * coinToDiamondRate;

    return {
      enabled: settings.enabled,
      monthlyDiamondPrice,
      coinToDiamondRate,
      monthlyCoinPrice: monthlyDiamondPrice * coinToDiamondRate,
      monthlyFinalDiamondPrice,
      monthlyFinalCoinPrice,
      monthlyPromo,
      boostEnabled: settings.boostEnabled,
      boostDurationHours: settings.boostDurationHours,
      boostDiamondPrice,
      boostCoinPrice,
      boostFinalDiamondPrice: boostDiamondPrice,
      boostFinalCoinPrice: boostCoinPrice,
      boostPromo: null,
      promoEnabled: Boolean(settings.promoEnabled),
      promoFreeAdCreation: Boolean(settings.promoFreeAdCreation),
      promoLabel: settings.promoLabel,
      promoDiscountType: this.normalizeAdvertisementPromoDiscountType(settings.promoDiscountType),
      promoDiscountValue: Number(settings.promoDiscountValue || 0),
      promoStartsAt: settings.promoStartsAt?.toISOString?.() ?? null,
      promoEndsAt: settings.promoEndsAt?.toISOString?.() ?? null,
      allowedDurations: settings.allowedDurationOptions,
      allowedPaymentCurrencies: settings.allowedPaymentCurrencies,
      maxMediaItems: settings.maxMediaItems,
      maxVideoSeconds: settings.maxVideoSeconds,
      maxTitleLength: settings.maxTitleLength,
      maxShortDescriptionLength: settings.maxShortDescriptionLength,
      maxDescriptionLength: settings.maxDescriptionLength,
      maxServiceDetailsLength: settings.maxServiceDetailsLength,
      rules,
      updatedAt: settings.updatedAt?.toISOString?.() ?? null,
    };
  }

  private mapMedia(row: any) {
    return {
      id: row.id,
      mediaType: row.mediaType,
      url: row.url,
      thumbnailUrl: row.thumbnailUrl,
      originalFileName: row.originalFileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      durationSeconds: row.durationSeconds,
      sortOrder: row.sortOrder,
      isCover: row.isCover,
      createdAt: row.createdAt?.toISOString?.() ?? null,
    };
  }

  private getCurrentRevision(ad: AdvertisementWithContent) {
    if (ad.currentRevisionId) {
      const current = ad.revisions.find((revision) => revision.id === ad.currentRevisionId);
      if (current) return current;
    }

    return ad.revisions.find((revision) => revision.status === AdvertisementRevisionStatus.APPROVED)
      || ad.revisions[0]
      || null;
  }

  private getLatestPendingRevision(ad: AdvertisementWithContent) {
    return ad.revisions.find(
      (revision) => revision.status === AdvertisementRevisionStatus.PENDING_REVIEW,
    ) || null;
  }

  private mapAdvertisement(ad: AdvertisementWithContent, { includePrivate = false } = {}) {
    const revision = this.getCurrentRevision(ad);
    const pendingRevision = this.getLatestPendingRevision(ad);
    const media = this.sortMediaForDisplay(revision?.media || []);

    const output: Record<string, unknown> = {
      id: ad.id,
      status: ad.status,
      ownerUserId: ad.ownerUserId,
      creator: {
        id: ad.owner.id,
        username: ad.owner.username,
        displayName: ad.owner.profile?.displayName || ad.owner.username,
        avatarUrl: ad.owner.profile?.avatarUrl || null,
      },
      title: revision?.title || pendingRevision?.title || "Untitled Advertisement",
      category: revision?.category || pendingRevision?.category || "Other",
      shortDescription: revision?.shortDescription || pendingRevision?.shortDescription || "",
      description: revision?.description || pendingRevision?.description || "",
      serviceDetails: revision?.serviceDetails || pendingRevision?.serviceDetails || null,
      contactLabel: revision?.contactLabel || pendingRevision?.contactLabel || null,
      contactUrl: revision?.contactUrl || pendingRevision?.contactUrl || null,
      media: media.map((item) => this.mapMedia(item)),
      paymentCurrency: ad.paymentCurrency,
      monthlyDiamondPrice: ad.monthlyDiamondPrice,
      monthlyCoinPrice: ad.monthlyCoinPrice,
      requestedDurationCycles: ad.requestedDurationCycles,
      remainingCycles: ad.remainingCycles,
      billingAnchorDay: ad.billingAnchorDay,
      currentCycleStartedAt: ad.currentCycleStartedAt?.toISOString?.() ?? null,
      currentCycleEndsAt: ad.currentCycleEndsAt?.toISOString?.() ?? null,
      liveUntil: ad.currentCycleEndsAt?.toISOString?.() ?? null,
      boostedUntil: ad.boostedUntil?.toISOString?.() ?? null,
      lastBoostedAt: ad.lastBoostedAt?.toISOString?.() ?? null,
      isBoosted: Boolean(ad.boostedUntil && ad.boostedUntil > new Date()),
      nextBillingAt: ad.nextBillingAt?.toISOString?.() ?? null,
      cancelAtCycleEnd: ad.cancelAtCycleEnd,
      latestDenialReason: ad.latestDenialReason,
      denialReason: ad.latestDenialReason,
      lastPaymentFailureReason: ad.lastPaymentFailureReason,
      createdAt: ad.createdAt.toISOString(),
      updatedAt: ad.updatedAt.toISOString(),
    };

    if (includePrivate) {
      output.currentRevisionId = ad.currentRevisionId;
      output.latestSubmittedRevisionId = ad.latestSubmittedRevisionId;
      output.pendingRevisionStatus = pendingRevision?.status || null;
      output.pendingRevision = pendingRevision
        ? {
          id: pendingRevision.id,
          status: pendingRevision.status,
          title: pendingRevision.title,
          category: pendingRevision.category,
          shortDescription: pendingRevision.shortDescription,
          description: pendingRevision.description,
          serviceDetails: pendingRevision.serviceDetails,
          contactLabel: pendingRevision.contactLabel,
          contactUrl: pendingRevision.contactUrl,
          denialReason: pendingRevision.denialReason,
          media: this.sortMediaForDisplay(pendingRevision.media)
            .map((item) => this.mapMedia(item)),
          createdAt: pendingRevision.createdAt.toISOString(),
        }
        : null;
      output.billingEvents = ad.billingEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        status: event.status,
        paymentCurrency: event.paymentCurrency,
        diamondAmount: event.diamondAmount,
        coinAmount: event.coinAmount,
        failureReason: event.failureReason,
        createdAt: event.createdAt.toISOString(),
      }));
    }

    return output;
  }

  async getPublicSettings() {
    const settings = await this.ensureSettings();
    return {
      success: true,
      settings: this.mapSettings(settings),
    };
  }

  async listLiveAdvertisements(query: AdvertisementListQueryDto) {
    const limit = this.normalizeLimit(query.limit, 24);
    const q = this.normalizeText(query.q, 120).toLowerCase();
    const category = this.normalizeText(query.category, 80);

    const where: Prisma.AdvertisementWhereInput = {
      status: AdvertisementStatus.LIVE,
      currentRevisionId: { not: null },
    };

    const rows = await this.prisma.advertisement.findMany({
      where,
      include: {
        owner: { include: { profile: true } },
        revisions: {
          include: { media: true },
          orderBy: { createdAt: "desc" },
        },
        billingEvents: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: [
        { boostedUntil: "desc" },
        { currentCycleStartedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: Math.min(100, Math.max(limit, limit * 4)),
    });

    const mapped = rows
      .map((ad) => this.mapAdvertisement(ad))
      .filter((ad: any) => {
        if (category && ad.category !== category) return false;
        if (!q) return true;

        return [
          ad.title,
          ad.category,
          ad.shortDescription,
          ad.description,
          ad.creator?.username,
          ad.creator?.displayName,
        ]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(q));
      });

    const advertisementIds = mapped
      .map((ad: any) => String(ad.id || ""))
      .filter(Boolean);

    const ratingRows = advertisementIds.length > 0
      ? await this.prisma.advertisementReview.groupBy({
          by: ["advertisementId"],
          where: {
            advertisementId: { in: advertisementIds },
          },
          _avg: { stars: true },
          _count: { stars: true },
        })
      : [];

    const ratingMap = new Map(
      ratingRows.map((row) => [
        row.advertisementId,
        {
          averageRating: row._avg.stars ? Math.round(Number(row._avg.stars) * 10) / 10 : null,
          reviewCount: Number(row._count.stars || 0),
        },
      ]),
    );

    const withRatings = mapped.map((ad: any) => {
      const rating = ratingMap.get(ad.id) || { averageRating: null, reviewCount: 0 };

      return {
        ...ad,
        averageRating: rating.averageRating,
        reviewCount: rating.reviewCount,
      };
    });

    const now = new Date();
    const sorted = withRatings
      .sort((a: any, b: any) => {
        const aBoosted = a.boostedUntil && new Date(a.boostedUntil) > now;
        const bBoosted = b.boostedUntil && new Date(b.boostedUntil) > now;

        if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;

        if (aBoosted && bBoosted) {
          return new Date(b.boostedUntil).getTime() - new Date(a.boostedUntil).getTime();
        }

        return 0;
      })
      .slice(0, limit);

    return {
      success: true,
      items: sorted,
      advertisements: sorted,
    };
  }

  async listMyAdvertisements(userId: string, query: MyAdvertisementsQueryDto) {
    const limit = this.normalizeLimit(query.limit, 50);
    const status = this.normalizeText(query.status, 40).toUpperCase();

    const where: Prisma.AdvertisementWhereInput = {
      ownerUserId: userId,
      ...(status ? { status: status as AdvertisementStatus } : {}),
    };

    const rows = await this.prisma.advertisement.findMany({
      where,
      include: {
        owner: { include: { profile: true } },
        revisions: {
          include: { media: true },
          orderBy: { createdAt: "desc" },
        },
        billingEvents: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    });

    const items = rows.map((ad) => this.mapAdvertisement(ad, { includePrivate: true }));

    return {
      success: true,
      items,
      advertisements: items,
    };
  }

  async getMyAdvertisement(userId: string, id: string) {
    const ad = await this.prisma.advertisement.findFirst({
      where: { id, ownerUserId: userId },
      include: {
        owner: { include: { profile: true } },
        revisions: {
          include: { media: true },
          orderBy: { createdAt: "desc" },
        },
        billingEvents: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!ad) {
      throw new NotFoundException("Advertisement not found.");
    }

    return {
      success: true,
      advertisement: this.mapAdvertisement(ad, { includePrivate: true }),
    };
  }


  private validateBody(body: CreateAdvertisementDto | UpdateAdvertisementDto, settings: any) {
    if (!settings.enabled) {
      throw new ForbiddenException("Advertisements are not accepting submissions right now.");
    }

    const title = this.normalizeText(body.title, settings.maxTitleLength);
    const category = this.normalizeCategory(body.category);
    const shortDescription = this.normalizeText(body.shortDescription, settings.maxShortDescriptionLength);
    const description = this.normalizeText(body.description, settings.maxDescriptionLength);
    const serviceDetails = this.normalizeOptionalText(body.serviceDetails, settings.maxServiceDetailsLength);
    // Contact for advertisements must happen through SparkzLive DMs.
    // External contact URLs/labels are intentionally ignored.
    const contactLabel = null;
    const contactUrl = null;
    const paymentCurrency = this.normalizeCurrency(body.paymentCurrency);

    if (!title) throw new BadRequestException("Advertisement title is required.");
    if (!shortDescription) throw new BadRequestException("Short description is required.");
    if (!description) throw new BadRequestException("Description is required.");

    const allowedCurrencies = Array.isArray(settings.allowedPaymentCurrencies)
      ? settings.allowedPaymentCurrencies.map((value: string) => String(value).toUpperCase())
      : ["DIAMONDS", "COINS"];

    if (!allowedCurrencies.includes(paymentCurrency)) {
      throw new BadRequestException("That payment currency is not currently allowed.");
    }

    return {
      title,
      category,
      shortDescription,
      description,
      serviceDetails,
      contactLabel,
      contactUrl,
      paymentCurrency,
      requestedDurationCycles: this.requestedDurationToCycles(body.requestedDuration),
    };
  }

  private async getVideoDurationSeconds(filePath: string) {
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        filePath,
      ]);

      const parsed = JSON.parse(stdout);
      const duration = Number(parsed?.format?.duration);
      if (!Number.isFinite(duration)) {
        throw new Error("Duration was not readable.");
      }

      return Math.ceil(duration);
    } catch (error) {
      throw new BadRequestException(
        "Video duration could not be verified. Install ffmpeg/ffprobe on the API server to allow video ads.",
      );
    }
  }

  private async saveUploadedMedia(files: Express.Multer.File[], settings: any): Promise<SaveMediaResult[]> {
    const maxMediaItems = Number(settings.maxMediaItems || 8);
    const maxVideoSeconds = Number(settings.maxVideoSeconds || 30);

    if (files.length > maxMediaItems) {
      throw new BadRequestException(`You can upload up to ${maxMediaItems} media items.`);
    }

    const uploadRoot = this.getUploadRoot();
    const publicPrefix = this.getUploadPublicPrefix();
    await fs.mkdir(uploadRoot, { recursive: true });

    const saved: SaveMediaResult[] = [];

    for (const file of files || []) {
      const mimeType = String(file.mimetype || "");
      const isImage = mimeType.startsWith("image/");
      const isVideo = mimeType.startsWith("video/");

      if (!isImage && !isVideo) {
        throw new BadRequestException("Only image and video files are allowed for advertisements.");
      }

      const originalExtension = path.extname(file.originalname || "").toLowerCase();
      const extension =
        originalExtension ||
        (isVideo ? ".mp4" : ".jpg");

      const filename = `${Date.now()}-${randomUUID()}${extension}`;
      const fullPath = path.join(uploadRoot, filename);
      await fs.writeFile(fullPath, file.buffer);

      let durationSeconds: number | null = null;

      if (isVideo) {
        durationSeconds = await this.getVideoDurationSeconds(fullPath);

        if (durationSeconds > maxVideoSeconds) {
          await fs.unlink(fullPath).catch(() => undefined);
          throw new BadRequestException(
            `Advertisement videos must be ${maxVideoSeconds} seconds or less.`,
          );
        }
      }

      saved.push({
        mediaType: isVideo ? AdvertisementMediaType.VIDEO : AdvertisementMediaType.IMAGE,
        url: `${publicPrefix}/${filename}`,
        storageKey: filename,
        originalFileName: file.originalname || null,
        mimeType: file.mimetype || null,
        sizeBytes: Number(file.size || file.buffer?.length || 0),
        durationSeconds,
      });
    }

    return saved;
  }

  async createAdvertisement(userId: string, body: CreateAdvertisementDto, files: Express.Multer.File[]) {
    const settings = await this.ensureSettings();
    const normalized = this.validateBody(body, settings);
    const savedMedia = await this.saveUploadedMedia(files || [], settings);
    const newMediaKeys = this.parseJsonArray(body.newMediaKeys);
    const mediaCreateInputs = this.assignMediaOrderAndCover(
      savedMedia.map((item, index) => ({
        ...item,
        sourceKey: newMediaKeys[index] || `new:${index}`,
      })),
      body.coverMediaKey,
    );

    const monthlyDiamondPrice = Number(settings.monthlyDiamondPrice || 250);
    const monthlyCoinPrice = monthlyDiamondPrice * Number(settings.coinToDiamondRate || 2);

    const created = await this.prisma.$transaction(async (tx) => {
      const ad = await tx.advertisement.create({
        data: {
          ownerUserId: userId,
          status: AdvertisementStatus.PENDING_REVIEW,
          paymentCurrency: normalized.paymentCurrency,
          monthlyDiamondPrice,
          monthlyCoinPrice,
          requestedDurationCycles: normalized.requestedDurationCycles,
        },
      });

      const revision = await tx.advertisementRevision.create({
        data: {
          advertisementId: ad.id,
          submittedByUserId: userId,
          version: 1,
          title: normalized.title,
          category: normalized.category,
          shortDescription: normalized.shortDescription,
          description: normalized.description,
          serviceDetails: normalized.serviceDetails,
          contactLabel: normalized.contactLabel,
          contactUrl: normalized.contactUrl,
          media: {
            create: mediaCreateInputs,
          },
        },
      });

      return tx.advertisement.update({
        where: { id: ad.id },
        data: { latestSubmittedRevisionId: revision.id },
        include: {
          owner: { include: { profile: true } },
          revisions: { include: { media: true }, orderBy: { createdAt: "desc" } },
          billingEvents: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
    });

    return {
      success: true,
      advertisement: this.mapAdvertisement(created, { includePrivate: true }),
    };
  }

  async updateAdvertisement(
    userId: string,
    id: string,
    body: UpdateAdvertisementDto,
    files: Express.Multer.File[],
  ) {
    const ad = await this.prisma.advertisement.findFirst({
      where: { id, ownerUserId: userId },
      include: {
        revisions: { include: { media: true }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!ad) throw new NotFoundException("Advertisement not found.");

    const pendingRevision = ad.revisions.find(
      (revision) => revision.status === AdvertisementRevisionStatus.PENDING_REVIEW,
    );

    if (pendingRevision) {
      throw new BadRequestException("This advertisement already has pending changes waiting for approval.");
    }

    const settings = await this.ensureSettings();
    const normalized = this.validateBody(body, settings);
    const savedMedia = await this.saveUploadedMedia(files || [], settings);
    const existingMediaIds = new Set(this.parseJsonArray(body.existingMediaIds));
    const removedMediaIds = new Set(this.parseJsonArray(body.removedMediaIds));
    const newMediaKeys = this.parseJsonArray(body.newMediaKeys);

    const currentRevision = ad.currentRevisionId
      ? ad.revisions.find((revision) => revision.id === ad.currentRevisionId)
      : ad.revisions[0];

    const currentMedia = currentRevision?.media || [];
    const requestedExistingIds = Array.from(existingMediaIds);

    const keptExistingMedia = (
      requestedExistingIds.length > 0
        ? requestedExistingIds
          .map((mediaId) => currentMedia.find((item) => item.id === mediaId))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
        : currentMedia
    ).filter((item) => !removedMediaIds.has(item.id));

    const mediaToCarryForward: MediaCreateCandidate[] = keptExistingMedia.map((item) => ({
      mediaType: item.mediaType,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      storageKey: item.storageKey,
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      durationSeconds: item.durationSeconds,
      sourceKey: `existing:${item.id}`,
    }));

    const combinedMediaForRevision = this.assignMediaOrderAndCover(
      [
        ...mediaToCarryForward,
        ...savedMedia.map((item, index) => ({
          ...item,
          sourceKey: newMediaKeys[index] || `new:${index}`,
        })),
      ],
      body.coverMediaKey,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const nextVersion = await tx.advertisementRevision.count({
        where: { advertisementId: ad.id },
      });

      const revision = await tx.advertisementRevision.create({
        data: {
          advertisementId: ad.id,
          submittedByUserId: userId,
          version: nextVersion + 1,
          title: normalized.title,
          category: normalized.category,
          shortDescription: normalized.shortDescription,
          description: normalized.description,
          serviceDetails: normalized.serviceDetails,
          contactLabel: normalized.contactLabel,
          contactUrl: normalized.contactUrl,
          media: {
            create: combinedMediaForRevision,
          },
        },
      });

      return tx.advertisement.update({
        where: { id: ad.id },
        data: {
          latestSubmittedRevisionId: revision.id,
          status: ad.currentRevisionId ? ad.status : AdvertisementStatus.PENDING_REVIEW,
          paymentCurrency: normalized.paymentCurrency,
          requestedDurationCycles: normalized.requestedDurationCycles,
          latestDenialReason: null,
        },
        include: {
          owner: { include: { profile: true } },
          revisions: { include: { media: true }, orderBy: { createdAt: "desc" } },
          billingEvents: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
    });

    return {
      success: true,
      advertisement: this.mapAdvertisement(created, { includePrivate: true }),
    };
  }

  private async chargeAdvertisement(
    tx: Prisma.TransactionClient,
    ad: {
      id: string;
      ownerUserId: string;
      paymentCurrency: AdvertisementPaymentCurrency;
      monthlyDiamondPrice: number;
      monthlyCoinPrice: number;
    },
    eventType: AdvertisementBillingEventType,
    cycleStartedAt: Date,
    cycleEndsAt: Date,
  ) {
    const settings = await this.ensureSettings(tx);
    const coinToDiamondRate = Math.max(1, Math.floor(Number(settings.coinToDiamondRate || 2)));
    const baseDiamondAmount = Math.max(1, Math.floor(Number(ad.monthlyDiamondPrice || settings.monthlyDiamondPrice || 250)));

    const promoEligible =
      eventType === AdvertisementBillingEventType.INITIAL_CHARGE ||
      eventType === AdvertisementBillingEventType.RENEWAL ||
      eventType === AdvertisementBillingEventType.REPUBLISH ||
      eventType === AdvertisementBillingEventType.RETRY_PAYMENT;

    const promo = this.calculateAdvertisementPromoPrice(
      baseDiamondAmount,
      promoEligible ? settings : { ...settings, promoEnabled: false, promoFreeAdCreation: false },
      cycleStartedAt,
    );

    const diamondAmount = promo.finalDiamondPrice;
    const coinAmount = diamondAmount * coinToDiamondRate;
    const useCoins = ad.paymentCurrency === AdvertisementPaymentCurrency.COINS;

    const metadataJson = {
      billingKind: "AD_CREATION_MONTHLY_PRICE",
      promoEligible,
      promoActive: promo.promoActive,
      promoApplied: promo.promoApplied,
      promoFreeAdCreation: promo.promoFreeAdCreation,
      promoLabel: promo.promoLabel,
      promoDiscountType: promo.promoDiscountType,
      promoDiscountValue: promo.promoDiscountValue,
      promoStartsAt: promo.promoStartsAt,
      promoEndsAt: promo.promoEndsAt,
      originalDiamondPrice: promo.originalDiamondPrice,
      finalDiamondPrice: promo.finalDiamondPrice,
      discountDiamondAmount: promo.discountDiamondAmount,
      originalCoinPrice: promo.originalCoinPrice,
      finalCoinPrice: promo.finalCoinPrice,
      discountCoinAmount: promo.discountCoinAmount,
    };

    const wallet = await tx.wallet.upsert({
      where: { userId: ad.ownerUserId },
      create: {
        userId: ad.ownerUserId,
        coins: 0,
        diamondsEarned: 0,
      },
      update: {},
    });

    if (useCoins && coinAmount > 0 && wallet.coins < coinAmount) {
      await tx.advertisementBillingEvent.create({
        data: {
          advertisementId: ad.id,
          userId: ad.ownerUserId,
          eventType,
          status: AdvertisementBillingEventStatus.FAILED,
          paymentCurrency: ad.paymentCurrency,
          diamondAmount,
          coinAmount,
          failureReason: "Insufficient coin balance.",
          billingCycleStartedAt: cycleStartedAt,
          billingCycleEndsAt: cycleEndsAt,
          metadataJson,
        },
      });

      throw new ForbiddenException("Insufficient coin balance for advertisement billing.");
    }

    if (!useCoins && diamondAmount > 0 && wallet.diamondsEarned < diamondAmount) {
      await tx.advertisementBillingEvent.create({
        data: {
          advertisementId: ad.id,
          userId: ad.ownerUserId,
          eventType,
          status: AdvertisementBillingEventStatus.FAILED,
          paymentCurrency: ad.paymentCurrency,
          diamondAmount,
          coinAmount,
          failureReason: "Insufficient diamond balance.",
          billingCycleStartedAt: cycleStartedAt,
          billingCycleEndsAt: cycleEndsAt,
          metadataJson,
        },
      });

      throw new ForbiddenException("Insufficient diamond balance for advertisement billing.");
    }

    const shouldDebitWallet = useCoins ? coinAmount > 0 : diamondAmount > 0;

    const updatedWallet = shouldDebitWallet
      ? await tx.wallet.update({
          where: { userId: ad.ownerUserId },
          data: useCoins
            ? { coins: { decrement: coinAmount } }
            : { diamondsEarned: { decrement: diamondAmount } },
        })
      : wallet;

    let ledger: { id: string } | null = null;

    if (shouldDebitWallet) {
      ledger = await tx.walletLedger.create({
        data: {
          userId: ad.ownerUserId,
          type: eventType === AdvertisementBillingEventType.RENEWAL
            ? LedgerEntryType.ADVERTISEMENT_RENEWAL_DEBIT
            : LedgerEntryType.ADVERTISEMENT_DEBIT,
          deltaCoins: useCoins ? -coinAmount : 0,
          deltaDiamonds: useCoins ? 0 : -diamondAmount,
        },
      });
    }

    await tx.advertisementBillingEvent.create({
      data: {
        advertisementId: ad.id,
        userId: ad.ownerUserId,
        eventType,
        status: AdvertisementBillingEventStatus.SUCCEEDED,
        paymentCurrency: ad.paymentCurrency,
        diamondAmount,
        coinAmount,
        walletLedgerId: ledger?.id ?? null,
        billingCycleStartedAt: cycleStartedAt,
        billingCycleEndsAt: cycleEndsAt,
        metadataJson,
      },
    });

    return { wallet: updatedWallet, ledger };
  }

  async activateApprovedAdvertisement(
    tx: Prisma.TransactionClient,
    adId: string,
    eventType: AdvertisementBillingEventType = AdvertisementBillingEventType.INITIAL_CHARGE,
  ) {
    const ad = await tx.advertisement.findUnique({
      where: { id: adId },
    });

    if (!ad) throw new NotFoundException("Advertisement not found.");
    if (!ad.currentRevisionId) {
      throw new BadRequestException("Advertisement has no approved revision.");
    }

    const now = new Date();
    const anchorDay = now.getUTCDate();
    const cycleEndsAt = this.addMonthsWithAnchor(now, 1, anchorDay);

    try {
      await this.chargeAdvertisement(tx, ad, eventType, now, cycleEndsAt);
    } catch (error: any) {
      await tx.advertisement.update({
        where: { id: ad.id },
        data: {
          status: AdvertisementStatus.PAYMENT_FAILED,
          lastPaymentFailureReason: error?.message || "Advertisement payment failed.",
        },
      });
      throw error;
    }

    const requestedCycles = ad.requestedDurationCycles ?? null;
    const remainingCycles = requestedCycles === null ? null : Math.max(0, requestedCycles - 1);

    return tx.advertisement.update({
      where: { id: ad.id },
      data: {
        status: AdvertisementStatus.LIVE,
        billingAnchorDay: anchorDay,
        currentCycleStartedAt: now,
        currentCycleEndsAt: cycleEndsAt,
        nextBillingAt: remainingCycles === 0 ? null : cycleEndsAt,
        remainingCycles,
        lastBilledAt: now,
        lastPaymentFailureReason: null,
        cancelAtCycleEnd: false,
        cancelledAt: null,
      },
    });
  }


async boostAdvertisement(userId: string, id: string, body: BoostAdvertisementDto = {}) {
  const updated = await this.prisma.$transaction(async (tx) => {
    const settings = await this.ensureSettings(tx);

    if (!settings.boostEnabled) {
      throw new ForbiddenException("Advertisement boosts are not available right now.");
    }

    const ad = await tx.advertisement.findFirst({
      where: { id, ownerUserId: userId },
    });

    if (!ad) throw new NotFoundException("Advertisement not found.");

    if (ad.status !== AdvertisementStatus.LIVE) {
      throw new BadRequestException("Only live advertisements can be boosted.");
    }

    if (!ad.currentRevisionId) {
      throw new BadRequestException("This advertisement needs approved content before it can be boosted.");
    }

    const now = new Date();
    const boostDurationHours = Math.max(1, Number(settings.boostDurationHours || 24));
    const boostDiamondPrice = Math.max(1, Number(settings.boostDiamondPrice || 100));
    const boostCoinPrice = boostDiamondPrice * Math.max(1, Number(settings.coinToDiamondRate || 2));
    const paymentCurrency = this.normalizeBoostCurrency(body?.paymentCurrency, ad.paymentCurrency);
    const useCoins = paymentCurrency === AdvertisementPaymentCurrency.COINS;

    const wallet = await tx.wallet.upsert({
      where: { userId },
      create: {
        userId,
        coins: 0,
        diamondsEarned: 0,
      },
      update: {},
    });

    if (useCoins && wallet.coins < boostCoinPrice) {
      await tx.advertisementBillingEvent.create({
        data: {
          advertisementId: ad.id,
          userId,
          eventType: AdvertisementBillingEventType.BOOST,
          status: AdvertisementBillingEventStatus.FAILED,
          paymentCurrency,
          diamondAmount: boostDiamondPrice,
          coinAmount: boostCoinPrice,
          failureReason: "Insufficient coin balance.",
          billingCycleStartedAt: now,
          billingCycleEndsAt: this.addHours(now, boostDurationHours),
          metadataJson: { boostDurationHours },
        },
      });

      throw new ForbiddenException("Insufficient coin balance for advertisement boost.");
    }

    if (!useCoins && wallet.diamondsEarned < boostDiamondPrice) {
      await tx.advertisementBillingEvent.create({
        data: {
          advertisementId: ad.id,
          userId,
          eventType: AdvertisementBillingEventType.BOOST,
          status: AdvertisementBillingEventStatus.FAILED,
          paymentCurrency,
          diamondAmount: boostDiamondPrice,
          coinAmount: boostCoinPrice,
          failureReason: "Insufficient diamond balance.",
          billingCycleStartedAt: now,
          billingCycleEndsAt: this.addHours(now, boostDurationHours),
          metadataJson: { boostDurationHours },
        },
      });

      throw new ForbiddenException("Insufficient diamond balance for advertisement boost.");
    }

    await tx.wallet.update({
      where: { userId },
      data: useCoins
        ? { coins: { decrement: boostCoinPrice } }
        : { diamondsEarned: { decrement: boostDiamondPrice } },
    });

    const ledger = await tx.walletLedger.create({
      data: {
        userId,
        type: LedgerEntryType.ADVERTISEMENT_BOOST_DEBIT,
        deltaCoins: useCoins ? -boostCoinPrice : 0,
        deltaDiamonds: useCoins ? 0 : -boostDiamondPrice,
      },
    });

    const boostStartsAt = ad.boostedUntil && ad.boostedUntil > now
      ? ad.boostedUntil
      : now;
    const boostedUntil = this.addHours(boostStartsAt, boostDurationHours);

    await tx.advertisementBillingEvent.create({
      data: {
        advertisementId: ad.id,
        userId,
        eventType: AdvertisementBillingEventType.BOOST,
        status: AdvertisementBillingEventStatus.SUCCEEDED,
        paymentCurrency,
        diamondAmount: boostDiamondPrice,
        coinAmount: boostCoinPrice,
        walletLedgerId: ledger.id,
        billingCycleStartedAt: now,
        billingCycleEndsAt: boostedUntil,
        metadataJson: {
          boostDurationHours,
          boostStartsAt: boostStartsAt.toISOString(),
        },
      },
    });

    return tx.advertisement.update({
      where: { id: ad.id },
      data: {
        boostedUntil,
        lastBoostedAt: now,
      },
      include: {
        owner: { include: { profile: true } },
        revisions: { include: { media: true }, orderBy: { createdAt: "desc" } },
        billingEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
  });

  return {
    success: true,
    advertisement: this.mapAdvertisement(updated, { includePrivate: true }),
    boost: {
      boostedUntil: updated.boostedUntil?.toISOString?.() ?? null,
      lastBoostedAt: updated.lastBoostedAt?.toISOString?.() ?? null,
    },
  };
}

  async cancelAtCycleEnd(userId: string, id: string) {
    const ad = await this.prisma.advertisement.findFirst({
      where: { id, ownerUserId: userId },
    });

    if (!ad) throw new NotFoundException("Advertisement not found.");

    if (ad.status !== AdvertisementStatus.LIVE && ad.status !== AdvertisementStatus.PAYMENT_FAILED) {
      throw new BadRequestException("Only live or payment-failed advertisements can be cancelled.");
    }

    const updated = await this.prisma.advertisement.update({
      where: { id: ad.id },
      data: ad.status === AdvertisementStatus.LIVE
        ? {
          status: AdvertisementStatus.CANCELLED_ENDING,
          cancelAtCycleEnd: true,
          cancelledAt: new Date(),
          nextBillingAt: null,
        }
        : {
          status: AdvertisementStatus.INACTIVE,
          cancelAtCycleEnd: false,
          cancelledAt: new Date(),
          nextBillingAt: null,
        },
      include: {
        owner: { include: { profile: true } },
        revisions: { include: { media: true }, orderBy: { createdAt: "desc" } },
        billingEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    return {
      success: true,
      advertisement: this.mapAdvertisement(updated, { includePrivate: true }),
    };
  }

  async republish(userId: string, id: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const ad = await tx.advertisement.findFirst({
        where: { id, ownerUserId: userId },
      });

      if (!ad) throw new NotFoundException("Advertisement not found.");

      if (!ad.currentRevisionId) {
        throw new BadRequestException("This advertisement needs admin approval before it can be published.");
      }

      const republishableStatuses: AdvertisementStatus[] = [
        AdvertisementStatus.INACTIVE,
        AdvertisementStatus.EXPIRED,
        AdvertisementStatus.PAYMENT_FAILED,
      ];

      if (!republishableStatuses.includes(ad.status)) {
        throw new BadRequestException("Only inactive, expired, or payment-failed ads can be republished.");
      }

      await tx.advertisement.update({
        where: { id: ad.id },
        data: {
          latestDenialReason: null,
          lastPaymentFailureReason: null,
        },
      });

      await this.activateApprovedAdvertisement(tx, ad.id, AdvertisementBillingEventType.REPUBLISH);

      return tx.advertisement.findUniqueOrThrow({
        where: { id: ad.id },
        include: {
          owner: { include: { profile: true } },
          revisions: { include: { media: true }, orderBy: { createdAt: "desc" } },
          billingEvents: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
    });

    return {
      success: true,
      advertisement: this.mapAdvertisement(updated, { includePrivate: true }),
    };
  }

  async retryPayment(userId: string, id: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const ad = await tx.advertisement.findFirst({
        where: { id, ownerUserId: userId },
      });

      if (!ad) throw new NotFoundException("Advertisement not found.");
      if (!ad.currentRevisionId) {
        throw new BadRequestException("This advertisement needs admin approval before payment can be retried.");
      }

      await this.activateApprovedAdvertisement(tx, ad.id, AdvertisementBillingEventType.RETRY_PAYMENT);

      return tx.advertisement.findUniqueOrThrow({
        where: { id: ad.id },
        include: {
          owner: { include: { profile: true } },
          revisions: { include: { media: true }, orderBy: { createdAt: "desc" } },
          billingEvents: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
    });

    return {
      success: true,
      advertisement: this.mapAdvertisement(updated, { includePrivate: true }),
    };
  }

  private async deleteStoredMediaFiles(mediaItems: Array<{ storageKey: string | null }>) {
    const uploadRoot = this.getUploadRoot();

    await Promise.all(
      mediaItems
        .map((item) => item.storageKey)
        .filter((storageKey): storageKey is string => Boolean(storageKey))
        .map(async (storageKey) => {
          const filePath = path.join(uploadRoot, storageKey);

          try {
            await fs.unlink(filePath);
          } catch {
            // Best-effort cleanup only. Database deletion is the source of truth.
          }
        }),
    );
  }

  async deleteInactiveAdvertisement(userId: string, id: string) {
    const ad = await this.prisma.advertisement.findFirst({
      where: {
        id,
        ownerUserId: userId,
      },
      include: {
        revisions: {
          include: {
            media: true,
          },
        },
      },
    });

    if (!ad) {
      throw new NotFoundException("Advertisement not found.");
    }

    const deletableStatuses: AdvertisementStatus[] = [
      AdvertisementStatus.INACTIVE,
      AdvertisementStatus.DENIED,
    ];

    if (!deletableStatuses.includes(ad.status)) {
      throw new BadRequestException("Only inactive or denied advertisements can be deleted.");
    }

    const mediaItems = ad.revisions.flatMap((revision) => revision.media);

    await this.prisma.advertisement.delete({
      where: {
        id: ad.id,
      },
    });

    await this.deleteStoredMediaFiles(mediaItems);

    return {
      success: true,
      deleted: true,
      id: ad.id,
    };
  }

  async processDueRenewals(limit = 100) {
    const now = new Date();
    const ads = await this.prisma.advertisement.findMany({
      where: {
        OR: [
          { status: AdvertisementStatus.LIVE, nextBillingAt: { lte: now } },
          { status: AdvertisementStatus.CANCELLED_ENDING, currentCycleEndsAt: { lte: now } },
          { status: AdvertisementStatus.LIVE, remainingCycles: 0, currentCycleEndsAt: { lte: now } },
        ],
      },
      orderBy: { nextBillingAt: "asc" },
      take: limit,
    });

    let renewed = 0;
    let expired = 0;
    let failed = 0;

    for (const ad of ads) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const fresh = await tx.advertisement.findUnique({
            where: { id: ad.id },
          });

          if (!fresh) return;

          if (
            fresh.status === AdvertisementStatus.CANCELLED_ENDING &&
            fresh.currentCycleEndsAt &&
            fresh.currentCycleEndsAt <= now
          ) {
            await tx.advertisement.update({
              where: { id: fresh.id },
              data: {
                status: AdvertisementStatus.INACTIVE,
                cancelAtCycleEnd: false,
                nextBillingAt: null,
              },
            });
            expired += 1;
            return;
          }

          if (
            fresh.status === AdvertisementStatus.LIVE &&
            fresh.remainingCycles === 0 &&
            fresh.currentCycleEndsAt &&
            fresh.currentCycleEndsAt <= now
          ) {
            await tx.advertisement.update({
              where: { id: fresh.id },
              data: {
                status: AdvertisementStatus.EXPIRED,
                nextBillingAt: null,
              },
            });
            expired += 1;
            return;
          }

          if (
            fresh.status !== AdvertisementStatus.LIVE ||
            !fresh.nextBillingAt ||
            fresh.nextBillingAt > now
          ) {
            return;
          }

          const anchorDay = fresh.billingAnchorDay || fresh.nextBillingAt.getUTCDate();
          const cycleStartedAt = fresh.nextBillingAt;
          const cycleEndsAt = this.addMonthsWithAnchor(cycleStartedAt, 1, anchorDay);

          try {
            await this.chargeAdvertisement(
              tx,
              fresh,
              AdvertisementBillingEventType.RENEWAL,
              cycleStartedAt,
              cycleEndsAt,
            );

            const nextRemaining =
              fresh.remainingCycles === null || fresh.remainingCycles === undefined
                ? null
                : Math.max(0, fresh.remainingCycles - 1);

            await tx.advertisement.update({
              where: { id: fresh.id },
              data: {
                currentCycleStartedAt: cycleStartedAt,
                currentCycleEndsAt: cycleEndsAt,
                nextBillingAt: nextRemaining === 0 ? null : cycleEndsAt,
                remainingCycles: nextRemaining,
                lastBilledAt: now,
                lastPaymentFailureReason: null,
              },
            });

            renewed += 1;
          } catch (error: any) {
            await tx.advertisement.update({
              where: { id: fresh.id },
              data: {
                status: AdvertisementStatus.PAYMENT_FAILED,
                nextBillingAt: null,
                lastPaymentFailureReason: error?.message || "Advertisement renewal failed.",
              },
            });
            failed += 1;
          }
        });
      } catch {
        failed += 1;
      }
    }

    return {
      success: true,
      processed: ads.length,
      renewed,
      expired,
      failed,
    };
  }
}

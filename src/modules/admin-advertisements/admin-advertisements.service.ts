import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AdvertisementBillingEventType,
  AdvertisementRevisionStatus,
  AdvertisementStatus,
  AdminAuditActionType,
  AdminAuditSeverity,
  AdminRole,
  Prisma,
} from "@prisma/client";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { AdvertisementsService } from "../advertisements/advertisements.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminAdvertisementsQueryDto,
  UpdateAdvertisementSettingsDto,
} from "./dto/admin-advertisements.dto";

type AdminAuditRequestContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

const DEFAULT_RULES = [
  "Advertisements must offer a real creative, streaming, event, moderation, promotion, or creator-service offering.",
  "All new ads and all edits to approved ads must be approved by an admin before they go live.",
  "Users can pay with diamonds or coins. 1 diamond = $0.01, and 2 coins = 1 diamond.",
  "Photos and videos must represent the service accurately. Videos may be up to 30 seconds.",
  "No scams, impersonation, adult services, hateful content, illegal services, or misleading guarantees.",
  "Contact must happen through SparkzLive DMs once available. External contact links/contact info are not allowed in advertisements.",
  "Billing starts only after approval when the ad becomes live. Monthly renewals bill on the live/republish date.",
];

@Injectable()
export class AdminAdvertisementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly advertisements: AdvertisementsService,
    private readonly adminAudit: AdminAuditService,
    private readonly adminRolePermissions: AdminRolePermissionsService,
  ) {}

  private normalizeLimit(value: unknown, fallback = 50) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(1, Math.min(100, Math.floor(parsed)));
  }

  private async ensureSettings() {
    const existing = await this.prisma.advertisementSettings.findUnique({
      where: { id: "default" },
    });

    if (existing) return existing;

    return this.prisma.advertisementSettings.create({
      data: {
        id: "default",
        rules: DEFAULT_RULES,
      },
    });
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

  private getCurrentRevision(ad: any) {
    if (ad.currentRevisionId) {
      const current = ad.revisions.find((revision: any) => revision.id === ad.currentRevisionId);
      if (current) return current;
    }
    return ad.revisions.find((revision: any) => revision.status === "APPROVED") || ad.revisions[0] || null;
  }

  private getApprovedRevision(ad: any) {
    if (ad.currentRevisionId) {
      const current = ad.revisions.find((revision: any) => revision.id === ad.currentRevisionId);
      if (current) return current;
    }

    return ad.revisions.find((revision: any) => revision.status === "APPROVED") || null;
  }

  private normalizeDiffValue(value: unknown) {
    return String(value ?? "").trim();
  }

  private getMediaLabel(item: any) {
    return (
      item?.originalFileName ||
      item?.url ||
      item?.thumbnailUrl ||
      item?.id ||
      "Unknown media"
    );
  }

  private sortMedia(media: any[] = []) {
    return [...media].sort((a, b) => {
      if (Boolean(a.isCover) !== Boolean(b.isCover)) {
        return a.isCover ? -1 : 1;
      }

      return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
    });
  }

  private getCoverMedia(revision: any) {
    const media = this.sortMedia(revision?.media || []);
    return (
      media.find((item) => item.isCover && item.mediaType === "IMAGE") ||
      media.find((item) => item.mediaType === "IMAGE") ||
      null
    );
  }

  private getRevisionChangeLog(previousRevision: any, nextRevision: any) {
    if (!nextRevision) return [];

    if (!previousRevision) {
      return [
        {
          type: "INITIAL_SUBMISSION",
          label: "Initial submission",
          description: "This is the first submitted version of the advertisement.",
        },
      ];
    }

    const changes: Array<Record<string, unknown>> = [];

    const textFields = [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "shortDescription", label: "Short description" },
      { key: "description", label: "Full description" },
      { key: "serviceDetails", label: "Service details" },
    ];

    for (const field of textFields) {
      const oldValue = this.normalizeDiffValue(previousRevision[field.key]);
      const newValue = this.normalizeDiffValue(nextRevision[field.key]);

      if (oldValue !== newValue) {
        changes.push({
          type: "TEXT_CHANGED",
          field: field.key,
          label: field.label,
          oldValue,
          newValue,
        });
      }
    }

    const oldMedia = this.sortMedia(previousRevision.media || []);
    const newMedia = this.sortMedia(nextRevision.media || []);

    const oldCover = this.getCoverMedia(previousRevision);
    const newCover = this.getCoverMedia(nextRevision);

    if ((oldCover?.url || "") !== (newCover?.url || "")) {
      changes.push({
        type: "THUMBNAIL_CHANGED",
        field: "thumbnail",
        label: "Thumbnail photo",
        oldValue: oldCover ? this.getMediaLabel(oldCover) : "No thumbnail",
        newValue: newCover ? this.getMediaLabel(newCover) : "No thumbnail",
        oldMedia: oldCover
          ? {
              id: oldCover.id,
              mediaType: oldCover.mediaType,
              url: oldCover.url,
              thumbnailUrl: oldCover.thumbnailUrl,
              originalFileName: oldCover.originalFileName,
            }
          : null,
        newMedia: newCover
          ? {
              id: newCover.id,
              mediaType: newCover.mediaType,
              url: newCover.url,
              thumbnailUrl: newCover.thumbnailUrl,
              originalFileName: newCover.originalFileName,
            }
          : null,
      });
    }

    const oldMediaUrls = new Set(oldMedia.map((item) => item.url).filter(Boolean));
    const newMediaUrls = new Set(newMedia.map((item) => item.url).filter(Boolean));

    const addedMedia = newMedia.filter((item) => item.url && !oldMediaUrls.has(item.url));
    const removedMedia = oldMedia.filter((item) => item.url && !newMediaUrls.has(item.url));

    if (addedMedia.length > 0) {
      changes.push({
        type: "MEDIA_ADDED",
        label: "Media added",
        count: addedMedia.length,
        items: addedMedia.map((item) => ({
          id: item.id,
          mediaType: item.mediaType,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          originalFileName: item.originalFileName,
        })),
      });
    }

    if (removedMedia.length > 0) {
      changes.push({
        type: "MEDIA_REMOVED",
        label: "Media removed",
        count: removedMedia.length,
        items: removedMedia.map((item) => ({
          id: item.id,
          mediaType: item.mediaType,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          originalFileName: item.originalFileName,
        })),
      });
    }

    const oldOrder = oldMedia
      .map((item) => item.url)
      .filter(Boolean)
      .join("|");

    const newOrder = newMedia
      .map((item) => item.url)
      .filter(Boolean)
      .join("|");

    if (
      oldOrder &&
      newOrder &&
      oldOrder !== newOrder &&
      addedMedia.length === 0 &&
      removedMedia.length === 0
    ) {
      changes.push({
        type: "MEDIA_REORDERED",
        label: "Media order changed",
        oldValue: oldMedia.map((item) => this.getMediaLabel(item)),
        newValue: newMedia.map((item) => this.getMediaLabel(item)),
      });
    }

    return changes;
  }

  private async canViewRealStaffIdentity(role: AdminRole) {
    const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

    return hasAdminPermission(
      permissions,
      ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
    );
  }

  private mapStaffIdentity(actor: any, canViewRealStaffIdentity = false) {
    if (!actor) {
      return null;
    }

    const fallbackName = String(actor.name || actor.email || "Staff agent").trim();

    if (canViewRealStaffIdentity) {
      return {
        id: actor.id,
        email: actor.email ?? null,
        name: fallbackName,
        role: actor.role ?? null,
        isActive: actor.isActive ?? true,
        displayName: fallbackName,
        displayEmail: actor.email ?? "No email",
        identityVisibility: "real" as const,
      };
    }

    return {
      id: null,
      email: "hidden",
      name: "Staff agent",
      role: null,
      isActive: null,
      displayName: "Staff agent",
      displayEmail: "Hidden",
      identityVisibility: "anonymous" as const,
    };
  }

  private mapStaffAdminId(
    id: string | null | undefined,
    canViewRealStaffIdentity = false,
  ) {
    return canViewRealStaffIdentity ? id ?? null : null;
  }

  private mapAdvertisementRevision(
    revision: any,
    approvedRevision: any,
    canViewRealStaffIdentity = false,
  ) {
    if (!revision) {
      return null;
    }

    const { reviewedBy, ...rest } = revision;

    return {
      ...rest,
      reviewedByAdminUserId: this.mapStaffAdminId(
        revision.reviewedByAdminUserId,
        canViewRealStaffIdentity,
      ),
      reviewedBy: this.mapStaffIdentity(reviewedBy, canViewRealStaffIdentity),
      changeLog:
        revision.status === "PENDING_REVIEW"
          ? this.getRevisionChangeLog(approvedRevision, revision)
          : [],
    };
  }

  private mapAd(ad: any, canViewRealStaffIdentity = false) {
    const currentRevision = this.getCurrentRevision(ad);
    const approvedRevision = this.getApprovedRevision(ad);
    const pendingRevision =
      ad.revisions.find((revision: any) => revision.status === "PENDING_REVIEW") || null;
    const pendingChangeLog = this.getRevisionChangeLog(approvedRevision, pendingRevision);

    return {
      id: ad.id,
      status: ad.status,
      owner: {
        id: ad.owner.id,
        username: ad.owner.username,
        email: ad.owner.email,
        displayName: ad.owner.profile?.displayName || ad.owner.username,
      },
      title: currentRevision?.title || pendingRevision?.title || "Untitled Advertisement",
      category: currentRevision?.category || pendingRevision?.category || "Other",
      shortDescription: currentRevision?.shortDescription || pendingRevision?.shortDescription || "",
      paymentCurrency: ad.paymentCurrency,
      monthlyDiamondPrice: ad.monthlyDiamondPrice,
      monthlyCoinPrice: ad.monthlyCoinPrice,
      currentCycleEndsAt: ad.currentCycleEndsAt?.toISOString?.() ?? null,
      nextBillingAt: ad.nextBillingAt?.toISOString?.() ?? null,
      latestDenialReason: ad.latestDenialReason,
      lastPaymentFailureReason: ad.lastPaymentFailureReason,
      currentRevisionId: ad.currentRevisionId,
      latestSubmittedRevisionId: ad.latestSubmittedRevisionId,
      adminPausedByAdminUserId: this.mapStaffAdminId(
        ad.adminPausedByAdminUserId,
        canViewRealStaffIdentity,
      ),
      currentRevision: this.mapAdvertisementRevision(
        currentRevision,
        approvedRevision,
        canViewRealStaffIdentity,
      ),
      pendingRevision: pendingRevision
        ? {
            ...this.mapAdvertisementRevision(
              pendingRevision,
              approvedRevision,
              canViewRealStaffIdentity,
            ),
            changeLog: pendingChangeLog,
          }
        : null,
      changeLog: pendingChangeLog,
      revisions: ad.revisions.map((revision: any) =>
        this.mapAdvertisementRevision(
          revision,
          approvedRevision,
          canViewRealStaffIdentity,
        ),
      ),
      billingEvents: ad.billingEvents,
      createdAt: ad.createdAt.toISOString(),
      updatedAt: ad.updatedAt.toISOString(),
    };
  }

  async getSettings() {
    const settings = await this.ensureSettings();
    return {
      success: true,
      settings: this.mapSettings(settings),
    };
  }

  async updateSettings(
    adminUserId: string,
    dto: UpdateAdvertisementSettingsDto,
    context: AdminAuditRequestContext,
  ) {
    const before = await this.ensureSettings();

    const data: Prisma.AdvertisementSettingsUpdateInput = {
      ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      ...(dto.monthlyDiamondPrice !== undefined ? { monthlyDiamondPrice: dto.monthlyDiamondPrice } : {}),
      ...(dto.coinToDiamondRate !== undefined ? { coinToDiamondRate: dto.coinToDiamondRate } : {}),
      ...(dto.allowedDurationOptions !== undefined ? { allowedDurationOptions: dto.allowedDurationOptions } : {}),
      ...(dto.allowedPaymentCurrencies !== undefined ? { allowedPaymentCurrencies: dto.allowedPaymentCurrencies } : {}),
      ...(dto.rules !== undefined ? { rules: dto.rules } : {}),
      ...(dto.maxMediaItems !== undefined ? { maxMediaItems: dto.maxMediaItems } : {}),
      ...(dto.maxVideoSeconds !== undefined ? { maxVideoSeconds: dto.maxVideoSeconds } : {}),
      ...(dto.maxTitleLength !== undefined ? { maxTitleLength: dto.maxTitleLength } : {}),
      ...(dto.maxShortDescriptionLength !== undefined ? { maxShortDescriptionLength: dto.maxShortDescriptionLength } : {}),
      ...(dto.maxDescriptionLength !== undefined ? { maxDescriptionLength: dto.maxDescriptionLength } : {}),
      ...(dto.maxServiceDetailsLength !== undefined ? { maxServiceDetailsLength: dto.maxServiceDetailsLength } : {}),
      ...(dto.boostEnabled !== undefined ? { boostEnabled: dto.boostEnabled } : {}),
      ...(dto.boostDurationHours !== undefined ? { boostDurationHours: dto.boostDurationHours } : {}),
      ...(dto.boostDiamondPrice !== undefined ? { boostDiamondPrice: dto.boostDiamondPrice } : {}),
      ...(dto.promoEnabled !== undefined ? { promoEnabled: dto.promoEnabled } : {}),
      ...(dto.promoFreeAdCreation !== undefined ? { promoFreeAdCreation: dto.promoFreeAdCreation } : {}),
      ...(dto.promoLabel !== undefined ? { promoLabel: String(dto.promoLabel || "").trim() || null } : {}),
      ...(dto.promoDiscountType !== undefined ? { promoDiscountType: dto.promoDiscountType } : {}),
      ...(dto.promoDiscountValue !== undefined ? { promoDiscountValue: dto.promoDiscountValue } : {}),
      ...(dto.promoStartsAt !== undefined ? { promoStartsAt: dto.promoStartsAt ? new Date(dto.promoStartsAt) : null } : {}),
      ...(dto.promoEndsAt !== undefined ? { promoEndsAt: dto.promoEndsAt ? new Date(dto.promoEndsAt) : null } : {}),
      updatedByAdminUserId: adminUserId,
    };

    const after = await this.prisma.advertisementSettings.update({
      where: { id: "default" },
      data,
    });

    await this.adminAudit.logEvent({
      actorAdminUserId: adminUserId,
      actionType: AdminAuditActionType.UPDATE,
      actionCode: "advertisement.settings.update",
      actionLabel: "Updated advertisement settings",
      resourceType: "ADVERTISEMENT_SETTINGS",
      resourceId: "default",
      beforeState: this.mapSettings(before),
      afterState: this.mapSettings(after),
      requestPath: context.requestPath,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceLabel: context.deviceLabel,
    });

    return {
      success: true,
      settings: this.mapSettings(after),
    };
  }

  async list(adminRole: AdminRole, query: AdminAdvertisementsQueryDto) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const limit = this.normalizeLimit(query.limit, 50);
    const status = String(query.status || "").trim().toUpperCase();
    const revisionStatus = String(query.revisionStatus || "").trim().toUpperCase();
    const q = String(query.q || "").trim().toLowerCase();

    const where: Prisma.AdvertisementWhereInput = {
      ...(status ? { status: status as AdvertisementStatus } : {}),
      ...(revisionStatus ? {
        revisions: {
          some: {
            status: revisionStatus as AdvertisementRevisionStatus,
          },
        },
      } : {}),
    };

    const rows = await this.prisma.advertisement.findMany({
      where,
      include: {
        owner: { include: { profile: true } },
        revisions: {
          include: { media: true, submittedBy: { include: { profile: true } }, reviewedBy: true },
          orderBy: { createdAt: "desc" },
        },
        billingEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    });

    const items = rows
      .map((ad) => this.mapAd(ad, canViewRealStaffIdentity))
      .filter((ad: any) => {
        if (!q) return true;
        return [
          ad.title,
          ad.category,
          ad.shortDescription,
          ad.owner?.username,
          ad.owner?.email,
          ad.owner?.displayName,
        ]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(q));
      });

    return {
      success: true,
      items,
      advertisements: items,
    };
  }

  async byId(adminRole: AdminRole, id: string) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
      include: {
        owner: { include: { profile: true } },
        revisions: {
          include: { media: true, submittedBy: { include: { profile: true } }, reviewedBy: true },
          orderBy: { createdAt: "desc" },
        },
        billingEvents: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!ad) {
      throw new NotFoundException("Advertisement not found.");
    }

    return {
      success: true,
      advertisement: this.mapAd(ad, canViewRealStaffIdentity),
    };
  }

  async approveRevision(
    adminUserId: string,
    adminRole: AdminRole,
    revisionId: string,
    context: AdminAuditRequestContext,
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const result = await this.prisma.$transaction(async (tx) => {
      const revision = await tx.advertisementRevision.findUnique({
        where: { id: revisionId },
        include: { advertisement: true },
      });

      if (!revision) {
        throw new NotFoundException("Advertisement revision not found.");
      }

      if (revision.status !== AdvertisementRevisionStatus.PENDING_REVIEW) {
        throw new BadRequestException("Only pending revisions can be approved.");
      }

      const ad = revision.advertisement;
      const alreadyHadApprovedContent = !!ad.currentRevisionId;

      await tx.advertisementRevision.update({
        where: { id: revision.id },
        data: {
          status: AdvertisementRevisionStatus.APPROVED,
          reviewedByAdminUserId: adminUserId,
          reviewedAt: new Date(),
        },
      });

      if (ad.currentRevisionId && ad.currentRevisionId !== revision.id) {
        await tx.advertisementRevision.updateMany({
          where: {
            advertisementId: ad.id,
            id: { not: revision.id },
            status: AdvertisementRevisionStatus.APPROVED,
          },
          data: {
            status: AdvertisementRevisionStatus.SUPERSEDED,
          },
        });
      }

      await tx.advertisement.update({
        where: { id: ad.id },
        data: {
          currentRevisionId: revision.id,
          latestSubmittedRevisionId: revision.id,
          latestDenialReason: null,
        },
      });

      if (!alreadyHadApprovedContent) {
        try {
          await this.advertisements.activateApprovedAdvertisement(
            tx,
            ad.id,
            AdvertisementBillingEventType.INITIAL_CHARGE,
          );
        } catch {
          // activateApprovedAdvertisement already stores PAYMENT_FAILED and a billing failure event.
        }
      }

      return tx.advertisement.findUniqueOrThrow({
        where: { id: ad.id },
        include: {
          owner: { include: { profile: true } },
          revisions: {
            include: { media: true, submittedBy: { include: { profile: true } }, reviewedBy: true },
            orderBy: { createdAt: "desc" },
          },
          billingEvents: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      });
    });

    await this.adminAudit.logEvent({
      actorAdminUserId: adminUserId,
      actionType: AdminAuditActionType.STATUS_CHANGE,
      actionCode: "advertisement.revision.approve",
      actionLabel: "Approved advertisement revision",
      resourceType: "ADVERTISEMENT_REVISION",
      resourceId: revisionId,
      target: {
        id: result.id,
        name: this.mapAd(result, true).title,
        type: "ADVERTISEMENT",
      },
      references: {
        targetUserId: result.ownerUserId,
      },
      metadata: {
        advertisementId: result.id,
        revisionId,
        status: result.status,
      },
      requestPath: context.requestPath,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceLabel: context.deviceLabel,
    });

    return {
      success: true,
      advertisement: this.mapAd(result, canViewRealStaffIdentity),
    };
  }

  async denyRevision(
    adminUserId: string,
    adminRole: AdminRole,
    revisionId: string,
    reason: string,
    context: AdminAuditRequestContext,
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const normalizedReason = String(reason || "").trim();

    if (!normalizedReason) {
      throw new BadRequestException("Denial reason is required.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const revision = await tx.advertisementRevision.findUnique({
        where: { id: revisionId },
        include: { advertisement: true },
      });

      if (!revision) {
        throw new NotFoundException("Advertisement revision not found.");
      }

      if (revision.status !== AdvertisementRevisionStatus.PENDING_REVIEW) {
        throw new BadRequestException("Only pending revisions can be denied.");
      }

      await tx.advertisementRevision.update({
        where: { id: revision.id },
        data: {
          status: AdvertisementRevisionStatus.DENIED,
          reviewedByAdminUserId: adminUserId,
          reviewedAt: new Date(),
          denialReason: normalizedReason,
        },
      });

      await tx.advertisement.update({
        where: { id: revision.advertisementId },
        data: {
          latestDenialReason: normalizedReason,
          status: revision.advertisement.currentRevisionId
            ? revision.advertisement.status
            : AdvertisementStatus.DENIED,
        },
      });

      return tx.advertisement.findUniqueOrThrow({
        where: { id: revision.advertisementId },
        include: {
          owner: { include: { profile: true } },
          revisions: {
            include: { media: true, submittedBy: { include: { profile: true } }, reviewedBy: true },
            orderBy: { createdAt: "desc" },
          },
          billingEvents: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      });
    });

    await this.adminAudit.logEvent({
      actorAdminUserId: adminUserId,
      actionType: AdminAuditActionType.STATUS_CHANGE,
      actionCode: "advertisement.revision.deny",
      actionLabel: "Denied advertisement revision",
      resourceType: "ADVERTISEMENT_REVISION",
      resourceId: revisionId,
      severity: AdminAuditSeverity.WARNING,
      target: {
        id: result.id,
        name: this.mapAd(result, true).title,
        type: "ADVERTISEMENT",
      },
      references: {
        targetUserId: result.ownerUserId,
      },
      metadata: {
        advertisementId: result.id,
        revisionId,
        reason: normalizedReason,
      },
      requestPath: context.requestPath,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceLabel: context.deviceLabel,
    });

    return {
      success: true,
      advertisement: this.mapAd(result, canViewRealStaffIdentity),
    };
  }

  async pauseAdvertisement(
    adminUserId: string,
    adminRole: AdminRole,
    id: string,
    reason: string,
    context: AdminAuditRequestContext,
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const normalizedReason = String(reason || "").trim();

    if (!normalizedReason) {
      throw new BadRequestException("Pause/takedown reason is required.");
    }

    const before = await this.prisma.advertisement.findUnique({
      where: { id },
    });

    if (!before) {
      throw new NotFoundException("Advertisement not found.");
    }

    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: {
        status: AdvertisementStatus.ADMIN_PAUSED,
        adminPausedAt: new Date(),
        adminPausedByAdminUserId: adminUserId,
        adminPauseReason: normalizedReason,
        nextBillingAt: null,
      },
      include: {
        owner: { include: { profile: true } },
        revisions: {
          include: { media: true, submittedBy: { include: { profile: true } }, reviewedBy: true },
          orderBy: { createdAt: "desc" },
        },
        billingEvents: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    await this.adminAudit.logEvent({
      actorAdminUserId: adminUserId,
      actionType: AdminAuditActionType.MODERATION_ACTION,
      actionCode: "advertisement.pause",
      actionLabel: "Paused advertisement",
      resourceType: "ADVERTISEMENT",
      resourceId: id,
      severity: AdminAuditSeverity.WARNING,
      references: {
        targetUserId: updated.ownerUserId,
      },
      beforeState: before,
      afterState: {
        status: updated.status,
        adminPauseReason: updated.adminPauseReason,
      },
      metadata: {
        reason: normalizedReason,
      },
      requestPath: context.requestPath,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceLabel: context.deviceLabel,
    });

    return {
      success: true,
      advertisement: this.mapAd(updated, canViewRealStaffIdentity),
    };
  }

  async resumeAdvertisement(
    adminUserId: string,
    adminRole: AdminRole,
    id: string,
    context: AdminAuditRequestContext,
  ) {
    const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
    });

    if (!ad) throw new NotFoundException("Advertisement not found.");
    if (!ad.currentRevisionId) {
      throw new BadRequestException("Advertisement has no approved content to resume.");
    }

    const nextStatus = ad.currentCycleEndsAt && ad.currentCycleEndsAt > new Date()
      ? AdvertisementStatus.LIVE
      : AdvertisementStatus.INACTIVE;

    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: {
        status: nextStatus,
        adminPausedAt: null,
        adminPausedByAdminUserId: null,
        adminPauseReason: null,
        nextBillingAt: nextStatus === AdvertisementStatus.LIVE && !ad.cancelAtCycleEnd
          ? ad.currentCycleEndsAt
          : null,
      },
      include: {
        owner: { include: { profile: true } },
        revisions: {
          include: { media: true, submittedBy: { include: { profile: true } }, reviewedBy: true },
          orderBy: { createdAt: "desc" },
        },
        billingEvents: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    await this.adminAudit.logEvent({
      actorAdminUserId: adminUserId,
      actionType: AdminAuditActionType.STATUS_CHANGE,
      actionCode: "advertisement.resume",
      actionLabel: "Resumed advertisement",
      resourceType: "ADVERTISEMENT",
      resourceId: id,
      references: {
        targetUserId: updated.ownerUserId,
      },
      metadata: {
        status: updated.status,
      },
      requestPath: context.requestPath,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceLabel: context.deviceLabel,
    });

    return {
      success: true,
      advertisement: this.mapAd(updated, canViewRealStaffIdentity),
    };
  }
}

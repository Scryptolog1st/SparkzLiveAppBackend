// backend/src/modules/economy/economy.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  CoinLotStatus,
  GiftMediaType,
  LedgerEntryType,
  Prisma,
  StreamerEarningStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { BattlesService } from "../battles/battles.service";
import { MilestonesService } from "../milestones/milestones.service";
import { NotificationsService } from "../notifications/notifications.service";

export type SendGiftParams = {
  streamId: string;
  senderUserId: string;
  recipientUserId: string;
  giftId: string;
  idempotencyKey?: string;
  quantity?: number;
  battleSideId?: string;

  // optional: tolerate older controller code that tried to pass this
  senderUsername?: string;
};

type GiftUserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type LockedCoinLotRow = {
  id: string;
  coins_remaining: number;
  provider_available_on: Date | null;
  created_at: Date;
};

type CreatedGiftCoinSource = {
  id: string;
  coinLotId: string;
  coinsUsed: number;
  providerAvailableOn: Date | null;
};

type CreatorEarningsConfig = {
  diamondToCentsRate: number;
  platformFeeBps: number;
  defaultHoldDays: number;
  establishedStreamerHoldDays: number;
  largeGiftCoinThreshold: number;
  largeGiftExtraHoldDays: number;
};

const GIFT_TRANSACTION_MAX_RETRIES = 5;
const GIFT_TRANSACTION_RETRY_BASE_DELAY_MS = 25;
const GIFT_TRANSACTION_RETRY_MAX_DELAY_MS = 250;
const GIFT_TRANSACTION_RETRY_JITTER_MS = 25;
const MAX_GIFT_SEND_QUANTITY = 100;
const COIN_LOT_LOCK_BATCH_SIZE = 32;

function isRetryableGiftTransactionError(error: unknown) {
  const code = String((error as any)?.code || '').trim();
  const message = String((error as any)?.message || '').toLowerCase();

  return (
    code === 'P2034' ||
    (
      message.includes('transaction failed') &&
      (
        message.includes('write conflict') ||
        message.includes('deadlock')
      )
    )
  );
}

function getGiftTransactionRetryDelayMs(attempt: number) {
  const exponentialDelay = GIFT_TRANSACTION_RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * GIFT_TRANSACTION_RETRY_JITTER_MS);

  return Math.min(GIFT_TRANSACTION_RETRY_MAX_DELAY_MS, exponentialDelay + jitter);
}

function sleepGiftTransactionRetry(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class EconomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly realtime: RealtimeGateway,
    private readonly battles: BattlesService,
    private readonly milestones: MilestonesService,
    private readonly notifications: NotificationsService,
  ) { }

  // --- Catalog seed (dev-friendly) ---
  private readonly seedCatalog = [
    {
      id: "rose",
      name: "Rose",
      diamondValue: 10,
      coinCost: 10,
      mediaUrl: "/gifts/rose.png",
      mediaType: "IMAGE" as GiftMediaType,
      isBigGift: false,
    },
    {
      id: "crown_goat",
      name: "Crowned Goat",
      diamondValue: 250,
      coinCost: 250,
      mediaUrl: "/gifts/crowned-goat.gif",
      mediaType: "GIF" as GiftMediaType,
      isBigGift: false,
    },
    {
      id: "dragon_egg",
      name: "Dragon Egg Hatch",
      diamondValue: 5000,
      coinCost: 5000,
      mediaUrl: "/gifts/dragon-egg.mp4",
      mediaType: "VIDEO" as GiftMediaType,
      isBigGift: true,
    },
    {
      id: "galaxy",
      name: "Galaxy",
      diamondValue: 1_000_000,
      coinCost: 1_000_000,
      mediaUrl: "/gifts/galaxy.mp4",
      mediaType: "VIDEO" as GiftMediaType,
      isBigGift: true,
    },
  ];

  private mediaTypeToDto(mt: GiftMediaType): "video" | "lottie" | "gif" | "image" {
    switch (mt) {
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

  private effectSizeToDto(value?: string | null): "small" | "medium" | "large" | "extra_large" {
    const normalized = String(value || "").trim().toUpperCase();

    switch (normalized) {
      case "SMALL":
        return "small";
      case "LARGE":
        return "large";
      case "EXTRA_LARGE":
        return "extra_large";
      case "MEDIUM":
      default:
        return "medium";
    }
  }

  private userSummary(user: any): GiftUserSummary {
    const displayName =
      typeof user?.profile?.displayName === "string"
        ? user.profile.displayName.trim()
        : "";

    return {
      id: user.id,
      username: user.username,
      displayName: displayName || user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
    };
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = String(value || "").trim();
    return normalized ? normalized : null;
  }

  private normalizeGiftQuantity(value?: number | string | null) {
    const raw = value ?? 1;
    const quantity = Number(raw);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException("Gift quantity must be a positive whole number.");
    }

    if (quantity > MAX_GIFT_SEND_QUANTITY) {
      throw new BadRequestException(`Gift quantity cannot exceed ${MAX_GIFT_SEND_QUANTITY}.`);
    }

    return quantity;
  }

  private assertIdempotentGiftMatches(
    existing: {
      streamId: string | null;
      recipientUserId: string;
      giftId: string;
    },
    expected: {
      streamId: string;
      recipientUserId: string;
      giftId: string;
    },
  ) {
    if (
      (existing.streamId ?? null) !== expected.streamId ||
      existing.recipientUserId !== expected.recipientUserId ||
      existing.giftId !== expected.giftId
    ) {
      throw new BadRequestException(
        "Idempotency key was already used for a different gift request.",
      );
    }
  }

  private addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  private maxDate(a: Date, b: Date) {
    return a.getTime() >= b.getTime() ? a : b;
  }

  private splitProportionally(total: number, parts: number[]) {
    const sum = parts.reduce((acc, value) => acc + value, 0);

    if (sum <= 0) {
      throw new BadRequestException("Cannot split by zero total.");
    }

    let allocated = 0;

    return parts.map((part, index) => {
      if (index === parts.length - 1) {
        return total - allocated;
      }

      const value = Math.floor((total * part) / sum);
      allocated += value;
      return value;
    });
  }

  private async ensureCatalogSeeded() {
    const count = await this.prisma.gift.count();
    if (count > 0) return;

    for (const g of this.seedCatalog) {
      await this.prisma.gift.upsert({
        where: { id: g.id },
        create: g,
        update: g,
      });
    }
  }

  private async ensureWallet(userId: string) {
    return this.prisma.wallet.upsert({
      where: { userId },
      create: {
        userId,
        coins: 0,
        diamondsEarned: 0,
      },
      update: {},
    });
  }

  private async getCreatorEarningsConfig(
    tx: Prisma.TransactionClient,
  ): Promise<CreatorEarningsConfig> {
    const row = await tx.appConfig.findUnique({
      where: { key: "creator_earnings" },
    });

    const value = row?.valueJson as
      | {
        diamondToCentsRate?: number;
        platformFeeBps?: number;
        defaultHoldDays?: number;
        establishedStreamerHoldDays?: number;
        largeGiftCoinThreshold?: number;
        largeGiftExtraHoldDays?: number;
      }
      | undefined;

    return {
      diamondToCentsRate: Number(value?.diamondToCentsRate ?? 1),
      platformFeeBps: Number(value?.platformFeeBps ?? 0),
      defaultHoldDays: Number(value?.defaultHoldDays ?? 7),
      establishedStreamerHoldDays: Number(value?.establishedStreamerHoldDays ?? 4),
      largeGiftCoinThreshold: Number(value?.largeGiftCoinThreshold ?? 10_000),
      largeGiftExtraHoldDays: Number(value?.largeGiftExtraHoldDays ?? 14),
    };
  }

  private async getCreatorEarningsSummary(userId: string) {
    const grouped = await this.prisma.streamerEarning.groupBy({
      by: ["status"],
      where: {
        streamerUserId: userId,
      },
      _sum: {
        diamondsEarned: true,
        streamerAmountCents: true,
      },
    });

    const values: Record<string, { diamonds: number; amountCents: number }> = {
      PENDING: { diamonds: 0, amountCents: 0 },
      AVAILABLE: { diamonds: 0, amountCents: 0 },
      LOCKED: { diamonds: 0, amountCents: 0 },
      PAID: { diamonds: 0, amountCents: 0 },
      REVERSED: { diamonds: 0, amountCents: 0 },
    };

    for (const row of grouped) {
      values[row.status] = {
        diamonds: Number(row._sum.diamondsEarned ?? 0),
        amountCents: Number(row._sum.streamerAmountCents ?? 0),
      };
    }

    return {
      pendingDiamonds: values.PENDING.diamonds,
      pendingAmountCents: values.PENDING.amountCents,

      availableDiamonds: values.AVAILABLE.diamonds,
      availableAmountCents: values.AVAILABLE.amountCents,

      lockedDiamonds: values.LOCKED.diamonds,
      lockedAmountCents: values.LOCKED.amountCents,

      paidDiamonds: values.PAID.diamonds,
      paidAmountCents: values.PAID.amountCents,

      reversedDiamonds: values.REVERSED.diamonds,
      reversedAmountCents: values.REVERSED.amountCents,
    };
  }

  private async getGiftCatalogMetadata() {
    const [total, enabled, latest] = await Promise.all([
      this.prisma.gift.count(),
      (this.prisma.gift as any).count({ where: { isEnabled: true } }),
      (this.prisma.gift as any).findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

    const updatedAt =
      latest?.updatedAt instanceof Date
        ? latest.updatedAt.toISOString()
        : new Date(0).toISOString();

    return {
      version: `${updatedAt}:${total}:${enabled}`,
      updatedAt,
    };
  }

  async getCatalog() {
    await this.ensureCatalogSeeded();

    const [metadata, rows] = await Promise.all([
      this.getGiftCatalogMetadata(),
      (this.prisma.gift as any).findMany({
        where: { isEnabled: true },
      include: { giftCategory: true },
        orderBy: [{ coinCost: "asc" }, { name: "asc" }],
      }),
    ]);

    const items = rows.map((g: any) => ({
      id: g.id,
      name: g.name,
      diamondValue: g.diamondValue,
      coinCost: g.coinCost,
      mediaUrl: g.mediaUrl,
      mediaType: this.mediaTypeToDto(g.mediaType),
      isBigGift: g.isBigGift,
      effectSize: this.effectSizeToDto(g.effectSize ?? (g.isBigGift ? "LARGE" : "MEDIUM")),
      categoryId: (g as any).giftCategoryId ?? (g as any).giftCategory?.id ?? null,
      categoryName: (g as any).giftCategory?.name ?? "Featured",
      categorySlug: (g as any).giftCategory?.slug ?? "featured",
      category: (g as any).giftCategory?.name ?? "Featured",
      giftCategory: (g as any).giftCategory
        ? {
            id: (g as any).giftCategory.id,
            name: (g as any).giftCategory.name,
            slug: (g as any).giftCategory.slug,
            description: (g as any).giftCategory.description ?? null,
            sortOrder: Number((g as any).giftCategory.sortOrder ?? 0),
            isEnabled: Boolean((g as any).giftCategory.isEnabled ?? true),
          }
        : null,
    }));

    return {
      ...metadata,
      items,
      total: items.length,
    };
  }

  // Back-compat with earlier controller naming
  async getMyWallet(userId: string) {
    return this.getWallet(userId);
  }

  async getWallet(userId: string) {
    await this.users.findByIdWithProfile(userId);
    const wallet = await this.ensureWallet(userId);
    const creatorEarnings = await this.getCreatorEarningsSummary(userId);

    return {
      userId: wallet.userId,
      coins: wallet.coins,
      diamondsEarned: wallet.diamondsEarned,
      creatorEarnings,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  private async requireLiveStream(streamId: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException("Stream not found");
    if (stream.status !== "LIVE") throw new ForbiddenException("Stream is not live");
    return stream;
  }

  private async requireActiveParticipantOrHost(streamId: string, userId: string) {
    const stream = await this.requireLiveStream(streamId);
    if (stream.hostUserId === userId) return { stream, role: "HOST" as const };

    const p = await this.prisma.streamParticipant.findFirst({
      where: { streamId, userId, leftAt: null },
      select: { role: true },
    });
    if (!p) throw new ForbiddenException("Join stream first");
    return { stream, role: p.role };
  }

  private async requireRecipientInStream(streamId: string, recipientUserId: string) {
    const p = await this.prisma.streamParticipant.findFirst({
      where: { streamId, userId: recipientUserId, leftAt: null },
      select: { id: true },
    });
    if (!p) throw new BadRequestException("Recipient must be in the stream");
  }

  private async consumeCoinLotsForGift(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      giftTxId: string;
      coinCost: number;
    },
  ): Promise<CreatedGiftCoinSource[]> {
    let remaining = params.coinCost;
    let cursor: { createdAt: Date; id: string } | null = null;

    const selected: Array<{
      coinLotId: string;
      coinsUsed: number;
      providerAvailableOn: Date | null;
    }> = [];

    while (remaining > 0) {
      let rows: LockedCoinLotRow[];

      if (cursor) {
        rows = await tx.$queryRaw<LockedCoinLotRow[]>`
          SELECT id, coins_remaining, provider_available_on, created_at
          FROM coin_lots
          WHERE user_id = ${params.userId}::uuid
            AND status = 'AVAILABLE'
            AND coins_remaining > 0
            AND (created_at, id) > (${cursor.createdAt}, ${cursor.id}::uuid)
          ORDER BY created_at ASC, id ASC
          LIMIT ${COIN_LOT_LOCK_BATCH_SIZE}
          FOR UPDATE
        `;
      } else {
        rows = await tx.$queryRaw<LockedCoinLotRow[]>`
          SELECT id, coins_remaining, provider_available_on, created_at
          FROM coin_lots
          WHERE user_id = ${params.userId}::uuid
            AND status = 'AVAILABLE'
            AND coins_remaining > 0
          ORDER BY created_at ASC, id ASC
          LIMIT ${COIN_LOT_LOCK_BATCH_SIZE}
          FOR UPDATE
        `;
      }

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        cursor = {
          createdAt: row.created_at,
          id: row.id,
        };

        if (remaining <= 0) break;

        const useCoins = Math.min(Number(row.coins_remaining), remaining);

        if (!Number.isFinite(useCoins) || useCoins <= 0) {
          continue;
        }

        const updated = await tx.coinLot.updateMany({
          where: {
            id: row.id,
            status: CoinLotStatus.AVAILABLE,
            coinsRemaining: { gte: useCoins },
          },
          data: {
            coinsRemaining: {
              decrement: useCoins,
            },
          },
        });

        if (updated.count !== 1) {
          throw new BadRequestException("Coin lot changed during gift transaction.");
        }

        selected.push({
          coinLotId: row.id,
          coinsUsed: useCoins,
          providerAvailableOn: row.provider_available_on,
        });

        remaining -= useCoins;
      }

      if (rows.length < COIN_LOT_LOCK_BATCH_SIZE) {
        break;
      }
    }

    if (remaining > 0) {
      throw new ForbiddenException("Insufficient available coin lots.");
    }

    const createdSources: CreatedGiftCoinSource[] = selected.map((source) => ({
      id: randomUUID(),
      coinLotId: source.coinLotId,
      coinsUsed: source.coinsUsed,
      providerAvailableOn: source.providerAvailableOn,
    }));

    if (createdSources.length > 0) {
      await tx.giftCoinSource.createMany({
        data: createdSources.map((source) => ({
          id: source.id,
          giftTxId: params.giftTxId,
          coinLotId: source.coinLotId,
          coinsUsed: source.coinsUsed,
        })),
      });
    }

    return createdSources;
  }

  private async createStreamerEarningsForGift(
    tx: Prisma.TransactionClient,
    params: {
      streamerUserId: string;
      giftTxId: string;
      totalCoins: number;
      totalDiamonds: number;
      giftCoinSources: CreatedGiftCoinSource[];
    },
  ) {
    const config = await this.getCreatorEarningsConfig(tx);

    const grossAmountCents = Math.round(
      params.totalDiamonds * config.diamondToCentsRate,
    );

    const platformFeeCents = Math.floor(
      (grossAmountCents * config.platformFeeBps) / 10_000,
    );

    const streamerAmountCents = grossAmountCents - platformFeeCents;

    const coinParts = params.giftCoinSources.map((source) => source.coinsUsed);

    const diamondSplits = this.splitProportionally(params.totalDiamonds, coinParts);
    const grossSplits = this.splitProportionally(grossAmountCents, coinParts);
    const feeSplits = this.splitProportionally(platformFeeCents, coinParts);
    const streamerSplits = this.splitProportionally(streamerAmountCents, coinParts);

    const now = new Date();

    const holdDays =
      params.totalCoins >= config.largeGiftCoinThreshold
        ? config.largeGiftExtraHoldDays
        : config.defaultHoldDays;

    const holdUntil = this.addDays(now, holdDays);

    await tx.streamerEarning.createMany({
      data: params.giftCoinSources.map((source, index) => {
        const providerAvailableOn = source.providerAvailableOn ?? now;
        const availableAt = this.maxDate(providerAvailableOn, holdUntil);

        return {
          streamerUserId: params.streamerUserId,
          giftTxId: params.giftTxId,
          giftCoinSourceId: source.id,

          diamondsEarned: diamondSplits[index],
          coinsSourceUsed: source.coinsUsed,

          grossAmountCents: grossSplits[index],
          platformFeeCents: feeSplits[index],
          streamerAmountCents: streamerSplits[index],

          providerAvailableOn,
          holdUntil,
          availableAt,

          status: StreamerEarningStatus.PENDING,

          metadataJson: {
            splitIndex: index,
            splitCount: params.giftCoinSources.length,
            totalGiftCoins: params.totalCoins,
            totalGiftDiamonds: params.totalDiamonds,
            holdDays,
          },
        };
      }),
    });
  }


  private readonly giftBattleScoringStatusesV2 = [
    "ACTIVE",
    "SUDDEN_DEATH",
    "REMATCH_ACTIVE",
  ];

  private getAllowedBattleGiftRecipientUserIdsV2(side: any) {
    const ids = new Set<string>();

    if (typeof side?.hostUserId === "string") {
      ids.add(side.hostUserId);
    }

    for (const participant of side?.participants || []) {
      if (
        typeof participant?.userId === "string" &&
        participant?.status === "ACCEPTED" &&
        !participant?.leftAt
      ) {
        ids.add(participant.userId);
      }
    }

    return ids;
  }

  private async resolveBattleGiftTargetForSendV2(params: {
    streamId: string;
    senderUserId: string;
    recipientUserId: string;
    battleSideId: string;
  }) {
    const { streamId, recipientUserId, battleSideId } = params;

    const side = await (this.prisma as any).battleSide.findFirst({
      where: {
        id: battleSideId,
        battle: {
          status: { in: this.giftBattleScoringStatusesV2 },
          sides: {
            some: {
              streamId,
            },
          },
        },
      },
      include: {
        participants: true,
        battle: {
          include: {
            sides: {
              include: {
                participants: true,
              },
            },
          },
        },
      },
    });

    if (!side) {
      throw new BadRequestException("Selected battle side is not active for this stream");
    }

    const battle = side.battle;
    const endsAtMs = battle?.endsAt ? new Date(battle.endsAt).getTime() : null;

    if (!endsAtMs || !Number.isFinite(endsAtMs) || endsAtMs <= Date.now()) {
      throw new BadRequestException("Battle is not accepting gifts");
    }

    // BATTLE_STAGE5V_BLOCK_GIFTS_DURING_SUDDEN_DEATH_INTERMISSION
    // SUDDEN_DEATH uses a 40 second window: first 10 seconds are visual countdown,
    // final 30 seconds accept sudden-death gifts.
    if (String(battle?.status || "").toUpperCase() === "SUDDEN_DEATH") {
      const remainingMs = endsAtMs - Date.now();

      if (remainingMs > 30_000) {
        throw new BadRequestException("Sudden death is starting. Gifts unlock when the countdown ends.");
      }
    }

    const allowedRecipientUserIds = this.getAllowedBattleGiftRecipientUserIdsV2(side);

    if (!allowedRecipientUserIds.has(recipientUserId)) {
      throw new BadRequestException("Gift recipient is not on the selected battle side");
    }

    return {
      battleId: side.battleId,
      sideId: side.id,
      battleStatus: battle.status,
      targetStreamId: typeof side.streamId === "string" ? side.streamId : null,
      sourceStreamId: streamId,
    };
  }

  private async recordBattleGiftContributionAfterSendV2(params: {
    battleTarget: { battleId: string; sideId: string; targetStreamId?: string | null; sourceStreamId?: string | null } | null;
    actorUserId: string;
    giftTxId: string;
  }) {
    if (!params.battleTarget) {
      return null;
    }

    return this.battles.recordBattleGiftContributionV2({
      battleSessionId: params.battleTarget.battleId,
      sideId: params.battleTarget.sideId,
      actorUserId: params.actorUserId,
      giftTxId: params.giftTxId,
    });
  }

  // BATTLE_STAGE5T_MIRROR_BATTLE_GIFT_TO_TARGET_STREAM_FINAL_RESUME
  private async mirrorBattleGiftToTargetStreamV2(params: {
    sourceStreamId: string;
    targetStreamId?: string | null;
    battleSideId?: string | null;
    txResult: any;
    senderUserId: string;
    recipientUserId: string;
  }) {
    const sourceStreamId = String(params.sourceStreamId || "").trim();
    const targetStreamId = String(params.targetStreamId || "").trim();

    if (!sourceStreamId || !targetStreamId || sourceStreamId === targetStreamId) {
      return;
    }

    const txResult = params.txResult || {};
    const giftTx = txResult.giftTx || {};
    const gift = txResult.gift || giftTx.gift || {};
    const txId = String(giftTx.id || txResult.txId || "").trim();

    if (!txId) {
      return;
    }

    const [sender, recipient] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: params.senderUserId },
        include: { profile: true },
      }),
      this.prisma.user.findUnique({
        where: { id: params.recipientUserId },
        include: { profile: true },
      }),
    ]);

    if (!sender || !recipient) {
      return;
    }

    const senderSummary = this.userSummary(sender);
    const recipientSummary = this.userSummary(recipient);
    const giftName = String(gift.name || gift.giftName || "a gift").trim();
    const quantity = Math.max(1, Number(txResult.quantity || giftTx.quantity || 1) || 1);
    const quantityText = quantity > 1 ? ` x${quantity}` : "";
    const battleSideId = String(params.battleSideId || "").trim();
    const sentAt = giftTx.createdAt instanceof Date ? giftTx.createdAt : new Date();

    const payload = {
      streamId: targetStreamId,
      sourceStreamId,
      mirroredFromStreamId: sourceStreamId,
      battleSideId: battleSideId || undefined,
      txId,
      giftTxId: txId,
      id: txId,
      quantity,
      giftId: gift.id || giftTx.giftId || undefined,
      giftName,
      gift: {
        id: gift.id || giftTx.giftId || undefined,
        name: giftName,
        imageUrl: gift.imageUrl,
        mediaUrl: gift.mediaUrl,
        thumbnailUrl: gift.thumbnailUrl,
        animationUrl: gift.animationUrl,
        mediaType: gift.mediaType ? this.mediaTypeToDto(gift.mediaType) : undefined,
        coinCost: gift.coinCost,
        diamondValue: gift.diamondValue,
      },
      sender: senderSummary,
      recipient: recipientSummary,
      senderUserId: senderSummary.id,
      recipientUserId: recipientSummary.id,
      senderDisplayName: senderSummary.displayName,
      recipientDisplayName: recipientSummary.displayName,
      text: `${senderSummary.displayName} sent ${recipientSummary.displayName} ${giftName}${quantityText}!`,
      message: `${senderSummary.displayName} sent ${recipientSummary.displayName} ${giftName}${quantityText}!`,
      coinCost: giftTx.coinCost ?? txResult.totalCoinCost,
      diamondValue: giftTx.diamondValue ?? txResult.totalDiamondValue,
      totalCoinCost: giftTx.coinCost ?? txResult.totalCoinCost,
      totalDiamondValue: giftTx.diamondValue ?? txResult.totalDiamondValue,
      isBigGift: !!(gift.isBigGift || Number(giftTx.diamondValue || 0) >= 1000),
      createdAt: sentAt.toISOString(),
      sentAt: sentAt.toISOString(),
      animationStartAt: new Date(sentAt.getTime() + 1000).toISOString(),
      displayAt: new Date(sentAt.getTime() + 1000).toISOString(),
      scheduledStartAt: new Date(sentAt.getTime() + 1000).toISOString(),
      mediaUrl: gift.mediaUrl,
      imageUrl: gift.imageUrl,
      thumbnailUrl: gift.thumbnailUrl,
      animationUrl: gift.animationUrl,
      mediaType: gift.mediaType ? this.mediaTypeToDto(gift.mediaType) : undefined,
    };

    const dedupeKey = `gift:${txId}:battle-target:${targetStreamId}`;
    const realtimeAny: any = this.realtime as any;

    if (typeof realtimeAny.emitGiftSent === "function") {
      await realtimeAny.emitGiftSent(payload, {
        streamId: targetStreamId,
        dedupeKey,
      });
      return;
    }

    if (typeof realtimeAny.emitToStream === "function") {
      await realtimeAny.emitToStream(targetStreamId, "gift.sent", payload, {
        dedupeKey,
      });
      return;
    }

    if (typeof realtimeAny.emitStreamEvent === "function") {
      await realtimeAny.emitStreamEvent(targetStreamId, "gift.sent", payload, {
        dedupeKey,
      });
      return;
    }

    if (typeof realtimeAny.emitToRoom === "function") {
      await realtimeAny.emitToRoom(`stream:${targetStreamId}`, "gift.sent", payload);
      return;
    }

    if (typeof realtimeAny.server?.to === "function") {
      realtimeAny.server.to(`stream:${targetStreamId}`).emit("gift.sent", payload);
    }
  }

  async sendGift(input: SendGiftParams) {
    const { streamId, senderUserId, recipientUserId, giftId } = input;
    const idempotencyKey = this.normalizeOptionalString(input.idempotencyKey);
    const quantity = this.normalizeGiftQuantity(input.quantity);
    const battleSideId = this.normalizeOptionalString(input.battleSideId);

    if (!streamId || !senderUserId || !recipientUserId || !giftId) {
      throw new BadRequestException("Missing required fields");
    }
    if (senderUserId === recipientUserId) {
      throw new BadRequestException("Cannot gift yourself");
    }

    await this.requireActiveParticipantOrHost(streamId, senderUserId);

    await this.users.findByIdWithProfile(recipientUserId);

    const battleGiftTarget = battleSideId
      ? await this.resolveBattleGiftTargetForSendV2({
        streamId,
        senderUserId,
        recipientUserId,
        battleSideId,
      })
      : null;

    if (!battleGiftTarget) {
      await this.requireRecipientInStream(streamId, recipientUserId);
    }

    if (idempotencyKey) {
      const existing = await this.prisma.giftTransaction.findUnique({
        where: {
          senderUserId_idempotencyKey: {
            senderUserId,
            idempotencyKey,
          },
        },
        include: {
          gift: true,
        },
      });

      if (existing) {
        this.assertIdempotentGiftMatches(existing, {
          streamId,
          recipientUserId,
          giftId,
        });

        const senderWallet = await this.ensureWallet(senderUserId);
        const battleContribution = await this.recordBattleGiftContributionAfterSendV2({
          battleTarget: battleGiftTarget,
          actorUserId: senderUserId,
          giftTxId: existing.id,
        });

        return {
          ok: true as const,
          idempotent: true,
          txId: existing.id,
          quantity,
          totalCoinCost: existing.coinCost,
          totalDiamondValue: existing.diamondValue,
          battleContribution,
          senderWallet: {
            userId: senderWallet.userId,
            coins: senderWallet.coins,
            diamondsEarned: senderWallet.diamondsEarned,
            creatorEarnings: await this.getCreatorEarningsSummary(senderUserId),
            updatedAt: senderWallet.updatedAt.toISOString(),
          },
        };
      }
    }

    await this.ensureWallet(senderUserId);
    await this.ensureWallet(recipientUserId);

        let txResult: any;

    for (let giftTxAttempt = 1; giftTxAttempt <= GIFT_TRANSACTION_MAX_RETRIES; giftTxAttempt += 1) {
      try {
        txResult = await this.prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const existing = await tx.giftTransaction.findUnique({
            where: {
              senderUserId_idempotencyKey: {
                senderUserId,
                idempotencyKey,
              },
            },
            include: {
              gift: true,
            },
          });

          if (existing) {
            this.assertIdempotentGiftMatches(existing, {
              streamId,
              recipientUserId,
              giftId,
            });

            const senderWallet = await tx.wallet.findUnique({
              where: { userId: senderUserId },
            });

            if (!senderWallet) {
              throw new Error("Sender wallet missing for idempotent gift response");
            }

            return {
              reused: true as const,
              gift: existing.gift,
              giftTx: existing,
              senderWallet,
              recipientWallet: null,
              quantity,
              totalCoinCost: existing.coinCost,
              totalDiamondValue: existing.diamondValue,
            };
          }
        }

        const gift = await (tx.gift as any).findUnique({ where: { id: giftId } });
        if (!gift || gift.isEnabled === false) throw new NotFoundException("Gift not found");

        const totalCoinCost = gift.coinCost * quantity;
        const totalDiamondValue = gift.diamondValue * quantity;

        const debited = await tx.wallet.updateMany({
          where: { userId: senderUserId, coins: { gte: totalCoinCost } },
          data: { coins: { decrement: totalCoinCost } },
        });

        if (debited.count !== 1) {
          throw new ForbiddenException("Insufficient coins");
        }

        const giftTx = await tx.giftTransaction.create({
          data: {
            id: randomUUID(),
            streamId,
            giftId: gift.id,
            senderUserId,
            recipientUserId,
            idempotencyKey,
            coinCost: totalCoinCost,
            diamondValue: totalDiamondValue,
          },
        });

        const coinSources = await this.consumeCoinLotsForGift(tx, {
          userId: senderUserId,
          giftTxId: giftTx.id,
          coinCost: totalCoinCost,
        });

        await this.createStreamerEarningsForGift(tx, {
          streamerUserId: recipientUserId,
          giftTxId: giftTx.id,
          totalCoins: totalCoinCost,
          totalDiamonds: totalDiamondValue,
          giftCoinSources: coinSources,
        });

        const recipientWallet = await tx.wallet.update({
          where: { userId: recipientUserId },
          data: { diamondsEarned: { increment: totalDiamondValue } },
        });

        await tx.walletLedger.createMany({
          data: [
            {
              id: randomUUID(),
              userId: senderUserId,
              type: LedgerEntryType.GIFT_SEND,
              deltaCoins: -totalCoinCost,
              deltaDiamonds: 0,
              streamId,
              giftTxId: giftTx.id,
            },
            {
              id: randomUUID(),
              userId: recipientUserId,
              type: LedgerEntryType.GIFT_RECEIVE,
              deltaCoins: 0,
              deltaDiamonds: totalDiamondValue,
              streamId,
              giftTxId: giftTx.id,
            },
          ],
        });

        const senderWallet = await tx.wallet.findUnique({ where: { userId: senderUserId } });
        if (!senderWallet) throw new Error("Sender wallet missing after debit");

        return {
          reused: false as const,
          gift,
          giftTx,
          senderWallet,
          recipientWallet,
          quantity,
          totalCoinCost,
          totalDiamondValue,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
        break;
      } catch (error) {
        if (
          !isRetryableGiftTransactionError(error) ||
          giftTxAttempt >= GIFT_TRANSACTION_MAX_RETRIES
        ) {
          throw error;
        }

        await sleepGiftTransactionRetry(getGiftTransactionRetryDelayMs(giftTxAttempt));
      }
    }

    if (!txResult) {
      throw new Error('Gift transaction failed without a result.');
    }

    const battleContribution = await this.recordBattleGiftContributionAfterSendV2({
      battleTarget: battleGiftTarget,
      actorUserId: senderUserId,
      giftTxId: txResult.giftTx.id,
    });

    if (!txResult.reused) {
      try {
        await this.battles.applyGiftToActiveBattle({
          streamId,
          giftTxId: txResult.giftTx.id,
          senderUserId,
          recipientUserId,
          diamondValue: txResult.giftTx.diamondValue,
          createdAt: txResult.giftTx.createdAt,
        });
      } catch (e) {
        console.warn("[EconomyService] battle hook failed:", e);
      }

      try {
        await this.milestones.awardGiftMilestones({
          userId: recipientUserId,
          diamondsEarned: txResult.recipientWallet.diamondsEarned,
          giverUserId: senderUserId,
          giftId: txResult.gift.id,
          giftTxId: txResult.giftTx.id,
          achievedAt: txResult.giftTx.createdAt,
          streamId,
        });
      } catch (e) {
        console.warn("[EconomyService] milestone hook failed:", e);
      }

      const [sender, recipient] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: senderUserId },
          include: { profile: true },
        }),
        this.prisma.user.findUnique({
          where: { id: recipientUserId },
          include: { profile: true },
        }),
      ]);

      if (sender && recipient) {
        void this.notifications.createAndSendToUsers({
            userIds: [recipientUserId],
            notificationType: "GIFT_RECEIVED",
            title: "You received a gift",
            body: `${this.userSummary(sender).displayName} sent you ${txResult.quantity > 1 ? `${txResult.quantity}x ` : ""}${txResult.gift.name}`,
            payload: {
              senderUserId,
              senderUsername: sender.username,
              senderDisplayName: this.userSummary(sender).displayName,
              recipientUserId,
              giftId: txResult.gift.id,
              giftName: txResult.gift.name,
              quantity: txResult.quantity,
              coinCost: txResult.giftTx.coinCost,
              diamondValue: txResult.giftTx.diamondValue,
              txId: txResult.giftTx.id,
              streamId,
            },
            streamId,
            dedupeKey: `gift:${txResult.giftTx.id}`,
          }).catch((e) => {
          console.warn("[EconomyService] gift notification hook failed:", e);
        });

        this.realtime.emitGiftSent({
          streamId,
          sender: this.userSummary(sender),
          recipient: this.userSummary(recipient),
          gift: {
            id: txResult.gift.id,
            name: txResult.gift.name,
            diamondValue: txResult.gift.diamondValue,
            mediaUrl: txResult.gift.mediaUrl,
            mediaType: this.mediaTypeToDto(txResult.gift.mediaType),
            effectSize: this.effectSizeToDto(txResult.gift.effectSize ?? (txResult.gift.isBigGift ? "LARGE" : "MEDIUM")),
          },
          quantity: txResult.quantity,
          totalCoinCost: txResult.giftTx.coinCost,
          totalDiamondValue: txResult.giftTx.diamondValue,
          isBigGift: txResult.gift.isBigGift || txResult.giftTx.diamondValue >= 1000,
          txId: txResult.giftTx.id,
          createdAt: txResult.giftTx.createdAt.toISOString(),
          sentAt: txResult.giftTx.createdAt.toISOString(),
          animationDelayMs: 1000,
          animationStartAt: new Date(txResult.giftTx.createdAt.getTime() + 1000).toISOString(),
          displayAt: new Date(txResult.giftTx.createdAt.getTime() + 1000).toISOString(),
          scheduledStartAt: new Date(txResult.giftTx.createdAt.getTime() + 1000).toISOString(),
        });
      }
    }

    if (!txResult.reused && battleGiftTarget) {
      await this.mirrorBattleGiftToTargetStreamV2({
        sourceStreamId: streamId,
        targetStreamId: (battleGiftTarget as any).targetStreamId,
        battleSideId,
        txResult,
        senderUserId,
        recipientUserId,
      });
    }

    return {
      ok: true as const,
      idempotent: txResult.reused,
      txId: txResult.giftTx.id,
      quantity: txResult.quantity,
      totalCoinCost: txResult.giftTx.coinCost,
      totalDiamondValue: txResult.giftTx.diamondValue,
      battleContribution,
      senderWallet: {
        userId: txResult.senderWallet.userId,
        coins: txResult.senderWallet.coins,
        diamondsEarned: txResult.senderWallet.diamondsEarned,
        creatorEarnings: await this.getCreatorEarningsSummary(senderUserId),
        updatedAt: txResult.senderWallet.updatedAt.toISOString(),
      },
    };
  }


  async getPublicGiftCategories() {
    const categories = await (this.prisma as any).giftCategory.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sortOrder: true,
        isEnabled: true,
        updatedAt: true,
      },
    });

    return {
      items: categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? null,
        sortOrder: Number(category.sortOrder ?? 0),
        isEnabled: Boolean(category.isEnabled),
        updatedAt: category.updatedAt instanceof Date ? category.updatedAt.toISOString() : category.updatedAt,
      })),
    };
  }

}

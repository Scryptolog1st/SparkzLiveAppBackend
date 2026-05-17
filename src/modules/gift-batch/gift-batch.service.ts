// src/modules/gift-batch/gift-batch.service.ts
//
// Accumulates gifts sent during an active battle and flushes them as a single
// GiftTransaction per (battle, sender, recipient, giftId) group when the
// battle enters COOLDOWN or ENDED. This avoids posting thousands of
// individual DB transactions for high-frequency gifting while still keeping
// wallet balances and battle scores updated in realtime.

import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  LedgerEntryType,
  Prisma,
  StreamerEarningStatus,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GiftMediaTypeLike = "IMAGE" | "GIF" | "LOTTIE" | "VIDEO";

export type BatchGiftInfo = {
  id: string;
  name: string;
  coinCost: number;
  diamondValue: number;
  isBigGift: boolean;
  mediaUrl: string | null;
  mediaType: GiftMediaTypeLike;
  effectSize: string | null;
};

/** One unit of accumulation: a single gift-send event added to the buffer. */
export type AccumulateGiftParams = {
  /** V2 BattleSession.id or V1 Battle.id */
  battleId: string;
  battleKind: "v1" | "v2";
  /** BattleSide.id for v2 battles, null for v1 */
  sideId: string | null;
  streamId: string;
  senderUserId: string;
  recipientUserId: string;
  gift: BatchGiftInfo;
  quantity: number;
  /** Pending UUID returned to the client while the real transaction is deferred. */
  pendingTxId: string;
  /** IDs of committed GiftCoinSource rows for lot-level accounting. */
  giftCoinSourceIds?: string[];
};

type PendingEntry = {
  battleId: string;
  battleKind: "v1" | "v2";
  sideId: string | null;
  streamId: string;
  senderUserId: string;
  recipientUserId: string;
  gift: BatchGiftInfo;
  quantity: number;
  totalCoinCost: number;
  totalDiamondValue: number;
  firstPendingTxId: string;
  /** All pendingTxIds from batched sends (used to update giftCoinSource FK references). */
  allPendingTxIds: string[];
  createdAt: Date;
  updatedAt: Date;
  /** Accumulated IDs of committed GiftCoinSource rows across all batched sends. */
  giftCoinSourceIds: string[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_FLUSH_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours safety-net

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class GiftBatchService implements OnModuleDestroy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {
    // Periodic sweep for stale entries (battles that never cleanly ended).
    this.sweepInterval = setInterval(() => this.sweepStaleEntries(), 15 * 60 * 1000);
  }

  // Key format: battleId:senderUserId:recipientUserId:giftId
  private readonly pending = new Map<string, PendingEntry>();

  // Track keys currently being processed to prevent concurrent commits
  private readonly inFlight = new Set<string>();

  // Interval handle for cleanup
  private sweepInterval: NodeJS.Timeout | null = null;

  onModuleDestroy() {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Merge one gift-send event into the in-memory buffer. */
  accumulate(params: AccumulateGiftParams): void {
    const key = this.buildKey(
      params.battleId,
      params.senderUserId,
      params.recipientUserId,
      params.gift.id,
    );

    const existing = this.pending.get(key);
    const totalCoinCost = params.gift.coinCost * params.quantity;
    const totalDiamondValue = params.gift.diamondValue * params.quantity;
    const now = new Date();

    if (existing) {
      existing.quantity += params.quantity;
      existing.totalCoinCost += totalCoinCost;
      existing.totalDiamondValue += totalDiamondValue;
      existing.updatedAt = now;
      existing.allPendingTxIds.push(params.pendingTxId);
      if (params.giftCoinSourceIds) {
        existing.giftCoinSourceIds.push(...params.giftCoinSourceIds);
      }
    } else {
      this.pending.set(key, {
        battleId: params.battleId,
        battleKind: params.battleKind,
        sideId: params.sideId,
        streamId: params.streamId,
        senderUserId: params.senderUserId,
        recipientUserId: params.recipientUserId,
        gift: params.gift,
        quantity: params.quantity,
        totalCoinCost,
        totalDiamondValue,
        firstPendingTxId: params.pendingTxId,
        allPendingTxIds: [params.pendingTxId],
        createdAt: now,
        updatedAt: now,
        giftCoinSourceIds: params.giftCoinSourceIds ?? [],
      });
    }
  }

  /** Return all pending entries for a given battleId (without clearing them). */
  getPendingForBattle(battleId: string): PendingEntry[] {
    const results: PendingEntry[] = [];
    for (const entry of this.pending.values()) {
      if (entry.battleId === battleId) {
        results.push(entry);
      }
    }
    return results;
  }

  /**
   * Flush all accumulated gifts for a battle:
   *  - Creates one GiftTransaction per (sender, recipient, giftId) group.
   *  - Creates WalletLedger entries.
   *  - Creates StreamerEarning records.
   *  - Clears the buffer for this battle.
   *
   * Called by BattlesService when a battle enters COOLDOWN or ENDED.
   * Safe to call multiple times – subsequent calls are no-ops if already flushed.
   */
  async flushBattle(battleId: string): Promise<void> {
    const entries = this.getPendingForBattle(battleId);
    if (entries.length === 0) return;

    // Remove from pending and mark as in-flight to prevent concurrent processing
    for (const entry of entries) {
      const key = this.buildKey(
        entry.battleId,
        entry.senderUserId,
        entry.recipientUserId,
        entry.gift.id,
      );

      // Skip if already being processed
      if (this.inFlight.has(key)) {
        continue;
      }

      this.inFlight.add(key);
      this.pending.delete(key);
    }

    const config = await this.getCreatorEarningsConfig();

    for (const entry of entries) {
      const key = this.buildKey(entry.battleId, entry.senderUserId, entry.recipientUserId, entry.gift.id);

      // Skip if this key wasn't marked in-flight (was already being processed)
      if (!this.inFlight.has(key)) {
        continue;
      }

      try {
        await this.commitEntry(entry, config);
      } catch (err) {
        console.error(
          `[GiftBatch] Failed to commit entry for battle ${battleId}, ` +
          `sender ${entry.senderUserId}, recipient ${entry.recipientUserId}, ` +
          `gift ${entry.gift.id}:`,
          err,
        );
        // Re-add to pending, merging with any newer buffered state that may have arrived.
        const existing = this.pending.get(key);
        if (existing) {
          // Merge failed entry into existing: accumulate quantities, coin sources, update timestamps
          existing.quantity += entry.quantity;
          existing.totalCoinCost += entry.totalCoinCost;
          existing.totalDiamondValue += entry.totalDiamondValue;
          existing.giftCoinSourceIds.push(...entry.giftCoinSourceIds);
          existing.updatedAt = new Date();
        } else {
          // No newer state, just re-insert the failed entry
          this.pending.set(key, entry);
        }
      } finally {
        // Always remove from in-flight when done (success or failure)
        this.inFlight.delete(key);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private buildKey(
    battleId: string,
    senderUserId: string,
    recipientUserId: string,
    giftId: string,
  ): string {
    return `${battleId}:${senderUserId}:${recipientUserId}:${giftId}`;
  }

  /** Commit one aggregated entry to the database. */
  private async commitEntry(
    entry: PendingEntry,
    config: CreatorEarningsConfigLocal,
  ): Promise<void> {
    // Use the first pending transaction ID as the final gift transaction ID
    // to preserve FK references from giftCoinSource rows created earlier
    const giftTxId = entry.firstPendingTxId;

    await this.prisma.$transaction(async (tx) => {
      // Update any giftCoinSource rows that reference other pendingTxIds
      // (from subsequent batched sends) to point to the single final giftTxId
      const otherPendingTxIds = entry.allPendingTxIds.filter(id => id !== giftTxId);

      if (otherPendingTxIds.length > 0) {
        await tx.$executeRaw`
          UPDATE gift_coin_sources
          SET gift_tx_id = ${giftTxId}::uuid
          WHERE gift_tx_id = ANY(${otherPendingTxIds}::uuid[])
        `;
      }

      // Create the single aggregated GiftTransaction.
      const giftTx = await tx.giftTransaction.create({
        data: {
          id: giftTxId,
          streamId: entry.streamId,
          giftId: entry.gift.id,
          senderUserId: entry.senderUserId,
          recipientUserId: entry.recipientUserId,
          idempotencyKey: null,
          coinCost: entry.totalCoinCost,
          diamondValue: entry.totalDiamondValue,
        },
      });

      // WalletLedger entries (coins were already debited/credited in realtime;
      // these records are the audit trail).
      await tx.walletLedger.createMany({
        data: [
          {
            id: randomUUID(),
            userId: entry.senderUserId,
            type: LedgerEntryType.GIFT_SEND,
            deltaCoins: -entry.totalCoinCost,
            deltaDiamonds: 0,
            streamId: entry.streamId,
            giftTxId: giftTx.id,
          },
          {
            id: randomUUID(),
            userId: entry.recipientUserId,
            type: LedgerEntryType.GIFT_RECEIVE,
            deltaCoins: 0,
            deltaDiamonds: entry.totalDiamondValue,
            streamId: entry.streamId,
            giftTxId: giftTx.id,
          },
        ],
      });

      // StreamerEarning: simplified (no per-coin-lot split).
      await this.createStreamerEarningForBatchEntry(tx, entry, giftTx.id, config);

      // Battle contribution record(s).
      if (entry.battleKind === "v2" && entry.sideId) {
        try {
          await (tx as any).battleSideContribution.create({
            data: {
              battleId: entry.battleId,
              sideId: entry.sideId,
              giftTxId: giftTx.id,
              senderUserId: entry.senderUserId,
              recipientUserId: entry.recipientUserId,
              diamondValue: entry.totalDiamondValue,
              phase: "NORMAL",
              suddenDeathRound: 0,
            },
          });
        } catch (err: any) {
          const code = String(err?.code || "");
          if (code !== "P2002") throw err; // ignore unique constraint violations
        }
      } else if (entry.battleKind === "v1") {
        // V1 battles use BattleContribution, keyed on giftTxId with a unique constraint.
        try {
          await tx.battleContribution.create({
            data: {
              battle: { connect: { id: entry.battleId } },
              giftTx: { connect: { id: giftTx.id } },
              sender: { connect: { id: entry.senderUserId } },
              recipient: { connect: { id: entry.recipientUserId } },
              diamondValue: entry.totalDiamondValue,
            },
          });
        } catch (err: any) {
          const code = String(err?.code || "");
          if (code !== "P2002") throw err; // ignore unique constraint violations
        }
      }
    });
  }

  private async getCreatorEarningsConfig(): Promise<CreatorEarningsConfigLocal> {
    const row = await this.prisma.appConfig.findUnique({
      where: { key: "creator_earnings" },
    });

    const value = row?.valueJson as Record<string, unknown> | undefined;

    return {
      diamondToCentsRate: Number(value?.diamondToCentsRate ?? 1),
      platformFeeBps: Number(value?.platformFeeBps ?? 0),
      defaultHoldDays: Number(value?.defaultHoldDays ?? 7),
      establishedStreamerHoldDays: Number(value?.establishedStreamerHoldDays ?? 4),
      largeGiftCoinThreshold: Number(value?.largeGiftCoinThreshold ?? 10_000),
      largeGiftExtraHoldDays: Number(value?.largeGiftExtraHoldDays ?? 14),
    };
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  private async createStreamerEarningForBatchEntry(
    tx: Prisma.TransactionClient,
    entry: PendingEntry,
    giftTxId: string,
    config: CreatorEarningsConfigLocal,
  ): Promise<void> {
    const grossAmountCents = Math.round(entry.totalDiamondValue * config.diamondToCentsRate);
    const platformFeeCents = Math.floor((grossAmountCents * config.platformFeeBps) / 10_000);
    const streamerAmountCents = grossAmountCents - platformFeeCents;

    const now = new Date();
    const holdDays =
      entry.totalCoinCost >= config.largeGiftCoinThreshold
        ? config.largeGiftExtraHoldDays
        : config.defaultHoldDays;
    const holdUntil = this.addDays(now, holdDays);

    // Use first coin source ID for FK requirement, but preserve all IDs in metadata
    const giftCoinSourceId = entry.giftCoinSourceIds.length > 0
      ? entry.giftCoinSourceIds[0]
      : null;

    if (!giftCoinSourceId) {
      throw new Error(
        `No giftCoinSourceIds for batch entry: battle=${entry.battleId} ` +
        `sender=${entry.senderUserId} recipient=${entry.recipientUserId} gift=${entry.gift.id}`
      );
    }

    await tx.streamerEarning.create({
      data: {
        streamerUserId: entry.recipientUserId,
        giftTxId,
        giftCoinSourceId,

        diamondsEarned: entry.totalDiamondValue,
        coinsSourceUsed: entry.totalCoinCost,

        grossAmountCents,
        platformFeeCents,
        streamerAmountCents,

        providerAvailableOn: now,
        holdUntil,
        availableAt: holdUntil,

        status: StreamerEarningStatus.PENDING,

        metadataJson: {
          batchFlushed: true,
          battleId: entry.battleId,
          giftId: entry.gift.id,
          quantity: entry.quantity,
          holdDays,
          giftCoinSourceIds: entry.giftCoinSourceIds,
        },
      },
    });
  }

  /** Remove buffer entries older than AUTO_FLUSH_TTL_MS without flushing to DB
   *  (coins were already debited; these are orphaned entries from crashed battles).
   *  A more sophisticated approach would attempt to flush them, but logging is
   *  sufficient for the safety-net use case. */
  private sweepStaleEntries(): void {
    const cutoff = Date.now() - AUTO_FLUSH_TTL_MS;
    const stale: string[] = [];

    for (const [key, entry] of this.pending.entries()) {
      if (entry.updatedAt.getTime() < cutoff) {
        stale.push(key);
      }
    }

    for (const key of stale) {
      // Skip if already in-flight (being processed by flushBattle or another sweep)
      if (this.inFlight.has(key)) {
        continue;
      }

      const entry = this.pending.get(key);
      if (entry) {
        console.warn(
          `[GiftBatch] Sweeping stale entry: battle=${entry.battleId} ` +
          `sender=${entry.senderUserId} recipient=${entry.recipientUserId} ` +
          `gift=${entry.gift.id} qty=${entry.quantity} ` +
          `coins=${entry.totalCoinCost} diamonds=${entry.totalDiamondValue}`,
        );
        // Mark as in-flight and remove from pending
        this.inFlight.add(key);
        this.pending.delete(key);

        // Attempt async flush. On failure, re-insert the entry so it can be retried.
        this.commitStaleEntry(entry, key).catch((err) => {
          console.error("[GiftBatch] Failed to commit stale entry, re-inserting:", err);
          const existing = this.pending.get(key);
          if (existing) {
            // Merge failed entry into existing
            existing.quantity += entry.quantity;
            existing.totalCoinCost += entry.totalCoinCost;
            existing.totalDiamondValue += entry.totalDiamondValue;
            existing.giftCoinSourceIds.push(...entry.giftCoinSourceIds);
            existing.updatedAt = new Date();
          } else {
            this.pending.set(key, entry);
          }
        });
      }
    }
  }

  private async commitStaleEntry(entry: PendingEntry, key: string): Promise<void> {
    try {
      const config = await this.getCreatorEarningsConfig();
      await this.commitEntry(entry, config);
    } catch (err) {
      console.error("[GiftBatch] Failed to commit stale entry during sweep:", err);
      throw err; // Re-throw so caller can handle re-insertion
    } finally {
      // Always remove from in-flight when done (success or failure)
      this.inFlight.delete(key);
    }
  }
}

// Local alias to avoid importing from economy.service
type CreatorEarningsConfigLocal = {
  diamondToCentsRate: number;
  platformFeeBps: number;
  defaultHoldDays: number;
  establishedStreamerHoldDays: number;
  largeGiftCoinThreshold: number;
  largeGiftExtraHoldDays: number;
};
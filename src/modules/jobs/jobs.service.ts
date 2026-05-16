import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationType, VipBadgeKey } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StreamsService } from '../streams/streams.service';

const LIVE_COLOR_VIP_THRESHOLDS: Array<{
  key: VipBadgeKey;
  minSpendCents: number;
}> = [
    { key: VipBadgeKey.GREEN, minSpendCents: 10_000 },
    { key: VipBadgeKey.YELLOW, minSpendCents: 25_000 },
    { key: VipBadgeKey.ORANGE, minSpendCents: 50_000 },
    { key: VipBadgeKey.RED, minSpendCents: 90_000 },
    { key: VipBadgeKey.PINK, minSpendCents: 140_000 },
    { key: VipBadgeKey.PURPLE, minSpendCents: 210_000 },
    { key: VipBadgeKey.BLACK, minSpendCents: 300_000 },
  ];

const METAL_VIP_RULES: Array<{
  key: VipBadgeKey;
  topPercent: number;
  minSpendCents: number;
}> = [
    { key: VipBadgeKey.ANODIZED_TITANIUM, topPercent: 10, minSpendCents: 4_000_000 },
    { key: VipBadgeKey.DIAMOND, topPercent: 20, minSpendCents: 2_000_000 },
    { key: VipBadgeKey.PLATINUM, topPercent: 30, minSpendCents: 1_000_000 },
    { key: VipBadgeKey.GOLD, topPercent: 40, minSpendCents: 500_000 },
  ];

type VipBadgeMeta = {
  label: string;
  compatibilityTone: string;
  displayRank: number;
};

const VIP_BADGE_META: Record<VipBadgeKey, VipBadgeMeta> = {
  [VipBadgeKey.GREEN]: {
    label: 'Green',
    compatibilityTone: 'green',
    displayRank: 1,
  },
  [VipBadgeKey.YELLOW]: {
    label: 'Yellow',
    compatibilityTone: 'yellow',
    displayRank: 2,
  },
  [VipBadgeKey.ORANGE]: {
    label: 'Orange',
    compatibilityTone: 'orange',
    displayRank: 3,
  },
  [VipBadgeKey.RED]: {
    label: 'Red',
    compatibilityTone: 'red',
    displayRank: 4,
  },
  [VipBadgeKey.PINK]: {
    label: 'Pink',
    compatibilityTone: 'pink',
    displayRank: 5,
  },
  [VipBadgeKey.PURPLE]: {
    label: 'Purple',
    compatibilityTone: 'purple',
    displayRank: 6,
  },
  [VipBadgeKey.BLACK]: {
    label: 'Black',
    compatibilityTone: 'neutral',
    displayRank: 7,
  },
  [VipBadgeKey.GOLD]: {
    label: 'Gold',
    compatibilityTone: 'amber',
    displayRank: 8,
  },
  [VipBadgeKey.PLATINUM]: {
    label: 'Platinum',
    compatibilityTone: 'slate',
    displayRank: 9,
  },
  [VipBadgeKey.DIAMOND]: {
    label: 'Diamond',
    compatibilityTone: 'cyan',
    displayRank: 10,
  },
  [VipBadgeKey.ANODIZED_TITANIUM]: {
    label: 'Anodized Titanium',
    compatibilityTone: 'indigo',
    displayRank: 11,
  },
};

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly startedAt = new Date();
  private intervalHandle: NodeJS.Timeout | null = null;
  private intervalMs = 60_000;

  private lastGiftScanAt: Date;
  private lastMilestoneScanAt: Date;
  private lastBattleScanAt: Date;
  private lastVipRefreshPeriodKey: string | null = null;

  private lastTickStartedAt: Date | null = null;
  private lastTickCompletedAt: Date | null = null;
  private lastTickDurationMs: number | null = null;
  private consecutiveFailures = 0;
  private lastTickError: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly streams: StreamsService,
  ) {
    const lookbackSec = Number(process.env.JOBS_SCAN_LOOKBACK_SECONDS ?? 300);
    const start = new Date(Date.now() - lookbackSec * 1000);
    this.lastGiftScanAt = start;
    this.lastMilestoneScanAt = start;
    this.lastBattleScanAt = start;
  }

  onModuleInit() {
    this.intervalMs = Number(process.env.JOBS_INTERVAL_MS ?? 60_000);
    this.intervalHandle = setInterval(() => {
      void this.runTick().catch((error) => this.logger.error(error));
    }, this.intervalMs);
    this.logger.log(`JobsService started (interval=${this.intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  getHealthSnapshot() {
    return {
      isRunning: Boolean(this.intervalHandle),
      startedAt: this.startedAt.toISOString(),
      intervalMs: this.intervalMs,
      lastTickStartedAt: this.lastTickStartedAt
        ? this.lastTickStartedAt.toISOString()
        : null,
      lastTickCompletedAt: this.lastTickCompletedAt
        ? this.lastTickCompletedAt.toISOString()
        : null,
      lastTickDurationMs: this.lastTickDurationMs,
      consecutiveFailures: this.consecutiveFailures,
      lastTickError: this.lastTickError,
      scans: {
        lastGiftScanAt: this.lastGiftScanAt.toISOString(),
        lastMilestoneScanAt: this.lastMilestoneScanAt.toISOString(),
        lastBattleScanAt: this.lastBattleScanAt.toISOString(),
      },
      currentVipPeriodKey: this.getVipPeriodKey(),
    };
  }

  private async runTick() {
    const startedAt = Date.now();
    this.lastTickStartedAt = new Date(startedAt);

    try {
      await this.tick();
      this.lastTickCompletedAt = new Date();
      this.lastTickDurationMs = Date.now() - startedAt;
      this.consecutiveFailures = 0;
      this.lastTickError = null;
    } catch (error) {
      this.lastTickDurationMs = Date.now() - startedAt;
      this.consecutiveFailures += 1;
      this.lastTickError =
        error instanceof Error ? error.message : 'Jobs tick failed.';
      throw error;
    }
  }

  private getVipMonthTimezone(): string {
    const raw = String(process.env.VIP_MONTH_TIMEZONE || 'America/New_York').trim();

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: raw }).format(new Date());
      return raw;
    } catch {
      return 'America/New_York';
    }
  }

  private getVipPeriodKey(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.getVipMonthTimezone(),
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';

    return `${year}-${month}`;
  }

  private getPreviousVipPeriodKey(referenceDate = new Date()): string {
    const prev = new Date(referenceDate);
    prev.setUTCDate(1);
    prev.setUTCMonth(prev.getUTCMonth() - 1);
    return this.getVipPeriodKey(prev);
  }

  private resolveLiveColorVipBadge(spendCents: number): VipBadgeKey | null {
    let resolved: VipBadgeKey | null = null;

    for (const threshold of LIVE_COLOR_VIP_THRESHOLDS) {
      if (spendCents >= threshold.minSpendCents) {
        resolved = threshold.key;
      }
    }

    return resolved;
  }

  private getVipBadgeRank(key?: VipBadgeKey | null): number {
    if (!key) return 0;
    return VIP_BADGE_META[key]?.displayRank ?? 0;
  }

  private pickHigherVipBadge(
    left?: VipBadgeKey | null,
    right?: VipBadgeKey | null,
  ): VipBadgeKey | null {
    if (!left && !right) return null;
    if (!left) return right ?? null;
    if (!right) return left ?? null;

    return this.getVipBadgeRank(left) >= this.getVipBadgeRank(right) ? left : right;
  }

  private getVipBadgeMeta(key?: VipBadgeKey | null): VipBadgeMeta | null {
    if (!key) return null;
    return VIP_BADGE_META[key] ?? null;
  }

  private resolveFinalizedVipBadge(params: {
    spendCents: number;
    rank: number | null;
    spenderCount: number;
    highestColorBadge?: VipBadgeKey | null;
  }) {
    const { spendCents, rank, spenderCount, highestColorBadge } = params;

    if (spendCents <= 0) {
      return {
        badgeKey: null as VipBadgeKey | null,
        percentileBand: null as number | null,
      };
    }

    if (rank !== null && spenderCount > 0) {
      for (const rule of METAL_VIP_RULES) {
        const cutoff = Math.ceil((spenderCount * rule.topPercent) / 100);

        if (rank <= cutoff && spendCents >= rule.minSpendCents) {
          return {
            badgeKey: rule.key,
            percentileBand: rule.topPercent,
          };
        }
      }
    }

    return {
      badgeKey: highestColorBadge ?? this.resolveLiveColorVipBadge(spendCents),
      percentileBand: null as number | null,
    };
  }

  private async ensureProfileExists(tx: any, userId: string) {
    const existing = await tx.profile.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (existing) return existing;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    return tx.profile.create({
      data: {
        userId,
        displayName: user?.username || 'User',
        showBadgeOnProfile: true,
      },
      select: { userId: true },
    });
  }

  private async rolloverVipBadgesIfNeeded() {
    const now = new Date();
    const currentPeriodKey = this.getVipPeriodKey(now);

    if (this.lastVipRefreshPeriodKey === currentPeriodKey) {
      return;
    }

    const previousPeriodKey = this.getPreviousVipPeriodKey(now);

    await this.prisma.$transaction(async (tx) => {
      const previousRows = await tx.userVipMonth.findMany({
        where: { periodKey: previousPeriodKey },
        orderBy: [
          { spendCents: 'desc' },
          { updatedAt: 'asc' },
          { userId: 'asc' },
        ],
        select: {
          userId: true,
          periodKey: true,
          spendCents: true,
          highestColorBadge: true,
          isFinalized: true,
        },
      });

      const spenders = previousRows.filter((row) => row.spendCents > 0);
      const spenderCount = spenders.length;
      const rankByUserId = new Map<string, number>();

      spenders.forEach((row, index) => {
        rankByUserId.set(row.userId, index + 1);
      });

      for (const row of previousRows) {
        const highestColorBadge = (row.highestColorBadge as VipBadgeKey | null) ?? null;
        const rank = rankByUserId.get(row.userId) ?? null;
        const resolution = this.resolveFinalizedVipBadge({
          spendCents: row.spendCents,
          rank,
          spenderCount,
          highestColorBadge,
        });

        await tx.userVipMonth.update({
          where: {
            userId_periodKey: {
              userId: row.userId,
              periodKey: row.periodKey,
            },
          },
          data: {
            highestColorBadge: highestColorBadge ?? this.resolveLiveColorVipBadge(row.spendCents),
            finalizedBadgeKey: resolution.badgeKey,
            finalizedPercentileBand: resolution.percentileBand,
            leaderboardRank: rank,
            spenderCount,
            isFinalized: true,
            finalizedAt: now,
          },
        });
      }

      const currentRows = await tx.userVipMonth.findMany({
        where: { periodKey: currentPeriodKey },
        select: {
          userId: true,
          highestColorBadge: true,
        },
      });

      const currentLiveBadgeByUserId = new Map<string, VipBadgeKey | null>();
      for (const row of currentRows) {
        currentLiveBadgeByUserId.set(
          row.userId,
          (row.highestColorBadge as VipBadgeKey | null) ?? null,
        );
      }

      const finalizedBadgeByUserId = new Map<string, VipBadgeKey | null>();
      for (const row of previousRows) {
        const storedFinal = await tx.userVipMonth.findUnique({
          where: {
            userId_periodKey: {
              userId: row.userId,
              periodKey: previousPeriodKey,
            },
          },
          select: {
            finalizedBadgeKey: true,
          },
        });

        finalizedBadgeByUserId.set(
          row.userId,
          (storedFinal?.finalizedBadgeKey as VipBadgeKey | null) ?? null,
        );
      }

      const profileRows = await tx.profile.findMany({
        where: {
          OR: [
            { vipLockedBadgeKey: { not: null } },
            { vipDisplayBadgeKey: { not: null } },
            { vipLiveBadgeKey: { not: null } },
            { badgeLabel: { not: null } },
          ],
        },
        select: { userId: true },
      });

      const impactedUserIds = new Set<string>([
        ...previousRows.map((row) => row.userId),
        ...currentRows.map((row) => row.userId),
        ...profileRows.map((row) => row.userId),
      ]);

      for (const userId of impactedUserIds) {
        await this.ensureProfileExists(tx, userId);

        const lockedBadgeKey = finalizedBadgeByUserId.get(userId) ?? null;
        const liveBadgeKey = currentLiveBadgeByUserId.get(userId) ?? null;
        const displayBadgeKey = this.pickHigherVipBadge(lockedBadgeKey, liveBadgeKey);
        const badgeMeta = this.getVipBadgeMeta(displayBadgeKey);

        await tx.profile.update({
          where: { userId },
          data: {
            vipLockedBadgeKey: lockedBadgeKey,
            vipLockedPeriodKey: lockedBadgeKey ? previousPeriodKey : null,
            vipLiveBadgeKey: liveBadgeKey,
            vipDisplayBadgeKey: displayBadgeKey,
            badgeLabel: badgeMeta?.label ?? null,
            badgeTone: badgeMeta?.compatibilityTone ?? null,
          },
        });
      }

      this.logger.log(
        `VIP rollover processed for display month ${currentPeriodKey} using finalized period ${previousPeriodKey}. Finalized rows=${previousRows.length}, spenders=${spenderCount}, impactedProfiles=${impactedUserIds.size}`,
      );
    });

    this.lastVipRefreshPeriodKey = currentPeriodKey;
  }

  private async tick() {
    await this.rolloverVipBadgesIfNeeded();

    const retentionDays = Number(process.env.NOTIFICATIONS_RETENTION_DAYS ?? 30);
    const res = await this.notifications.deleteOlderThan(retentionDays);
    this.logger.debug(`notifications retention: deleted=${res.deleted} cutoff=${res.cutoff}`);

    const sweptGhosts = await this.streams.sweepGhostParticipants().catch((e) => {
      this.logger.error('Failed to sweep ghosts', e);
      return 0;
    });

    if (sweptGhosts > 0) {
      this.logger.log(`Swept ${sweptGhosts} ghost participants from streams.`);
    }

    await this.emitGiftReceivedNotifications();
    await this.emitMilestoneReachedNotifications();
    await this.emitBattleEndedNotifications();
  }

  private async emitGiftReceivedNotifications() {
    const now = new Date();
    const since = this.lastGiftScanAt;
    this.lastGiftScanAt = now;

    const rows = await this.prisma.giftTransaction.findMany({
      where: { createdAt: { gt: since } },
      take: 200,
      orderBy: { createdAt: 'asc' },
      include: {
        gift: { select: { id: true, name: true, coinCost: true, diamondValue: true } },
        sender: { select: { id: true, username: true } },
        recipient: { select: { id: true, username: true } },
      },
    });

    if (rows.length === 0) return;

    for (const tx of rows) {
      const dedupeKey = `gift_tx:${tx.id}`;

      const existing = await this.prisma.notification.findFirst({
        where: { userId: tx.recipientUserId, dedupeKey },
        select: { id: true },
      });
      if (existing) continue;

      const title = 'Gift received';
      const body = `${tx.sender.username} sent you ${tx.gift.name}`;

      await this.prisma.notification.create({
        data: {
          userId: tx.recipientUserId,
          type: NotificationType.GIFT_RECEIVED,
          title,
          body,
          streamId: tx.streamId,
          dedupeKey,
          payloadJson: {
            giftTxId: tx.id,
            streamId: tx.streamId,
            giftId: tx.giftId,
            giftName: tx.gift.name,
            coinCost: tx.coinCost,
            diamondValue: tx.diamondValue,
            senderUserId: tx.senderUserId,
            senderUsername: tx.sender.username,
            recipientUserId: tx.recipientUserId,
            recipientUsername: tx.recipient.username,
            createdAt: tx.createdAt.toISOString(),
          } as any,
        },
      });
    }

    this.logger.debug(`gift notifications: processed=${rows.length}`);
  }

  private async emitMilestoneReachedNotifications() {
    const now = new Date();
    const since = this.lastMilestoneScanAt;
    this.lastMilestoneScanAt = now;

    const rows = await this.prisma.diamondMilestone.findMany({
      where: { createdAt: { gt: since } },
      take: 200,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true } },
        giver: { select: { id: true, username: true } },
      },
    });

    if (rows.length === 0) return;

    for (const m of rows) {
      const dedupeKey = `milestone:${m.id}`;

      const existing = await this.prisma.notification.findFirst({
        where: { userId: m.userId, dedupeKey },
        select: { id: true },
      });
      if (existing) continue;

      const title = 'Milestone reached';
      const body = `You reached ${m.milestoneAmount.toLocaleString()} diamonds earned!`;

      await this.prisma.notification.create({
        data: {
          userId: m.userId,
          type: NotificationType.MILESTONE_REACHED,
          title,
          body,
          streamId: null,
          dedupeKey,
          payloadJson: {
            milestoneId: m.id,
            userId: m.userId,
            username: m.user.username,
            milestoneAmount: m.milestoneAmount,
            achievedAt: m.achievedAt.toISOString(),
            giverUserId: m.giverUserId ?? null,
            giverUsername: m.giver?.username ?? null,
            giftTxId: m.giftTxId ?? null,
            createdAt: m.createdAt.toISOString(),
          } as any,
        },
      });
    }

    this.logger.debug(`milestone notifications: processed=${rows.length}`);
  }

  private async emitBattleEndedNotifications() {
    const now = new Date();
    const since = this.lastBattleScanAt;
    this.lastBattleScanAt = now;

    const rows = await this.prisma.battle.findMany({
      where: {
        status: 'ENDED',
        endedAt: { gt: since },
      },
      take: 200,
      orderBy: { endedAt: 'asc' },
      include: {
        host: { select: { id: true, username: true } },
        opponent: { select: { id: true, username: true } },
        winner: { select: { id: true, username: true } },
      },
    });

    if (rows.length === 0) return;

    for (const b of rows) {
      const battleId = b.id;
      const streamId = b.streamId;
      const winnerUsername = b.winner?.username ?? null;

      const payload = {
        battleId,
        streamId,
        hostUserId: b.hostUserId,
        hostUsername: b.host.username,
        opponentUserId: b.opponentUserId,
        opponentUsername: b.opponent.username,
        winnerUserId: b.winnerUserId ?? null,
        winnerUsername,
        hostScore: b.hostScore,
        opponentScore: b.opponentScore,
        startedAt: b.startedAt ? b.startedAt.toISOString() : null,
        endsAt: b.endsAt ? b.endsAt.toISOString() : null,
        endedAt: b.endedAt ? b.endedAt.toISOString() : null,
      };

      const targets: Array<{ userId: string; label: 'HOST' | 'OPPONENT'; username: string }> = [
        { userId: b.hostUserId, label: 'HOST', username: b.host.username },
        { userId: b.opponentUserId, label: 'OPPONENT', username: b.opponent.username },
      ];

      for (const t of targets) {
        const dedupeKey = `battle_end:${battleId}`;

        const existing = await this.prisma.notification.findFirst({
          where: { userId: t.userId, dedupeKey },
          select: { id: true },
        });
        if (existing) continue;

        const title = 'Battle ended';
        const isWinner = b.winnerUserId && b.winnerUserId === t.userId;
        const body = b.winnerUserId
          ? (isWinner ? 'You won the battle!' : `Winner: ${winnerUsername}`)
          : 'Battle ended';

        await this.prisma.notification.create({
          data: {
            userId: t.userId,
            type: NotificationType.BATTLE_ENDED,
            title,
            body,
            streamId,
            dedupeKey,
            payloadJson: payload as any,
          },
        });
      }
    }

    this.logger.debug(`battle end notifications: processed=${rows.length}`);
  }
}
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminStoreService } from "../admin-store/admin-store.service";
import { StreamsService } from "../streams/streams.service";
import { DiscoveryService } from "../discovery/discovery.service";
import { PayoutStatus } from "@prisma/client";

@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminStore: AdminStoreService,
    private readonly streams: StreamsService,
    private readonly discovery: DiscoveryService,
  ) { }

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

  async getOverview(adminUserId: string) {
    await this.requireAdmin(adminUserId);

    const [
      storeOverview,
      liveStreams,
      payoutGroups,
      payoutAggregate,
      earningsLeaderboard,
      giftersLeaderboard,
      recentPayouts,
      totalUsers,
      liveParticipantCount,
      recentChatCount,
      recentGiftCount,
    ] = await Promise.all([
      this.adminStore.getOverview(adminUserId),
      this.streams.listLive(),
      this.prisma.payoutRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.payoutRequest.aggregate({
        _sum: {
          netAmount: true,
          diamondAmount: true,
        },
      }),
      this.discovery.getLeaderboards(
        { type: "diamonds", period: "alltime", limit: 5 },
        undefined,
      ),
      this.discovery.getLeaderboards(
        { type: "gifters", period: "alltime", limit: 5 },
        undefined,
      ),
      this.prisma.payoutRequest.findMany({
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.prisma.user.count(),
      this.prisma.streamParticipant.count({
        where: {
          leftAt: null,
        },
      }),
      this.prisma.chatMessage.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.giftTransaction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const payoutCounts = {
      pending: 0,
      processing: 0,
      paid: 0,
      rejected: 0,
      cancelled: 0,
    };

    for (const row of payoutGroups) {
      switch (row.status) {
        case PayoutStatus.PENDING:
          payoutCounts.pending = row._count._all;
          break;
        case PayoutStatus.PROCESSING:
          payoutCounts.processing = row._count._all;
          break;
        case PayoutStatus.PAID:
          payoutCounts.paid = row._count._all;
          break;
        case PayoutStatus.REJECTED:
          payoutCounts.rejected = row._count._all;
          break;
        case PayoutStatus.CANCELLED:
          payoutCounts.cancelled = row._count._all;
          break;
      }
    }

    const totalConcurrentViewers = liveStreams.reduce(
      (sum, stream: any) => sum + Number(stream.viewerCount || 0),
      0,
    );

    const totalGuestBoxes = liveStreams.reduce(
      (sum, stream: any) => sum + Number(Array.isArray(stream.guests) ? stream.guests.length : 0),
      0,
    );

    const pkBattleCount = await this.prisma.battle.count({
      where: {
        status: {
          in: ["PENDING", "ACTIVE"],
        },
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      platform: {
        totalUsers,
        liveStreams: liveStreams.length,
        concurrentViewers: totalConcurrentViewers,
        liveParticipants: liveParticipantCount,
        guestBoxesActive: totalGuestBoxes,
        pkBattlesActive: pkBattleCount,
        recentChatLastHour: recentChatCount,
        recentGiftsLastHour: recentGiftCount,
      },
      store: storeOverview,
      payouts: {
        counts: payoutCounts,
        totals: {
          totalNetAmountCents: Number(payoutAggregate._sum.netAmount || 0),
          totalDiamondAmount: Number(payoutAggregate._sum.diamondAmount || 0),
        },
        recent: recentPayouts.map((row) => ({
          id: row.id,
          user: {
            id: row.user.id,
            publicId: row.user.publicId ?? null,
            username: row.user.username,
            displayName: row.user.profile?.displayName?.trim() || row.user.username,
          },
          status: row.status,
          diamondAmount: row.diamondAmount,
          netAmount: row.netAmount,
          paymentMethod: row.paymentMethod ?? null,
          createdAt: row.createdAt.toISOString(),
          processedAt: row.processedAt ? row.processedAt.toISOString() : null,
        })),
      },
      live: {
        streams: liveStreams.slice(0, 12),
      },
      leaderboards: {
        earners: earningsLeaderboard,
        gifters: giftersLeaderboard,
      },
    };
  }
}
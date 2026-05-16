import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";

type AwardGiftMilestonesParams = {
  userId: string;
  diamondsEarned: number;
  giverUserId: string;
  giftId: string;
  giftTxId: string;
  achievedAt: Date;
  streamId?: string | null;
};

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
  ) { }

  async awardGiftMilestones(params: AwardGiftMilestonesParams) {
    const MILLION = 1_000_000;
    const top = Math.floor(params.diamondsEarned / MILLION) * MILLION;

    if (top < MILLION) {
      return [];
    }

    const existing = await this.prisma.diamondMilestone.findMany({
      where: { userId: params.userId, milestoneAmount: { lte: top } },
      select: { milestoneAmount: true },
    });

    const have = new Set(existing.map((m) => m.milestoneAmount));

    const toCreate: number[] = [];
    for (let amt = MILLION; amt <= top; amt += MILLION) {
      if (!have.has(amt)) {
        toCreate.push(amt);
      }
    }

    if (toCreate.length === 0) {
      return [];
    }

    for (const amt of toCreate) {
      await this.prisma.diamondMilestone.create({
        data: {
          userId: params.userId,
          milestoneAmount: amt,
          achievedAt: params.achievedAt,
          giverUserId: params.giverUserId,
          giftId: params.giftId,
          giftTxId: params.giftTxId,
        },
      });
    }

    const [owner, giver] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: params.userId },
        include: { profile: true },
      }),
      this.prisma.user.findUnique({
        where: { id: params.giverUserId },
        include: { profile: true },
      }),
    ]);

    const giverName =
      giver?.profile?.displayName?.trim() || giver?.username || "Someone";

    for (const milestoneAmount of toCreate) {
      try {
        await this.notifications.createAndSendToUsers({
          userIds: [params.userId],
          notificationType: "MILESTONE_REACHED",
          title: "Diamond milestone reached",
          body: `${giverName} helped you reach ${milestoneAmount.toLocaleString()} diamonds`,
          payload: {
            userId: params.userId,
            giverUserId: params.giverUserId,
            giverUsername: giver?.username ?? null,
            giverDisplayName: giverName,
            giftId: params.giftId,
            giftTxId: params.giftTxId,
            milestoneAmount,
            achievedAt: params.achievedAt.toISOString(),
          },
          streamId: params.streamId ?? null,
          dedupeKey: `milestone:${params.userId}:${milestoneAmount}:${params.giftTxId}`,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[MilestonesService] milestone notification hook failed:", e);
      }
    }

    return toCreate.map((milestoneAmount) => ({
      milestoneAmount,
      userId: owner?.id ?? params.userId,
    }));
  }

  async getMilestonesByUsername(username: string) {
    const user = await this.users.requireByUsername(username);

    const rows = await this.prisma.diamondMilestone.findMany({
      where: { userId: user.id },
      orderBy: [
        { milestoneAmount: "desc" },
        { achievedAt: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        giver: {
          select: {
            id: true,
            username: true,
            publicId: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        giftTx: {
          select: {
            id: true,
            sender: {
              select: {
                id: true,
                username: true,
                publicId: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            gift: {
              select: {
                id: true,
                name: true,
                mediaUrl: true,
                mediaType: true,
                diamondValue: true,
              },
            },
          },
        },
      },
    });

    const fallbackGiverIds = Array.from(
      new Set(
        rows
          .filter((row) => !row.giver && !!row.giverUserId)
          .map((row) => row.giverUserId!),
      ),
    );

    const fallbackGiftIds = Array.from(
      new Set(
        rows
          .filter((row) => !row.giftTx?.gift && !!row.giftId)
          .map((row) => row.giftId!),
      ),
    );

    const [fallbackGivers, fallbackGifts] = await Promise.all([
      fallbackGiverIds.length
        ? this.prisma.user.findMany({
          where: { id: { in: fallbackGiverIds } },
          select: {
            id: true,
            username: true,
            publicId: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        })
        : Promise.resolve([]),
      fallbackGiftIds.length
        ? this.prisma.gift.findMany({
          where: { id: { in: fallbackGiftIds } },
          select: {
            id: true,
            name: true,
            mediaUrl: true,
            mediaType: true,
            diamondValue: true,
          },
        })
        : Promise.resolve([]),
    ]);

    const giverMap = new Map(fallbackGivers.map((giver) => [giver.id, giver]));
    const giftMap = new Map(fallbackGifts.map((gift) => [gift.id, gift]));

    return rows.map((m) => {
      const resolvedGiver =
        m.giver ??
        m.giftTx?.sender ??
        (m.giverUserId ? giverMap.get(m.giverUserId) ?? null : null);

      const resolvedGift =
        m.giftTx?.gift ??
        (m.giftId ? giftMap.get(m.giftId) ?? null : null);

      const giverDisplayName =
        resolvedGiver?.profile?.displayName?.trim() || resolvedGiver?.username || null;

      return {
        id: m.id,
        userId: m.userId,
        milestoneAmount: m.milestoneAmount,
        achievedAt: m.achievedAt.toISOString(),
        giverUserId: m.giverUserId ?? resolvedGiver?.id ?? null,
        giftId: m.giftId ?? resolvedGift?.id ?? null,
        giftTxId: m.giftTxId ?? null,

        giver: resolvedGiver
          ? {
            id: resolvedGiver.id,
            username: resolvedGiver.username ?? null,
            publicId: resolvedGiver.publicId ?? null,
            displayName: giverDisplayName,
            avatarUrl: resolvedGiver.profile?.avatarUrl ?? null,
          }
          : null,

        gift: resolvedGift
          ? {
            id: resolvedGift.id,
            name: resolvedGift.name,
            mediaUrl: resolvedGift.mediaUrl,
            mediaType: String(resolvedGift.mediaType).toLowerCase(),
            diamondValue: resolvedGift.diamondValue,
          }
          : null,

        giverDisplayName,
        giverUsername: resolvedGiver?.username ?? null,
        giverPublicId: resolvedGiver?.publicId ?? null,
        giverAvatarUrl: resolvedGiver?.profile?.avatarUrl ?? null,

        giftName: resolvedGift?.name ?? null,
        giftMediaUrl: resolvedGift?.mediaUrl ?? null,
      };
    });
  }
}
// backend/src/modules/battles/battles.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type StreamRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationsService } from "../notifications/notifications.service";
import type { BattleTypeV2 } from "./battle-v2.contract";
import { serializeBattleSessionV2 } from "./battle-v2.serializer";
import {
  BATTLE_TYPE_OPEN_DECISIONS,
  DIRECT_BATTLE_TIMER_SECONDS,
  DIRECT_HOST_INVITE_RECOMMENDED_TIMEOUT_SECONDS,
  ONE_V_ONE_COOLDOWN_SECONDS,
  RANDOM_BATTLE_DURATION_SECONDS,
  SUDDEN_DEATH_DURATION_SECONDS,
  TEAM_INVITE_TIMEOUT_SECONDS,
  getAllBattleTypeRules,
} from "./battle-v2.contract";

@Injectable()
export class BattlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) { }

  private room(streamId: string) {
    return `stream:${streamId}`;
  }

  // Fallback emit (in case RealtimeGateway helper isn't available for an event)
  private emit(event: string, payload: any) {
    const server = (this.realtime as any).server;
    if (!server) return;

    if (payload?.streamId) {
      server.to(this.room(payload.streamId)).emit(event, payload);
    }
  }

  private emitBattleStarted(payload: any) {
    const fn = (this.realtime as any)?.emitBattleStarted;
    if (typeof fn === "function") return fn.call(this.realtime, payload);
    this.emit("battle.started", payload);
  }

  private emitBattleScoreUpdated(payload: any) {
    const fn = (this.realtime as any)?.emitBattleScoreUpdated;
    if (typeof fn === "function") return fn.call(this.realtime, payload);
    this.emit("battle.scoreUpdated", payload);
  }

  private emitBattleEnded(payload: any) {
    const fn = (this.realtime as any)?.emitBattleEnded;
    if (typeof fn === "function") return fn.call(this.realtime, payload);
    this.emit("battle.ended", payload);
  }

  private emitBattleMvp(payload: any) {
    const fn = (this.realtime as any)?.emitBattleMvp;
    if (typeof fn === "function") return fn.call(this.realtime, payload);
    this.emit("battle.mvp", payload);
  }

  private mapBattle(b: any) {
    return {
      id: b.id,
      streamId: b.streamId,
      hostUserId: b.hostUserId,
      opponentUserId: b.opponentUserId,
      status: b.status,
      durationSeconds: b.durationSeconds,
      hostScore: b.hostScore,
      opponentScore: b.opponentScore,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : null,
      startedAt: b.startedAt ? new Date(b.startedAt).toISOString() : null,
      endsAt: b.endsAt ? new Date(b.endsAt).toISOString() : null,
      endedAt: b.endedAt ? new Date(b.endedAt).toISOString() : null,
      winnerUserId: b.winnerUserId ?? null,
    };
  }

  async getActiveBattle(streamId: string) {
    const battle = await this.prisma.battle.findFirst({
      where: { streamId, status: { in: ["PENDING", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
    });

    return battle ? this.mapBattle(battle) : null;
  }

  async getBattleById(battleId: string) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: { contributions: true },
    });

    if (!battle) throw new NotFoundException("Battle not found");

    const mapped = this.mapBattle(battle);

    const contributions = Array.isArray((battle as any).contributions)
      ? (battle as any).contributions.map((c: any) => ({
        id: c.id,
        battleId: c.battleId,
        giftTxId: c.giftTxId ?? null,
        senderUserId: c.senderUserId,
        recipientUserId: c.recipientUserId,
        diamondValue: c.diamondValue,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
      }))
      : [];

    return { ...mapped, contributions };
  }

  private async requireStream(streamId: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new NotFoundException("Stream not found");
    return stream;
  }

  private async actorRole(streamId: string, actorUserId: string): Promise<StreamRole> {
    const stream = await this.requireStream(streamId);
    if (stream.hostUserId === actorUserId) return "HOST";

    const participant = await this.prisma.streamParticipant.findFirst({
      where: { streamId, userId: actorUserId, leftAt: null },
      select: { role: true },
    });

    if (!participant) throw new ForbiddenException("Join stream first");
    return participant.role;
  }

  private ensureHost(role: StreamRole) {
    if (role !== "HOST") throw new ForbiddenException("Only the host can do this");
  }

  private winnerFromScores(hostScore: number, opponentScore: number): "HOST" | "OPPONENT" | null {
    if (hostScore > opponentScore) return "HOST";
    if (opponentScore > hostScore) return "OPPONENT";
    return null;
  }



  private readonly activeBattleSessionStatusesV2 = [
    "INVITING",
    "QUEUE_WAITING",
    "READY_CHECK",
    "ACTIVE",
    "SUDDEN_DEATH",
    "COOLDOWN",
    "REMATCH_READY_CHECK",
    "REMATCH_ACTIVE",
  ];

  private getBattleSessionIncludeV2() {
    const userSummarySelect = {
      id: true,
      username: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    };

    return {
      sides: {
        include: {
          host: {
            select: userSummarySelect,
          },
          participants: {
            include: {
              user: {
                select: userSummarySelect,
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          sideKey: "asc",
        },
      },
      participants: {
        include: {
          user: {
            select: userSummarySelect,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      invites: {
        orderBy: {
          createdAt: "desc",
        },
      },
      rematchVotes: {
        orderBy: {
          createdAt: "asc",
        },
      },
    };
  }

  private async getBattleSideContributionsForSummaryV2(battleId: string) {
    return (this.prisma as any).battleSideContribution.findMany({
      where: { battleId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }

  async getActiveBattleSessionForStreamV2(params: { streamId: string; actorUserId: string }) {
    const { streamId, actorUserId } = params;

    await this.requireStream(streamId);

    const session = await (this.prisma as any).battleSession.findFirst({
      where: {
        status: { in: this.activeBattleSessionStatusesV2 },
        sides: {
          some: { streamId },
        },
      },
      include: this.getBattleSessionIncludeV2(),
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return {
        ok: true,
        streamId,
        actorUserId,
        battle: null,
      };
    }

    const contributions = await this.getBattleSideContributionsForSummaryV2(session.id);

    return {
      ok: true,
      streamId,
      actorUserId,
      battle: serializeBattleSessionV2(session, contributions),
    };
  }

  async getBattleSessionV2(params: { battleSessionId: string; actorUserId: string }) {
    const { battleSessionId, actorUserId } = params;

    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    if (!session) {
      throw new NotFoundException("Battle session not found");
    }

    const contributions = await this.getBattleSideContributionsForSummaryV2(session.id);

    return {
      ok: true,
      actorUserId,
      battle: serializeBattleSessionV2(session, contributions),
    };
  }


  private assertDirectInviteBattleTypeV2(battleType: string) {
    if (battleType !== "ONE_V_ONE") {
      throw new BadRequestException("Only ONE_V_ONE direct invite eligibility is enabled in Stage 2A");
    }

    return "ONE_V_ONE" as const;
  }

  private async getLegacyBattleBusyUserIdsV2(userIds: string[]) {
    if (userIds.length === 0) return new Set<string>();

    const rows = await (this.prisma as any).battle.findMany({
      where: {
        status: { in: ["PENDING", "ACTIVE"] },
        OR: [
          { hostUserId: { in: userIds } },
          { opponentUserId: { in: userIds } },
        ],
      },
      select: {
        hostUserId: true,
        opponentUserId: true,
      },
    });

    const busy = new Set<string>();
    for (const row of rows) {
      if (row.hostUserId) busy.add(row.hostUserId);
      if (row.opponentUserId) busy.add(row.opponentUserId);
    }

    return busy;
  }

  private async getGeneralizedBattleBusyUserIdsV2(userIds: string[]) {
    if (userIds.length === 0) return new Set<string>();

    const rows = await (this.prisma as any).battleSide.findMany({
      where: {
        hostUserId: { in: userIds },
        battle: {
          status: { in: this.activeBattleSessionStatusesV2 },
        },
      },
      select: {
        hostUserId: true,
      },
    });

    return new Set<string>(
      (rows as any[])
        .map((row: any) => row.hostUserId)
        .filter((id: unknown): id is string => typeof id === "string"),
    );
  }

  private async getBlockedEitherDirectionUserIdsV2(actorUserId: string, candidateUserIds: string[]) {
    if (candidateUserIds.length === 0) return new Set<string>();

    const rows = await (this.prisma as any).userBlock.findMany({
      where: {
        OR: [
          { blockerId: actorUserId, blockedId: { in: candidateUserIds } },
          { blockedId: actorUserId, blockerId: { in: candidateUserIds } },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    const blocked = new Set<string>();
    for (const row of rows) {
      if (row.blockerId === actorUserId && row.blockedId) {
        blocked.add(row.blockedId);
      }
      if (row.blockedId === actorUserId && row.blockerId) {
        blocked.add(row.blockerId);
      }
    }

    return blocked;
  }

  async getEligibleDirectInviteHostsV2(params: {
    streamId: string;
    actorUserId: string;
    battleType?: string | null;
  }) {
    const { streamId, actorUserId } = params;
    const battleType = this.assertDirectInviteBattleTypeV2(params.battleType || "ONE_V_ONE");

    const stream = await this.requireStream(streamId);
    const isHost = stream.hostUserId === actorUserId;
    const isLive = stream.status === "LIVE";

    if (!isHost) {
      return {
        ok: true,
        streamId,
        actorUserId,
        battleType,
        eligibility: {
          canBrowseEligibleHosts: false,
          blockingReason: "ONLY_HOST_CAN_BROWSE_BATTLE_HOSTS",
        },
        hosts: [],
      };
    }

    if (!isLive) {
      return {
        ok: true,
        streamId,
        actorUserId,
        battleType,
        eligibility: {
          canBrowseEligibleHosts: false,
          blockingReason: "STREAM_NOT_LIVE",
        },
        hosts: [],
      };
    }

    const favoritesOut = await (this.prisma as any).userFavorite.findMany({
      where: { userId: actorUserId },
      select: {
        favoriteUserId: true,
        createdAt: true,
      },
    });

    const favoriteOutIds: string[] = (favoritesOut as any[])
      .map((row: any) => row.favoriteUserId)
      .filter((id: unknown): id is string => typeof id === "string" && id !== actorUserId);

    if (favoriteOutIds.length === 0) {
      return {
        ok: true,
        streamId,
        actorUserId,
        battleType,
        eligibility: {
          canBrowseEligibleHosts: true,
          blockingReason: null,
        },
        hosts: [],
      };
    }

    const favoritesBack = await (this.prisma as any).userFavorite.findMany({
      where: {
        favoriteUserId: actorUserId,
        userId: { in: favoriteOutIds },
      },
      select: {
        userId: true,
      },
    });

    const mutualIds: string[] = (favoritesBack as any[])
      .map((row: any) => row.userId)
      .filter((id: unknown): id is string => typeof id === "string" && id !== actorUserId);

    if (mutualIds.length === 0) {
      return {
        ok: true,
        streamId,
        actorUserId,
        battleType,
        eligibility: {
          canBrowseEligibleHosts: true,
          blockingReason: null,
        },
        hosts: [],
      };
    }

    const blockedIds = await this.getBlockedEitherDirectionUserIdsV2(actorUserId, mutualIds);
    const unblockedMutualIds: string[] = mutualIds.filter((id: string) => !blockedIds.has(id));

    if (unblockedMutualIds.length === 0) {
      return {
        ok: true,
        streamId,
        actorUserId,
        battleType,
        eligibility: {
          canBrowseEligibleHosts: true,
          blockingReason: null,
        },
        hosts: [],
      };
    }

    const [legacyBusyIds, generalizedBusyIds] = await Promise.all([
      this.getLegacyBattleBusyUserIdsV2(unblockedMutualIds),
      this.getGeneralizedBattleBusyUserIdsV2(unblockedMutualIds),
    ]);

    const busyIds = new Set<string>([
      ...Array.from(legacyBusyIds),
      ...Array.from(generalizedBusyIds),
    ]);
    const availableIds: string[] = unblockedMutualIds.filter((id: string) => !busyIds.has(id));

    if (availableIds.length === 0) {
      return {
        ok: true,
        streamId,
        actorUserId,
        battleType,
        eligibility: {
          canBrowseEligibleHosts: true,
          blockingReason: null,
        },
        hosts: [],
      };
    }

    const liveStreams = await (this.prisma as any).stream.findMany({
      where: {
        status: "LIVE",
        hostUserId: { in: availableIds },
      },
      include: {
        host: {
          include: {
            profile: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const hosts = liveStreams.map((candidateStream: any) => {
      const host = candidateStream.host || {};
      const profile = host.profile || {};

      return {
        userId: candidateStream.hostUserId,
        streamId: candidateStream.id,
        username: host.username ?? null,
        displayName: profile.displayName ?? host.username ?? "Live Host",
        avatarUrl: profile.avatarUrl ?? null,
        streamCategoryId: candidateStream.streamCategoryId ?? null,
        categoryId: candidateStream.streamCategoryId ?? null,
        viewerCount: candidateStream.viewerCount ?? candidateStream._count?.participants ?? 0,
        isMutualFavorite: true,
        isLive: true,
        isBattleAvailable: true,
      };
    });

    return {
      ok: true,
      streamId,
      actorUserId,
      battleType,
      eligibility: {
        canBrowseEligibleHosts: true,
        blockingReason: null,
      },
      hosts,
    };
  }


  private assertDirectInviteDurationSecondsV2(durationSeconds: number) {
    if (!(DIRECT_BATTLE_TIMER_SECONDS as readonly number[]).includes(durationSeconds)) {
      throw new BadRequestException("Invalid direct invite battle duration");
    }

    return durationSeconds;
  }

  private async assertMutualFavoriteV2(actorUserId: string, recipientUserId: string) {
    const [actorFavoritesRecipient, recipientFavoritesActor] = await Promise.all([
      (this.prisma as any).userFavorite.findFirst({
        where: {
          userId: actorUserId,
          favoriteUserId: recipientUserId,
        },
        select: { userId: true, favoriteUserId: true },
      }),
      (this.prisma as any).userFavorite.findFirst({
        where: {
          userId: recipientUserId,
          favoriteUserId: actorUserId,
        },
        select: { userId: true, favoriteUserId: true },
      }),
    ]);

    if (!actorFavoritesRecipient || !recipientFavoritesActor) {
      throw new BadRequestException("Direct battle invites require mutual favorites");
    }
  }

  private async assertUsersNotBlockedEitherDirectionV2(actorUserId: string, recipientUserId: string) {
    const blockedIds = await this.getBlockedEitherDirectionUserIdsV2(actorUserId, [recipientUserId]);

    if (blockedIds.has(recipientUserId)) {
      throw new BadRequestException("Cannot send battle invite because one user has blocked the other");
    }
  }

  private async assertUsersBattleAvailableV2(userIds: string[]) {
    const [legacyBusyIds, generalizedBusyIds] = await Promise.all([
      this.getLegacyBattleBusyUserIdsV2(userIds),
      this.getGeneralizedBattleBusyUserIdsV2(userIds),
    ]);

    const busyIds = new Set<string>([
      ...Array.from(legacyBusyIds),
      ...Array.from(generalizedBusyIds),
    ]);

    if (busyIds.size > 0) {
      throw new BadRequestException("One or more hosts are already in a pending or active battle");
    }
  }

  private async getLiveHostStreamForBattleV2(hostUserId: string) {
    return (this.prisma as any).stream.findFirst({
      where: {
        hostUserId,
        status: "LIVE",
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDirectInviteBattleV2(params: {
    streamId: string;
    actorUserId: string;
    battleType: string;
    recipientHostUserId: string;
    durationSeconds: number;
  }) {
    const { streamId, actorUserId, recipientHostUserId } = params;
    const battleType = this.assertDirectInviteBattleTypeV2(params.battleType);
    const durationSeconds = this.assertDirectInviteDurationSecondsV2(params.durationSeconds);

    if (recipientHostUserId === actorUserId) {
      throw new BadRequestException("Cannot invite yourself to a battle");
    }

    const senderStream = await this.requireStream(streamId);

    if (senderStream.hostUserId !== actorUserId) {
      throw new BadRequestException("Only the stream host can create a battle invite");
    }

    if (senderStream.status !== "LIVE") {
      throw new BadRequestException("Stream must be live to create a battle invite");
    }

    const recipientStream = await this.getLiveHostStreamForBattleV2(recipientHostUserId);

    if (!recipientStream) {
      throw new BadRequestException("Recipient host is not currently live");
    }

    await this.assertMutualFavoriteV2(actorUserId, recipientHostUserId);
    await this.assertUsersNotBlockedEitherDirectionV2(actorUserId, recipientHostUserId);
    await this.assertUsersBattleAvailableV2([actorUserId, recipientHostUserId]);

    const inviteExpiresAt = new Date(
      Date.now() + DIRECT_HOST_INVITE_RECOMMENDED_TIMEOUT_SECONDS * 1000,
    );

    const created = await (this.prisma as any).$transaction(async (tx: any) => {
      const battle = await tx.battleSession.create({
        data: {
          battleType,
          mode: "DIRECT_INVITE",
          status: "INVITING",
          createdByUserId: actorUserId,
          categoryId: (senderStream as any).streamCategoryId ?? null,
          durationSeconds,
          cooldownSeconds: ONE_V_ONE_COOLDOWN_SECONDS,
        },
      });

      const sideA = await tx.battleSide.create({
        data: {
          battleId: battle.id,
          sideKey: "A",
          streamId: senderStream.id,
          hostUserId: actorUserId,
          score: 0,
          result: "PENDING",
        },
      });

      const sideB = await tx.battleSide.create({
        data: {
          battleId: battle.id,
          sideKey: "B",
          streamId: recipientStream.id,
          hostUserId: recipientHostUserId,
          score: 0,
          result: "PENDING",
        },
      });

      await tx.battleParticipant.create({
        data: {
          battleId: battle.id,
          sideId: sideA.id,
          streamId: senderStream.id,
          userId: actorUserId,
          role: "HOST",
          status: "ACCEPTED",
          mediaMode: "VIDEO",
          acceptedAt: new Date(),
        },
      });

      await tx.battleParticipant.create({
        data: {
          battleId: battle.id,
          sideId: sideB.id,
          streamId: recipientStream.id,
          userId: recipientHostUserId,
          role: "HOST",
          status: "INVITED",
          mediaMode: "VIDEO",
        },
      });

      const invite = await tx.battleInvite.create({
        data: {
          battleId: battle.id,
          senderUserId: actorUserId,
          recipientUserId: recipientHostUserId,
          kind: "HOST_DIRECT",
          status: "PENDING",
          expiresAt: inviteExpiresAt,
        },
      });

      return { battleId: battle.id, inviteId: invite.id };
    });

    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: created.battleId },
      include: this.getBattleSessionIncludeV2(),
    });

    const contributions = await this.getBattleSideContributionsForSummaryV2(created.battleId);
    const serialized = serializeBattleSessionV2(session, contributions);

    this.emitBattleV2EventToSessionStreams("battle.v2.inviteCreated", serialized, {
      inviteId: created.inviteId,
      senderUserId: actorUserId,
      recipientUserId: recipientHostUserId,
      inviteExpiresAt: inviteExpiresAt.toISOString(),
    });

    return {
      ok: true,
      battleId: created.battleId,
      inviteId: created.inviteId,
      inviteExpiresAt: inviteExpiresAt.toISOString(),
      battle: serialized,
      notes: [
        "Direct invite created in INVITING state.",
        "Accept/start logic is intentionally not enabled until Stage 2C.",
      ],
    };
  }

  async cancelDirectInviteBattleV2(params: {
    battleSessionId: string;
    inviteId: string;
    actorUserId: string;
  }) {
    const { battleSessionId, inviteId, actorUserId } = params;

    const existing = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    if (!existing) {
      throw new NotFoundException("Battle session not found");
    }

    const invite = (existing.invites || []).find((row: any) => row.id === inviteId);

    if (!invite) {
      throw new NotFoundException("Battle invite not found");
    }

    if (invite.kind !== "HOST_DIRECT") {
      throw new BadRequestException("Only host direct invites can be cancelled here");
    }

    if (invite.senderUserId !== actorUserId && existing.createdByUserId !== actorUserId) {
      throw new BadRequestException("Only the invite sender can cancel this battle invite");
    }

    if (invite.status !== "PENDING") {
      throw new BadRequestException("Only pending battle invites can be cancelled");
    }

    if (existing.status !== "INVITING") {
      throw new BadRequestException("Only inviting battle sessions can be cancelled");
    }

    await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.battleInvite.update({
        where: { id: inviteId },
        data: {
          status: "CANCELLED",
          respondedAt: new Date(),
        },
      });

      await tx.battleParticipant.updateMany({
        where: {
          battleId: battleSessionId,
          status: "INVITED",
        },
        data: {
          status: "REMOVED",
          leftAt: new Date(),
        },
      });

      await tx.battleSession.update({
        where: { id: battleSessionId },
        data: {
          status: "CANCELLED",
          endedReason: "CANCELLED",
        },
      });
    });

    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    const contributions = await this.getBattleSideContributionsForSummaryV2(battleSessionId);
    const serialized = serializeBattleSessionV2(session, contributions);

    this.emitBattleV2EventToSessionStreams("battle.v2.inviteCancelled", serialized, {
      inviteId,
      cancelledByUserId: actorUserId,
    });

    return {
      ok: true,
      battleId: battleSessionId,
      inviteId,
      battle: serialized,
    };
  }


  private emitBattleV2EventToSessionStreams(event: string, session: any, extra: any = {}) {
    const streamIds = new Set<string>();

    for (const side of session?.sides || []) {
      if (typeof side?.streamId === "string") {
        streamIds.add(side.streamId);
      }
    }

    if (streamIds.size === 0 && typeof extra.streamId === "string") {
      streamIds.add(extra.streamId);
    }

    for (const streamId of streamIds) {
      this.emit(event, {
        ...extra,
        streamId,
        battleId: session?.id,
        battleSessionId: session?.id,
        battle: session,
      });
    }
  }

  private async getBattleSessionForInviteActionV2(battleSessionId: string) {
    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    if (!session) {
      throw new NotFoundException("Battle session not found");
    }

    return session;
  }

  private getPendingHostDirectInviteFromSessionV2(session: any, inviteId: string) {
    const invite = (session.invites || []).find((row: any) => row.id === inviteId);

    if (!invite) {
      throw new NotFoundException("Battle invite not found");
    }

    if (invite.kind !== "HOST_DIRECT") {
      throw new BadRequestException("Only host direct invites are supported here");
    }

    if (invite.status !== "PENDING") {
      throw new BadRequestException("Only pending battle invites can be acted on");
    }

    return invite;
  }

  private assertBattleInviteNotExpiredV2(invite: any) {
    const expiresAtMs = new Date(invite.expiresAt).getTime();

    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      throw new BadRequestException("Battle invite has expired");
    }
  }

  private getBattleParticipantForUserV2(session: any, userId: string) {
    return (session.participants || []).find((participant: any) => participant.userId === userId) || null;
  }

  async acceptDirectInviteBattleV2(params: {
    battleSessionId: string;
    inviteId: string;
    actorUserId: string;
  }) {
    const { battleSessionId, inviteId, actorUserId } = params;

    const existing = await this.getBattleSessionForInviteActionV2(battleSessionId);
    const invite = this.getPendingHostDirectInviteFromSessionV2(existing, inviteId);

    if (existing.status !== "INVITING") {
      throw new BadRequestException("Only inviting battle sessions can be accepted");
    }

    if (invite.recipientUserId !== actorUserId) {
      throw new BadRequestException("Only the invited host can accept this battle invite");
    }

    this.assertBattleInviteNotExpiredV2(invite);

    const recipientParticipant = this.getBattleParticipantForUserV2(existing, actorUserId);

    if (!recipientParticipant) {
      throw new BadRequestException("Invited host participant was not found");
    }

    const [senderStream, recipientStream] = await Promise.all([
      this.getLiveHostStreamForBattleV2(invite.senderUserId),
      this.getLiveHostStreamForBattleV2(invite.recipientUserId),
    ]);

    if (!senderStream) {
      throw new BadRequestException("Sender host is no longer live");
    }

    if (!recipientStream) {
      throw new BadRequestException("Recipient host is no longer live");
    }

    await this.assertUsersNotBlockedEitherDirectionV2(invite.senderUserId, invite.recipientUserId);

    const now = new Date();
    const endsAt = new Date(now.getTime() + Number(existing.durationSeconds) * 1000);

    await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.battleInvite.update({
        where: { id: inviteId },
        data: {
          status: "ACCEPTED",
          respondedAt: now,
        },
      });

      await tx.battleParticipant.update({
        where: { id: recipientParticipant.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
          streamId: recipientStream.id,
        },
      });

      await tx.battleSide.updateMany({
        where: {
          battleId: battleSessionId,
          hostUserId: invite.recipientUserId,
        },
        data: {
          streamId: recipientStream.id,
        },
      });

      await tx.battleSide.updateMany({
        where: {
          battleId: battleSessionId,
          hostUserId: invite.senderUserId,
        },
        data: {
          streamId: senderStream.id,
        },
      });

      await tx.battleSession.update({
        where: { id: battleSessionId },
        data: {
          status: "ACTIVE",
          startedAt: now,
          endsAt,
        },
      });
    });

    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    const contributions = await this.getBattleSideContributionsForSummaryV2(battleSessionId);
    const serialized = serializeBattleSessionV2(session, contributions);

    this.emitBattleV2EventToSessionStreams("battle.v2.inviteAccepted", serialized, {
      inviteId,
      acceptedByUserId: actorUserId,
    });

    this.emitBattleV2EventToSessionStreams("battle.v2.started", serialized, {
      inviteId,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    return {
      ok: true,
      battleId: battleSessionId,
      inviteId,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      battle: serialized,
    };
  }

  async declineDirectInviteBattleV2(params: {
    battleSessionId: string;
    inviteId: string;
    actorUserId: string;
  }) {
    const { battleSessionId, inviteId, actorUserId } = params;

    const existing = await this.getBattleSessionForInviteActionV2(battleSessionId);
    const invite = this.getPendingHostDirectInviteFromSessionV2(existing, inviteId);

    if (existing.status !== "INVITING") {
      throw new BadRequestException("Only inviting battle sessions can be declined");
    }

    if (invite.recipientUserId !== actorUserId) {
      throw new BadRequestException("Only the invited host can decline this battle invite");
    }

    const recipientParticipant = this.getBattleParticipantForUserV2(existing, actorUserId);

    const now = new Date();

    await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.battleInvite.update({
        where: { id: inviteId },
        data: {
          status: "DECLINED",
          respondedAt: now,
        },
      });

      if (recipientParticipant) {
        await tx.battleParticipant.update({
          where: { id: recipientParticipant.id },
          data: {
            status: "DECLINED",
            leftAt: now,
          },
        });
      }

      await tx.battleSession.update({
        where: { id: battleSessionId },
        data: {
          status: "DECLINED",
          endedReason: "DECLINED",
        },
      });
    });

    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    const contributions = await this.getBattleSideContributionsForSummaryV2(battleSessionId);
    const serialized = serializeBattleSessionV2(session, contributions);

    this.emitBattleV2EventToSessionStreams("battle.v2.inviteDeclined", serialized, {
      inviteId,
      declinedByUserId: actorUserId,
    });

    return {
      ok: true,
      battleId: battleSessionId,
      inviteId,
      battle: serialized,
    };
  }


  private readonly contributionBattleSessionStatusesV2 = [
    "ACTIVE",
    "SUDDEN_DEATH",
    "REMATCH_ACTIVE",
  ];

  private assertBattleCanReceiveContributionV2(session: any) {
    if (!this.contributionBattleSessionStatusesV2.includes(session.status)) {
      throw new BadRequestException("Battle is not accepting gift contributions");
    }

    const endsAtMs = session.endsAt ? new Date(session.endsAt).getTime() : null;

    if (!endsAtMs || !Number.isFinite(endsAtMs)) {
      throw new BadRequestException("Battle timer is not active");
    }

    if (endsAtMs <= Date.now()) {
      throw new BadRequestException("Battle timer has ended");
    }
  }

  private getBattleSideFromSessionV2(session: any, sideId: string) {
    const side = (session.sides || []).find((row: any) => row.id === sideId);

    if (!side) {
      throw new NotFoundException("Battle side not found");
    }

    return side;
  }

  private getGiftTxSenderUserIdV2(giftTx: any): string | null {
    const value =
      giftTx?.senderUserId ??
      giftTx?.fromUserId ??
      giftTx?.userId ??
      giftTx?.buyerUserId ??
      giftTx?.purchaserUserId ??
      null;

    return typeof value === "string" ? value : null;
  }

  private getGiftTxRecipientUserIdV2(giftTx: any): string | null {
    const value =
      giftTx?.recipientUserId ??
      giftTx?.receiverUserId ??
      giftTx?.toUserId ??
      giftTx?.hostUserId ??
      giftTx?.creatorUserId ??
      null;

    return typeof value === "string" ? value : null;
  }

  private getGiftTxDiamondValueV2(giftTx: any): number {
    const raw =
      giftTx?.diamondValue ??
      giftTx?.diamonds ??
      giftTx?.amountDiamonds ??
      giftTx?.totalDiamonds ??
      giftTx?.valueDiamonds ??
      giftTx?.value ??
      giftTx?.gift?.diamondValue ??
      giftTx?.gift?.diamonds ??
      giftTx?.gift?.priceDiamonds ??
      giftTx?.gift?.coinPrice ??
      null;

    const value = Number(raw);

    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException("Gift transaction does not have a valid diamond value");
    }

    return Math.floor(value);
  }

  private getAllowedRecipientUserIdsForSideV2(side: any) {
    const ids = new Set<string>();

    if (typeof side?.hostUserId === "string") {
      ids.add(side.hostUserId);
    }

    for (const participant of side?.participants || []) {
      if (typeof participant?.userId === "string") {
        ids.add(participant.userId);
      }
    }

    return ids;
  }

  private getContributionPhaseForSessionV2(session: any) {
    if (session.status === "SUDDEN_DEATH" || Number(session.suddenDeathRound || 0) > 0) {
      return "SUDDEN_DEATH";
    }

    return "REGULAR";
  }

  async recordBattleGiftContributionV2(params: {
    battleSessionId: string;
    sideId: string;
    actorUserId: string;
    giftTxId: string;
  }) {
    const { battleSessionId, sideId, actorUserId, giftTxId } = params;

    const existing = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    if (!existing) {
      throw new NotFoundException("Battle session not found");
    }

    this.assertBattleCanReceiveContributionV2(existing);

    const side = this.getBattleSideFromSessionV2(existing, sideId);

    const giftTx = await (this.prisma as any).giftTransaction.findUnique({
      where: { id: giftTxId },
      include: {
        gift: true,
      },
    });

    if (!giftTx) {
      throw new NotFoundException("Gift transaction not found");
    }

    const senderUserId = this.getGiftTxSenderUserIdV2(giftTx);

    if (!senderUserId) {
      throw new BadRequestException("Gift transaction sender could not be determined");
    }

    if (senderUserId !== actorUserId) {
      throw new BadRequestException("Only the gift sender can record this battle contribution");
    }

    const allowedRecipientUserIds = this.getAllowedRecipientUserIdsForSideV2(side);
    let recipientUserId = this.getGiftTxRecipientUserIdV2(giftTx);

    if (!recipientUserId) {
      recipientUserId = side.hostUserId ?? Array.from(allowedRecipientUserIds)[0] ?? null;
    }

    if (!recipientUserId || !allowedRecipientUserIds.has(recipientUserId)) {
      throw new BadRequestException("Gift transaction recipient is not on the selected battle side");
    }

    const diamondValue = this.getGiftTxDiamondValueV2(giftTx);
    const phase = this.getContributionPhaseForSessionV2(existing);
    const suddenDeathRound = Number(existing.suddenDeathRound || 0);

    const contributionResult = await (this.prisma as any).$transaction(async (tx: any) => {
      const alreadyRecorded = await tx.battleSideContribution.findUnique({
        where: { giftTxId },
      });

      if (alreadyRecorded) {
        if (alreadyRecorded.battleId !== battleSessionId || alreadyRecorded.sideId !== sideId) {
          throw new BadRequestException("Gift transaction was already recorded for another battle side");
        }

        return {
          contribution: alreadyRecorded,
          alreadyRecorded: true,
        };
      }

      const contribution = await tx.battleSideContribution.create({
        data: {
          battleId: battleSessionId,
          sideId,
          giftTxId,
          senderUserId,
          recipientUserId,
          diamondValue,
          phase,
          suddenDeathRound,
        },
      });

      await tx.battleSide.update({
        where: { id: sideId },
        data: {
          score: {
            increment: diamondValue,
          },
        },
      });

      return {
        contribution,
        alreadyRecorded: false,
      };
    });

    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    const contributions = await this.getBattleSideContributionsForSummaryV2(battleSessionId);
    const serialized = serializeBattleSessionV2(session, contributions);

    this.emitBattleV2EventToSessionStreams("battle.v2.scoreUpdated", serialized, {
      sideId,
      giftTxId,
      contributionId: contributionResult.contribution.id,
      diamondValue: contributionResult.contribution.diamondValue,
      alreadyRecorded: contributionResult.alreadyRecorded,
    });

    return {
      ok: true,
      battleId: battleSessionId,
      sideId,
      giftTxId,
      contributionId: contributionResult.contribution.id,
      diamondValue: contributionResult.contribution.diamondValue,
      alreadyRecorded: contributionResult.alreadyRecorded,
      battle: serialized,
    };
  }


  private readonly expirableBattleSessionStatusesV2 = [
    "ACTIVE",
    "SUDDEN_DEATH",
    "REMATCH_ACTIVE",
  ];

  private readonly battleV2ExpiryProcessorIntervalMs = 5000;
  private battleV2ExpiryProcessorTimer: any = null;

  onModuleInit() {
    if (this.battleV2ExpiryProcessorTimer) return;

    this.battleV2ExpiryProcessorTimer = setInterval(() => {
      void this.processExpiredBattleSessionsV2({ limit: 10 }).catch(() => undefined);
      void this.processExpiredBattleCooldownsV2({ limit: 10 }).catch(() => undefined);
      void this.processExpiredBattleInvitesV2({ limit: 10 }).catch(() => undefined);
    }, this.battleV2ExpiryProcessorIntervalMs);
  }

  onModuleDestroy() {
    if (this.battleV2ExpiryProcessorTimer) {
      clearInterval(this.battleV2ExpiryProcessorTimer);
      this.battleV2ExpiryProcessorTimer = null;
    }
  }

  private assertBattleCanBeExpiryProcessedV2(session: any) {
    const status = String(session?.status || "").toUpperCase();
    const expirableStatuses = new Set(["ACTIVE", "SUDDEN_DEATH", "REMATCH_ACTIVE"]);

    if (!expirableStatuses.has(status)) {
      return {
        canProcess: false,
        reason: "STATUS_NOT_EXPIRABLE",
      };
    }

    const endsAtMs = session?.endsAt ? new Date(session.endsAt).getTime() : null;

    if (!endsAtMs || !Number.isFinite(endsAtMs)) {
      return {
        canProcess: false,
        reason: "BATTLE_TIMER_NOT_ACTIVE",
      };
    }

    if (endsAtMs > Date.now()) {
      return {
        canProcess: false,
        reason: "BATTLE_TIMER_NOT_EXPIRED",
      };
    }

    return {
      canProcess: true,
      reason: null,
    };
  }

  private getWinningSidesByScoreV2(sides: any[]) {
    if (!Array.isArray(sides) || sides.length === 0) {
      return {
        highestScore: 0,
        winningSides: [],
      };
    }

    const highestScore = Math.max(
      ...sides.map((side: any) => Number(side?.score ?? 0)),
    );

    return {
      highestScore,
      winningSides: sides.filter((side: any) => Number(side?.score ?? 0) === highestScore),
    };
  }

  private getCooldownSecondsForBattleSessionV2(session: any) {
    const value = Number(session?.cooldownSeconds ?? 0);

    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }

    return ONE_V_ONE_COOLDOWN_SECONDS;
  }

  private async reloadSerializedBattleSessionV2(battleSessionId: string) {
    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    const contributions = await this.getBattleSideContributionsForSummaryV2(battleSessionId);

    return serializeBattleSessionV2(session, contributions);
  }

  async processBattleTimerExpiryV2(params: {
    battleSessionId: string;
    actorUserId?: string | null;
  }) {
    const { battleSessionId } = params;

    const existing = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    if (!existing) {
      throw new NotFoundException("Battle session not found");
    }

    const processCheck = this.assertBattleCanBeExpiryProcessedV2(existing);

    if (!processCheck.canProcess) {
      const serialized = serializeBattleSessionV2(
        existing,
        await this.getBattleSideContributionsForSummaryV2(battleSessionId),
      );

      return {
        ok: true,
        battleId: battleSessionId,
        processed: false,
        reason: processCheck.reason,
        battle: serialized,
      };
    }

    const sides = Array.isArray(existing.sides) ? existing.sides : [];
    const { highestScore, winningSides } = this.getWinningSidesByScoreV2(sides);
    const now = new Date();


    // BATTLE_STAGE5U_TIE_MUST_START_SUDDEN_DEATH
    // A tied expired battle must stay in the same battle session and become sudden death.
    // It must not enter cooldown, because cooldown opens rematch UI.
    if (winningSides.length !== 1) {
      const now = new Date();
      const suddenDeathEndsAt = new Date(now.getTime() + 40_000);
      const existingAny: any = existing as any;
      const nextSuddenDeathRound = Number(existingAny?.suddenDeathRound || 0) + 1;

      const updateData: any = {
        status: "SUDDEN_DEATH",
        endsAt: suddenDeathEndsAt,
        cooldownStartedAt: null,
        cooldownEndsAt: null,
        winnerSideId: null,
      };

      if (Object.prototype.hasOwnProperty.call(existingAny, "suddenDeathRound")) {
        updateData.suddenDeathRound = nextSuddenDeathRound;
      }

      await (this.prisma as any).battleSession.update({
        where: { id: battleSessionId },
        data: updateData,
      });

      const serialized = await this.reloadSerializedBattleSessionV2(battleSessionId);

      this.emitBattleV2EventToSessionStreams("battle.v2.suddenDeathStarted", serialized, {
        battleId: battleSessionId,
        highestScore,
        tiedSideIds: winningSides.map((side: any) => side.id),
        tiedSideKeys: winningSides.map((side: any) => side.sideKey),
        suddenDeathStartedAt: now.toISOString(),
        suddenDeathEndsAt: suddenDeathEndsAt.toISOString(),
        suddenDeathCountdownSeconds: 10,
        suddenDeathScoringSeconds: 30,
        suddenDeathStartsAt: new Date(suddenDeathEndsAt.getTime() - 30_000).toISOString(),
        endsAt: suddenDeathEndsAt.toISOString(),
      });

      return {
        ok: true,
        battleId: battleSessionId,
        processed: true,
        result: "SUDDEN_DEATH_STARTED",
        highestScore,
        tiedSideIds: winningSides.map((side: any) => side.id),
        tiedSideKeys: winningSides.map((side: any) => side.sideKey),
        suddenDeathStartedAt: now.toISOString(),
        suddenDeathEndsAt: suddenDeathEndsAt.toISOString(),
        suddenDeathCountdownSeconds: 10,
        suddenDeathScoringSeconds: 30,
        suddenDeathStartsAt: new Date(suddenDeathEndsAt.getTime() - 30_000).toISOString(),
        battle: serialized,
      };
    }

    const winnerSide = winningSides[0];
    const cooldownSeconds = this.getCooldownSecondsForBattleSessionV2(existing);
    const cooldownEndsAt = new Date(now.getTime() + cooldownSeconds * 1000);

    await (this.prisma as any).$transaction(async (tx: any) => {
      for (const side of sides) {
        await tx.battleSide.update({
          where: { id: side.id },
          data: {
            result: side.id === winnerSide.id ? "WIN" : "LOSS",
          },
        });
      }

      await tx.battleSession.update({
        where: { id: battleSessionId },
        data: {
          status: "COOLDOWN",
          winnerSideId: winnerSide.id,
          cooldownStartedAt: now,
          cooldownEndsAt,
          endedReason: "NORMAL",
        },
      });
    });

    const serialized = await this.reloadSerializedBattleSessionV2(battleSessionId);

    this.emitBattleV2EventToSessionStreams("battle.v2.cooldownStarted", serialized, {
      battleId: battleSessionId,
      winnerSideId: winnerSide.id,
      winnerSideKey: winnerSide.sideKey,
      winningScore: Number(winnerSide.score ?? 0),
      cooldownStartedAt: now.toISOString(),
      cooldownEndsAt: cooldownEndsAt.toISOString(),
    });

    return {
      ok: true,
      battleId: battleSessionId,
      processed: true,
      result: "COOLDOWN_STARTED",
      winnerSideId: winnerSide.id,
      winnerSideKey: winnerSide.sideKey,
      winningScore: Number(winnerSide.score ?? 0),
      cooldownStartedAt: now.toISOString(),
      cooldownEndsAt: cooldownEndsAt.toISOString(),
      battle: serialized,
    };
  }

  async processExpiredBattleSessionsV2(params: { limit?: number } = {}) {
    const limit = Math.max(1, Math.min(Number(params.limit ?? 10), 50));
    const now = new Date();

    const expired = await (this.prisma as any).battleSession.findMany({
      where: {
        status: { in: this.expirableBattleSessionStatusesV2 },
        endsAt: { lte: now },
      },
      select: { id: true },
      orderBy: { endsAt: "asc" },
      take: limit,
    });

    const results = [];

    for (const row of expired) {
      try {
        results.push(await this.processBattleTimerExpiryV2({ battleSessionId: row.id }));
      } catch (error: any) {
        results.push({
          ok: false,
          battleId: row.id,
          error: error?.message ?? "Failed to process expired battle",
        });
      }
    }

    return {
      ok: true,
      checkedAt: now.toISOString(),
      found: expired.length,
      processed: results,
    };
  }


  private getRematchEligibleParticipantsV2(session: any) {
    return (session?.participants || []).filter((participant: any) => {
      return participant?.status === "ACCEPTED" && !participant?.leftAt;
    });
  }

  private getCooldownEndsAtMsV2(session: any) {
    const cooldownEndsAtMs = session?.cooldownEndsAt ? new Date(session.cooldownEndsAt).getTime() : null;

    if (!cooldownEndsAtMs || !Number.isFinite(cooldownEndsAtMs)) {
      return null;
    }

    return cooldownEndsAtMs;
  }

  private getRematchVoteByUserIdV2(session: any) {
    const votes = new Map<string, any>();

    for (const vote of session?.rematchVotes || []) {
      if (typeof vote?.userId === "string") {
        votes.set(vote.userId, vote);
      }
    }

    return votes;
  }

  private hasUnanimousRematchBeforeCooldownEndV2(session: any) {
    const participants = this.getRematchEligibleParticipantsV2(session);
    const cooldownEndsAtMs = this.getCooldownEndsAtMsV2(session);

    if (!cooldownEndsAtMs || participants.length < 2) {
      return false;
    }

    const votesByUserId = this.getRematchVoteByUserIdV2(session);

    for (const participant of participants) {
      const vote = votesByUserId.get(participant.userId);

      if (!vote || vote.vote !== "REMATCH") {
        return false;
      }

      const votedAtMs = vote.votedAt ? new Date(vote.votedAt).getTime() : null;

      if (!votedAtMs || !Number.isFinite(votedAtMs) || votedAtMs > cooldownEndsAtMs) {
        return false;
      }
    }

    return true;
  }

  private hasAnySkipRematchVoteV2(session: any) {
    return (session?.rematchVotes || []).some((vote: any) => vote?.vote === "SKIP");
  }

  private async endBattleCooldownAfterSkipV2(existing: any, skippedByUserId?: string | null) {
    const now = new Date();

    await (this.prisma as any).battleSession.update({
      where: { id: existing.id },
      data: {
        status: "ENDED",
        endedReason: "NORMAL",
      },
    });

    const serialized = await this.reloadSerializedBattleSessionV2(existing.id);

    this.emitBattleV2EventToSessionStreams("battle.v2.ended", serialized, {
      battleId: existing.id,
      endedReason: "NORMAL",
      endedAt: now.toISOString(),
      rematchStarted: false,
      rematchSkipped: true,
      skippedByUserId: skippedByUserId ?? null,
    });

    return {
      ok: true,
      battleId: existing.id,
      processed: true,
      result: "BATTLE_ENDED_BY_SKIP",
      rematchStarted: false,
      rematchSkipped: true,
      skippedByUserId: skippedByUserId ?? null,
      endedAt: now.toISOString(),
      battle: serialized,
    };
  }

  private async reloadBattleSessionForRematchV2(battleSessionId: string) {
    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    if (!session) {
      throw new NotFoundException("Battle session not found");
    }

    return session;
  }

  private async startRematchBattleFromCooldownV2(existing: any) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + Number(existing.durationSeconds) * 1000);
    const eligibleParticipants = this.getRematchEligibleParticipantsV2(existing);

    const created = await (this.prisma as any).$transaction(async (tx: any) => {
      const rematch = await tx.battleSession.create({
        data: {
          battleType: existing.battleType,
          mode: "REMATCH",
          status: "ACTIVE",
          createdByUserId: existing.createdByUserId,
          categoryId: existing.categoryId ?? null,
          durationSeconds: existing.durationSeconds,
          cooldownSeconds: existing.cooldownSeconds,
          startedAt: now,
          endsAt,
          suddenDeathRound: 0,
          parentBattleId: existing.id,
        },
      });

      const sideIdMap = new Map<string, string>();

      for (const side of existing.sides || []) {
        const newSide = await tx.battleSide.create({
          data: {
            battleId: rematch.id,
            sideKey: side.sideKey,
            streamId: side.streamId ?? null,
            hostUserId: side.hostUserId ?? null,
            score: 0,
            result: "PENDING",
          },
        });

        sideIdMap.set(side.id, newSide.id);
      }

      for (const participant of eligibleParticipants) {
        const newSideId = sideIdMap.get(participant.sideId);

        if (!newSideId) continue;

        await tx.battleParticipant.create({
          data: {
            battleId: rematch.id,
            sideId: newSideId,
            streamId: participant.streamId ?? null,
            userId: participant.userId,
            role: participant.role,
            status: "ACCEPTED",
            mediaMode: participant.mediaMode,
            acceptedAt: now,
          },
        });
      }

      await tx.battleSession.update({
        where: { id: existing.id },
        data: {
          status: "ENDED",
          endedReason: "NORMAL",
        },
      });

      return {
        rematchId: rematch.id,
      };
    });

    const serialized = await this.reloadSerializedBattleSessionV2(created.rematchId);

    this.emitBattleV2EventToSessionStreams("battle.v2.rematchStarted", serialized, {
      previousBattleId: existing.id,
      battleId: created.rematchId,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    return {
      ok: true,
      battleId: existing.id,
      processed: true,
      result: "REMATCH_STARTED",
      rematchBattleId: created.rematchId,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      battle: serialized,
    };
  }

  async submitBattleRematchVoteV2(params: {
    battleSessionId: string;
    actorUserId: string;
    vote: "REMATCH" | "SKIP";
  }) {
    const { battleSessionId, actorUserId, vote } = params;

    const existing = await this.reloadBattleSessionForRematchV2(battleSessionId);

    if (existing.status !== "COOLDOWN") {
      throw new BadRequestException("Battle is not in cooldown");
    }

    const cooldownEndsAtMs = this.getCooldownEndsAtMsV2(existing);

    if (!cooldownEndsAtMs || cooldownEndsAtMs <= Date.now()) {
      throw new BadRequestException("Battle cooldown has ended");
    }

    const participant = this.getRematchEligibleParticipantsV2(existing)
      .find((row: any) => row.userId === actorUserId);

    if (!participant) {
      throw new BadRequestException("Only active battle participants can vote for rematch");
    }

    const now = new Date();

    await (this.prisma as any).$transaction(async (tx: any) => {
      const existingVote = await tx.battleRematchVote.findFirst({
        where: {
          battleId: battleSessionId,
          userId: actorUserId,
        },
      });

      if (existingVote) {
        await tx.battleRematchVote.update({
          where: { id: existingVote.id },
          data: {
            sideId: participant.sideId,
            participantId: participant.id,
            vote,
            votedAt: now,
          },
        });
      } else {
        await tx.battleRematchVote.create({
          data: {
            battleId: battleSessionId,
            sideId: participant.sideId,
            participantId: participant.id,
            userId: actorUserId,
            vote,
            votedAt: now,
          },
        });
      }
    });

    const reloaded = await this.reloadBattleSessionForRematchV2(battleSessionId);
    const serialized = serializeBattleSessionV2(
      reloaded,
      await this.getBattleSideContributionsForSummaryV2(battleSessionId),
    );

    this.emitBattleV2EventToSessionStreams("battle.v2.rematchVoteUpdated", serialized, {
      battleId: battleSessionId,
      userId: actorUserId,
      vote,
      votedAt: now.toISOString(),
    });

    if (vote === "SKIP") {
      return this.endBattleCooldownAfterSkipV2(reloaded, actorUserId);
    }

    if (vote === "REMATCH" && this.hasUnanimousRematchBeforeCooldownEndV2(reloaded)) {
      return this.startRematchBattleFromCooldownV2(reloaded);
    }

    return {
      ok: true,
      battleId: battleSessionId,
      vote,
      rematchStarted: false,
      battle: serialized,
    };
  }

  async skipBattleSessionV2(params: { battleSessionId: string; actorUserId: string }) {
    const { battleSessionId, actorUserId } = params;
    const existing = await this.reloadBattleSessionForRematchV2(battleSessionId);

    if (!["ACTIVE", "SUDDEN_DEATH", "REMATCH_ACTIVE"].includes(existing.status)) {
      throw new BadRequestException("Only active battles can be skipped");
    }

    const participant = existing.participants?.find((p: any) => p.userId === actorUserId);
    if (!participant && existing.createdByUserId !== actorUserId) {
      throw new ForbiddenException("Not authorized to skip this battle");
    }

    return this.endBattleCooldownAfterSkipV2(existing, actorUserId);
  }

  async processBattleCooldownExpiryV2(params: {
    battleSessionId: string;
    actorUserId?: string | null;
  }) {
    const { battleSessionId } = params;
    const existing = await this.reloadBattleSessionForRematchV2(battleSessionId);

    if (existing.status !== "COOLDOWN") {
      const serialized = serializeBattleSessionV2(
        existing,
        await this.getBattleSideContributionsForSummaryV2(battleSessionId),
      );

      return {
        ok: true,
        battleId: battleSessionId,
        processed: false,
        reason: "BATTLE_NOT_IN_COOLDOWN",
        battle: serialized,
      };
    }

    const cooldownEndsAtMs = this.getCooldownEndsAtMsV2(existing);

    if (this.hasAnySkipRematchVoteV2(existing)) {
      return this.endBattleCooldownAfterSkipV2(existing, null);
    }

    if (!cooldownEndsAtMs || cooldownEndsAtMs > Date.now()) {
      const serialized = serializeBattleSessionV2(
        existing,
        await this.getBattleSideContributionsForSummaryV2(battleSessionId),
      );

      return {
        ok: true,
        battleId: battleSessionId,
        processed: false,
        reason: "COOLDOWN_STILL_ACTIVE",
        battle: serialized,
      };
    }

    if (this.hasUnanimousRematchBeforeCooldownEndV2(existing)) {
      return this.startRematchBattleFromCooldownV2(existing);
    }

    await (this.prisma as any).battleSession.update({
      where: { id: battleSessionId },
      data: {
        status: "ENDED",
        endedReason: "NORMAL",
      },
    });

    const serialized = await this.reloadSerializedBattleSessionV2(battleSessionId);

    this.emitBattleV2EventToSessionStreams("battle.v2.ended", serialized, {
      battleId: battleSessionId,
      endedReason: "NORMAL",
      endedAt: new Date().toISOString(),
      rematchStarted: false,
    });

    return {
      ok: true,
      battleId: battleSessionId,
      processed: true,
      result: "BATTLE_ENDED",
      rematchStarted: false,
      battle: serialized,
    };
  }

  async processExpiredBattleCooldownsV2(params: { limit?: number } = {}) {
    const limit = Math.max(1, Math.min(Number(params.limit ?? 10), 50));
    const now = new Date();

    const cooldowns = await (this.prisma as any).battleSession.findMany({
      where: {
        status: "COOLDOWN",
        cooldownEndsAt: { lte: now },
      },
      select: { id: true },
      orderBy: { cooldownEndsAt: "asc" },
      take: limit,
    });

    const results = [];

    for (const row of cooldowns) {
      try {
        results.push(await this.processBattleCooldownExpiryV2({ battleSessionId: row.id }));
      } catch (error: any) {
        results.push({
          ok: false,
          battleId: row.id,
          error: error?.message ?? "Failed to process expired battle cooldown",
        });
      }
    }

    return {
      ok: true,
      checkedAt: now.toISOString(),
      found: cooldowns.length,
      processed: results,
    };
  }


  async getBattleInvitesForStreamV2(params: {
    streamId: string;
    actorUserId: string;
  }) {
    const { streamId, actorUserId } = params;

    const stream = await this.requireStream(streamId);

    if (stream.hostUserId !== actorUserId) {
      throw new BadRequestException("Only the stream host can view battle invites");
    }

    const sessions = await (this.prisma as any).battleSession.findMany({
      where: {
        status: "INVITING",
        sides: {
          some: {
            OR: [
              { streamId },
              { hostUserId: actorUserId },
            ],
          },
        },
        invites: {
          some: {
            status: "PENDING",
            OR: [
              { senderUserId: actorUserId },
              { recipientUserId: actorUserId },
            ],
          },
        },
      },
      include: this.getBattleSessionIncludeV2(),
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const incoming: any[] = [];
    const outgoing: any[] = [];

    for (const session of sessions as any[]) {
      const contributions = await this.getBattleSideContributionsForSummaryV2(session.id);
      const serialized = serializeBattleSessionV2(session, contributions);

      for (const invite of session.invites || []) {
        if (invite.status !== "PENDING") continue;

        const item = {
          invite,
          battleId: session.id,
          battleSessionId: session.id,
          battle: serialized,
          direction: invite.recipientUserId === actorUserId ? "INCOMING" : "OUTGOING",
        };

        if (invite.recipientUserId === actorUserId) {
          incoming.push(item);
        } else if (invite.senderUserId === actorUserId) {
          outgoing.push(item);
        }
      }
    }

    return {
      ok: true,
      streamId,
      actorUserId,
      incoming,
      outgoing,
      total: incoming.length + outgoing.length,
    };
  }

  async processBattleInviteExpiryV2(params: {
    battleSessionId: string;
    inviteId: string;
    actorUserId?: string | null;
  }) {
    const { battleSessionId, inviteId } = params;

    const existing = await this.getBattleSessionForInviteActionV2(battleSessionId);
    const invite = (existing.invites || []).find((row: any) => row.id === inviteId);

    if (!invite) {
      throw new NotFoundException("Battle invite not found");
    }

    if (invite.status !== "PENDING") {
      const serialized = serializeBattleSessionV2(
        existing,
        await this.getBattleSideContributionsForSummaryV2(battleSessionId),
      );

      return {
        ok: true,
        battleId: battleSessionId,
        inviteId,
        processed: false,
        reason: "INVITE_NOT_PENDING",
        battle: serialized,
      };
    }

    if (existing.status !== "INVITING") {
      const serialized = serializeBattleSessionV2(
        existing,
        await this.getBattleSideContributionsForSummaryV2(battleSessionId),
      );

      return {
        ok: true,
        battleId: battleSessionId,
        inviteId,
        processed: false,
        reason: "BATTLE_NOT_INVITING",
        battle: serialized,
      };
    }

    const expiresAtMs = invite.expiresAt ? new Date(invite.expiresAt).getTime() : null;

    if (!expiresAtMs || !Number.isFinite(expiresAtMs) || expiresAtMs > Date.now()) {
      const serialized = serializeBattleSessionV2(
        existing,
        await this.getBattleSideContributionsForSummaryV2(battleSessionId),
      );

      return {
        ok: true,
        battleId: battleSessionId,
        inviteId,
        processed: false,
        reason: "INVITE_NOT_EXPIRED",
        battle: serialized,
      };
    }

    const now = new Date();

    await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.battleInvite.update({
        where: { id: inviteId },
        data: {
          status: "EXPIRED",
          respondedAt: now,
        },
      });

      await tx.battleParticipant.updateMany({
        where: {
          battleId: battleSessionId,
          userId: invite.recipientUserId,
          status: "INVITED",
        },
        data: {
          status: "TIMED_OUT",
          leftAt: now,
        },
      });

      await tx.battleSession.update({
        where: { id: battleSessionId },
        data: {
          status: "EXPIRED",
          endedReason: "EXPIRED",
        },
      });
    });

    const session = await (this.prisma as any).battleSession.findUnique({
      where: { id: battleSessionId },
      include: this.getBattleSessionIncludeV2(),
    });

    const contributions = await this.getBattleSideContributionsForSummaryV2(battleSessionId);
    const serialized = serializeBattleSessionV2(session, contributions);

    this.emitBattleV2EventToSessionStreams("battle.v2.inviteExpired", serialized, {
      inviteId,
      expiredAt: now.toISOString(),
    });

    return {
      ok: true,
      battleId: battleSessionId,
      inviteId,
      processed: true,
      result: "INVITE_EXPIRED",
      battle: serialized,
    };
  }

  async processExpiredBattleInvitesV2(params: { limit?: number } = {}) {
    const limit = Math.max(1, Math.min(Number(params.limit ?? 10), 50));
    const now = new Date();

    const expired = await (this.prisma as any).battleInvite.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lte: now },
        battle: {
          status: "INVITING",
        },
      },
      select: {
        id: true,
        battleId: true,
      },
      orderBy: { expiresAt: "asc" },
      take: limit,
    });

    const results: any[] = [];

    for (const row of expired as any[]) {
      try {
        results.push(await this.processBattleInviteExpiryV2({
          battleSessionId: row.battleId,
          inviteId: row.id,
        }));
      } catch (error: any) {
        results.push({
          ok: false,
          battleId: row.battleId,
          inviteId: row.id,
          error: error?.message ?? "Failed to process expired battle invite",
        });
      }
    }

    return {
      ok: true,
      checkedAt: now.toISOString(),
      found: expired.length,
      processed: results,
    };
  }


  private normalizeRandomQueueBattleTypeV2(value: BattleTypeV2 | string | null | undefined): BattleTypeV2 {
    const battleType = String(value || "ONE_V_ONE").trim().toUpperCase();

    if (battleType !== "ONE_V_ONE") {
      throw new BadRequestException("Random queue currently supports ONE_V_ONE only");
    }

    return "ONE_V_ONE";
  }

  private isoOrNullV2(value: any) {
    if (!value) return null;

    const date = new Date(value);

    if (!Number.isFinite(date.getTime())) return null;

    return date.toISOString();
  }

  private getRandomQueueCategoryIdV2(stream: any) {
    const categoryId = stream?.streamCategoryId ?? stream?.categoryId ?? null;
    const clean = typeof categoryId === "string" ? categoryId.trim() : "";

    return clean || null;
  }

  private assertStreamCanJoinRandomQueueV2(stream: any, actorUserId: string) {
    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    if (stream.hostUserId !== actorUserId) {
      throw new ForbiddenException("Only the stream host can join random battle queue");
    }

    if (stream.status !== "LIVE") {
      throw new BadRequestException("Stream must be live to join random battle queue");
    }

    if (stream.endedAt) {
      throw new BadRequestException("Ended streams cannot join random battle queue");
    }

    const categoryId = this.getRandomQueueCategoryIdV2(stream);

    if (!categoryId) {
      throw new BadRequestException("Random battle queue requires a stream category");
    }

    return categoryId;
  }

  private getRandomQueueBlockingBattleStatusesV2() {
    return this.activeBattleSessionStatusesV2.filter(
      (status: string) => status !== "QUEUE_WAITING",
    );
  }

  private getRandomQueueBlockingBattleWhereV2(params: {
    hostUserId: string;
    streamId: string;
  }) {
    const { hostUserId, streamId } = params;

    return {
      status: {
        in: this.getRandomQueueBlockingBattleStatusesV2(),
      },
      OR: [
        { createdByUserId: hostUserId },
        {
          sides: {
            some: {
              OR: [
                { hostUserId },
                { streamId },
              ],
            },
          },
        },
        {
          participants: {
            some: {
              userId: hostUserId,
              leftAt: null,
            },
          },
        },
      ],
    };
  }

  private async getRandomQueueBlockingBattleSessionV2(params: {
    hostUserId: string;
    streamId: string;
  }) {
    return (this.prisma as any).battleSession.findFirst({
      where: this.getRandomQueueBlockingBattleWhereV2(params),
      include: this.getBattleSessionIncludeV2(),
      orderBy: { createdAt: "desc" },
    });
  }

  private async endBattleSessionIfAllLinkedStreamsInactiveV2(session: any) {
    const streamIds = Array.from(
      new Set(
        (session?.sides || [])
          .map((side: any) => side?.streamId)
          .filter((id: unknown): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    if (streamIds.length === 0) {
      return false;
    }

    const linkedStreams = await (this.prisma as any).stream.findMany({
      where: {
        id: { in: streamIds },
      },
      select: {
        id: true,
        status: true,
        endedAt: true,
      },
    });

    const liveLinkedStream = (linkedStreams as any[]).find((stream: any) => {
      return stream?.status === "LIVE" && !stream?.endedAt;
    });

    if (liveLinkedStream) {
      return false;
    }

    await (this.prisma as any).battleSession.update({
      where: { id: session.id },
      data: {
        status: "ENDED",
        endedReason: "CANCELLED",
      },
    });

    const serialized = await this.reloadSerializedBattleSessionV2(session.id);

    this.emitBattleV2EventToSessionStreams("battle.v2.ended", serialized, {
      battleId: session.id,
      endedReason: "CANCELLED",
      endedAt: new Date().toISOString(),
      rematchStarted: false,
      autoClearedForRandomQueue: true,
    });

    return true;
  }

  private async clearStaleBlockingBattleSessionsForRandomQueueV2(params: {
    hostUserId: string;
    streamId: string;
  }) {
    await this.processExpiredBattleSessionsV2({ limit: 25 }).catch(() => undefined);
    await this.processExpiredBattleCooldownsV2({ limit: 25 }).catch(() => undefined);

    for (let index = 0; index < 10; index += 1) {
      const blocking = await this.getRandomQueueBlockingBattleSessionV2(params);

      if (!blocking) {
        return;
      }

      const cleared = await this.endBattleSessionIfAllLinkedStreamsInactiveV2(blocking);

      if (!cleared) {
        return;
      }
    }
  }

  private async assertNoBlockingBattleForRandomQueueV2(params: {
    hostUserId: string;
    streamId: string;
  }) {
    await this.clearStaleBlockingBattleSessionsForRandomQueueV2(params);

    const blocking = await this.getRandomQueueBlockingBattleSessionV2(params);

    if (blocking) {
      throw new BadRequestException(
        `Host is already in an active or pending battle (${blocking.status}:${blocking.id})`,
      );
    }
  }

  private async areUsersBlockedEitherWayV2(userAId: string, userBId: string) {
    if (!userAId || !userBId || userAId === userBId) return false;

    const block = await (this.prisma as any).userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });

    return !!block;
  }

  private async serializeRandomQueueEntryV2(entry: any) {
    if (!entry) return null;

    let battle: any = null;

    if (entry.matchedBattleId) {
      battle = await this.reloadSerializedBattleSessionV2(entry.matchedBattleId);
    }

    return {
      id: entry.id,
      queueEntryId: entry.id,
      hostUserId: entry.hostUserId,
      streamId: entry.streamId,
      battleType: entry.battleType,
      categoryId: entry.categoryId ?? null,
      status: entry.status,
      matchedBattleId: entry.matchedBattleId ?? null,
      createdAt: this.isoOrNullV2(entry.createdAt),
      updatedAt: this.isoOrNullV2(entry.updatedAt),
      expiresAt: this.isoOrNullV2(entry.expiresAt),
      matchedAt: entry.status === "MATCHED" ? this.isoOrNullV2(entry.updatedAt) : null,
      battle,
    };
  }

  private async findRandomQueueMatchCandidateV2(params: {
    actorUserId: string;
    streamId: string;
    battleType: BattleTypeV2;
    categoryId: string;
    now: Date;
  }) {
    const { actorUserId, streamId, battleType, categoryId, now } = params;

    const candidates = await (this.prisma as any).battleRandomQueueEntry.findMany({
      where: {
        status: "WAITING",
        battleType,
        categoryId,
        expiresAt: { gt: now },
        hostUserId: { not: actorUserId },
        streamId: { not: streamId },
      },
      include: {
        stream: true,
      },
      orderBy: { createdAt: "asc" },
      take: 25,
    });

    for (const candidate of candidates as any[]) {
      if (!candidate?.stream || candidate.stream.status !== "LIVE" || candidate.stream.endedAt) {
        continue;
      }

      if (await this.areUsersBlockedEitherWayV2(actorUserId, candidate.hostUserId)) {
        continue;
      }

      const blocking = await (this.prisma as any).battleSession.findFirst({
        where: {
          status: {
            in: this.activeBattleSessionStatusesV2.filter(
              (status: string) => status !== "QUEUE_WAITING",
            ),
          },
          OR: [
            { createdByUserId: candidate.hostUserId },
            {
              sides: {
                some: {
                  OR: [
                    { hostUserId: candidate.hostUserId },
                    { streamId: candidate.streamId },
                  ],
                },
              },
            },
            {
              participants: {
                some: {
                  userId: candidate.hostUserId,
                  leftAt: null,
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      if (blocking) {
        continue;
      }

      return candidate;
    }

    return null;
  }

  private async createRandomOneVOneBattleFromQueueV2(params: {
    actorUserId: string;
    actorStreamId: string;
    candidateHostUserId: string;
    candidateStreamId: string;
    candidateQueueEntryId: string;
    categoryId: string;
  }) {
    const {
      actorUserId,
      actorStreamId,
      candidateHostUserId,
      candidateStreamId,
      candidateQueueEntryId,
      categoryId,
    } = params;

    const now = new Date();
    const endsAt = new Date(now.getTime() + RANDOM_BATTLE_DURATION_SECONDS * 1000);
    const queueExpiresAt = new Date(now.getTime() + RANDOM_BATTLE_DURATION_SECONDS * 1000);

    const created = await (this.prisma as any).$transaction(async (tx: any) => {
      const candidateClaim = await tx.battleRandomQueueEntry.updateMany({
        where: {
          id: candidateQueueEntryId,
          status: "WAITING",
          expiresAt: { gt: now },
        },
        data: {
          status: "MATCHED",
        },
      });

      if (candidateClaim.count !== 1) {
        throw new BadRequestException("Random battle queue match was already claimed");
      }

      const battle = await tx.battleSession.create({
        data: {
          battleType: "ONE_V_ONE",
          mode: "RANDOM_QUEUE",
          status: "ACTIVE",
          createdByUserId: actorUserId,
          categoryId,
          durationSeconds: RANDOM_BATTLE_DURATION_SECONDS,
          cooldownSeconds: ONE_V_ONE_COOLDOWN_SECONDS,
          startedAt: now,
          endsAt,
        },
        select: { id: true },
      });

      const sideA = await tx.battleSide.create({
        data: {
          battleId: battle.id,
          sideKey: "A",
          streamId: candidateStreamId,
          hostUserId: candidateHostUserId,
          score: 0,
          result: "PENDING",
        },
        select: { id: true },
      });

      const sideB = await tx.battleSide.create({
        data: {
          battleId: battle.id,
          sideKey: "B",
          streamId: actorStreamId,
          hostUserId: actorUserId,
          score: 0,
          result: "PENDING",
        },
        select: { id: true },
      });

      await tx.battleParticipant.create({
        data: {
          battleId: battle.id,
          sideId: sideA.id,
          streamId: candidateStreamId,
          userId: candidateHostUserId,
          role: "HOST",
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      await tx.battleParticipant.create({
        data: {
          battleId: battle.id,
          sideId: sideB.id,
          streamId: actorStreamId,
          userId: actorUserId,
          role: "HOST",
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      await tx.battleRandomQueueEntry.update({
        where: { id: candidateQueueEntryId },
        data: {
          matchedBattleId: battle.id,
        },
      });

      const actorQueueEntry = await tx.battleRandomQueueEntry.create({
        data: {
          hostUserId: actorUserId,
          streamId: actorStreamId,
          battleType: "ONE_V_ONE",
          categoryId,
          status: "MATCHED",
          matchedBattleId: battle.id,
          expiresAt: queueExpiresAt,
        },
        select: { id: true },
      });

      return {
        battleId: battle.id,
        actorQueueEntryId: actorQueueEntry.id,
        candidateQueueEntryId,
      };
    });

    const serialized = await this.reloadSerializedBattleSessionV2(created.battleId);

    this.emitBattleV2EventToSessionStreams("battle.v2.started", serialized, {
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      mode: "RANDOM_QUEUE",
      matchedBy: "RANDOM_QUEUE",
    });

    const actorQueueEntry = await (this.prisma as any).battleRandomQueueEntry.findUnique({
      where: { id: created.actorQueueEntryId },
    });

    const candidateQueueEntry = await (this.prisma as any).battleRandomQueueEntry.findUnique({
      where: { id: created.candidateQueueEntryId },
    });

    return {
      battle: serialized,
      queueEntry: await this.serializeRandomQueueEntryV2(actorQueueEntry),
      matchedQueueEntry: await this.serializeRandomQueueEntryV2(candidateQueueEntry),
    };
  }

  async joinRandomBattleQueueV2(params: {
    streamId: string;
    actorUserId: string;
    battleType: BattleTypeV2 | string;
  }) {
    const { streamId, actorUserId } = params;
    const battleType = this.normalizeRandomQueueBattleTypeV2(params.battleType);
    const stream = await this.requireStream(streamId);
    const categoryId = this.assertStreamCanJoinRandomQueueV2(stream, actorUserId);
    const now = new Date();

    await this.assertNoBlockingBattleForRandomQueueV2({
      hostUserId: actorUserId,
      streamId,
    });

    await (this.prisma as any).battleRandomQueueEntry.updateMany({
      where: {
        status: "WAITING",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    });

    const existing = await (this.prisma as any).battleRandomQueueEntry.findFirst({
      where: {
        hostUserId: actorUserId,
        streamId,
        status: "WAITING",
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return {
        ok: true,
        status: "WAITING",
        matched: false,
        queueEntry: await this.serializeRandomQueueEntryV2(existing),
        battle: null,
        message: "Already waiting in random battle queue",
      };
    }

    const candidate = await this.findRandomQueueMatchCandidateV2({
      actorUserId,
      streamId,
      battleType,
      categoryId,
      now,
    });

    if (candidate) {
      const matched = await this.createRandomOneVOneBattleFromQueueV2({
        actorUserId,
        actorStreamId: streamId,
        candidateHostUserId: candidate.hostUserId,
        candidateStreamId: candidate.streamId,
        candidateQueueEntryId: candidate.id,
        categoryId,
      });

      return {
        ok: true,
        status: "MATCHED",
        matched: true,
        queueEntry: matched.queueEntry,
        matchedQueueEntry: matched.matchedQueueEntry,
        battle: matched.battle,
        message: "Random battle matched and started",
      };
    }

    const waiting = await (this.prisma as any).battleRandomQueueEntry.create({
      data: {
        hostUserId: actorUserId,
        streamId,
        battleType,
        categoryId,
        status: "WAITING",
        expiresAt: new Date(now.getTime() + RANDOM_BATTLE_DURATION_SECONDS * 1000),
      },
    });

    return {
      ok: true,
      status: "WAITING",
      matched: false,
      queueEntry: await this.serializeRandomQueueEntryV2(waiting),
      battle: null,
      message: "Joined random battle queue",
    };
  }

  async cancelRandomBattleQueueV2(params: {
    streamId: string;
    actorUserId: string;
  }) {
    const { streamId, actorUserId } = params;
    const stream = await this.requireStream(streamId);

    if (stream.hostUserId !== actorUserId) {
      throw new ForbiddenException("Only the stream host can cancel random battle queue");
    }

    const waiting = await (this.prisma as any).battleRandomQueueEntry.findFirst({
      where: {
        hostUserId: actorUserId,
        streamId,
        status: "WAITING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!waiting) {
      return {
        ok: true,
        status: "NOT_FOUND",
        cancelled: false,
        queueEntry: null,
        message: "No active random battle queue entry found",
      };
    }

    const cancelled = await (this.prisma as any).battleRandomQueueEntry.update({
      where: { id: waiting.id },
      data: { status: "CANCELLED" },
    });

    return {
      ok: true,
      status: "CANCELLED",
      cancelled: true,
      queueEntry: await this.serializeRandomQueueEntryV2(cancelled),
      message: "Random battle queue cancelled",
    };
  }


  private mapSetupBattleTypeRule(rule: ReturnType<typeof getAllBattleTypeRules>[number]) {
    return {
      type: rule.type,
      sideCount: rule.sideCount,
      teamSize: rule.teamSize,
      requiresTeammateInvites: rule.requiresTeammateInvites,
      confirmedCooldownSeconds: rule.confirmedCooldownSeconds,
      hasOpenCooldownDecision: rule.hasOpenCooldownDecision,
    };
  }

  async getBattleSetupOptions(params: { streamId: string; actorUserId: string }) {
    const { streamId, actorUserId } = params;

    const stream = await this.requireStream(streamId);

    const activeLegacyBattle = await this.prisma.battle.findFirst({
      where: { streamId, status: { in: ["PENDING", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });

    const isHost = stream.hostUserId === actorUserId;
    const isLive = stream.status === "LIVE";
    const hasBlockingLegacyBattle = !!activeLegacyBattle;

    return {
      ok: true,
      streamId,
      actorUserId,
      stream: {
        id: stream.id,
        hostUserId: stream.hostUserId,
        status: stream.status,
        streamCategoryId: (stream as any).streamCategoryId ?? null,
      },
      eligibility: {
        isHost,
        isLive,
        hasBlockingLegacyBattle,
        canOpenBattleSetup: isHost && isLive,
        canStartBattleNow: isHost && isLive && !hasBlockingLegacyBattle,
        blockingReason: !isHost
          ? "ONLY_HOST_CAN_START_BATTLE"
          : !isLive
            ? "STREAM_NOT_LIVE"
            : hasBlockingLegacyBattle
              ? "LEGACY_BATTLE_ALREADY_PENDING_OR_ACTIVE"
              : null,
      },
      battleTypes: getAllBattleTypeRules().map((rule) => this.mapSetupBattleTypeRule(rule)),
      directInvite: {
        timerSeconds: [...DIRECT_BATTLE_TIMER_SECONDS],
        requiresMutualFavorites: true,
      },
      randomQueue: {
        durationSeconds: RANDOM_BATTLE_DURATION_SECONDS,
        matchesSameBattleType: true,
        matchesStreamCategory: true,
        requiresMutualFavorites: false,
      },
      teamInvites: {
        timeoutSeconds: TEAM_INVITE_TIMEOUT_SECONDS,
        audioOnlyAllowed: true,
        moderatorsAndStaffAllowed: true,
      },
      suddenDeath: {
        durationSeconds: SUDDEN_DEATH_DURATION_SECONDS,
        repeatsUntilWinner: true,
      },
      openDecisions: BATTLE_TYPE_OPEN_DECISIONS,
      notes: [
        "This is a Stage 1B read-only setup contract.",
        "It does not create generalized battles yet.",
        "Legacy Battle rows still block setup until the new battle engine replaces them.",
      ],
    };
  }

  async createBattle(params: {
    streamId: string;
    actorUserId: string;
    opponentUserId: string;
    durationSeconds: number;
  }) {
    const { streamId, actorUserId, opponentUserId, durationSeconds } = params;

    const stream = await this.requireStream(streamId);
    const role = await this.actorRole(streamId, actorUserId);
    this.ensureHost(role);

    if (opponentUserId === actorUserId) throw new BadRequestException("Cannot battle yourself");

    if (!Number.isFinite(durationSeconds) || durationSeconds < 15 || durationSeconds > 3600) {
      throw new BadRequestException("durationSeconds must be 15..3600");
    }

    const opp = await this.prisma.streamParticipant.findFirst({
      where: { streamId, userId: opponentUserId, leftAt: null },
      select: { id: true },
    });
    if (!opp) throw new BadRequestException("Opponent must be in the stream");

    const existing = await this.prisma.battle.findFirst({
      where: { streamId, status: { in: ["PENDING", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) throw new BadRequestException("A battle is already pending/active in this stream");

    const battle = await this.prisma.battle.create({
      data: {
        streamId,
        hostUserId: stream.hostUserId,
        opponentUserId,
        status: "PENDING",
        durationSeconds,
        hostScore: 0,
        opponentScore: 0,
      },
    });

    this.emit("battle.created", {
      streamId,
      battleId: battle.id,
      hostUserId: battle.hostUserId,
      opponentUserId: battle.opponentUserId,
      status: battle.status,
      durationSeconds: battle.durationSeconds,
      hostScore: battle.hostScore,
      opponentScore: battle.opponentScore,
      createdAt: battle.createdAt.toISOString(),
    });

    return { ok: true, battleId: battle.id };
  }

  async acceptBattle(params: { battleId: string; actorUserId: string }) {
    const battle = await this.prisma.battle.findUnique({ where: { id: params.battleId } });
    if (!battle) throw new NotFoundException("Battle not found");
    if (battle.status !== "PENDING") throw new BadRequestException("Battle is not pending");
    if (battle.opponentUserId !== params.actorUserId) {
      throw new ForbiddenException("Only the opponent can accept");
    }

    const stream = await this.requireStream(battle.streamId);
    if (stream.status !== "LIVE") throw new BadRequestException("Stream is not live");

    const startedAt = new Date();
    const endsAt = new Date(Date.now() + battle.durationSeconds * 1000);

    const updated = await this.prisma.battle.update({
      where: { id: battle.id },
      data: { status: "ACTIVE", startedAt, endsAt },
    });

    this.emitBattleStarted({
      streamId: updated.streamId,
      battleId: updated.id,
      hostUserId: updated.hostUserId,
      opponentUserId: updated.opponentUserId,
      durationSeconds: updated.durationSeconds,
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      hostScore: updated.hostScore,
      opponentScore: updated.opponentScore,
    });

    return {
      ok: true,
      battleId: updated.id,
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  }

  async declineBattle(params: { battleId: string; actorUserId: string }) {
    const battle = await this.prisma.battle.findUnique({ where: { id: params.battleId } });
    if (!battle) throw new NotFoundException("Battle not found");
    if (battle.status !== "PENDING") throw new BadRequestException("Battle is not pending");
    if (battle.opponentUserId !== params.actorUserId) {
      throw new ForbiddenException("Only the opponent can decline");
    }

    const endedAt = new Date();
    const updated = await this.prisma.battle.update({
      where: { id: battle.id },
      data: { status: "DECLINED", endedAt },
    });

    this.emitBattleEnded({
      streamId: updated.streamId,
      battleId: updated.id,
      endedAt: endedAt.toISOString(),
      hostScore: updated.hostScore,
      opponentScore: updated.opponentScore,
      winner: null,
      winnerUserId: null,
      status: updated.status,
    });

    return { ok: true };
  }

  async cancelBattle(params: { battleId: string; actorUserId: string }) {
    const battle = await this.prisma.battle.findUnique({ where: { id: params.battleId } });
    if (!battle) throw new NotFoundException("Battle not found");
    if (battle.hostUserId !== params.actorUserId) {
      throw new ForbiddenException("Only the host can cancel");
    }
    if (battle.status !== "PENDING" && battle.status !== "ACTIVE") {
      throw new BadRequestException("Battle is not pending/active");
    }

    const endedAt = new Date();
    const updated = await this.prisma.battle.update({
      where: { id: battle.id },
      data: { status: "CANCELLED", endedAt },
    });

    this.emitBattleEnded({
      streamId: updated.streamId,
      battleId: updated.id,
      endedAt: endedAt.toISOString(),
      hostScore: updated.hostScore,
      opponentScore: updated.opponentScore,
      winner: null,
      winnerUserId: null,
      status: updated.status,
    });

    return { ok: true };
  }

  async endBattle(params: { battleId: string; actorUserId: string }) {
    const battle = await this.prisma.battle.findUnique({ where: { id: params.battleId } });
    if (!battle) throw new NotFoundException("Battle not found");
    if (battle.status !== "ACTIVE") throw new BadRequestException("Battle is not active");

    if (battle.hostUserId !== params.actorUserId && battle.opponentUserId !== params.actorUserId) {
      throw new ForbiddenException("Not allowed");
    }

    const endedAt = new Date();

    const winnerSide = this.winnerFromScores(battle.hostScore, battle.opponentScore);
    const winnerUserId =
      winnerSide === "HOST"
        ? battle.hostUserId
        : winnerSide === "OPPONENT"
          ? battle.opponentUserId
          : null;

    const updated = await this.prisma.battle.update({
      where: { id: battle.id },
      data: {
        status: "ENDED",
        endedAt,
        winnerUserId,
      },
    });

    this.emitBattleEnded({
      streamId: updated.streamId,
      battleId: updated.id,
      endedAt: endedAt.toISOString(),
      hostScore: updated.hostScore,
      opponentScore: updated.opponentScore,
      winner: winnerSide,
      winnerUserId,
      status: updated.status,
    });

    if (winnerUserId) {
      this.emitBattleMvp({
        streamId: updated.streamId,
        battleId: updated.id,
        userId: winnerUserId,
      });
    }

    try {
      await this.notifications.createAndSendToUsers({
        userIds: [updated.hostUserId, updated.opponentUserId],
        notificationType: "BATTLE_ENDED",
        title: "Battle ended",
        body: winnerSide
          ? winnerSide === "HOST"
            ? "The host won the battle."
            : "The opponent won the battle."
          : "The battle ended in a tie.",
        payload: {
          battleId: updated.id,
          streamId: updated.streamId,
          hostUserId: updated.hostUserId,
          opponentUserId: updated.opponentUserId,
          hostScore: updated.hostScore,
          opponentScore: updated.opponentScore,
          winner: winnerSide,
          winnerUserId,
          endedAt: endedAt.toISOString(),
        },
        streamId: updated.streamId,
        dedupeKey: `battle-ended:${updated.id}`,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[BattlesService] battle notification hook failed:", e);
    }

    return { ok: true, winner: winnerSide, winnerUserId };
  }

  async applyGiftToActiveBattle(input: {
    streamId: string;
    giftTxId: string;
    senderUserId: string;
    recipientUserId: string;
    diamondValue: number;
    createdAt: Date;
  }) {
    const { streamId, giftTxId, senderUserId, recipientUserId, diamondValue, createdAt } = input;
    if (!diamondValue || diamondValue <= 0) return null;

    const battle = await this.prisma.battle.findFirst({
      where: { streamId, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });

    if (!battle || !battle.startedAt || !battle.endsAt) return null;

    if (
      createdAt.getTime() < battle.startedAt.getTime() ||
      createdAt.getTime() > battle.endsAt.getTime()
    ) {
      return null;
    }

    const recipientIsHost = recipientUserId === battle.hostUserId;
    const recipientIsOpponent = recipientUserId === battle.opponentUserId;
    if (!recipientIsHost && !recipientIsOpponent) return null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.battleContribution.create({
          data: {
            battle: { connect: { id: battle.id } },
            giftTx: { connect: { id: giftTxId } },
            sender: { connect: { id: senderUserId } },
            recipient: { connect: { id: recipientUserId } },
            diamondValue,
          },
        });

        const patch = recipientIsHost
          ? { hostScore: { increment: diamondValue } }
          : { opponentScore: { increment: diamondValue } };

        return tx.battle.update({
          where: { id: battle.id },
          data: patch as any,
        });
      });

      this.emitBattleScoreUpdated({
        streamId,
        battleId: battle.id,
        hostScore: updated.hostScore,
        opponentScore: updated.opponentScore,
      });

      return updated;
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return null;
      }
      throw e;
    }
  }
}
const SIDE_ORDER: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function sortBySideKey<T extends { sideKey?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aOrder = SIDE_ORDER[a.sideKey ?? ""] ?? 99;
    const bOrder = SIDE_ORDER[b.sideKey ?? ""] ?? 99;
    return aOrder - bOrder;
  });
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}


function serializeBattleUserSummaryV2(user: any) {
  if (!user || typeof user !== "object") return null;

  const profile = user.profile && typeof user.profile === "object" ? user.profile : {};

  return {
    id: user.id ?? user.userId ?? null,
    userId: user.userId ?? user.id ?? null,
    username: user.username ?? null,
    displayName: profile.displayName ?? user.displayName ?? user.name ?? user.username ?? null,
    avatarUrl: profile.avatarUrl ?? user.avatarUrl ?? null,
  };
}

export type BattleSessionV2Serialized = ReturnType<typeof serializeBattleSessionV2>;

export function serializeBattleSessionV2(session: any, contributionsInput: any[] = []) {
  const sides = sortBySideKey(asArray<any>(session?.sides)).map((side) => {
    const participants = asArray<any>(side.participants).map((participant) => ({
      id: participant.id,
      battleId: participant.battleId,
      sideId: participant.sideId,
      streamId: participant.streamId ?? null,
      userId: participant.userId,
      role: participant.role,
      status: participant.status,
      mediaMode: participant.mediaMode,
      acceptedAt: iso(participant.acceptedAt),
      leftAt: iso(participant.leftAt),
      createdAt: iso(participant.createdAt),
      updatedAt: iso(participant.updatedAt),
      user: serializeBattleUserSummaryV2(participant.user),
    }));

    return {
      id: side.id,
      battleId: side.battleId,
      sideKey: side.sideKey,
      streamId: side.streamId ?? null,
      hostUserId: side.hostUserId ?? null,
      score: side.score ?? 0,
      result: side.result,
      createdAt: iso(side.createdAt),
      updatedAt: iso(side.updatedAt),
      host: serializeBattleUserSummaryV2(side.host),
      participants,
    };
  });

  const sideById = new Map<string, any>();
  for (const side of sides) {
    sideById.set(side.id, side);
  }

  const participantsFromRoot = asArray<any>(session?.participants).map((participant) => ({
    id: participant.id,
    battleId: participant.battleId,
    sideId: participant.sideId,
    sideKey: sideById.get(participant.sideId)?.sideKey ?? null,
    streamId: participant.streamId ?? null,
    userId: participant.userId,
    role: participant.role,
    status: participant.status,
    mediaMode: participant.mediaMode,
    acceptedAt: iso(participant.acceptedAt),
    leftAt: iso(participant.leftAt),
    createdAt: iso(participant.createdAt),
    updatedAt: iso(participant.updatedAt),
    user: serializeBattleUserSummaryV2(participant.user),
  }));

  const invites = asArray<any>(session?.invites).map((invite) => ({
    id: invite.id,
    battleId: invite.battleId,
    senderUserId: invite.senderUserId,
    recipientUserId: invite.recipientUserId,
    kind: invite.kind,
    status: invite.status,
    expiresAt: iso(invite.expiresAt),
    respondedAt: iso(invite.respondedAt),
    createdAt: iso(invite.createdAt),
    updatedAt: iso(invite.updatedAt),
  }));

  const rematchVotes = asArray<any>(session?.rematchVotes).map((vote) => ({
    id: vote.id,
    battleId: vote.battleId,
    sideId: vote.sideId ?? null,
    sideKey: vote.sideId ? sideById.get(vote.sideId)?.sideKey ?? null : null,
    participantId: vote.participantId ?? null,
    userId: vote.userId,
    vote: vote.vote,
    votedAt: iso(vote.votedAt),
    createdAt: iso(vote.createdAt),
  }));

  const contributions = asArray<any>(contributionsInput);
  const topGifterMap = new Map<string, {
    senderUserId: string;
    totalDiamondValue: number;
    giftCount: number;
  }>();

  for (const contribution of contributions) {
    const senderUserId = contribution.senderUserId;
    if (!senderUserId) continue;

    const current = topGifterMap.get(senderUserId) ?? {
      senderUserId,
      totalDiamondValue: 0,
      giftCount: 0,
    };

    current.totalDiamondValue += Number(contribution.diamondValue ?? 0);
    current.giftCount += 1;
    topGifterMap.set(senderUserId, current);
  }

  const topGifters = [...topGifterMap.values()]
    .sort((a, b) => {
      if (b.totalDiamondValue !== a.totalDiamondValue) {
        return b.totalDiamondValue - a.totalDiamondValue;
      }
      return b.giftCount - a.giftCount;
    })
    .slice(0, 3);

  const scoreboard = sides.map((side) => ({
    sideId: side.id,
    sideKey: side.sideKey,
    streamId: side.streamId,
    hostUserId: side.hostUserId,
    score: side.score,
    result: side.result,
  }));

  return {
    id: session.id,
    battleType: session.battleType,
    mode: session.mode,
    status: session.status,
    createdByUserId: session.createdByUserId,
    categoryId: session.categoryId ?? null,
    durationSeconds: session.durationSeconds,
    cooldownSeconds: session.cooldownSeconds,
    startedAt: iso(session.startedAt),
    endsAt: iso(session.endsAt),
    cooldownStartedAt: iso(session.cooldownStartedAt),
    cooldownEndsAt: iso(session.cooldownEndsAt),
    suddenDeathRound: session.suddenDeathRound ?? 0,
    winnerSideId: session.winnerSideId ?? null,
    endedReason: session.endedReason ?? null,
    parentBattleId: session.parentBattleId ?? null,
    createdAt: iso(session.createdAt),
    updatedAt: iso(session.updatedAt),
    sides,
    participants: participantsFromRoot.length > 0 ? participantsFromRoot : sides.flatMap((side) => side.participants),
    invites,
    rematchVotes,
    scoreboard,
    contributionSummary: {
      totalDiamondValue: contributions.reduce((sum, contribution) => {
        return sum + Number(contribution.diamondValue ?? 0);
      }, 0),
      contributionCount: contributions.length,
      topGifters,
      topGifterRewardsPending: true,
    },
  };
}

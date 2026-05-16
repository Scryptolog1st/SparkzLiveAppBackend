export const BATTLE_TYPES = [
  "ONE_V_ONE",
  "TWO_V_TWO",
  "THREE_V_THREE",
  "FOUR_V_FOUR",
  "ONE_V_ONE_V_ONE",
  "ONE_V_ONE_V_ONE_V_ONE",
] as const;

export type BattleTypeV2 = (typeof BATTLE_TYPES)[number];

export const DIRECT_BATTLE_TIMER_SECONDS = [60, 120, 180, 240, 300] as const;

export const RANDOM_BATTLE_DURATION_SECONDS = 120;

export const ONE_V_ONE_COOLDOWN_SECONDS = 15;
export const TEAM_BATTLE_COOLDOWN_SECONDS = 60;

export const TEAM_INVITE_TIMEOUT_SECONDS = 30;
export const DIRECT_HOST_INVITE_RECOMMENDED_TIMEOUT_SECONDS = 60;
export const RANDOM_QUEUE_RECOMMENDED_TIMEOUT_SECONDS = 120;
export const SUDDEN_DEATH_DURATION_SECONDS = 30;

export const BATTLE_TYPE_SIDE_COUNTS: Record<BattleTypeV2, number> = {
  ONE_V_ONE: 2,
  TWO_V_TWO: 2,
  THREE_V_THREE: 2,
  FOUR_V_FOUR: 2,
  ONE_V_ONE_V_ONE: 3,
  ONE_V_ONE_V_ONE_V_ONE: 4,
};

export const BATTLE_TYPE_TEAM_SIZE: Record<BattleTypeV2, number> = {
  ONE_V_ONE: 1,
  TWO_V_TWO: 2,
  THREE_V_THREE: 3,
  FOUR_V_FOUR: 4,
  ONE_V_ONE_V_ONE: 1,
  ONE_V_ONE_V_ONE_V_ONE: 1,
};

export const BATTLE_TYPE_REQUIRES_TEAMMATE_INVITES: Record<BattleTypeV2, boolean> = {
  ONE_V_ONE: false,
  TWO_V_TWO: true,
  THREE_V_THREE: true,
  FOUR_V_FOUR: true,
  ONE_V_ONE_V_ONE: false,
  ONE_V_ONE_V_ONE_V_ONE: false,
};

export const BATTLE_TYPE_CONFIRMED_COOLDOWN_SECONDS: Partial<Record<BattleTypeV2, number>> = {
  ONE_V_ONE: ONE_V_ONE_COOLDOWN_SECONDS,
  TWO_V_TWO: TEAM_BATTLE_COOLDOWN_SECONDS,
  THREE_V_THREE: TEAM_BATTLE_COOLDOWN_SECONDS,
  FOUR_V_FOUR: TEAM_BATTLE_COOLDOWN_SECONDS,
};

export const BATTLE_TYPE_OPEN_DECISIONS = {
  ONE_V_ONE_V_ONE: "Confirm whether free-for-all battles use 15 or 60 second cooldown.",
  ONE_V_ONE_V_ONE_V_ONE: "Confirm whether free-for-all battles use 15 or 60 second cooldown.",
} as const;

export const BATTLE_SIDE_KEYS = ["A", "B", "C", "D"] as const;

export const DIRECT_INVITE_SIDE_RULES = {
  senderSideKey: "A",
  recipientSideKey: "B",
} as const;

export type BattleTypeRule = {
  type: BattleTypeV2;
  sideCount: number;
  teamSize: number;
  requiresTeammateInvites: boolean;
  confirmedCooldownSeconds: number | null;
  hasOpenCooldownDecision: boolean;
};

export function isBattleTypeV2(value: string): value is BattleTypeV2 {
  return (BATTLE_TYPES as readonly string[]).includes(value);
}

export function getBattleTypeRule(type: BattleTypeV2): BattleTypeRule {
  const confirmedCooldownSeconds = BATTLE_TYPE_CONFIRMED_COOLDOWN_SECONDS[type] ?? null;

  return {
    type,
    sideCount: BATTLE_TYPE_SIDE_COUNTS[type],
    teamSize: BATTLE_TYPE_TEAM_SIZE[type],
    requiresTeammateInvites: BATTLE_TYPE_REQUIRES_TEAMMATE_INVITES[type],
    confirmedCooldownSeconds,
    hasOpenCooldownDecision: confirmedCooldownSeconds === null,
  };
}

export function getAllBattleTypeRules(): BattleTypeRule[] {
  return BATTLE_TYPES.map((type) => getBattleTypeRule(type));
}


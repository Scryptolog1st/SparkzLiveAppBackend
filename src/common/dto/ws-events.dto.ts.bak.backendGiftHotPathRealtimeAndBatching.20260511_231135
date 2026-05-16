import type { UserSummaryDto } from "./user.dto";
import type { StreamRole, StreamStatus, StreamVisibility } from "./streams.dto";
import type { GiftCatalogItemDto } from "./economy.dto";

export type ToastType = "info" | "success" | "warning" | "error";

export type StreamStateUpdatedEvent = {
  streamId: string;
  status: StreamStatus;
  title?: string;
  host?: UserSummaryDto;
  hostUserId?: string;
  visibility?: StreamVisibility;
  tags?: string[];
  layoutGridSize?: number;
  gridSize?: number;
  startedAt?: string;
  endedAt?: string | null;
};

export type StreamJoinedEvent = {
  streamId: string;
  user: UserSummaryDto;
  role: StreamRole;
};

export type StreamLeftEvent = {
  streamId: string;
  userId: string;
};

export type StreamViewerCountEvent = {
  streamId: string;
  count: number;
};

export type StreamParticipantsEvent = {
  streamId: string;
  participants: Array<{
    user: UserSummaryDto;
    role: StreamRole;
    joinedAt: string;
  }>;
};

export type ChatMessageEvent = {
  streamId: string;
  message: {
    id: string;
    user: UserSummaryDto;
    text: string;
    createdAt: string;
    type?: string;
    replyToMessageId?: string | null;
    badges?: string[];
  };
};

export type HeartReactionEvent = {
  streamId: string;
  userId: string;
  user?: UserSummaryDto;
  count?: number;
  totalHearts?: number;
  activeHeartSenderCount?: number;
  createdAt?: string;
};

export type GiftSentEvent = {
  streamId: string;
  sender: UserSummaryDto;
  recipient: UserSummaryDto;
  gift: Pick<GiftCatalogItemDto, "id" | "name" | "diamondValue" | "mediaUrl" | "mediaType">;
  quantity?: number;
  totalCoinCost?: number;
  totalDiamondValue?: number;
  isBigGift: boolean;
  txId: string;
  createdAt: string;
  sentAt?: string;
  animationDelayMs?: number;
  animationStartAt?: string;
  displayAt?: string;
  scheduledStartAt?: string;
};

export type RoleAssignedEvent = {
  streamId: string;
  targetUserId: string;
  assignedRole: StreamRole;
  assignedByUserId: string;
};

export type ModerationActionEvent = {
  streamId: string;
  actionId: string;
  action: "KICK" | "MUTE" | "BAN" | "UNMUTE" | "UNBAN";
  targetUserId: string;
  actorUserId: string;
  reason?: string | null;
  durationSeconds?: number | null;
  createdAt: string;
};

export type SystemToastEvent = {
  type: ToastType;
  message: string;
  streamId?: string;
};

export type BattleStartedEvent = {
  streamId: string;
  battleId: string;
  hostUserId: string;
  opponentUserId: string;
  durationSeconds: number;
  startedAt: string;
  endsAt: string;
  hostScore: number;
  opponentScore: number;
};

export type BattleScoreUpdatedEvent = {
  streamId: string;
  battleId: string;
  hostScore: number;
  opponentScore: number;
};

export type BattleEndedEvent = {
  streamId: string;
  battleId: string;
  endedAt: string;
  hostScore: number;
  opponentScore: number;
  winner?: "HOST" | "OPPONENT" | null;
  winnerUserId?: string | null;
  status?: "ENDED" | "DECLINED" | "CANCELLED";
};

export type BattleMvpEvent = {
  streamId: string;
  battleId: string;
  userId: string;
};
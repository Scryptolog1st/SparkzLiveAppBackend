export type StreamStatus = "LIVE" | "ENDED";
export type StreamVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
export type StreamRole = "HOST" | "GUEST" | "MODERATOR" | "VIEWER";

export type StreamDto = {
  id: string;
  hostUserId: string;
  title: string;
  status: StreamStatus;
  visibility: StreamVisibility;
  tags: string[];
  layoutGridSize: number;
  streamGoal?: number;
  startedAt: string;
  endedAt?: string | null;
  endedByAdmin?: boolean;
  endedByAdminUserId?: string | null;
  endReason?: string | null;
};

export type StreamListItemDto = {
  id: string;
  title: string;
  host: import("./user.dto").UserSummaryDto;
  viewerCount: number;
  layoutGridSize: number;
  streamGoal?: number;
  startedAt: string;
  tags: string[];
};

export type CreateStreamRequestDto = {
  title: string;
  visibility: StreamVisibility;
  tags?: string[];
  layoutGridSize?: number;
  streamGoal?: number;
};

export type UpdateStreamLayoutRequestDto = {
  layoutGridSize: number;
};

export type UpdateStreamGoalRequestDto = {
  streamGoal: number;
};

export type ScheduleItemDto = {
  id: string;
  isRecurring: boolean;
  title: string;
  description?: string | null;
  timezone: string;

  dayOfWeek?: number | null;
  time24h?: string | null;

  startAt?: string | null;
  endAt?: string | null;
};

export type ScheduleItemInputDto = Omit<ScheduleItemDto, "id">;

export type DiamondMilestoneDto = {
  id: string;
  userId: string;
  milestoneAmount: number;
  achievedAt: string;
  giverUserId?: string | null;
  giftId?: string | null;
  giftTxId?: string | null;
};
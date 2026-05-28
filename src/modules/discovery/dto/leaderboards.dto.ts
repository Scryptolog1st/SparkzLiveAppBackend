import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export type LeaderboardType =
  | 'diamonds'
  | 'likes_sent'
  | 'gifters'
  | 'stream_time'
  | 'likes_received'
  | 'favorites';

export class LeaderboardsQueryDto {
  @Transform(({ value }) => (value === undefined ? undefined : value))
  @IsOptional()
  @IsIn(['alltime'])
  period?: 'alltime';

  @Transform(({ value }) => (value === undefined ? undefined : value))
  @IsOptional()
  @IsIn(['diamonds', 'likes_sent', 'gifters', 'stream_time', 'likes_received', 'favorites'])
  type?: LeaderboardType;

  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export type LeaderboardUser = {
  id: string;
  publicId?: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  user: LeaderboardUser;
  value: number;
};

export type LeaderboardsResponse = {
  period: 'alltime';
  type: LeaderboardType;
  generatedAt: string;
  valueLabel: string;
  hideValues: boolean;
  totalValue: number;
  totalDiamonds: number;
  totalUsers: number;
  items: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
};

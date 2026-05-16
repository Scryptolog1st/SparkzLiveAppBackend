import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class LeaderboardsQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value : 'alltime'))
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'alltime'])
  period?: 'daily' | 'weekly' | 'monthly' | 'alltime';

  @Transform(({ value }) => (typeof value === 'string' ? value : 'earnings'))
  @IsOptional()
  @IsIn(['earnings', 'gifters'])
  type?: 'earnings' | 'gifters';

  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export type LeaderboardUser = {
  id: string;
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
  period: 'daily' | 'weekly' | 'monthly' | 'alltime';
  type: 'earnings' | 'gifters';
  generatedAt: string;
  totalDiamonds: number;
  items: LeaderboardEntry[];
};
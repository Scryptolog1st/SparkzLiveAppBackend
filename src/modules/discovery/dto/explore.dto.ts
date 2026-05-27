import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ExploreLiveStreamsQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value : 'recent'))
  @IsOptional()
  @IsIn(['recent', 'trending'])
  sort?: 'recent' | 'trending';

  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  windowMinutes?: number;

  @Transform(({ value }) => (typeof value === 'string' && value.length ? value : undefined))
  @IsOptional()
  @IsString()
  cursor?: string;
}

export type ExploreHostSummary = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ExploreStreamItem = {
  id: string;
  title: string;
  streamTitle: string;
  host: ExploreHostSummary;
  startedAt: string;
  viewerCount: number;
  chatCountWindow: number;
  giftsCountWindow: number;
  trendingScore: number;
  tags: string[];
  category: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  streamCategory: {
    id: string;
    name: string;
    slug: string;
  } | null;
  streamCategoryName: string | null;
  streamCategorySlug: string | null;
};

export type ExploreLiveStreamsResponse = {
  sort: 'recent' | 'trending';
  windowMinutes: number;
  limit: number;
  cursor: string | null;
  nextCursor: string | null;
  streams: ExploreStreamItem[];
};

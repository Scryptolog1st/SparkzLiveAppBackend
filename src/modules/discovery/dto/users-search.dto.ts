import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UsersSearchQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsOptional()
  @IsString()
  @MaxLength(32)
  q?: string;

  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @Transform(({ value }) => (typeof value === 'string' && value.length ? value : undefined))
  @IsOptional()
  @IsString()
  cursor?: string;
}

export type UserSearchItem = {
  id: string;
  publicId: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  isLive: boolean;
  liveStreamId: string | null;
  isFavoritedByViewer?: boolean;
};

export type UsersSearchResponse = {
  q: string;
  limit: number;
  cursor: string | null;
  nextCursor: string | null;
  results: UserSearchItem[];
};
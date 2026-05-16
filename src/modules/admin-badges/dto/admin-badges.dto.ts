import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export const BADGE_STATUS_VALUES = ["DRAFT", "ACTIVE", "DISABLED"] as const;

export const BADGE_CHARACTERISTIC_KEYS = [
  "ALWAYS_TRENDING_BOOST",
  "CONVERSION_DISCOUNT",
  "COIN_PURCHASE_DISCOUNT",
  "PROFILE_BADGE",
  "LIVE_BADGE",
  "APP_LOGIN_ACCESS",
  "PRIORITY_SUPPORT",
  "CUSTOM_PROFILE_STYLE",
  "CUSTOM",
] as const;

export class AdminBadgesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(["all", ...BADGE_STATUS_VALUES])
  status?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

export class CreateAdminBadgeDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  assetUrl?: string;

  @IsOptional()
  @IsIn(BADGE_STATUS_VALUES)
  status?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  characteristics?: unknown[];

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}

export class UpdateAdminBadgeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  assetUrl?: string | null;

  @IsOptional()
  @IsIn(BADGE_STATUS_VALUES)
  status?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  characteristics?: unknown[];

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}

export class AdminBadgeUserSearchDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class AssignUserBadgeDto {
  @IsString()
  @MaxLength(180)
  badgeId!: string;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}

export class RevokeUserBadgeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class UpdateUserBadgeDto {
  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsBoolean()
  clearExpiration?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}

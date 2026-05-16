import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const IN_APP_ALERT_STATUSES = ["DRAFT", "ACTIVE", "DISABLED", "EXPIRED"] as const;
export type InAppAlertStatusDto = (typeof IN_APP_ALERT_STATUSES)[number];

export const IN_APP_ALERT_CADENCES = [
  "ONCE_EVER",
  "ONCE_DAILY",
  "EVERY_APP_START",
  "CRON",
  "EVENT_TRIGGERED",
  "EVENT_ONCE",
] as const;
export type InAppAlertCadenceDto = (typeof IN_APP_ALERT_CADENCES)[number];

function normalizeStringArray(value: unknown): string[] | undefined {
  if (value == null || value === "") return undefined;

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
}

function normalizeUuidArray(value: unknown): string[] | undefined {
  return normalizeStringArray(value);
}

export class AdminInAppAlertsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(["all", ...IN_APP_ALERT_STATUSES])
  status?: "all" | InAppAlertStatusDto;

  @IsOptional()
  @IsIn(["all", ...IN_APP_ALERT_CADENCES])
  cadence?: "all" | InAppAlertCadenceDto;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CreateInAppAlertDto {
  @IsString()
  @MaxLength(140)
  title!: string;

  @IsString()
  @MaxLength(8000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  confirmButtonLabel?: string;

  @IsOptional()
  @IsIn(IN_APP_ALERT_STATUSES)
  status?: InAppAlertStatusDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-100000)
  @Max(100000)
  priority?: number;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string | null;

  @IsOptional()
  @IsIn(IN_APP_ALERT_CADENCES)
  cadence?: InAppAlertCadenceDto;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cronExpression?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventTriggerKey?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  targetAllUsers?: boolean;

  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  targetRoles?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeUuidArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  targetUserIds?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  targetPlatforms?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  minAppVersion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  maxAppVersion?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateInAppAlertDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  confirmButtonLabel?: string;

  @IsOptional()
  @IsIn(IN_APP_ALERT_STATUSES)
  status?: InAppAlertStatusDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-100000)
  @Max(100000)
  priority?: number;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string | null;

  @IsOptional()
  @IsIn(IN_APP_ALERT_CADENCES)
  cadence?: InAppAlertCadenceDto;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cronExpression?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventTriggerKey?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  targetAllUsers?: boolean;

  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  targetRoles?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeUuidArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  targetUserIds?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  targetPlatforms?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  minAppVersion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  maxAppVersion?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class DueInAppAlertsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}

export class InAppAlertEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class InAppAlertActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventKey?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

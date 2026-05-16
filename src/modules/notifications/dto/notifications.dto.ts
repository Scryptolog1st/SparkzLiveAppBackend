import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListNotificationsQueryDto {
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @Transform(({ value }) => (typeof value === 'string' && value.length ? value : undefined))
  @IsOptional()
  @IsString()
  cursor?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;
}

export enum PushPlatformDto {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  UNKNOWN = 'UNKNOWN',
}

export enum NotificationDeliveryCategoryDto {
  LIVE_ALERT = 'LIVE_ALERT',
  TRANSACTIONAL = 'TRANSACTIONAL',
  MARKETING = 'MARKETING',
}

export class RegisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  expoPushToken!: string;

  @IsOptional()
  @IsEnum(PushPlatformDto)
  platform?: PushPlatformDto;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class UnregisterPushTokenDto {
  @IsString()
  @IsNotEmpty()
  expoPushToken!: string;
}

export class SendTestPushDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(NotificationDeliveryCategoryDto)
  category?: NotificationDeliveryCategoryDto;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  streamId?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  createInbox?: boolean;
}

export type NotificationItemDto = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  payload: any;
  streamId: string | null;
  createdAt: string;
  readAt: string | null;
};

export type ListNotificationsResponseDto = {
  limit: number;
  cursor: string | null;
  nextCursor: string | null;
  unreadOnly: boolean;
  items: NotificationItemDto[];
};
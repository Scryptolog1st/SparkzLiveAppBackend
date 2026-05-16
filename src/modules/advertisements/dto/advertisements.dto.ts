import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export const ADVERTISEMENT_CATEGORIES = [
  "Flyer Design",
  "Event Admin",
  "Streamer Merch",
  "Promotion",
  "Moderation",
  "Graphics",
  "Other",
] as const;

export class AdvertisementListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class MyAdvertisementsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateAdvertisementDto {
  @IsString()
  @MaxLength(90)
  title!: string;

  @IsString()
  @MaxLength(80)
  category!: string;

  @IsString()
  @MaxLength(180)
  shortDescription!: string;

  @IsString()
  @MaxLength(1600)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1600)
  serviceDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  contactLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  contactUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  requestedDuration?: string;

  @IsOptional()
  @IsIn(["DIAMONDS", "COINS"])
  paymentCurrency?: "DIAMONDS" | "COINS";

  @IsOptional()
  @IsString()
  removedMediaIds?: string;

  @IsOptional()
  @IsString()
  existingMediaIds?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  coverMediaKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  newMediaKeys?: string;
}

export class UpdateAdvertisementDto extends CreateAdvertisementDto {}

export class AdminAdvertisementsQueryDto extends AdvertisementListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  revisionStatus?: string;
}

export class DenyAdvertisementRevisionDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class PauseAdvertisementDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class UpdateAdvertisementSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  monthlyDiamondPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  coinToDiamondRate?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDurationOptions?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(["DIAMONDS", "COINS"], { each: true })
  allowedPaymentCurrencies?: Array<"DIAMONDS" | "COINS">;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  maxMediaItems?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  maxVideoSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(140)
  maxTitleLength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  @Max(400)
  maxShortDescriptionLength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(5000)
  maxDescriptionLength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(5000)
  maxServiceDetailsLength?: number;

  @IsOptional()
  @IsBoolean()
  boostEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  boostDurationHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  boostDiamondPrice?: number;

  @IsOptional()
  @IsBoolean()
  promoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  promoFreeAdCreation?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  promoLabel?: string;

  @IsOptional()
  @IsIn(["PERCENT", "FIXED_DIAMONDS"])
  promoDiscountType?: "PERCENT" | "FIXED_DIAMONDS";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  promoDiscountValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoStartsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoEndsAt?: string;
}



export class BoostAdvertisementDto {
  @IsOptional()
  @IsIn(["DIAMONDS", "COINS"])
  paymentCurrency?: "DIAMONDS" | "COINS";
}

import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

export class CreateLiveopsEventDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsISO8601({}, { message: "startsAt must be a valid ISO 8601 date string" })
  startsAt?: string;

  @IsOptional()
  @IsISO8601({}, { message: "endsAt must be a valid ISO 8601 date string" })
  endsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: "ctaUrl must be a valid absolute URL" },
  )
  ctaUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateLiveopsEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsISO8601({}, { message: "startsAt must be a valid ISO 8601 date string" })
  startsAt?: string;

  @IsOptional()
  @IsISO8601({}, { message: "endsAt must be a valid ISO 8601 date string" })
  endsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: "ctaUrl must be a valid absolute URL" },
  )
  ctaUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateLiveopsBannerDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsUrl(
    { require_protocol: true },
    { message: "imageUrl must be a valid absolute URL" },
  )
  imageUrl!: string;

  @IsOptional()
  @IsISO8601({}, { message: "startsAt must be a valid ISO 8601 date string" })
  startsAt?: string;

  @IsOptional()
  @IsISO8601({}, { message: "endsAt must be a valid ISO 8601 date string" })
  endsAt?: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: "linkUrl must be a valid absolute URL" },
  )
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateLiveopsBannerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: "imageUrl must be a valid absolute URL" },
  )
  imageUrl?: string;

  @IsOptional()
  @IsISO8601({}, { message: "startsAt must be a valid ISO 8601 date string" })
  startsAt?: string;

  @IsOptional()
  @IsISO8601({}, { message: "endsAt must be a valid ISO 8601 date string" })
  endsAt?: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: "linkUrl must be a valid absolute URL" },
  )
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
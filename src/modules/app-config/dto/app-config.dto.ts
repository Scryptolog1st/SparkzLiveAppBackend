import { Type } from "class-transformer";
import {
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from "class-validator";

export class UpdateFeatureFlagDto {
    @IsBoolean()
    enabled!: boolean;
}

export class DiscoveryBoostDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    username?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    userId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    durationMinutes?: number;
}

export class DiscoveryHideDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    username?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    userId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    reason?: string;
}

export class DiscoveryControlsQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsIn(["all", "hidden", "boosted", "both"])
    state?: string;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    includeExpiredBoosts?: boolean;
}
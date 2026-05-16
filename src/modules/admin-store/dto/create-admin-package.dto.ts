import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateAdminPackageDto {
    @IsString()
    @MinLength(3)
    @MaxLength(64)
    @Matches(/^[a-z0-9][a-z0-9_-]*$/)
    id!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    coins!: number;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    priceUsd!: number;

    @IsOptional()
    @IsString()
    @MaxLength(8)
    currency?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    appleProductId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    googleProductId?: string;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    forDevUse?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(40)
    badgeText?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    @Matches(/^$|^[a-z0-9][a-z0-9_-]*$/)
    colorPreset?: string;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isFeatured?: boolean;
}
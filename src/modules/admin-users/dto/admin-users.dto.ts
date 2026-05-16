import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";
import { Type } from "class-transformer";

export class AdminUsersListQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsIn(["recent", "oldest", "username"])
    sort?: string;

    @IsOptional()
    @IsIn(["any", "hidden", "boosted", "visible"])
    discoveryState?: string;

    @IsOptional()
    @IsIn(["any", "restricted", "clear"])
    restrictionState?: string;

    @IsOptional()
    @IsIn(["any", "live", "offline"])
    liveState?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminUserModerationHistoryQueryDto {
    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminUserReportsQueryDto {
    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;

    @IsOptional()
    @IsIn(["any", "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED", "ESCALATED"])
    status?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;
}

export class AdminUserDiscoveryHideDto {
    @IsOptional()
    @IsString()
    @MaxLength(300)
    reason?: string;
}

export class AdminUserDiscoveryBoostDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(60 * 24 * 30)
    durationMinutes!: number;
}

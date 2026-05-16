import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class AdminModerationHistoryQueryDto {
    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminModerationActionsQueryDto {
    @IsOptional()
    @IsString()
    streamId?: string;

    @IsOptional()
    @IsIn(["KICK", "MUTE", "BAN", "UNMUTE", "UNBAN"])
    action?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminModerationRestrictionsQueryDto {
    @IsOptional()
    @IsString()
    streamId?: string;

    @IsOptional()
    @IsIn(["MUTE", "BAN"])
    kind?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminModerationActionDto {
    @IsUUID()
    targetUserId!: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(60 * 60 * 24 * 7)
    durationSeconds?: number;
}

export class AdminPlatformBanDto {
    @IsString()
    reason!: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(60 * 60 * 24 * 7)
    durationSeconds?: number;
}

export class AdminPlatformUnbanDto {
    @IsOptional()
    @IsString()
    reason?: string;
}
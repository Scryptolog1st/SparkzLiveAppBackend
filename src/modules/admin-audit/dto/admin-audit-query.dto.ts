import {
    IsDateString,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class AdminAuditQueryDto {
    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    search?: string;

    @IsOptional()
    @IsIn(["all", "views_only", "mutations_only"])
    actionScope?: string;

    @IsOptional()
    @IsIn([
        "VIEW",
        "CREATE",
        "UPDATE",
        "DELETE",
        "STATUS_CHANGE",
        "MODERATION_ACTION",
        "SYSTEM_ACTION",
        "AUTH_ACTION",
        "PERMISSION_ACTION",
        "EXPORT",
    ])
    actionType?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    resourceType?: string;

    @IsOptional()
    @IsIn(["info", "warning", "critical"])
    severity?: string;

    @IsOptional()
    @IsIn(["SUCCESS", "DENIED", "FAILED"])
    status?: string;

    @IsOptional()
    @IsIn(["SUPER_ADMIN", "ADMIN", "MODERATOR", "ANALYST"])
    role?: string;

    @IsOptional()
    @IsIn(["newest", "oldest"])
    sort?: string;

    @IsOptional()
    @IsIn(["24h", "7d", "30d", "all"])
    timeRange?: string;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    action?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    actorId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    resourceId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    targetId?: string;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}
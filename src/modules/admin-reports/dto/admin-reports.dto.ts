import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from "class-validator";

export class AdminReportsQueryDto {
    @IsOptional()
    @IsIn(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED", "ESCALATED"])
    status?: string;

    @IsOptional()
    @IsIn(["USER", "STREAM", "CHAT_MESSAGE", "DM_MESSAGE"])
    targetType?: string;

    @IsOptional()
    @IsIn([
        "NUDITY",
        "HARASSMENT_OR_BULLYING",
        "RACISM_OR_HATE",
        "THREATS",
        "INAPPROPRIATE_BEHAVIOR",
        "RULE_BREAKING_STREAM",
        "ABUSIVE_CHAT_MESSAGE",
        "ABUSIVE_DM",
        "OTHER",
    ])
    reasonCode?: string;

    @IsOptional()
    @IsIn(["any", "assigned", "unassigned"])
    assignment?: string;

    @IsOptional()
    @IsIn(["newest", "oldest", "updated"])
    sort?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class SearchAdminReportAssigneesDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    query?: string;
}

export class UpdateAdminReportStatusDto {
    @IsIn(["IN_REVIEW", "RESOLVED", "DISMISSED", "ESCALATED"])
    status!: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    resolutionNotes?: string;
}

export class AssignAdminReportDto {
    @IsOptional()
    @IsUUID()
    assignedAdminUserId?: string;
}

export class AddAdminReportNoteDto {
    @IsString()
    @MaxLength(2000)
    note!: string;
}

export class BulkAdminReportStatusDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    @IsString({ each: true })
    reportIds!: string[];

    @IsIn(["IN_REVIEW", "RESOLVED", "DISMISSED", "ESCALATED"])
    status!: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    resolutionNotes?: string;
}
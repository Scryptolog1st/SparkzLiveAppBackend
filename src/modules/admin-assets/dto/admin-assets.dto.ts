import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsIn,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
} from "class-validator";

export class AdminAssetsQueryDto {
    @IsOptional()
    @IsIn(["PENDING", "APPROVED", "REJECTED"])
    status?: string;

    @IsOptional()
    @IsIn(["PROFILE_AVATAR", "PROFILE_BANNER"])
    type?: string;

    @IsOptional()
    @IsIn(["any", "needs_attention", "live_targets", "repeat_offenders"])
    preset?: string;

    @IsOptional()
    @IsIn(["newest", "oldest"])
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

export class UpdateAdminAssetNotesDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;
}

export class ApproveAssetSubmissionDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;

    @IsOptional()
    @IsUrl(
        { require_protocol: true },
        { message: "approvedUrl must be a valid absolute URL" },
    )
    approvedUrl?: string;
}

export class RejectAssetSubmissionDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;
}

export class BulkAdminAssetActionDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    @IsString({ each: true })
    submissionIds!: string[];

    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;
}
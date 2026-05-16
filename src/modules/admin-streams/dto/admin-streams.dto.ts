import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class AdminStreamsListQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsIn(["true", "false"])
    flagged?: string;

    @IsOptional()
    @IsIn(["true", "false"])
    pk?: string;

    @IsOptional()
    @IsIn(["viewers", "recent", "oldest"])
    sort?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminTerminateStreamDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    reason!: string;
}
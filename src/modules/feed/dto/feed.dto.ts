import { Type } from "class-transformer";
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class FeedPostsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(30)
    limit?: number;

    @IsOptional()
    @IsString()
    cursor?: string;

    @IsOptional()
    @IsIn(["all", "favorites"])
    scope?: "all" | "favorites";
}

export class CreateFeedPostDto {
    @IsString()
    @MaxLength(1000)
    imageUrl!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    caption?: string;
}

export class CreateFeedPostCommentDto {
    @IsString()
    @MaxLength(500)
    text!: string;
}

export class FeedPostCommentsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @IsString()
    cursor?: string;
}
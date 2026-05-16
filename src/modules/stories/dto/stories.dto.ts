import { Type } from "class-transformer";
import {
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class StoriesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number;

    @IsOptional()
    @IsString()
    cursor?: string;
}

export class CreateStoryPostDto {
    @IsString()
    @MaxLength(1000)
    mediaUrl!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    caption?: string;
}
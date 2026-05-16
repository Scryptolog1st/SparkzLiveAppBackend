import { ArrayMaxSize, IsArray, IsOptional, IsString } from "class-validator";

export class BulkUnfavoriteDto {
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(200)
    @IsString({ each: true })
    identifiers?: string[];

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(200)
    @IsString({ each: true })
    userIds?: string[];
}
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsIn,
    IsOptional,
    IsUUID,
    IsString,
    MaxLength,
} from "class-validator";

export class AdminChatMessagesQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsString()
    streamId?: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    hostUserId?: string;

    @IsOptional()
    @IsIn(["any", "reply", "top_level"])
    hasReply?: string;

    @IsOptional()
    @IsIn(["any", "badged", "unbadged"])
    hasBadges?: string;

    @IsOptional()
    @IsIn(["newest", "oldest"])
    sort?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminChatBulkDeleteDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(100)
    @IsString({ each: true })
    messageIds!: string[];
}

export class AdminChatDeleteByUserDto {
    @IsUUID()
    userId!: string;

    @IsOptional()
    @IsUUID()
    streamId?: string;
}
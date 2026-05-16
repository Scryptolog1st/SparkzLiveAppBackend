import {
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from "class-validator";

export class CreateReportDto {
    @IsIn(["USER", "STREAM", "CHAT_MESSAGE", "DM_MESSAGE"])
    targetType!: "USER" | "STREAM" | "CHAT_MESSAGE" | "DM_MESSAGE";

    @IsOptional()
    @IsUUID()
    targetUserId?: string;

    @IsOptional()
    @IsUUID()
    targetStreamId?: string;

    @IsOptional()
    @IsUUID()
    targetChatMessageId?: string;

    @IsOptional()
    @IsUUID()
    targetDmMessageId?: string;

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
    reasonCode!:
        | "NUDITY"
        | "HARASSMENT_OR_BULLYING"
        | "RACISM_OR_HATE"
        | "THREATS"
        | "INAPPROPRIATE_BEHAVIOR"
        | "RULE_BREAKING_STREAM"
        | "ABUSIVE_CHAT_MESSAGE"
        | "ABUSIVE_DM"
        | "OTHER";

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;
}
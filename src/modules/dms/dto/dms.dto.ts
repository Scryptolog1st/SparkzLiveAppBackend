import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class UpdateDmSettingsDto {
    @IsOptional()
    @IsString()
    dmUnlockGiftId?: string | null;
}

export class SendDmDto {
    @IsOptional()
    @IsUUID()
    conversationId?: string;

    @IsUUID()
    recipientUserId!: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    text?: string;

    @IsOptional()
    @IsString()
    mediaUrl?: string;

    @IsOptional()
    @IsString()
    messageType?: "TEXT" | "GIF" | "IMAGE" | "GIFT";

    @IsOptional()
    @IsString()
    giftId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    idempotencyKey?: string;
}

export class AdvertisementDmRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    text!: string;
}

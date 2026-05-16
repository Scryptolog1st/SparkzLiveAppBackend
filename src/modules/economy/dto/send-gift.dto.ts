import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class SendGiftDto {
  @IsString()
  @MaxLength(120)
  giftId!: string;

  @IsUUID()
  recipientUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsOptional()
  @IsUUID()
  battleSideId?: string;
}
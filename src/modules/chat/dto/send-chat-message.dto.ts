import { IsOptional, IsString, MaxLength } from "class-validator";

export class SendChatMessageDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsOptional()
  @IsString()
  replyToMessageId?: string | null;
}

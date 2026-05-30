import { IsOptional, IsString, MaxLength } from "class-validator";

export class StreamStartupDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceSessionId?: string;
}

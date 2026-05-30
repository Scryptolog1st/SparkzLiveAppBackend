import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class VideoTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceSessionId?: string;

  @IsOptional()
  @IsString()
  @IsIn(["publisher", "owner_viewer", "viewer"])
  joinMode?: "publisher" | "owner_viewer" | "viewer";

  @IsOptional()
  @IsBoolean()
  takeover?: boolean;
}

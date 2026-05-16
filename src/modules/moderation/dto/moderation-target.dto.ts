import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class ModerationTargetDto {
  @IsUUID()
  targetUserId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  durationLabel?: string;

  // null/undefined = permanent (for ban/mute); for kick default applies in service
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60 * 60 * 24 * 30) // 30 days max in one action
  durationSeconds?: number;
}

import { IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export class CreateBattleDto {
  @IsUUID()
  opponentUserId!: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(3600)
  durationSeconds?: number;
}

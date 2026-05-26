import { IsBoolean, IsIn, IsOptional, IsUUID } from "class-validator";

export class CreateBattleV2DirectInviteDto {
  @IsIn(["ONE_V_ONE"])
  battleType!: "ONE_V_ONE";

  @IsUUID()
  recipientHostUserId!: string;

  @IsIn([60, 120, 180, 240, 300])
  durationSeconds!: 60 | 120 | 180 | 240 | 300;

  @IsOptional()
  @IsBoolean()
  cancelPendingOutgoing?: boolean;
}

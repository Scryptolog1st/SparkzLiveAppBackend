import { IsIn } from "class-validator";

export class JoinBattleV2RandomQueueDto {
  @IsIn(["ONE_V_ONE"])
  battleType!: "ONE_V_ONE";
}

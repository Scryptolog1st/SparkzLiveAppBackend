import { IsIn, IsOptional } from "class-validator";

export class BattleV2EligibleHostsQueryDto {
  @IsOptional()
  @IsIn(["ONE_V_ONE"])
  type?: "ONE_V_ONE";
}

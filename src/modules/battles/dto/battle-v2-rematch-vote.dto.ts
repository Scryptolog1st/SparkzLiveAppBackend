import { IsIn } from "class-validator";

export class BattleV2RematchVoteDto {
  @IsIn(["REMATCH", "SKIP"])
  vote!: "REMATCH" | "SKIP";
}

import { IsUUID } from "class-validator";

export class CreateBattleV2ContributionDto {
  @IsUUID()
  giftTxId!: string;
}

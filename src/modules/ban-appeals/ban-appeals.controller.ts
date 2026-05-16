import { Body, Controller, Post } from "@nestjs/common";

import { BanAppealsService } from "./ban-appeals.service";
import { SubmitBanAppealDto } from "./dto/ban-appeals.dto";

@Controller("auth")
export class BanAppealsController {
  constructor(private readonly banAppeals: BanAppealsService) {}

  @Post("ban-appeals")
  async submit(@Body() dto: SubmitBanAppealDto) {
    return this.banAppeals.submit(dto);
  }
}

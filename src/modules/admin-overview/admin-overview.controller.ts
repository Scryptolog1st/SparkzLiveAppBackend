import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AdminOverviewService } from "./admin-overview.service";

@Controller("admin/overview")
@UseGuards(AuthGuard("jwt"))
export class AdminOverviewController {
  constructor(private readonly adminOverview: AdminOverviewService) { }

  @Get()
  async getOverview(@Req() req: any) {
    return this.adminOverview.getOverview(req.user.userId);
  }
}
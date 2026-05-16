import { Controller, Get, Param } from "@nestjs/common";
import { MilestonesService } from "./milestones.service";

@Controller()
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) { }

  @Get("/users/:username/milestones")
  async byUsername(@Param("username") username: string) {
    return this.milestones.getMilestonesByUsername(username);
  }
}
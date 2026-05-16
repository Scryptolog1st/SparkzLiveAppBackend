import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { ScheduleService } from "./schedule.service";
import { ScheduleItemInputDto } from "./dto/schedule-item.dto";

type JwtReq = Request & { user?: { userId: string; username?: string } };

@Controller()
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  // Public read by username
  @Get("/users/:username/schedule")
  async getByUsername(@Param("username") username: string) {
    return this.schedule.getScheduleByUsername(username);
  }

  // Replace current user's schedule list
  @UseGuards(JwtAuthGuard)
  @Put("/me/schedule")
  async replaceMine(@Req() req: JwtReq, @Body() body: ScheduleItemInputDto[]) {
    const userId = req.user?.userId!;
    return this.schedule.replaceMySchedule(userId, body as any);
  }
}

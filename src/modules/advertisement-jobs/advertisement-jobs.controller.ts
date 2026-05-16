import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { AdvertisementJobsService } from "./advertisement-jobs.service";
import {
  DeclineAdvertisementJobCompletionDto,
  RateAdvertisementJobDto,
} from "./dto/advertisement-jobs.dto";

type JwtReq = Request & { user?: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller("advertisements/jobs")
export class AdvertisementJobsController {
  constructor(private readonly jobs: AdvertisementJobsService) {}

  @Get("me")
  async myJobs(@Req() req: JwtReq, @Query() query: any) {
    return this.jobs.listMyJobs(req.user!.userId, query || {});
  }

  @Get("conversations/:conversationId")
  async byConversation(@Req() req: JwtReq, @Param("conversationId") conversationId: string) {
    return this.jobs.getJobByConversation(req.user!.userId, conversationId);
  }

  @Post(":id/accept")
  async accept(@Req() req: JwtReq, @Param("id") id: string) {
    return this.jobs.acceptJob(req.user!.userId, id);
  }

  @Post(":id/decline")
  async decline(@Req() req: JwtReq, @Param("id") id: string) {
    return this.jobs.declineJob(req.user!.userId, id);
  }

  @Post(":id/mark-complete")
  async markComplete(@Req() req: JwtReq, @Param("id") id: string) {
    return this.jobs.markComplete(req.user!.userId, id);
  }

  @Post(":id/approve-completion")
  async approveCompletion(@Req() req: JwtReq, @Param("id") id: string) {
    return this.jobs.approveCompletion(req.user!.userId, id);
  }

  @Post(":id/decline-completion")
  async declineCompletion(
    @Req() req: JwtReq,
    @Param("id") id: string,
    @Body() body: DeclineAdvertisementJobCompletionDto,
  ) {
    return this.jobs.declineCompletion(req.user!.userId, id, body?.reason);
  }

  @Post(":id/rate")
  async rate(@Req() req: JwtReq, @Param("id") id: string, @Body() body: RateAdvertisementJobDto) {
    return this.jobs.rateJob(req.user!.userId, id, body.stars);
  }
}

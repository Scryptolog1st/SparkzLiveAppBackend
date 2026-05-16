import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { ModerationService } from "./moderation.service";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { ModerationTargetDto } from "./dto/moderation-target.dto";

type JwtReq = Request & {
  user?: {
    userId: string;
    username?: string;
  };
};

@Controller()
export class ModerationController {
  constructor(private readonly mod: ModerationService) { }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/roles/assign")
  async assignRole(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.mod.assignRole({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId: dto.targetUserId,
      role: dto.role,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/kick")
  async kick(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: ModerationTargetDto,
  ) {
    return this.mod.kick({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
      durationSeconds: dto.durationSeconds,
      durationLabel: dto.durationLabel,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/mute")
  async mute(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: ModerationTargetDto,
  ) {
    return this.mod.mute({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
      durationSeconds: dto.durationSeconds,
      durationLabel: dto.durationLabel,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/chat-mute")
  async chatMute(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: ModerationTargetDto,
  ) {
    return this.mod.chatMute({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/ban")
  async ban(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: ModerationTargetDto,
  ) {
    return this.mod.ban({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
      durationSeconds: dto.durationSeconds,
      durationLabel: dto.durationLabel,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("/streams/:id/moderation/bans")
  async listStreamBans(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Query("search") search?: string,
  ) {
    return this.mod.listStreamBans({
      streamId,
      actorUserId: req.user!.userId,
      search,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/bans/:targetUserId")
  async updateStreamBan(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Param("targetUserId") targetUserId: string,
    @Body()
    dto: {
      reason?: string | null;
      durationSeconds?: number | null;
      durationLabel?: string | null;
    },
  ) {
    return this.mod.updateStreamBan({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId,
      reason: dto?.reason ?? undefined,
      durationSeconds: dto?.durationSeconds ?? null,
      durationLabel: dto?.durationLabel ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/bans/:targetUserId/unban")
  async unbanStreamBan(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Param("targetUserId") targetUserId: string,
    @Body() dto: { reason?: string | null },
  ) {
    return this.mod.unbanStreamBan({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId,
      reason: dto?.reason ?? undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/unmute")
  async unmute(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: ModerationTargetDto,
  ) {
    return this.mod.unmute({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/chat-unmute")
  async chatUnmute(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: ModerationTargetDto,
  ) {
    return this.mod.chatUnmute({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/moderation/unban")
  async unban(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: ModerationTargetDto,
  ) {
    return this.mod.unban({
      streamId,
      actorUserId: req.user!.userId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
    });
  }
}
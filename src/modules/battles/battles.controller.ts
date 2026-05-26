// backend/src/modules/battles/battles.controller.ts

import {
  Body, Controller, Get, Param,
  Query, Post, Delete, Req, UseGuards
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { BattlesService } from "./battles.service";
import { CreateBattleDto } from "./dto/create-battle.dto";
import { BattleV2EligibleHostsQueryDto } from "./dto/battle-v2-eligible-hosts.dto";
import { CreateBattleV2DirectInviteDto } from "./dto/battle-v2-direct-invite.dto";
import { CreateBattleV2ContributionDto } from "./dto/battle-v2-contribution.dto";
import { BattleV2RematchVoteDto } from "./dto/battle-v2-rematch-vote.dto";
import { JoinBattleV2RandomQueueDto } from "./dto/battle-v2-random-queue.dto";

type JwtReq = Request & { user?: { userId: string; username?: string } };

@Controller()
export class BattlesController {
  constructor(private readonly battles: BattlesService) { }

  @UseGuards(JwtAuthGuard)
  @Get("/streams/:id/battles/invites")
  async getBattleInvitesV2(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
  ) {
    return this.battles.getBattleInvitesForStreamV2({
      streamId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/invites/:inviteId/process-invite-expiry")
  async processBattleInviteExpiryV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.battles.processBattleInviteExpiryV2({
      battleSessionId,
      inviteId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/rematch-vote")
  async submitBattleRematchVoteV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
    @Body() body: BattleV2RematchVoteDto,
  ) {
    return this.battles.submitBattleRematchVoteV2({
      battleSessionId,
      actorUserId: req.user!.userId,
      vote: body.vote,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/skip")
  async skipBattleSessionV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
  ) {
    return this.battles.skipBattleSessionV2({
      battleSessionId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/process-cooldown")
  async processBattleCooldownV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
  ) {
    return this.battles.processBattleCooldownExpiryV2({
      battleSessionId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/process-expiry")
  async processBattleExpiryV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
  ) {
    return this.battles.processBattleTimerExpiryV2({
      battleSessionId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/sides/:sideId/contributions")
  async recordBattleContributionV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
    @Param("sideId") sideId: string,
    @Body() body: CreateBattleV2ContributionDto,
  ) {
    return this.battles.recordBattleGiftContributionV2({
      battleSessionId,
      sideId,
      actorUserId: req.user!.userId,
      giftTxId: body.giftTxId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/invites/:inviteId/accept")
  async acceptDirectInviteV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.battles.acceptDirectInviteBattleV2({
      battleSessionId,
      inviteId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/invites/:inviteId/decline")
  async declineDirectInviteV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.battles.declineDirectInviteBattleV2({
      battleSessionId,
      inviteId,
      actorUserId: req.user!.userId,
    });
  }


  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/battles/random-queue")
  async joinRandomQueueV2(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() body: JoinBattleV2RandomQueueDto,
  ) {
    return this.battles.joinRandomBattleQueueV2({
      streamId,
      actorUserId: req.user!.userId,
      battleType: body.battleType,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete("/streams/:id/battles/random-queue")
  async cancelRandomQueueV2(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
  ) {
    return this.battles.cancelRandomBattleQueueV2({
      streamId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/battles/direct-invites")
  async createDirectInviteV2(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() body: CreateBattleV2DirectInviteDto,
  ) {
    return this.battles.createDirectInviteBattleV2({
      streamId,
      actorUserId: req.user!.userId,
      battleType: body.battleType,
      recipientHostUserId: body.recipientHostUserId,
      durationSeconds: body.durationSeconds,
      cancelPendingOutgoing: body.cancelPendingOutgoing === true,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:battleSessionId/invites/:inviteId/cancel")
  async cancelDirectInviteV2(
    @Req() req: JwtReq,
    @Param("battleSessionId") battleSessionId: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.battles.cancelDirectInviteBattleV2({
      battleSessionId,
      inviteId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("/streams/:id/battles/eligible-hosts")
  async eligibleDirectHostsV2(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Query() query: BattleV2EligibleHostsQueryDto,
  ) {
    return this.battles.getEligibleDirectInviteHostsV2({
      streamId,
      actorUserId: req.user!.userId,
      battleType: query.type || "ONE_V_ONE",
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("/streams/:id/battles/v2/active")
  async activeBattleSessionV2(@Req() req: JwtReq, @Param("id") streamId: string) {
    return this.battles.getActiveBattleSessionForStreamV2({
      streamId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("/battle-sessions/:battleSessionId")
  async battleSessionV2(@Req() req: JwtReq, @Param("battleSessionId") battleSessionId: string) {
    return this.battles.getBattleSessionV2({
      battleSessionId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("/streams/:id/battles/setup-options")
  async setupOptions(@Req() req: JwtReq, @Param("id") streamId: string) {
    return this.battles.getBattleSetupOptions({
      streamId,
      actorUserId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/battles")
  async create(@Req() req: JwtReq, @Param("id") streamId: string, @Body() dto: CreateBattleDto) {
    return this.battles.createBattle({
      streamId,
      actorUserId: req.user!.userId,
      opponentUserId: dto.opponentUserId,
      durationSeconds: dto.durationSeconds ?? 60,
    });
  }

  @Get("/streams/:id/battles/active")
  async active(@Param("id") streamId: string) {
    return this.battles.getActiveBattle(streamId);
  }

  @Get("/battles/:battleId")
  async byId(@Param("battleId") battleId: string) {
    return this.battles.getBattleById(battleId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battles/:battleId/accept")
  async accept(@Req() req: JwtReq, @Param("battleId") battleId: string) {
    return this.battles.acceptBattle({ battleId, actorUserId: req.user!.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battles/:battleId/decline")
  async decline(@Req() req: JwtReq, @Param("battleId") battleId: string) {
    return this.battles.declineBattle({ battleId, actorUserId: req.user!.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battles/:battleId/cancel")
  async cancel(@Req() req: JwtReq, @Param("battleId") battleId: string) {
    return this.battles.cancelBattle({ battleId, actorUserId: req.user!.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battles/:battleId/end")
  async end(@Req() req: JwtReq, @Param("battleId") battleId: string) {
    return this.battles.endBattle({ battleId, actorUserId: req.user!.userId });
  }
}
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import {
  AdminModerationActionDto,
  AdminModerationActionsQueryDto,
  AdminModerationHistoryQueryDto,
  AdminModerationRestrictionsQueryDto,
  AdminPlatformBanDto,
  AdminPlatformUnbanDto,
} from "./dto/admin-moderation.dto";
import { ModerationService } from "./moderation.service";

@Controller("admin/moderation")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminModerationController {
  constructor(private readonly moderation: ModerationService) { }

  @Get("actions")
  @RequireAdminPermission(ADMIN_PERMISSIONS.MOD_ACTIONS_VIEW)
  async getActions(
    @Req() req: any,
    @Query() query: AdminModerationActionsQueryDto,
  ) {
    return this.moderation.getAdminActionsFeed(req.adminUser.id, query);
  }

  @Get("restrictions/active")
  @RequireAdminPermission(ADMIN_PERMISSIONS.MOD_RESTRICTIONS_VIEW)
  async getActiveRestrictions(
    @Req() req: any,
    @Query() query: AdminModerationRestrictionsQueryDto,
  ) {
    return this.moderation.getActiveRestrictions(req.adminUser.id, query);
  }

  @Get("users/:userId/history")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USERS_VIEW)
  async getUserHistory(
    @Req() req: any,
    @Param("userId") userId: string,
    @Query() query: AdminModerationHistoryQueryDto,
  ) {
    return this.moderation.getAdminUserHistory(
      req.adminUser.id,
      userId,
      query,
    );
  }

  @Post("streams/:streamId/kick")
  @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_RESOLVE)
  async kick(
    @Req() req: any,
    @Param("streamId") streamId: string,
    @Body() dto: AdminModerationActionDto,
  ) {
    return this.moderation.adminKick({
      actorAdminUserId: req.adminUser.id,
      streamId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
      durationSeconds: dto.durationSeconds,
    });
  }

  @Post("streams/:streamId/mute")
  @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_RESOLVE)
  async mute(
    @Req() req: any,
    @Param("streamId") streamId: string,
    @Body() dto: AdminModerationActionDto,
  ) {
    return this.moderation.adminMute({
      actorAdminUserId: req.adminUser.id,
      streamId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
      durationSeconds: dto.durationSeconds,
    });
  }

  @Post("streams/:streamId/ban")
  @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_RESOLVE)
  async ban(
    @Req() req: any,
    @Param("streamId") streamId: string,
    @Body() dto: AdminModerationActionDto,
  ) {
    return this.moderation.adminBan({
      actorAdminUserId: req.adminUser.id,
      streamId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
      durationSeconds: dto.durationSeconds,
    });
  }

  @Post("streams/:streamId/unmute")
  @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_RESOLVE)
  async unmute(
    @Req() req: any,
    @Param("streamId") streamId: string,
    @Body() dto: AdminModerationActionDto,
  ) {
    return this.moderation.adminUnmute({
      actorAdminUserId: req.adminUser.id,
      streamId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
    });
  }

  @Post("streams/:streamId/unban")
  @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_RESOLVE)
  async unban(
    @Req() req: any,
    @Param("streamId") streamId: string,
    @Body() dto: AdminModerationActionDto,
  ) {
    return this.moderation.adminUnban({
      actorAdminUserId: req.adminUser.id,
      streamId,
      targetUserId: dto.targetUserId,
      reason: dto.reason,
    });
  }

  @Post("users/:userId/platform-ban")
  @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_RESOLVE)
  async platformBan(
    @Req() req: any,
    @Param("userId") userId: string,
    @Body() dto: AdminPlatformBanDto,
  ) {
    return this.moderation.adminPlatformBan({
      actorAdminUserId: req.adminUser.id,
      targetUserId: userId,
      reason: dto.reason,
      durationSeconds: dto.durationSeconds,
    });
  }

  @Post("users/:userId/platform-unban")
  @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_RESOLVE)
  async platformUnban(
    @Req() req: any,
    @Param("userId") userId: string,
    @Body() dto: AdminPlatformUnbanDto,
  ) {
    return this.moderation.adminPlatformUnban({
      actorAdminUserId: req.adminUser.id,
      targetUserId: userId,
      reason: dto.reason,
    });
  }
}
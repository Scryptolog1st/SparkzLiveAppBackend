import { Body, Controller, Get, Patch, Put, Req, UseGuards } from "@nestjs/common";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { AutomodConfigService } from "./automod-config.service";

@Controller("admin/automod")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AutomodConfigController {
  constructor(private readonly automod: AutomodConfigService) { }

  @Get("config")
  @RequireAdminPermission(ADMIN_PERMISSIONS.AUTOMOD_VIEW)
  async getConfig(@Req() req: any) {
    return this.automod.getConfig(req.adminUser.id);
  }

  @Patch("config")
  @RequireAdminPermission(ADMIN_PERMISSIONS.AUTOMOD_EDIT)
  async updateConfig(
    @Req() req: any,
    @Body()
    body: {
      nsfwDetection?: number;
      violenceWeapons?: number;
      drugParaphernalia?: number;
    },
  ) {
    return this.automod.updateConfig(req.adminUser.id, body);
  }

  @Get("blacklist")
  @RequireAdminPermission(ADMIN_PERMISSIONS.AUTOMOD_VIEW)
  async getBlacklist(@Req() req: any) {
    return this.automod.getBlacklist(req.adminUser.id);
  }

  @Put("blacklist")
  @RequireAdminPermission(ADMIN_PERMISSIONS.AUTOMOD_EDIT)
  async putBlacklist(
    @Req() req: any,
    @Body() body: { entries: string[] },
  ) {
    return this.automod.putBlacklist(req.adminUser.id, body.entries);
  }
}
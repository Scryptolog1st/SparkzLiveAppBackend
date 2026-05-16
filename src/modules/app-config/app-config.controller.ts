import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import {
  DiscoveryBoostDto,
  DiscoveryControlsQueryDto,
  DiscoveryHideDto,
  UpdateFeatureFlagDto,
} from "./dto/app-config.dto";
import { AppConfigService } from "./app-config.service";

type AdminRequestContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

@Controller("admin/config")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AppConfigController {
  constructor(private readonly appConfig: AppConfigService) { }

  private getHeader(req: Request, name: string) {
    const value = req.headers[name];

    if (Array.isArray(value)) {
      return value[0] ?? "";
    }

    return typeof value === "string" ? value : "";
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = String(value || "").trim();
    return normalized ? normalized : null;
  }

  private extractIp(req: Request) {
    const forwardedFor = this.getHeader(req, "x-forwarded-for");
    if (forwardedFor) {
      const first = forwardedFor
        .split(",")
        .map((part) => part.trim())
        .find(Boolean);

      if (first) {
        return first;
      }
    }

    const realIp =
      this.getHeader(req, "cf-connecting-ip") ||
      this.getHeader(req, "x-real-ip") ||
      req.ip ||
      "";

    return this.normalizeOptionalString(realIp);
  }

  private buildAuditContext(req: Request): AdminRequestContext {
    const requestPath = this.normalizeOptionalString(req.originalUrl || req.url || "");
    const ipAddress = this.extractIp(req);
    const userAgent = this.normalizeOptionalString(this.getHeader(req, "user-agent"));

    return {
      requestPath,
      ipAddress,
      userAgent,
      deviceLabel: userAgent ? "Admin Dashboard Browser" : null,
    };
  }

  @Get("feature-flags")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
  async getFeatureFlags(@Req() req: any) {
    return this.appConfig.getFeatureFlags(
      req.adminUser.id,
      this.buildAuditContext(req),
    );
  }

  @Patch("feature-flags/:key")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
  async updateFeatureFlag(
    @Req() req: any,
    @Param("key") key: string,
    @Body() body: UpdateFeatureFlagDto,
  ) {
    return this.appConfig.updateFeatureFlag(
      req.adminUser.id,
      key,
      body.enabled,
      this.buildAuditContext(req),
    );
  }

  @Get("login-gate")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
  async getLoginGate(@Req() req: any) {
    return this.appConfig.getLoginGate(
      req.adminUser.id,
      this.buildAuditContext(req),
    );
  }

  @Patch("login-gate")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_MANAGE)
  async updateLoginGate(@Req() req: any, @Body() body: any) {
    return this.appConfig.updateLoginGate(
      req.adminUser.id,
      body || {},
      this.buildAuditContext(req),
    );
  }

  @Post("discovery/boost")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
  async boostUser(
    @Req() req: any,
    @Body() body: DiscoveryBoostDto,
  ) {
    return this.appConfig.boostUser(
      req.adminUser.id,
      body,
      this.buildAuditContext(req),
    );
  }

  @Delete("discovery/boost/:userId")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
  async clearBoost(
    @Req() req: any,
    @Param("userId") userId: string,
  ) {
    return this.appConfig.clearBoost(
      req.adminUser.id,
      userId,
      this.buildAuditContext(req),
    );
  }

  @Post("discovery/hide")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
  async hideUser(
    @Req() req: any,
    @Body() body: DiscoveryHideDto,
  ) {
    return this.appConfig.hideUser(
      req.adminUser.id,
      body,
      this.buildAuditContext(req),
    );
  }

  @Delete("discovery/hide/:userId")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
  async unhideUser(
    @Req() req: any,
    @Param("userId") userId: string,
  ) {
    return this.appConfig.unhideUser(
      req.adminUser.id,
      userId,
      this.buildAuditContext(req),
    );
  }

  @Get("discovery/controls")
  @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
  async getDiscoveryControls(
    @Req() req: any,
    @Query() query: DiscoveryControlsQueryDto,
  ) {
    return this.appConfig.getDiscoveryControls(req.adminUser.id, query);
  }
}
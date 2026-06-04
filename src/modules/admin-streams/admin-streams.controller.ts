import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { AdminStreamsListQueryDto, AdminTerminateStreamDto } from "./dto/admin-streams.dto";
import { AdminStreamsService } from "./admin-streams.service";

type AdminRequestContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

@Controller("admin/streams")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminStreamsController {
  constructor(private readonly adminStreams: AdminStreamsService) { }

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

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.STREAMS_VIEW)
  async list(@Req() req: any, @Query() query: AdminStreamsListQueryDto) {
    return this.adminStreams.list(req.adminUser.id, query);
  }

  @Get(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.STREAMS_VIEW)
  async byId(@Req() req: any, @Param("id") id: string) {
    return this.adminStreams.getById(
      req.adminUser.id,
      id,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/watch-session")
  @RequireAdminPermission(ADMIN_PERMISSIONS.LIVE_VIEW)
  async watchSession(@Req() req: any, @Param("id") id: string) {
    return this.adminStreams.watchSession(
      req.adminUser.id,
      id,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/guests/:guestUserId/remove")
  @RequireAdminPermission(ADMIN_PERMISSIONS.LIVE_VIEW)
  async removeGuestFromBox(
    @Req() req: any,
    @Param("id") id: string,
    @Param("guestUserId") guestUserId: string,
  ) {
    return this.adminStreams.removeGuestFromBox(
      req.adminUser.id,
      id,
      guestUserId,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/guests/:guestUserId/camera")
  @RequireAdminPermission(ADMIN_PERMISSIONS.LIVE_VIEW)
  async setGuestCameraState(
    @Req() req: any,
    @Param("id") id: string,
    @Param("guestUserId") guestUserId: string,
    @Body() body: { state?: boolean },
  ) {
    return this.adminStreams.setGuestCameraState(
      req.adminUser.id,
      id,
      guestUserId,
      Boolean(body?.state),
      this.buildAuditContext(req),
    );
  }

  @Post(":id/terminate")
  @RequireAdminPermission(ADMIN_PERMISSIONS.STREAMS_TERMINATE)
  async terminate(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: AdminTerminateStreamDto,
  ) {
    return this.adminStreams.terminate(
      req.adminUser.id,
      id,
      body.reason,
      this.buildAuditContext(req),
    );
  }
}
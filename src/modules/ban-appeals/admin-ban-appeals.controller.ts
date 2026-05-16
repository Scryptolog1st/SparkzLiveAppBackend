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
import type { Request } from "express";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { BanAppealsService } from "./ban-appeals.service";
import {
  AdminBanAppealDecisionDto,
  AdminBanAppealInReviewDto,
  AdminBanAppealNoteDto,
  AdminBanAppealsQueryDto,
} from "./dto/ban-appeals.dto";

type AdminRequestContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

@Controller("admin/ban-appeals")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminBanAppealsController {
  constructor(private readonly banAppeals: BanAppealsService) { }

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

  @Get("summary")
  @RequireAdminPermission(ADMIN_PERMISSIONS.BAN_APPEALS_VIEW)
  async summary(@Req() req: any) {
    return this.banAppeals.getAdminSummary(req.adminUser.id);
  }

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.BAN_APPEALS_VIEW)
  async list(
    @Req() req: any,
    @Query() query: AdminBanAppealsQueryDto,
  ) {
    return this.banAppeals.listAdminAppeals(req.adminUser.id, query);
  }

  @Get(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.BAN_APPEALS_VIEW)
  async byId(@Req() req: any, @Param("id") id: string) {
    return this.banAppeals.getAdminAppealById(
      req.adminUser.id,
      id,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/note")
  @RequireAdminPermission(ADMIN_PERMISSIONS.BAN_APPEALS_REVIEW)
  async note(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: AdminBanAppealNoteDto,
  ) {
    return this.banAppeals.saveAdminNote(
      req.adminUser.id,
      id,
      dto,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/in-review")
  @RequireAdminPermission(ADMIN_PERMISSIONS.BAN_APPEALS_REVIEW)
  async inReview(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: AdminBanAppealInReviewDto,
  ) {
    return this.banAppeals.moveToInReview(
      req.adminUser.id,
      id,
      dto,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/approve")
  @RequireAdminPermission(ADMIN_PERMISSIONS.BAN_APPEALS_REVIEW)
  async approve(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: AdminBanAppealDecisionDto,
  ) {
    return this.banAppeals.approve(
      req.adminUser.id,
      id,
      dto,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/deny")
  @RequireAdminPermission(ADMIN_PERMISSIONS.BAN_APPEALS_REVIEW)
  async deny(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: AdminBanAppealDecisionDto,
  ) {
    return this.banAppeals.deny(
      req.adminUser.id,
      id,
      dto,
      this.buildAuditContext(req),
    );
  }
}
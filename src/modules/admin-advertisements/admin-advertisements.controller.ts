import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
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
  AdminAdvertisementsQueryDto,
  DenyAdvertisementRevisionDto,
  PauseAdvertisementDto,
  UpdateAdvertisementSettingsDto,
} from "./dto/admin-advertisements.dto";
import { AdminAdvertisementsService } from "./admin-advertisements.service";

@Controller("admin/advertisements")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminAdvertisementsController {
  constructor(private readonly adminAdvertisements: AdminAdvertisementsService) {}

  private requireSuperAdmin(req: any) {
    if (req.adminUser?.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Only Super Admins can manage advertisement settings.");
    }
  }

  private buildAuditContext(req: any) {
    return {
      requestPath: req.originalUrl || req.url || null,
      ipAddress: req.ip || null,
      userAgent: req.headers?.["user-agent"] || null,
      deviceLabel: req.headers?.["x-device-label"] || null,
    };
  }

  @Get("settings")
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_ADVERT_MANAGE)
  async settings(@Req() req: any) {
    this.requireSuperAdmin(req);
    return this.adminAdvertisements.getSettings();
  }

  @Patch("settings")
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_ADVERT_MANAGE)
  async updateSettings(@Req() req: any, @Body() body: UpdateAdvertisementSettingsDto) {
    this.requireSuperAdmin(req);
    return this.adminAdvertisements.updateSettings(
      req.adminUser.id,
      body,
      this.buildAuditContext(req),
    );
  }

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_ADVERT_VIEW)
  async list(@Req() req: any, @Query() query: AdminAdvertisementsQueryDto) {
    return this.adminAdvertisements.list(req.adminUser.role, query);
  }

  @Get(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_ADVERT_VIEW)
  async byId(@Req() req: any, @Param("id") id: string) {
    return this.adminAdvertisements.byId(req.adminUser.role, id);
  }

  @Post("revisions/:revisionId/approve")
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_ADVERT_MANAGE)
  async approveRevision(@Req() req: any, @Param("revisionId") revisionId: string) {
    return this.adminAdvertisements.approveRevision(
      req.adminUser.id,
      req.adminUser.role,
      revisionId,
      this.buildAuditContext(req),
    );
  }

  @Post("revisions/:revisionId/deny")
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_ADVERT_MANAGE)
  async denyRevision(
    @Req() req: any,
    @Param("revisionId") revisionId: string,
    @Body() body: DenyAdvertisementRevisionDto,
  ) {
    return this.adminAdvertisements.denyRevision(
      req.adminUser.id,
      req.adminUser.role,
      revisionId,
      body.reason,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/pause")
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_ADVERT_MANAGE)
  async pause(@Req() req: any, @Param("id") id: string, @Body() body: PauseAdvertisementDto) {
    return this.adminAdvertisements.pauseAdvertisement(
      req.adminUser.id,
      req.adminUser.role,
      id,
      body.reason,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/resume")
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_ADVERT_MANAGE)
  async resume(@Req() req: any, @Param("id") id: string) {
    return this.adminAdvertisements.resumeAdvertisement(
      req.adminUser.id,
      req.adminUser.role,
      id,
      this.buildAuditContext(req),
    );
  }
}

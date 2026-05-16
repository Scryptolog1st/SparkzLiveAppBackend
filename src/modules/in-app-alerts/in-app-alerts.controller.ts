import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import {
  AdminInAppAlertsQueryDto,
  CreateInAppAlertDto,
  DueInAppAlertsQueryDto,
  InAppAlertActionDto,
  InAppAlertEventDto,
  UpdateInAppAlertDto,
} from "./dto/in-app-alerts.dto";
import { InAppAlertsService } from "./in-app-alerts.service";

function getUserId(req: Request): string | null {
  const u: any = (req as any).user;
  return u?.id || u?.userId || u?.sub || null;
}

@Controller("admin/in-app-alerts")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminInAppAlertsController {
  constructor(private readonly inAppAlerts: InAppAlertsService) {}

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.IN_APP_ALERTS_VIEW)
  async list(@Query() query: AdminInAppAlertsQueryDto) {
    return this.inAppAlerts.listAdminAlerts(query);
  }

  @Get(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.IN_APP_ALERTS_VIEW)
  async get(@Param("id") id: string) {
    return this.inAppAlerts.getAdminAlert(id);
  }

  @Post()
  @RequireAdminPermission(ADMIN_PERMISSIONS.IN_APP_ALERTS_MANAGE)
  async create(@Req() req: any, @Body() dto: CreateInAppAlertDto) {
    return this.inAppAlerts.createAdminAlert(req.adminUser.id, dto);
  }

  @Patch(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.IN_APP_ALERTS_MANAGE)
  async update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateInAppAlertDto) {
    return this.inAppAlerts.updateAdminAlert(req.adminUser.id, id, dto);
  }

  @Post(":id/enable")
  @RequireAdminPermission(ADMIN_PERMISSIONS.IN_APP_ALERTS_MANAGE)
  async enable(@Req() req: any, @Param("id") id: string) {
    return this.inAppAlerts.setAdminAlertEnabled(req.adminUser.id, id, true);
  }

  @Post(":id/disable")
  @RequireAdminPermission(ADMIN_PERMISSIONS.IN_APP_ALERTS_MANAGE)
  async disable(@Req() req: any, @Param("id") id: string) {
    return this.inAppAlerts.setAdminAlertEnabled(req.adminUser.id, id, false);
  }

  @Delete(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.IN_APP_ALERTS_MANAGE)
  async delete(@Req() req: any, @Param("id") id: string) {
    return this.inAppAlerts.deleteAdminAlert(req.adminUser.id, id);
  }
}

@Controller("me/in-app-alerts")
export class MeInAppAlertsController {
  constructor(private readonly inAppAlerts: InAppAlertsService) {}

  @Get("due")
  @UseGuards(AuthGuard("jwt"))
  async due(@Req() req: Request, @Query() query: DueInAppAlertsQueryDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    return this.inAppAlerts.getDueAlerts(userId, query);
  }

  @Post("events/:eventKey")
  @UseGuards(AuthGuard("jwt"))
  async event(@Req() req: Request, @Param("eventKey") eventKey: string, @Body() dto: InAppAlertEventDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    return this.inAppAlerts.getDueAlertsForEvent(userId, eventKey, dto);
  }

  @Post(":id/impression")
  @UseGuards(AuthGuard("jwt"))
  async impression(@Req() req: Request, @Param("id") id: string, @Body() dto: InAppAlertActionDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    return this.inAppAlerts.recordShown(userId, id, dto);
  }

  @Post(":id/acknowledge")
  @UseGuards(AuthGuard("jwt"))
  async acknowledge(@Req() req: Request, @Param("id") id: string, @Body() dto: InAppAlertActionDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    return this.inAppAlerts.acknowledge(userId, id, dto);
  }

  @Post(":id/dismiss")
  @UseGuards(AuthGuard("jwt"))
  async dismiss(@Req() req: Request, @Param("id") id: string, @Body() dto: InAppAlertActionDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    return this.inAppAlerts.dismiss(userId, id, dto);
  }
}

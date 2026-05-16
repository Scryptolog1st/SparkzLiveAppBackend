import { Module } from "@nestjs/common";

import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import {
  AdminInAppAlertsController,
  MeInAppAlertsController,
} from "./in-app-alerts.controller";
import { InAppAlertsService } from "./in-app-alerts.service";

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [AdminInAppAlertsController, MeInAppAlertsController],
  providers: [
    InAppAlertsService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [InAppAlertsService],
})
export class InAppAlertsModule {}

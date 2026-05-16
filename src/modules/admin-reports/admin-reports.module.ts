import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminReportsController } from "./admin-reports.controller";
import { AdminReportsService } from "./admin-reports.service";

@Module({
    imports: [
    PrismaModule,
    AdminAuditModule,
  ],
    controllers: [AdminReportsController],
    providers: [AdminReportsService, AdminProxyGuard, AdminPermissionGuard, AdminRolePermissionsService],
    exports: [AdminReportsService],
})
export class AdminReportsModule { }
import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminAssetsController } from "./admin-assets.controller";
import { AdminAssetsService } from "./admin-assets.service";

@Module({
  imports: [
    PrismaModule,
    AdminAuditModule,
  ],
  controllers: [AdminAssetsController],
  providers: [AdminAssetsService, AdminProxyGuard, AdminRolePermissionsService],
  exports: [AdminAssetsService],
})
export class AdminAssetsModule { }
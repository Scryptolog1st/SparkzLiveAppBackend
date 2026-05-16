import { Module } from "@nestjs/common";

import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { AdvertisementsModule } from "../advertisements/advertisements.module";
import { AdminAdvertisementsController } from "./admin-advertisements.controller";
import { AdminAdvertisementsService } from "./admin-advertisements.service";

@Module({
  imports: [AdvertisementsModule, AdminAuditModule],
  controllers: [AdminAdvertisementsController],
  providers: [
    AdminAdvertisementsService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [AdminAdvertisementsService],
})
export class AdminAdvertisementsModule {}

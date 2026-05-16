import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { AdminGiftsController } from "./admin-gifts.controller";
import { AdminGiftCategoriesController, AdminStreamCategoriesController } from "./admin-categories.controller";
import { AdminGiftsService } from "./admin-gifts.service";

@Module({
  imports: [RealtimeModule, PrismaModule, AdminAuditModule],
  controllers: [AdminGiftsController, AdminGiftCategoriesController, AdminStreamCategoriesController],
  providers: [
    AdminGiftsService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [AdminGiftsService],
})
export class AdminGiftsModule {}

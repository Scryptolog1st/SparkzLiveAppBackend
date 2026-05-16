import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { AdminChatController } from "./admin-chat.controller";
import { AdminChatService } from "./admin-chat.service";

@Module({
    imports: [
    PrismaModule,
    RealtimeModule,
    AdminAuditModule,
  ],
    controllers: [AdminChatController],
    providers: [
        AdminChatService,
        AdminProxyGuard,
        AdminPermissionGuard,
        AdminRolePermissionsService,
    ],
    exports: [AdminChatService],
})
export class AdminChatModule { }
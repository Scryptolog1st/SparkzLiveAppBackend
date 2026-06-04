import { Module } from "@nestjs/common";

import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminHelpdeskController } from "./admin-helpdesk.controller";
import { HelpdeskController } from "./helpdesk.controller";
import { HelpdeskService } from "./helpdesk.service";

@Module({
    imports: [PrismaModule, AdminAuditModule],
    controllers: [HelpdeskController, AdminHelpdeskController],
    providers: [
        HelpdeskService,
        AdminProxyGuard,
        AdminPermissionGuard,
        AdminRolePermissionsService,
    ],
    exports: [HelpdeskService],
})
export class HelpdeskModule { }

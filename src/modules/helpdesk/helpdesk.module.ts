import { Module } from "@nestjs/common";

import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { ApiObservabilityModule } from "../api-observability/api-observability.module";
import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminHelpdeskController } from "./admin-helpdesk.controller";
import { HelpdeskController } from "./helpdesk.controller";
import { HelpdeskPhase2Service } from "./helpdesk-phase2.service";
import { HelpdeskService } from "./helpdesk.service";

@Module({
    imports: [PrismaModule, AdminAuditModule, ApiObservabilityModule, NotificationsModule],
    controllers: [HelpdeskController, AdminHelpdeskController],
    providers: [
        HelpdeskService,
        HelpdeskPhase2Service,
        AdminProxyGuard,
        AdminPermissionGuard,
        AdminRolePermissionsService,
    ],
    exports: [HelpdeskService, HelpdeskPhase2Service],
})
export class HelpdeskModule { }

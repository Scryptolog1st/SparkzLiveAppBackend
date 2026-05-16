import { Module } from "@nestjs/common";

import { ApiObservabilityModule } from "../api-observability/api-observability.module";
import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminUsersModule } from "../admin-users/admin-users.module";
import { JobsModule } from "../jobs/jobs.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { AdminSystemController } from "./admin-system.controller";
import { AdminSystemService } from "./admin-system.service";

@Module({
    imports: [
        PrismaModule,
        AdminUsersModule,
        RealtimeModule,
        JobsModule,
        ApiObservabilityModule,
    ],
    controllers: [AdminSystemController],
    providers: [AdminSystemService, AdminPermissionGuard],
})
export class AdminSystemModule { }
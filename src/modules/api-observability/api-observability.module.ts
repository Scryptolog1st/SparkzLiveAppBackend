import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { PrismaModule } from "../prisma/prisma.module";
import { ApiObservabilityInterceptor } from "./api-observability.interceptor";
import { ApiObservabilityService } from "./api-observability.service";
import { ApiRouteInventoryService } from "./api-route-inventory.service";
import { SystemLogEventsService } from "./system-log-events.service";

@Module({
    imports: [PrismaModule],
    providers: [
        ApiRouteInventoryService,
        ApiObservabilityService,
        SystemLogEventsService,
        {
            provide: APP_INTERCEPTOR,
            useClass: ApiObservabilityInterceptor,
        },
    ],
    exports: [ApiObservabilityService, SystemLogEventsService],
})
export class ApiObservabilityModule { }
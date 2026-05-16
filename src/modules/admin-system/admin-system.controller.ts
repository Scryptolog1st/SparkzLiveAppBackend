import {
    Controller,
    Delete,
    Get,
    MessageEvent,
    Req,
    Sse,
    UseGuards,
} from "@nestjs/common";
import { Observable } from "rxjs";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { AdminSystemService } from "./admin-system.service";

@Controller("admin/system")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminSystemController {
    constructor(private readonly adminSystem: AdminSystemService) { }

    @Get("health")
    @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
    async getHealth(@Req() req: any) {
        return this.adminSystem.getHealth(req.adminUser.id);
    }

    @Delete("health")
    @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
    async clearLogs(@Req() req: any) {
        return this.adminSystem.clearAllLogs(req.adminUser.id);
    }

    @Sse("health/stream")
    @RequireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_VIEW)
    streamHealth(@Req() req: any): Observable<MessageEvent> {
        const adminUserId = req.adminUser.id;
        const intervalMs = 1_000;

        return new Observable<MessageEvent>((subscriber) => {
            let closed = false;

            const publish = async () => {
                try {
                    const payload = await this.adminSystem.getHealth(adminUserId);

                    if (!closed) {
                        subscriber.next({
                            type: "message",
                            data: payload,
                        });
                    }
                } catch (error) {
                    if (!closed) {
                        subscriber.next({
                            type: "health-error",
                            data: {
                                message:
                                    error instanceof Error
                                        ? error.message
                                        : "Failed to load system health stream payload.",
                            },
                        });
                    }
                }
            };

            void publish();

            const timer = setInterval(() => {
                void publish();
            }, intervalMs);

            return () => {
                closed = true;
                clearInterval(timer);
            };
        });
    }
}
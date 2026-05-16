import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import {
    AdminChatBulkDeleteDto,
    AdminChatDeleteByUserDto,
    AdminChatMessagesQueryDto,
} from "./dto/admin-chat.dto";
import { AdminChatService } from "./admin-chat.service";

type AdminRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

@Controller("admin/chat")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminChatController {
    constructor(private readonly adminChat: AdminChatService) { }

    private getHeader(req: Request, name: string) {
        const value = req.headers[name];

        if (Array.isArray(value)) {
            return value[0] ?? "";
        }

        return typeof value === "string" ? value : "";
    }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private extractIp(req: Request) {
        const forwardedFor = this.getHeader(req, "x-forwarded-for");
        if (forwardedFor) {
            const first = forwardedFor
                .split(",")
                .map((part) => part.trim())
                .find(Boolean);

            if (first) {
                return first;
            }
        }

        const realIp =
            this.getHeader(req, "cf-connecting-ip") ||
            this.getHeader(req, "x-real-ip") ||
            req.ip ||
            "";

        return this.normalizeOptionalString(realIp);
    }

    private buildAuditContext(req: Request): AdminRequestContext {
        const requestPath = this.normalizeOptionalString(req.originalUrl || req.url || "");
        const ipAddress = this.extractIp(req);
        const userAgent = this.normalizeOptionalString(this.getHeader(req, "user-agent"));

        return {
            requestPath,
            ipAddress,
            userAgent,
            deviceLabel: userAgent ? "Admin Dashboard Browser" : null,
        };
    }

    @Get("messages")
    @RequireAdminPermission(ADMIN_PERMISSIONS.CHAT_VIEW)
    async listMessages(@Req() req: any, @Query() query: AdminChatMessagesQueryDto) {
        return this.adminChat.listMessages(req.adminUser.id, query);
    }

    @Get("messages/:id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.CHAT_VIEW)
    async getMessageById(@Req() req: any, @Param("id") id: string) {
        return this.adminChat.getMessageById(
            req.adminUser.id,
            id,
            this.buildAuditContext(req),
        );
    }

    @Delete("messages/:id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.CHAT_DELETE)
    async deleteMessage(@Req() req: any, @Param("id") id: string) {
        return this.adminChat.deleteMessage(
            req.adminUser.id,
            id,
            this.buildAuditContext(req),
        );
    }

    @Post("messages/:id/delete")
    @RequireAdminPermission(ADMIN_PERMISSIONS.CHAT_DELETE)
    async deleteMessagePost(@Req() req: any, @Param("id") id: string) {
        return this.adminChat.deleteMessage(
            req.adminUser.id,
            id,
            this.buildAuditContext(req),
        );
    }

    @Post("messages/bulk-delete")
    @RequireAdminPermission(ADMIN_PERMISSIONS.CHAT_BULK_DELETE)
    async bulkDeleteMessages(
        @Req() req: any,
        @Body() body: AdminChatBulkDeleteDto,
    ) {
        return this.adminChat.bulkDeleteMessages(
            req.adminUser.id,
            body.messageIds,
            this.buildAuditContext(req),
        );
    }

    @Post("messages/delete-by-user")
    @RequireAdminPermission(ADMIN_PERMISSIONS.CHAT_BULK_DELETE)
    async deleteMessagesByUser(
        @Req() req: any,
        @Body() body: AdminChatDeleteByUserDto,
    ) {
        return this.adminChat.deleteMessagesByUser(
            req.adminUser.id,
            body,
            this.buildAuditContext(req),
        );
    }
}
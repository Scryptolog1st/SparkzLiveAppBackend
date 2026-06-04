import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { AdminRole, Prisma } from "@prisma/client";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import {
    ADMIN_PERMISSIONS,
    hasAdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { AdminChatMessagesQueryDto } from "./dto/admin-chat.dto";

type AdminAuditRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

@Injectable()
export class AdminChatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly realtime: RealtimeGateway,
        private readonly adminAudit: AdminAuditService,
        private readonly adminRolePermissions: AdminRolePermissionsService,
    ) { }

    private normalizePage(value: string | number | undefined, fallback: number) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) return fallback;
        return Math.floor(parsed);
    }

    private normalizePageSize(value: string | number | undefined, fallback: number) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) return fallback;
        return Math.min(100, Math.floor(parsed));
    }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private normalizeAuditContext(context?: AdminAuditRequestContext | null) {
        return {
            requestPath: this.normalizeOptionalString(context?.requestPath),
            ipAddress: this.normalizeOptionalString(context?.ipAddress),
            userAgent: this.normalizeOptionalString(context?.userAgent),
            deviceLabel: this.normalizeOptionalString(context?.deviceLabel),
        };
    }

    private async requireAdmin(adminUserId: string) {
        const adminUser = await this.prisma.adminUser.findUnique({
            where: { id: adminUserId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
            },
        });

        if (!adminUser) {
            throw new UnauthorizedException("Admin account not found.");
        }

        if (!adminUser.isActive) {
            throw new ForbiddenException("Admin account is inactive.");
        }

        return adminUser;
    }

    private appendChatAnd(
        where: Prisma.ChatMessageWhereInput,
        clause: Prisma.ChatMessageWhereInput,
    ) {
        if (Array.isArray(where.AND)) {
            where.AND = [...where.AND, clause];
            return;
        }

        if (where.AND) {
            where.AND = [where.AND, clause];
            return;
        }

        where.AND = [clause];
    }

    private async canViewRealStaffIdentity(role: AdminRole) {
        const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

        return hasAdminPermission(
            permissions,
            ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
        );
    }

    private mapStaffAdminId(
        id: string | null | undefined,
        canViewRealStaffIdentity = false,
    ) {
        return canViewRealStaffIdentity ? id ?? null : null;
    }

    private mapUser(user: any) {
        return {
            id: user.id,
            publicId: user.publicId ?? null,
            username: user.username,
            displayName: user.profile?.displayName?.trim() || user.username,
            avatarUrl: user.profile?.avatarUrl ?? null,
        };
    }

    private toDeletedLabel(message: any) {
        return message?.deletionLabel?.trim() || "Message deleted by an Admin.";
    }

    private mapMessage(message: any, canViewRealStaffIdentity = false) {
        const isDeleted = Boolean(message?.isDeleted);
        const deletionLabel = this.toDeletedLabel(message);

        return {
            id: message.id,
            text: isDeleted ? deletionLabel : message.text,
            replyToMessageId: message.replyToMessageId ?? null,
            badgesJson: message.badgesJson ?? null,
            createdAt: message.createdAt.toISOString(),
            isDeleted,
            deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
            deletedByAdminUserId: this.mapStaffAdminId(
                message.deletedByAdminUserId,
                canViewRealStaffIdentity,
            ),
            deletionLabel: isDeleted ? deletionLabel : null,
            user: message.user ? this.mapUser(message.user) : null,
            stream: message.stream
                ? {
                    id: message.stream.id,
                    title: message.stream.title,
                    status: message.stream.status,
                    hostUserId: message.stream.hostUserId,
                    host: message.stream.host ? this.mapUser(message.stream.host) : null,
                }
                : null,
            replyToMessagePreview: message.replyToMessage
                ? {
                    id: message.replyToMessage.id,
                    text: message.replyToMessage.isDeleted
                        ? this.toDeletedLabel(message.replyToMessage)
                        : message.replyToMessage.text,
                    createdAt: message.replyToMessage.createdAt.toISOString(),
                    user: message.replyToMessage.user
                        ? this.mapUser(message.replyToMessage.user)
                        : null,
                }
                : null,
        };
    }

    private async addChatAudit(args: {
        actorAdminUserId: string;
        message: any;
        actionType: "VIEW" | "DELETE";
        actionCode: string;
        actionLabel: string;
        metadata?: Record<string, unknown> | null;
        beforeState?: Record<string, unknown> | null;
        afterState?: Record<string, unknown> | null;
        diff?: Record<string, unknown> | null;
        requestContext?: AdminAuditRequestContext | null;
    }) {
        const requestContext = this.normalizeAuditContext(args.requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: args.actorAdminUserId,
            actionType: args.actionType,
            actionCode: args.actionCode,
            actionLabel: args.actionLabel,
            resourceType: "CHAT_MESSAGE",
            resourceId: args.message.id,
            target: {
                id: args.message.id,
                name: args.message.id,
                type: "CHAT_MESSAGE",
            },
            references: {
                targetUserId: args.message.userId ?? args.message.user?.id ?? null,
                targetStreamId: args.message.streamId ?? args.message.stream?.id ?? null,
            },
            requestPath: requestContext.requestPath,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            deviceLabel: requestContext.deviceLabel,
            metadata: {
                streamId: args.message.streamId ?? args.message.stream?.id ?? null,
                userId: args.message.userId ?? args.message.user?.id ?? null,
                ...(args.metadata || {}),
            },
            beforeState: args.beforeState ?? undefined,
            afterState: args.afterState ?? undefined,
            diff: args.diff ?? undefined,
        });
    }

    async listMessages(
        adminUserId: string,
        adminRole: AdminRole,
        query: AdminChatMessagesQueryDto = {},
    ) {
        await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 25);
        const search = String(query.search || "").trim();
        const streamId = String((query as any).streamId || "").trim();
        const userId = String((query as any).userId || "").trim();
        const hostUserId = String((query as any).hostUserId || "").trim();
        const hasReply = String((query as any).hasReply || "any").trim().toLowerCase();
        const hasBadges = String((query as any).hasBadges || "any").trim().toLowerCase();
        const sort = String((query as any).sort || "newest").trim().toLowerCase();

        const where: Prisma.ChatMessageWhereInput = {};

        if (streamId) {
            where.streamId = streamId;
        }

        if (userId) {
            where.userId = userId;
        }

        if (hostUserId) {
            where.stream = {
                ...(where.stream || {}),
                is: {
                    ...((where.stream as any)?.is || {}),
                    hostUserId,
                },
            };
        }

        if (hasReply === "reply") {
            where.replyToMessageId = { not: null };
        } else if (hasReply === "top_level") {
            where.replyToMessageId = null;
        }

        if (hasBadges === "badged") {
            where.badgesJson = { not: Prisma.JsonNull };
        } else if (hasBadges === "plain") {
            this.appendChatAnd(where, {
                badgesJson: {
                    equals: Prisma.AnyNull,
                },
            });
        }

        if (search) {
            const searchFilter: Prisma.ChatMessageWhereInput = {
                OR: [
                    {
                        text: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        user: {
                            is: {
                                username: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                    {
                        user: {
                            is: {
                                publicId: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                    {
                        user: {
                            is: {
                                profile: {
                                    is: {
                                        displayName: {
                                            contains: search,
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        stream: {
                            is: {
                                title: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                ],
            };

            this.appendChatAnd(where, searchFilter);
        }

        const orderBy: Prisma.ChatMessageOrderByWithRelationInput[] =
            sort === "oldest"
                ? [{ createdAt: "asc" }]
                : [{ createdAt: "desc" }];

        const [total, items] = await Promise.all([
            this.prisma.chatMessage.count({ where }),
            this.prisma.chatMessage.findMany({
                where,
                include: {
                    user: {
                        include: {
                            profile: true,
                        },
                    },
                    stream: {
                        include: {
                            host: {
                                include: {
                                    profile: true,
                                },
                            },
                        },
                    },
                },
                orderBy,
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        return {
            items: items.map((item) => this.mapMessage(item, canViewRealStaffIdentity)),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            filters: {
                search: search || null,
                streamId: streamId || null,
                userId: userId || null,
                hostUserId: hostUserId || null,
                hasReply,
                hasBadges,
                sort,
            },
        };
    }

    async getMessageById(
        adminUserId: string,
        adminRole: AdminRole,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);

        const item = await this.prisma.chatMessage.findUnique({
            where: { id },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                stream: {
                    include: {
                        host: {
                            include: {
                                profile: true,
                            },
                        },
                    },
                },
            },
        });

        if (!item) {
            throw new NotFoundException("Chat message not found.");
        }

        let replyToMessage = null;

        if (item.replyToMessageId) {
            const reply = await this.prisma.chatMessage.findUnique({
                where: { id: item.replyToMessageId },
                include: {
                    user: {
                        include: { profile: true },
                    },
                },
            });

            if (reply) {
                replyToMessage = {
                    id: reply.id,
                    text: reply.isDeleted ? this.toDeletedLabel(reply) : reply.text,
                    createdAt: reply.createdAt.toISOString(),
                    isDeleted: Boolean(reply.isDeleted),
                    deletedAt: reply.deletedAt ? reply.deletedAt.toISOString() : null,
                    deletedByAdminUserId: this.mapStaffAdminId(
                        reply.deletedByAdminUserId,
                        canViewRealStaffIdentity,
                    ),
                    deletionLabel: reply.isDeleted ? this.toDeletedLabel(reply) : null,
                    user: reply.user ? this.mapUser(reply.user) : null,
                };
            }
        }

        await this.addChatAudit({
            actorAdminUserId: adminUserId,
            message: item,
            actionType: "VIEW",
            actionCode: "chat.message.view",
            actionLabel: "Viewed chat message details",
            requestContext,
        });

        return {
            item: this.mapMessage(item, canViewRealStaffIdentity),
            replyToMessage,
        };
    }

    async deleteMessage(
        adminUserId: string,
        adminRole: AdminRole,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(adminRole);

        const existing = await this.prisma.chatMessage.findUnique({
            where: { id },
            include: {
                user: {
                    include: { profile: true },
                },
                stream: {
                    include: {
                        host: {
                            include: { profile: true },
                        },
                    },
                },
            },
        });

        if (!existing) {
            throw new NotFoundException("Chat message not found.");
        }

        if (existing.isDeleted) {
            await this.addChatAudit({
                actorAdminUserId: adminUserId,
                message: existing,
                actionType: "DELETE",
                actionCode: "chat.message.delete",
                actionLabel: "Attempted to delete chat message",
                metadata: {
                    alreadyDeleted: true,
                },
                requestContext,
            });

            return {
                success: true,
                deletedId: id,
                item: this.mapMessage(existing, canViewRealStaffIdentity),
            };
        }

        const deletedAt = new Date();

        const updated = await this.prisma.chatMessage.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt,
                deletedByAdminUserId: adminUserId,
                deletionLabel: "Message deleted by an Admin.",
            },
            include: {
                user: {
                    include: { profile: true },
                },
                stream: {
                    include: {
                        host: {
                            include: { profile: true },
                        },
                    },
                },
            },
        });

        if (updated.streamId) {
            this.realtime.emitChatDeleted({
                streamId: updated.streamId,
                message: this.mapMessage(updated),
            });
        }

        await this.addChatAudit({
            actorAdminUserId: adminUserId,
            message: updated,
            actionType: "DELETE",
            actionCode: "chat.message.delete",
            actionLabel: "Deleted chat message",
            beforeState: {
                isDeleted: false,
            },
            afterState: {
                isDeleted: true,
                deletedByAdminUserId: adminUserId,
            },
            diff: {
                isDeleted: {
                    before: false,
                    after: true,
                },
            },
            requestContext,
        });

        return {
            success: true,
            deletedId: id,
            item: this.mapMessage(updated, canViewRealStaffIdentity),
        };
    }

    async bulkDeleteMessages(
        adminUserId: string,
        messageIds: string[],
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const normalizedIds = Array.from(
            new Set(
                (messageIds || [])
                    .map((id) => String(id || "").trim())
                    .filter(Boolean),
            ),
        );

        const existing = await this.prisma.chatMessage.findMany({
            where: {
                id: { in: normalizedIds },
            },
            include: {
                user: {
                    include: { profile: true },
                },
                stream: {
                    include: {
                        host: {
                            include: { profile: true },
                        },
                    },
                },
            },
        });

        const existingIds = new Set(existing.map((row) => row.id));
        const deletedIds = normalizedIds.filter((id) => existingIds.has(id));
        const missingIds = normalizedIds.filter((id) => !existingIds.has(id));

        const deletedAt = new Date();

        if (deletedIds.length > 0) {
            await this.prisma.chatMessage.updateMany({
                where: {
                    id: { in: deletedIds },
                },
                data: {
                    isDeleted: true,
                    deletedAt,
                    deletedByAdminUserId: adminUserId,
                    deletionLabel: "Message deleted by an Admin.",
                },
            });

            for (const row of existing) {
                if (!row.streamId) continue;

                this.realtime.emitChatDeleted({
                    streamId: row.streamId,
                    message: this.mapMessage({
                        ...row,
                        isDeleted: true,
                        deletedAt,
                        deletedByAdminUserId: adminUserId,
                        deletionLabel: "Message deleted by an Admin.",
                    }),
                });

                await this.addChatAudit({
                    actorAdminUserId: adminUserId,
                    message: {
                        ...row,
                        isDeleted: true,
                        deletedAt,
                        deletedByAdminUserId: adminUserId,
                    },
                    actionType: "DELETE",
                    actionCode: "chat.bulk_delete",
                    actionLabel: "Bulk deleted chat messages",
                    metadata: {
                        bulk: true,
                        requestedCount: normalizedIds.length,
                    },
                    beforeState: {
                        isDeleted: Boolean(row.isDeleted),
                    },
                    afterState: {
                        isDeleted: true,
                        deletedByAdminUserId: adminUserId,
                    },
                    diff: {
                        isDeleted: {
                            before: Boolean(row.isDeleted),
                            after: true,
                        },
                    },
                    requestContext,
                });
            }
        }

        return {
            success: true,
            requestedCount: normalizedIds.length,
            deletedCount: deletedIds.length,
            deletedIds,
            missingIds,
        };
    }

    async deleteMessagesByUser(
        adminUserId: string,
        body: { userId: string; streamId?: string },
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const userId = String(body?.userId || "").trim();
        const streamId = String(body?.streamId || "").trim();

        if (!userId) {
            throw new NotFoundException("Target user is required.");
        }

        const where: Prisma.ChatMessageWhereInput = {
            userId,
            isDeleted: false,
        };

        if (streamId) {
            where.streamId = streamId;
        }

        const existing = await this.prisma.chatMessage.findMany({
            where,
            include: {
                user: {
                    include: { profile: true },
                },
                stream: {
                    include: {
                        host: {
                            include: { profile: true },
                        },
                    },
                },
            },
            orderBy: [{ createdAt: "asc" }],
        });

        const deletedIds = existing.map((row) => row.id);

        if (deletedIds.length === 0) {
            return {
                success: true,
                requestedUserId: userId,
                streamId: streamId || null,
                deletedCount: 0,
                deletedIds: [],
            };
        }

        const deletedAt = new Date();

        await this.prisma.chatMessage.updateMany({
            where: {
                id: { in: deletedIds },
            },
            data: {
                isDeleted: true,
                deletedAt,
                deletedByAdminUserId: adminUserId,
                deletionLabel: "Message deleted by an Admin.",
            },
        });

        for (const row of existing) {
            if (!row.streamId) continue;

            this.realtime.emitChatDeleted({
                streamId: row.streamId,
                message: this.mapMessage({
                    ...row,
                    isDeleted: true,
                    deletedAt,
                    deletedByAdminUserId: adminUserId,
                    deletionLabel: "Message deleted by an Admin.",
                }),
            });
        }

        const normalizedRequestContext = this.normalizeAuditContext(requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: adminUserId,
            actionType: "DELETE",
            actionCode: "chat.user_bulk_delete",
            actionLabel: "Bulk deleted chat messages by user",
            resourceType: "CHAT_MESSAGE",
            resourceId: deletedIds[0] ?? userId,
            target: {
                id: userId,
                name: userId,
                type: "USER",
            },
            references: {
                targetUserId: userId,
                targetStreamId: streamId || null,
            },
            requestPath: normalizedRequestContext.requestPath,
            ipAddress: normalizedRequestContext.ipAddress,
            userAgent: normalizedRequestContext.userAgent,
            deviceLabel: normalizedRequestContext.deviceLabel,
            metadata: {
                deletedCount: deletedIds.length,
                deletedIds,
                streamId: streamId || null,
            },
        });

        return {
            success: true,
            requestedUserId: userId,
            streamId: streamId || null,
            deletedCount: deletedIds.length,
            deletedIds,
        };
    }
}
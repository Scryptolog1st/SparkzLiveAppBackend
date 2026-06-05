import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import {
    AdminRole,
    HelpdeskLiveChatMessageSenderType,
    HelpdeskLiveChatThreadStatus,
    HelpdeskTicketEventType,
    HelpdeskTicketMessageSenderType,
    HelpdeskTicketPriority,
    HelpdeskTicketSource,
    HelpdeskTicketStatus,
    Prisma,
} from "@prisma/client";
import { randomBytes } from "crypto";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import { getAnonymousStaffLabel } from "../admin-users/admin-identity-utils";
import { ADMIN_PERMISSIONS, hasAdminPermission } from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import {
    CloseHelpdeskLiveChatDto,
    ConvertHelpdeskLiveChatToTicketDto,
    CreateAdminHelpdeskTicketDto,
    HelpdeskLiveChatQueryDto,
    ReplyHelpdeskLiveChatDto,
    StartHelpdeskLiveChatDto,
} from "./dto/helpdesk.dto";

type AdminAuditRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

type JsonRecord = Record<string, unknown>;

@Injectable()
export class HelpdeskPhase2Service {
    private readonly liveChatClaimMs = 15 * 60 * 1000;

    constructor(
        private readonly prisma: PrismaService,
        private readonly adminAudit: AdminAuditService,
        private readonly adminRolePermissions: AdminRolePermissionsService,
    ) { }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private normalizePage(value: string | number | undefined, fallback: number) {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
    }

    private normalizePageSize(value: string | number | undefined, fallback: number) {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? Math.min(100, Math.floor(parsed)) : fallback;
    }

    private isUuid(value?: string | null) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            String(value || "").trim(),
        );
    }

    private toJsonObject(value?: JsonRecord | null) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return undefined;
        }

        return value as Prisma.InputJsonObject;
    }

    private normalizeAuditContext(context?: AdminAuditRequestContext | null) {
        return {
            requestPath: this.normalizeOptionalString(context?.requestPath),
            ipAddress: this.normalizeOptionalString(context?.ipAddress),
            userAgent: this.normalizeOptionalString(context?.userAgent),
            deviceLabel: this.normalizeOptionalString(context?.deviceLabel),
        };
    }

    private parsePriority(raw?: string) {
        const value = String(raw || "").trim().toUpperCase();

        if (!value) {
            return undefined;
        }

        if (!Object.values(HelpdeskTicketPriority).includes(value as HelpdeskTicketPriority)) {
            throw new BadRequestException("Invalid helpdesk ticket priority.");
        }

        return value as HelpdeskTicketPriority;
    }

    private parseLiveChatStatus(raw?: string) {
        const value = String(raw || "").trim().toUpperCase();

        if (!value) {
            return undefined;
        }

        if (!Object.values(HelpdeskLiveChatThreadStatus).includes(value as HelpdeskLiveChatThreadStatus)) {
            throw new BadRequestException("Invalid helpdesk live chat status.");
        }

        return value as HelpdeskLiveChatThreadStatus;
    }

    private parseLiveChatAssignment(raw?: string) {
        const value = String(raw || "any").trim().toLowerCase();

        if (!["any", "claimed", "unclaimed", "mine"].includes(value)) {
            throw new BadRequestException("Invalid helpdesk live chat assignment filter.");
        }

        return value as "any" | "claimed" | "unclaimed" | "mine";
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

    private async requireUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new UnauthorizedException("User account not found.");
        }

        return user;
    }

    private async findUserForAdminLookup(rawLookup: string) {
        const lookup = this.normalizeOptionalString(rawLookup);

        if (!lookup) {
            throw new BadRequestException("Target user is required.");
        }

        const orFilters: Prisma.UserWhereInput[] = [
            { email: { equals: lookup, mode: "insensitive" } },
            { username: { equals: lookup, mode: "insensitive" } },
            { publicId: { equals: lookup, mode: "insensitive" } },
        ];

        if (this.isUuid(lookup)) {
            orFilters.unshift({ id: lookup });
        }

        const user = await this.prisma.user.findFirst({
            where: { OR: orFilters },
            include: { profile: true },
        });

        if (!user) {
            throw new NotFoundException("Target user was not found.");
        }

        return user;
    }

    private async canViewRealStaffIdentity(role: AdminRole) {
        const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

        return hasAdminPermission(
            permissions,
            ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
        );
    }

    private mapUser(user: any) {
        if (!user) {
            return null;
        }

        return {
            id: user.id,
            publicId: user.publicId ?? null,
            email: user.email ?? null,
            username: user.username,
            displayName: user.profile?.displayName?.trim() || user.username,
            avatarUrl: user.profile?.avatarUrl ?? null,
        };
    }

    private mapAdminUser(adminUser: any, canViewRealStaffIdentity = false) {
        if (!adminUser) {
            return null;
        }

        if (!canViewRealStaffIdentity) {
            const anonymousName = getAnonymousStaffLabel({
                id: adminUser.id,
                role: adminUser.role,
            });

            return {
                id: null,
                email: "hidden",
                name: anonymousName,
                displayName: anonymousName,
                displayEmail: "Hidden",
                role: null,
                isActive: null,
                identityVisibility: "anonymous",
            };
        }

        return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            displayName: adminUser.name,
            displayEmail: adminUser.email,
            role: adminUser.role,
            isActive: adminUser.isActive,
            identityVisibility: "real",
        };
    }

    private mapCategory(category: any) {
        if (!category) {
            return null;
        }

        return {
            id: category.id,
            key: category.key,
            name: category.name,
            description: category.description ?? null,
            isActive: category.isActive,
            sortOrder: category.sortOrder,
            createdAt: category.createdAt.toISOString(),
            updatedAt: category.updatedAt.toISOString(),
        };
    }

    private mapTicketListItem(ticket: any, canViewRealStaffIdentity = false) {
        if (!ticket) {
            return null;
        }

        return {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            source: ticket.source,
            createdAt: ticket.createdAt.toISOString(),
            updatedAt: ticket.updatedAt.toISOString(),
            lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : null,
            closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
            user: this.mapUser(ticket.user),
            category: this.mapCategory(ticket.category),
            assignedAdminUser: this.mapAdminUser(
                ticket.assignedAdminUser,
                canViewRealStaffIdentity,
            ),
            closedByAdminUser: this.mapAdminUser(
                ticket.closedByAdminUser,
                canViewRealStaffIdentity,
            ),
        };
    }

    private mapLiveChatMessage(message: any, canViewRealStaffIdentity = false) {
        return {
            id: message.id,
            senderType: message.senderType,
            body: message.deletedAt ? null : message.body,
            metadata: message.metadataJson ?? null,
            createdAt: message.createdAt.toISOString(),
            deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
            senderUser:
                message.senderType === HelpdeskLiveChatMessageSenderType.USER
                    ? this.mapUser(message.senderUser)
                    : null,
            senderStaff:
                message.senderType === HelpdeskLiveChatMessageSenderType.STAFF
                    ? this.mapAdminUser(message.senderAdminUser, canViewRealStaffIdentity)
                    : null,
        };
    }

    private mapLiveChatThread(thread: any, canViewRealStaffIdentity = false, includeMessages = false) {
        return {
            id: thread.id,
            subject: thread.subject ?? null,
            status: thread.status,
            createdAt: thread.createdAt.toISOString(),
            updatedAt: thread.updatedAt.toISOString(),
            lastMessageAt: thread.lastMessageAt ? thread.lastMessageAt.toISOString() : null,
            claimedAt: thread.claimedAt ? thread.claimedAt.toISOString() : null,
            claimExpiresAt: thread.claimExpiresAt ? thread.claimExpiresAt.toISOString() : null,
            closedAt: thread.closedAt ? thread.closedAt.toISOString() : null,
            closeReason: thread.closeReason ?? null,
            metadata: thread.metadataJson ?? null,
            user: this.mapUser(thread.user),
            category: this.mapCategory(thread.category),
            claimedByAdminUser: this.mapAdminUser(
                thread.claimedByAdminUser,
                canViewRealStaffIdentity,
            ),
            closedByAdminUser: this.mapAdminUser(
                thread.closedByAdminUser,
                canViewRealStaffIdentity,
            ),
            convertedTicket: this.mapTicketListItem(
                thread.convertedTicket,
                canViewRealStaffIdentity,
            ),
            messages: includeMessages
                ? (thread.messages || []).map((message: any) =>
                    this.mapLiveChatMessage(message, canViewRealStaffIdentity),
                )
                : undefined,
        };
    }

    private liveChatThreadInclude(includeMessages = false) {
        return {
            user: { include: { profile: true } },
            category: true,
            claimedByAdminUser: true,
            closedByAdminUser: true,
            convertedTicket: {
                include: {
                    user: { include: { profile: true } },
                    category: true,
                    assignedAdminUser: true,
                    closedByAdminUser: true,
                },
            },
            messages: includeMessages
                ? {
                    include: {
                        senderUser: { include: { profile: true } },
                        senderAdminUser: true,
                    },
                    orderBy: { createdAt: "asc" as const },
                }
                : false,
        };
    }

    private async createTicketNumber() {
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const randomPart = randomBytes(4).toString("hex").toUpperCase();
            const ticketNumber = `HD-${datePart}-${randomPart}`;

            const exists = await this.prisma.helpdeskTicket.count({
                where: { ticketNumber },
            });

            if (!exists) {
                return ticketNumber;
            }
        }

        throw new BadRequestException("Could not generate ticket number.");
    }

    private async assertActiveCategory(categoryId?: string | null) {
        if (!categoryId) {
            return;
        }

        const category = await this.prisma.helpdeskCategory.findFirst({
            where: { id: categoryId, isActive: true },
            select: { id: true },
        });

        if (!category) {
            throw new BadRequestException("Helpdesk category is invalid.");
        }
    }

    private async writeAudit(args: {
        actorAdminUserId: string;
        actionType: "VIEW" | "CREATE" | "UPDATE" | "STATUS_CHANGE";
        actionCode: string;
        actionLabel: string;
        resourceType: string;
        resourceId: string;
        resourceName?: string | null;
        targetUserId?: string | null;
        targetSupportTicketId?: string | null;
        metadata?: JsonRecord | null;
        requestContext?: AdminAuditRequestContext | null;
    }) {
        const context = this.normalizeAuditContext(args.requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: args.actorAdminUserId,
            actionType: args.actionType,
            actionCode: args.actionCode,
            actionLabel: args.actionLabel,
            resourceType: args.resourceType,
            resourceId: args.resourceId,
            target: {
                id: args.resourceId,
                name: args.resourceName ?? args.resourceId,
                type: args.resourceType,
            },
            references: {
                targetUserId: args.targetUserId ?? null,
                targetSupportTicketId: args.targetSupportTicketId ?? null,
            },
            requestPath: context.requestPath,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            deviceLabel: context.deviceLabel,
            metadata: args.metadata ?? undefined,
        });
    }

    async createAdminTicket(
        adminUserId: string,
        body: CreateAdminHelpdeskTicketDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);
        const user = await this.findUserForAdminLookup(body.userLookup);
        const subject = this.normalizeOptionalString(body.subject);
        const messageBody = this.normalizeOptionalString(body.body);
        const internalNote = this.normalizeOptionalString(body.internalNote);
        const priority = this.parsePriority(body.priority) ?? HelpdeskTicketPriority.NORMAL;

        if (!subject) {
            throw new BadRequestException("Ticket subject is required.");
        }

        if (!messageBody) {
            throw new BadRequestException("Ticket message is required.");
        }

        await this.assertActiveCategory(body.categoryId);

        if (body.assignedAdminUserId) {
            const assignedAdmin = await this.prisma.adminUser.findFirst({
                where: { id: body.assignedAdminUserId, isActive: true },
                select: { id: true },
            });

            if (!assignedAdmin) {
                throw new BadRequestException("Assigned admin is invalid.");
            }
        }

        const ticketNumber = await this.createTicketNumber();
        const now = new Date();

        const created = await this.prisma.helpdeskTicket.create({
            data: {
                ticketNumber,
                userId: user.id,
                categoryId: body.categoryId ?? null,
                assignedAdminUserId: body.assignedAdminUserId ?? adminUserId,
                subject,
                status: HelpdeskTicketStatus.PENDING_USER,
                priority,
                source: HelpdeskTicketSource.ADMIN,
                lastMessageAt: now,
                metadataJson: this.toJsonObject({
                    createdByAdmin: true,
                }),
                messages: {
                    create: {
                        senderType: HelpdeskTicketMessageSenderType.STAFF,
                        senderAdminUserId: adminUserId,
                        body: messageBody,
                    },
                },
                internalNotes: internalNote
                    ? {
                        create: {
                            adminUserId,
                            body: internalNote,
                        },
                    }
                    : undefined,
                events: {
                    create: {
                        actorAdminUserId: adminUserId,
                        eventType: HelpdeskTicketEventType.TICKET_CREATED,
                        afterJson: {
                            status: HelpdeskTicketStatus.PENDING_USER,
                            subject,
                            source: HelpdeskTicketSource.ADMIN,
                        },
                    },
                },
            },
            include: {
                user: { include: { profile: true } },
                category: true,
                assignedAdminUser: true,
                closedByAdminUser: true,
            },
        });

        await this.writeAudit({
            actorAdminUserId: adminUserId,
            actionType: "CREATE",
            actionCode: "helpdesk.ticket.create_admin",
            actionLabel: "Created helpdesk ticket from admin dashboard",
            resourceType: "HELPDESK_TICKET",
            resourceId: created.id,
            resourceName: created.ticketNumber,
            targetUserId: user.id,
            targetSupportTicketId: created.id,
            metadata: {
                ticketNumber: created.ticketNumber,
                source: HelpdeskTicketSource.ADMIN,
                priority,
                hasAssignedAdminUser: Boolean(created.assignedAdminUserId),
            },
            requestContext,
        });

        return {
            success: true,
            item: this.mapTicketListItem(created, canViewRealStaffIdentity),
        };
    }

    async startUserLiveChatThread(userId: string, body: StartHelpdeskLiveChatDto) {
        const user = await this.requireUser(userId);
        const messageBody = this.normalizeOptionalString(body.body);
        const subject = this.normalizeOptionalString(body.subject);

        if (!messageBody) {
            throw new BadRequestException("Live chat message is required.");
        }

        await this.assertActiveCategory(body.categoryId);

        const now = new Date();

        const created = await this.prisma.helpdeskLiveChatThread.create({
            data: {
                userId: user.id,
                categoryId: body.categoryId ?? null,
                subject,
                status: HelpdeskLiveChatThreadStatus.WAITING,
                lastMessageAt: now,
                messages: {
                    create: {
                        senderType: HelpdeskLiveChatMessageSenderType.USER,
                        senderUserId: user.id,
                        body: messageBody,
                    },
                },
            },
            include: this.liveChatThreadInclude(true),
        });

        return {
            success: true,
            item: this.mapLiveChatThread(created, false, true),
        };
    }

    async listUserLiveChatThreads(userId: string, query: HelpdeskLiveChatQueryDto = {}) {
        await this.requireUser(userId);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const status = this.parseLiveChatStatus(query.status);

        const where: Prisma.HelpdeskLiveChatThreadWhereInput = {
            userId,
            ...(status ? { status } : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.helpdeskLiveChatThread.findMany({
                where,
                include: this.liveChatThreadInclude(false),
                orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.helpdeskLiveChatThread.count({ where }),
        ]);

        return {
            items: items.map((item) => this.mapLiveChatThread(item, false, false)),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    }

    async getUserLiveChatThread(userId: string, id: string) {
        await this.requireUser(userId);

        const thread = await this.prisma.helpdeskLiveChatThread.findFirst({
            where: { id, userId },
            include: this.liveChatThreadInclude(true),
        });

        if (!thread) {
            throw new NotFoundException("Helpdesk live chat thread not found.");
        }

        return this.mapLiveChatThread(thread, false, true);
    }

    async addUserLiveChatMessage(userId: string, id: string, body: ReplyHelpdeskLiveChatDto) {
        await this.requireUser(userId);

        const messageBody = this.normalizeOptionalString(body.body);
        if (!messageBody) {
            throw new BadRequestException("Live chat message is required.");
        }

        const existing = await this.prisma.helpdeskLiveChatThread.findFirst({
            where: { id, userId },
            select: {
                id: true,
                status: true,
                claimedByAdminUserId: true,
                claimExpiresAt: true,
            },
        });

        if (!existing) {
            throw new NotFoundException("Helpdesk live chat thread not found.");
        }

        if (
            existing.status === HelpdeskLiveChatThreadStatus.CLOSED ||
            existing.status === HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET
        ) {
            throw new BadRequestException("This live chat thread is no longer active.");
        }

        const now = new Date();
        const claimIsActive =
            existing.claimedByAdminUserId &&
            existing.claimExpiresAt &&
            existing.claimExpiresAt > now;

        await this.prisma.$transaction([
            this.prisma.helpdeskLiveChatMessage.create({
                data: {
                    threadId: existing.id,
                    senderType: HelpdeskLiveChatMessageSenderType.USER,
                    senderUserId: userId,
                    body: messageBody,
                },
            }),
            this.prisma.helpdeskLiveChatThread.update({
                where: { id: existing.id },
                data: claimIsActive
                    ? {
                        status: HelpdeskLiveChatThreadStatus.ACTIVE,
                        lastMessageAt: now,
                    }
                    : {
                        status: HelpdeskLiveChatThreadStatus.WAITING,
                        claimedByAdminUserId: null,
                        claimedAt: null,
                        claimExpiresAt: null,
                        lastMessageAt: now,
                    },
            }),
        ]);

        return this.getUserLiveChatThread(userId, existing.id);
    }

    async listAdminLiveChatThreads(adminUserId: string, query: HelpdeskLiveChatQueryDto = {}) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const status = this.parseLiveChatStatus(query.status);
        const assignment = this.parseLiveChatAssignment(query.assignment);
        const search = this.normalizeOptionalString(query.search);
        const now = new Date();

        const andFilters: Prisma.HelpdeskLiveChatThreadWhereInput[] = [];

        if (status) {
            andFilters.push({ status });
        }

        if (query.categoryId) {
            andFilters.push({ categoryId: query.categoryId });
        }

        if (assignment === "claimed") {
            andFilters.push({
                claimedByAdminUserId: { not: null },
                claimExpiresAt: { gt: now },
            });
        }

        if (assignment === "unclaimed") {
            andFilters.push({
                OR: [
                    { claimedByAdminUserId: null },
                    { claimExpiresAt: null },
                    { claimExpiresAt: { lte: now } },
                ],
            });
        }

        if (assignment === "mine") {
            andFilters.push({
                claimedByAdminUserId: adminUserId,
                claimExpiresAt: { gt: now },
            });
        }

        if (search) {
            const searchOr: Prisma.HelpdeskLiveChatThreadWhereInput[] = [
                { subject: { contains: search, mode: "insensitive" } },
                { user: { is: { username: { contains: search, mode: "insensitive" } } } },
                { user: { is: { email: { contains: search, mode: "insensitive" } } } },
                { user: { is: { publicId: { contains: search, mode: "insensitive" } } } },
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
            ];

            if (this.isUuid(search)) {
                searchOr.unshift({ id: search });
            }

            andFilters.push({ OR: searchOr });
        }

        const where: Prisma.HelpdeskLiveChatThreadWhereInput =
            andFilters.length > 0 ? { AND: andFilters } : {};

        const [items, total] = await this.prisma.$transaction([
            this.prisma.helpdeskLiveChatThread.findMany({
                where,
                include: this.liveChatThreadInclude(false),
                orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.helpdeskLiveChatThread.count({ where }),
        ]);

        return {
            items: items.map((item) =>
                this.mapLiveChatThread(item, canViewRealStaffIdentity, false),
            ),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            filters: {
                search,
                status: status ?? "all",
                categoryId: query.categoryId ?? "all",
                assignment,
            },
        };
    }

    async getAdminLiveChatThread(adminUserId: string, id: string) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);

        const thread = await this.prisma.helpdeskLiveChatThread.findUnique({
            where: { id },
            include: this.liveChatThreadInclude(true),
        });

        if (!thread) {
            throw new NotFoundException("Helpdesk live chat thread not found.");
        }

        return this.mapLiveChatThread(thread, canViewRealStaffIdentity, true);
    }

    async claimLiveChatThread(
        adminUserId: string,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);
        const now = new Date();
        const claimExpiresAt = new Date(now.getTime() + this.liveChatClaimMs);

        const updated = await this.prisma.$transaction(async (tx) => {
            const claimResult = await tx.helpdeskLiveChatThread.updateMany({
                where: {
                    id,
                    status: {
                        notIn: [
                            HelpdeskLiveChatThreadStatus.CLOSED,
                            HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET,
                        ],
                    },
                    OR: [
                        { claimedByAdminUserId: null },
                        { claimExpiresAt: null },
                        { claimExpiresAt: { lte: now } },
                        { claimedByAdminUserId: adminUserId },
                    ],
                },
                data: {
                    status: HelpdeskLiveChatThreadStatus.ACTIVE,
                    claimedByAdminUserId: adminUserId,
                    claimedAt: now,
                    claimExpiresAt,
                },
            });

            if (claimResult.count !== 1) {
                const current = await tx.helpdeskLiveChatThread.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        status: true,
                        claimedByAdminUserId: true,
                        claimExpiresAt: true,
                    },
                });

                if (!current) {
                    throw new NotFoundException("Helpdesk live chat thread not found.");
                }

                if (
                    current.status === HelpdeskLiveChatThreadStatus.CLOSED ||
                    current.status === HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET
                ) {
                    throw new BadRequestException("This live chat thread is no longer active.");
                }

                throw new ConflictException("This live chat thread is already claimed by another staff member.");
            }

            const updatedThread = await tx.helpdeskLiveChatThread.findUnique({
                where: { id },
                include: this.liveChatThreadInclude(true),
            });

            if (!updatedThread) {
                throw new NotFoundException("Helpdesk live chat thread not found.");
            }

            return updatedThread;
        });

        await this.writeAudit({
            actorAdminUserId: adminUserId,
            actionType: "UPDATE",
            actionCode: "helpdesk.live_chat.claim",
            actionLabel: "Claimed helpdesk live chat thread",
            resourceType: "HELPDESK_LIVE_CHAT",
            resourceId: updated.id,
            resourceName: updated.subject,
            targetUserId: updated.userId,
            metadata: { status: updated.status },
            requestContext,
        });

        return this.mapLiveChatThread(updated, canViewRealStaffIdentity, true);
    }

    async releaseLiveChatThread(
        adminUserId: string,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);

        const existing = await this.prisma.helpdeskLiveChatThread.findUnique({
            where: { id },
            include: this.liveChatThreadInclude(true),
        });

        if (!existing) {
            throw new NotFoundException("Helpdesk live chat thread not found.");
        }

        if (
            existing.claimedByAdminUserId &&
            existing.claimedByAdminUserId !== adminUserId &&
            existing.claimExpiresAt &&
            existing.claimExpiresAt > new Date()
        ) {
            throw new ForbiddenException("Only the claiming staff member can release this live chat thread.");
        }

        const updated = await this.prisma.helpdeskLiveChatThread.update({
            where: { id: existing.id },
            data: {
                status: HelpdeskLiveChatThreadStatus.WAITING,
                claimedByAdminUserId: null,
                claimedAt: null,
                claimExpiresAt: null,
            },
            include: this.liveChatThreadInclude(true),
        });

        await this.writeAudit({
            actorAdminUserId: adminUserId,
            actionType: "UPDATE",
            actionCode: "helpdesk.live_chat.release",
            actionLabel: "Released helpdesk live chat thread",
            resourceType: "HELPDESK_LIVE_CHAT",
            resourceId: updated.id,
            resourceName: updated.subject,
            targetUserId: updated.userId,
            metadata: { status: updated.status },
            requestContext,
        });

        return this.mapLiveChatThread(updated, canViewRealStaffIdentity, true);
    }

    async addAdminLiveChatMessage(
        adminUserId: string,
        id: string,
        body: ReplyHelpdeskLiveChatDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);

        const messageBody = this.normalizeOptionalString(body.body);
        if (!messageBody) {
            throw new BadRequestException("Live chat message is required.");
        }

        const now = new Date();
        const claimExpiresAt = new Date(now.getTime() + this.liveChatClaimMs);

        const updated = await this.prisma.$transaction(async (tx) => {
            const claimResult = await tx.helpdeskLiveChatThread.updateMany({
                where: {
                    id,
                    status: {
                        notIn: [
                            HelpdeskLiveChatThreadStatus.CLOSED,
                            HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET,
                        ],
                    },
                    OR: [
                        { claimedByAdminUserId: null },
                        { claimExpiresAt: null },
                        { claimExpiresAt: { lte: now } },
                        { claimedByAdminUserId: adminUserId },
                    ],
                },
                data: {
                    status: HelpdeskLiveChatThreadStatus.ACTIVE,
                    claimedByAdminUserId: adminUserId,
                    claimedAt: now,
                    claimExpiresAt,
                    lastMessageAt: now,
                },
            });

            if (claimResult.count !== 1) {
                const current = await tx.helpdeskLiveChatThread.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        status: true,
                        claimedByAdminUserId: true,
                        claimExpiresAt: true,
                    },
                });

                if (!current) {
                    throw new NotFoundException("Helpdesk live chat thread not found.");
                }

                if (
                    current.status === HelpdeskLiveChatThreadStatus.CLOSED ||
                    current.status === HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET
                ) {
                    throw new BadRequestException("This live chat thread is no longer active.");
                }

                throw new ConflictException("This live chat thread is claimed by another staff member.");
            }

            await tx.helpdeskLiveChatMessage.create({
                data: {
                    threadId: id,
                    senderType: HelpdeskLiveChatMessageSenderType.STAFF,
                    senderAdminUserId: adminUserId,
                    body: messageBody,
                },
            });

            const updatedThread = await tx.helpdeskLiveChatThread.findUnique({
                where: { id },
                include: this.liveChatThreadInclude(true),
            });

            if (!updatedThread) {
                throw new NotFoundException("Helpdesk live chat thread not found.");
            }

            return updatedThread;
        });

        await this.writeAudit({
            actorAdminUserId: adminUserId,
            actionType: "CREATE",
            actionCode: "helpdesk.live_chat.message",
            actionLabel: "Sent helpdesk live chat message",
            resourceType: "HELPDESK_LIVE_CHAT",
            resourceId: updated.id,
            resourceName: updated.subject,
            targetUserId: updated.userId,
            metadata: { senderType: HelpdeskLiveChatMessageSenderType.STAFF },
            requestContext,
        });

        return this.mapLiveChatThread(updated, canViewRealStaffIdentity, true);
    }

    async closeUserLiveChatThread(
        userId: string,
        id: string,
        body: CloseHelpdeskLiveChatDto,
    ) {
        await this.requireUser(userId);

        const closeReason = this.normalizeOptionalString(body.reason);
        const now = new Date();

        const updated = await this.prisma.$transaction(async (tx) => {
            const closeResult = await tx.helpdeskLiveChatThread.updateMany({
                where: {
                    id,
                    userId,
                    status: {
                        notIn: [
                            HelpdeskLiveChatThreadStatus.CLOSED,
                            HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET,
                        ],
                    },
                },
                data: {
                    status: HelpdeskLiveChatThreadStatus.CLOSED,
                    closedAt: now,
                    closedByAdminUserId: null,
                    closeReason,
                    claimedByAdminUserId: null,
                    claimedAt: null,
                    claimExpiresAt: null,
                    lastMessageAt: now,
                },
            });

            if (closeResult.count !== 1) {
                const current = await tx.helpdeskLiveChatThread.findFirst({
                    where: { id, userId },
                    select: { id: true, status: true },
                });

                if (!current) {
                    throw new NotFoundException("Helpdesk live chat thread not found.");
                }

                throw new BadRequestException("This live chat thread is already closed.");
            }

            await tx.helpdeskLiveChatMessage.create({
                data: {
                    threadId: id,
                    senderType: HelpdeskLiveChatMessageSenderType.SYSTEM,
                    body: "Live chat ended by user.",
                    metadataJson: this.toJsonObject({
                        action: "USER_CLOSED_LIVE_CHAT",
                        reason: closeReason,
                    }),
                },
            });

            const updatedThread = await tx.helpdeskLiveChatThread.findUnique({
                where: { id },
                include: this.liveChatThreadInclude(true),
            });

            if (!updatedThread) {
                throw new NotFoundException("Helpdesk live chat thread not found.");
            }

            return updatedThread;
        });

        return this.mapLiveChatThread(updated, false, true);
    }

    async closeLiveChatThread(
        adminUserId: string,
        id: string,
        body: CloseHelpdeskLiveChatDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);

        const existing = await this.prisma.helpdeskLiveChatThread.findUnique({
            where: { id },
            include: this.liveChatThreadInclude(true),
        });

        if (!existing) {
            throw new NotFoundException("Helpdesk live chat thread not found.");
        }

        if (
            existing.status === HelpdeskLiveChatThreadStatus.CLOSED ||
            existing.status === HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET
        ) {
            throw new BadRequestException("This live chat thread is already closed.");
        }

        const closeReason = this.normalizeOptionalString(body.reason);
        const now = new Date();

        const updated = await this.prisma.$transaction(async (tx) => {
            const closeResult = await tx.helpdeskLiveChatThread.updateMany({
                where: {
                    id: existing.id,
                    status: {
                        notIn: [
                            HelpdeskLiveChatThreadStatus.CLOSED,
                            HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET,
                        ],
                    },
                },
                data: {
                    status: HelpdeskLiveChatThreadStatus.CLOSED,
                    closedAt: now,
                    closedByAdminUserId: adminUserId,
                    closeReason,
                    claimedByAdminUserId: null,
                    claimedAt: null,
                    claimExpiresAt: null,
                    lastMessageAt: now,
                },
            });

            if (closeResult.count !== 1) {
                const current = await tx.helpdeskLiveChatThread.findUnique({
                    where: { id: existing.id },
                    select: { id: true, status: true },
                });

                if (!current) {
                    throw new NotFoundException("Helpdesk live chat thread not found.");
                }

                throw new BadRequestException("This live chat thread is already closed.");
            }

            await tx.helpdeskLiveChatMessage.create({
                data: {
                    threadId: existing.id,
                    senderType: HelpdeskLiveChatMessageSenderType.SYSTEM,
                    body: "Live chat ended by support.",
                    metadataJson: this.toJsonObject({
                        action: "STAFF_CLOSED_LIVE_CHAT",
                        reason: closeReason,
                    }),
                },
            });

            const updatedThread = await tx.helpdeskLiveChatThread.findUnique({
                where: { id: existing.id },
                include: this.liveChatThreadInclude(true),
            });

            if (!updatedThread) {
                throw new NotFoundException("Helpdesk live chat thread not found.");
            }

            return updatedThread;
        });

        await this.writeAudit({
            actorAdminUserId: adminUserId,
            actionType: "STATUS_CHANGE",
            actionCode: "helpdesk.live_chat.close",
            actionLabel: "Closed helpdesk live chat thread",
            resourceType: "HELPDESK_LIVE_CHAT",
            resourceId: updated.id,
            resourceName: updated.subject,
            targetUserId: updated.userId,
            metadata: { status: updated.status },
            requestContext,
        });

        return this.mapLiveChatThread(updated, canViewRealStaffIdentity, true);
    }

    async convertLiveChatToTicket(
        adminUserId: string,
        id: string,
        body: ConvertHelpdeskLiveChatToTicketDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);

        const existing = await this.prisma.helpdeskLiveChatThread.findUnique({
            where: { id },
            include: this.liveChatThreadInclude(true),
        });

        if (!existing) {
            throw new NotFoundException("Helpdesk live chat thread not found.");
        }

        if (existing.convertedTicketId) {
            if (!existing.convertedTicket) {
                throw new BadRequestException("This live chat thread references a missing converted ticket.");
            }

            return {
                success: true,
                ticket: this.mapTicketListItem(existing.convertedTicket, canViewRealStaffIdentity),
                thread: this.mapLiveChatThread(existing, canViewRealStaffIdentity, true),
            };
        }

        const priority = this.parsePriority(body.priority) ?? HelpdeskTicketPriority.NORMAL;
        const categoryId = body.categoryId ?? existing.categoryId ?? undefined;
        await this.assertActiveCategory(categoryId);

        const subject =
            this.normalizeOptionalString(body.subject) ||
            existing.subject ||
            `Live chat with ${existing.user?.username ?? "user"}`;

        const ticketNumber = await this.createTicketNumber();
        const now = new Date();

        const messages = (existing.messages || []).filter((message: any) => !message.deletedAt);
        const lastMessage = messages[messages.length - 1];
        const ticketStatus =
            lastMessage?.senderType === HelpdeskLiveChatMessageSenderType.USER
                ? HelpdeskTicketStatus.PENDING_ADMIN
                : HelpdeskTicketStatus.PENDING_USER;

        const conversionResult: any = await this.prisma.$transaction(async (tx) => {
            const reserveResult = await tx.helpdeskLiveChatThread.updateMany({
                where: {
                    id: existing.id,
                    convertedTicketId: null,
                },
                data: {
                    status: HelpdeskLiveChatThreadStatus.CONVERTED_TO_TICKET,
                    closedAt: now,
                    closedByAdminUserId: adminUserId,
                    claimedByAdminUserId: null,
                    claimedAt: null,
                    claimExpiresAt: null,
                },
            });

            if (reserveResult.count !== 1) {
                const current = await tx.helpdeskLiveChatThread.findUnique({
                    where: { id: existing.id },
                    include: this.liveChatThreadInclude(true),
                });

                if (!current) {
                    throw new NotFoundException("Helpdesk live chat thread not found.");
                }

                if (current.convertedTicketId && current.convertedTicket) {
                    return {
                        created: false,
                        ticket: current.convertedTicket,
                        thread: current,
                    };
                }

                throw new ConflictException("This live chat thread could not be converted because it changed during conversion.");
            }

            const ticket = await tx.helpdeskTicket.create({
                data: {
                    ticketNumber,
                    userId: existing.userId,
                    categoryId: categoryId ?? null,
                    assignedAdminUserId: adminUserId,
                    subject,
                    status: ticketStatus,
                    priority,
                    source: HelpdeskTicketSource.LIVE_CHAT,
                    lastMessageAt: existing.lastMessageAt ?? now,
                    metadataJson: this.toJsonObject({
                        liveChatThreadId: existing.id,
                    }),
                    messages: {
                        create: messages.length
                            ? messages.map((message: any) => ({
                                senderType:
                                    message.senderType === HelpdeskLiveChatMessageSenderType.STAFF
                                        ? HelpdeskTicketMessageSenderType.STAFF
                                        : message.senderType === HelpdeskLiveChatMessageSenderType.SYSTEM
                                            ? HelpdeskTicketMessageSenderType.SYSTEM
                                            : HelpdeskTicketMessageSenderType.USER,
                                senderUserId:
                                    message.senderType === HelpdeskLiveChatMessageSenderType.USER
                                        ? message.senderUserId
                                        : null,
                                senderAdminUserId:
                                    message.senderType === HelpdeskLiveChatMessageSenderType.STAFF
                                        ? message.senderAdminUserId
                                        : null,
                                body: message.body,
                                createdAt: message.createdAt,
                            }))
                            : [
                                {
                                    senderType: HelpdeskTicketMessageSenderType.SYSTEM,
                                    body: "Live chat was converted to a support ticket.",
                                },
                            ],
                    },
                    events: {
                        create: {
                            actorAdminUserId: adminUserId,
                            eventType: HelpdeskTicketEventType.TICKET_CREATED,
                            afterJson: {
                                source: HelpdeskTicketSource.LIVE_CHAT,
                                liveChatThreadId: existing.id,
                            },
                        },
                    },
                },
                include: {
                    user: { include: { profile: true } },
                    category: true,
                    assignedAdminUser: true,
                    closedByAdminUser: true,
                },
            });

            const thread = await tx.helpdeskLiveChatThread.update({
                where: { id: existing.id },
                data: {
                    convertedTicketId: ticket.id,
                },
                include: this.liveChatThreadInclude(true),
            });

            return {
                created: true,
                ticket,
                thread,
            };
        });

        if (conversionResult.created) {
            await this.writeAudit({
                actorAdminUserId: adminUserId,
                actionType: "CREATE",
                actionCode: "helpdesk.live_chat.convert_to_ticket",
                actionLabel: "Converted helpdesk live chat to ticket",
                resourceType: "HELPDESK_LIVE_CHAT",
                resourceId: existing.id,
                resourceName: existing.subject,
                targetUserId: existing.userId,
                targetSupportTicketId: conversionResult.ticket.id,
                metadata: {
                    ticketId: conversionResult.ticket.id,
                    ticketNumber: conversionResult.ticket.ticketNumber,
                },
                requestContext,
            });
        }

        return {
            success: true,
            ticket: this.mapTicketListItem(conversionResult.ticket, canViewRealStaffIdentity),
            thread: this.mapLiveChatThread(conversionResult.thread, canViewRealStaffIdentity, true),
        };
    }

}

import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import {
    AdminRole,
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
    AddHelpdeskInternalNoteDto,
    AssignHelpdeskTicketDto,
    CreateHelpdeskTicketDto,
    HelpdeskTicketQueryDto,
    ReplyHelpdeskTicketDto,
    UpdateHelpdeskTicketCategoryDto,
    UpdateHelpdeskTicketPriorityDto,
    UpdateHelpdeskTicketStatusDto,
    UpsertHelpdeskCategoryDto,
    UpdateHelpdeskCategoryDto,
    DeactivateHelpdeskCategoryDto,
} from "./dto/helpdesk.dto";

type AdminAuditRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

type JsonRecord = Record<string, unknown>;

@Injectable()
export class HelpdeskService {
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

    private normalizeAuditContext(context?: AdminAuditRequestContext | null) {
        return {
            requestPath: this.normalizeOptionalString(context?.requestPath),
            ipAddress: this.normalizeOptionalString(context?.ipAddress),
            userAgent: this.normalizeOptionalString(context?.userAgent),
            deviceLabel: this.normalizeOptionalString(context?.deviceLabel),
        };
    }

    private toJsonObject(value?: JsonRecord | null) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return undefined;
        }

        return value as Prisma.InputJsonObject;
    }

    private maskStaffAdminIdsInHelpdeskJson(
        value: unknown,
        canViewRealStaffIdentity = false,
    ): unknown {
        if (canViewRealStaffIdentity || value === null || value === undefined) {
            return value;
        }

        if (Array.isArray(value)) {
            return value.map((item) =>
                this.maskStaffAdminIdsInHelpdeskJson(item, canViewRealStaffIdentity),
            );
        }

        if (typeof value !== "object") {
            return value;
        }

        const output: Record<string, unknown> = {};

        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            output[key] =
                /AdminUserId$/i.test(key)
                    ? null
                    : this.maskStaffAdminIdsInHelpdeskJson(
                        item,
                        canViewRealStaffIdentity,
                    );
        }

        return output;
    }

    private parseStatus(raw?: string) {
        const value = String(raw || "").trim().toUpperCase();

        if (!value) {
            return undefined;
        }

        if (!Object.values(HelpdeskTicketStatus).includes(value as HelpdeskTicketStatus)) {
            throw new BadRequestException("Invalid helpdesk ticket status.");
        }

        return value as HelpdeskTicketStatus;
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

    private parseAssignment(raw?: string) {
        const value = String(raw || "any").trim().toLowerCase();

        if (value !== "any" && value !== "assigned" && value !== "unassigned") {
            throw new BadRequestException("Invalid helpdesk assignment filter.");
        }

        return value as "any" | "assigned" | "unassigned";
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

    private async canViewRealStaffIdentity(role: AdminRole) {
        const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

        return hasAdminPermission(
            permissions,
            ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
        );
    }

    private async canViewInternalNotes(role: AdminRole) {
        const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

        return hasAdminPermission(
            permissions,
            ADMIN_PERMISSIONS.HELPDESK_VIEW_INTERNAL_NOTES,
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

    private mapMessage(message: any, canViewRealStaffIdentity = false) {
        return {
            id: message.id,
            senderType: message.senderType,
            body: message.deletedAt ? null : message.body,
            attachments: message.attachmentsJson ?? [],
            createdAt: message.createdAt.toISOString(),
            editedAt: message.editedAt ? message.editedAt.toISOString() : null,
            deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
            senderUser:
                message.senderType === HelpdeskTicketMessageSenderType.USER
                    ? this.mapUser(message.senderUser)
                    : null,
            senderStaff:
                message.senderType === HelpdeskTicketMessageSenderType.STAFF
                    ? this.mapAdminUser(message.senderAdminUser, canViewRealStaffIdentity)
                    : null,
        };
    }

    private mapInternalNote(note: any, canViewRealStaffIdentity = false) {
        return {
            id: note.id,
            body: note.deletedAt ? null : note.body,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
            deletedAt: note.deletedAt ? note.deletedAt.toISOString() : null,
            adminUser: this.mapAdminUser(note.adminUser, canViewRealStaffIdentity),
        };
    }

    private mapEvent(event: any, canViewRealStaffIdentity = false) {
        return {
            id: event.id,
            eventType: event.eventType,
            before: this.maskStaffAdminIdsInHelpdeskJson(
                event.beforeJson,
                canViewRealStaffIdentity,
            ) as Record<string, unknown> | null,
            after: this.maskStaffAdminIdsInHelpdeskJson(
                event.afterJson,
                canViewRealStaffIdentity,
            ) as Record<string, unknown> | null,
            metadata: this.maskStaffAdminIdsInHelpdeskJson(
                event.metadataJson,
                canViewRealStaffIdentity,
            ) as Record<string, unknown> | null,
            createdAt: event.createdAt.toISOString(),
            actorUser: this.mapUser(event.actorUser),
            actorStaff: this.mapAdminUser(event.actorAdminUser, canViewRealStaffIdentity),
        };
    }

    private mapTicketListItem(ticket: any, canViewRealStaffIdentity = false) {
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

    private mapTicketDetail(
        ticket: any,
        canViewRealStaffIdentity = false,
        includeInternalNotes = false,
    ) {
        return {
            item: this.mapTicketListItem(ticket, canViewRealStaffIdentity),
            messages: (ticket.messages || []).map((message: any) =>
                this.mapMessage(message, canViewRealStaffIdentity),
            ),
            internalNotes: includeInternalNotes
                ? (ticket.internalNotes || []).map((note: any) =>
                    this.mapInternalNote(note, canViewRealStaffIdentity),
                )
                : [],
            events: (ticket.events || []).map((event: any) =>
                this.mapEvent(event, canViewRealStaffIdentity),
            ),
        };
    }

    private ticketInclude(includeInternalNotes = false) {
        return {
            user: { include: { profile: true } },
            category: true,
            assignedAdminUser: true,
            closedByAdminUser: true,
            messages: {
                include: {
                    senderUser: { include: { profile: true } },
                    senderAdminUser: true,
                },
                orderBy: { createdAt: "asc" as const },
            },
            internalNotes: includeInternalNotes
                ? {
                    include: { adminUser: true },
                    orderBy: { createdAt: "desc" as const },
                }
                : false,
            events: {
                include: {
                    actorUser: { include: { profile: true } },
                    actorAdminUser: true,
                },
                orderBy: { createdAt: "desc" as const },
                take: 50,
            },
        };
    }

    private ticketLookupWhere(idOrNumber: string): Prisma.HelpdeskTicketWhereInput {
        const normalized = String(idOrNumber || "").trim();
        const orFilters: Prisma.HelpdeskTicketWhereInput[] = [
            { ticketNumber: normalized },
        ];

        if (this.isUuid(normalized)) {
            orFilters.unshift({ id: normalized });
        }

        return { OR: orFilters };
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

    private async findTicketByIdOrNumber(idOrNumber: string) {
        const normalized = this.normalizeOptionalString(idOrNumber);

        if (!normalized) {
            return null;
        }

        return this.prisma.helpdeskTicket.findFirst({
            where: this.ticketLookupWhere(normalized),
            include: this.ticketInclude(true),
        });
    }

    private async addTicketEvent(args: {
        ticketId: string;
        actorUserId?: string | null;
        actorAdminUserId?: string | null;
        eventType: HelpdeskTicketEventType;
        before?: JsonRecord | null;
        after?: JsonRecord | null;
        metadata?: JsonRecord | null;
    }) {
        await this.prisma.helpdeskTicketEvent.create({
            data: {
                ticketId: args.ticketId,
                actorUserId: args.actorUserId ?? null,
                actorAdminUserId: args.actorAdminUserId ?? null,
                eventType: args.eventType,
                beforeJson: this.toJsonObject(args.before),
                afterJson: this.toJsonObject(args.after),
                metadataJson: this.toJsonObject(args.metadata),
            },
        });
    }

    private async addAdminAuditLog(args: {
        actorAdminUserId: string;
        ticket: any;
        actionType: "VIEW" | "CREATE" | "UPDATE" | "STATUS_CHANGE";
        actionCode: string;
        actionLabel: string;
        beforeState?: JsonRecord | null;
        afterState?: JsonRecord | null;
        diff?: JsonRecord | null;
        metadata?: JsonRecord | null;
        requestContext?: AdminAuditRequestContext | null;
    }) {
        const requestContext = this.normalizeAuditContext(args.requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: args.actorAdminUserId,
            actionType: args.actionType,
            actionCode: args.actionCode,
            actionLabel: args.actionLabel,
            resourceType: "HELPDESK_TICKET",
            resourceId: args.ticket.id,
            target: {
                id: args.ticket.id,
                name: args.ticket.ticketNumber,
                type: "HELPDESK_TICKET",
            },
            references: {
                targetUserId: args.ticket.userId ?? args.ticket.user?.id ?? null,
                targetSupportTicketId: args.ticket.id,
            },
            requestPath: requestContext.requestPath,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            deviceLabel: requestContext.deviceLabel,
            beforeState: args.beforeState,
            afterState: args.afterState,
            diff: args.diff,
            metadata: {
                ticketNumber: args.ticket.ticketNumber,
                status: args.ticket.status,
                priority: args.ticket.priority,
                hasAssignedAdminUser: Boolean(
                    args.ticket.assignedAdminUserId ??
                    args.ticket.assignedAdminUser?.id,
                ),
                ...(args.metadata || {}),
            },
        });
    }

    async listPublicCategories() {
        const items = await this.prisma.helpdeskCategory.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });

        return {
            items: items.map((item) => this.mapCategory(item)),
        };
    }

    async listAdminCategories() {
        const items = await this.prisma.helpdeskCategory.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });

        return {
            items: items.map((item) => this.mapCategory(item)),
        };
    }

    async upsertCategory(
        adminUserId: string,
        body: UpsertHelpdeskCategoryDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const key = String(body.key || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_ -]/g, "")
            .replace(/\s+/g, "_")
            .replace(/-+/g, "_");

        if (!key) {
            throw new BadRequestException("Category key is required.");
        }

        let category;

        try {
            category = await this.prisma.helpdeskCategory.create({
                data: {
                    key,
                    name: body.name.trim(),
                    description: this.normalizeOptionalString(body.description),
                    isActive: body.isActive ?? true,
                    sortOrder: body.sortOrder ?? 0,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new BadRequestException("A helpdesk category with this key already exists.");
            }

            throw error;
        }

        const auditContext = this.normalizeAuditContext(requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: adminUserId,
            actionType: "CREATE",
            actionCode: "helpdesk.category.create",
            actionLabel: "Created helpdesk category",
            resourceType: "HELPDESK_CATEGORY",
            resourceId: category.id,
            target: {
                id: category.id,
                name: category.name,
                type: "HELPDESK_CATEGORY",
            },
            requestPath: auditContext.requestPath,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            deviceLabel: auditContext.deviceLabel,
            metadata: {
                key: category.key,
                isActive: category.isActive,
            },
        });

        return {
            success: true,
            item: this.mapCategory(category),
        };
    }

    async createUserTicket(userId: string, body: CreateHelpdeskTicketDto) {
        const user = await this.requireUser(userId);
        const subject = this.normalizeOptionalString(body.subject);
        const messageBody = this.normalizeOptionalString(body.body);

        if (!subject) {
            throw new BadRequestException("Ticket subject is required.");
        }

        if (!messageBody) {
            throw new BadRequestException("Ticket message is required.");
        }

        if (body.categoryId) {
            const category = await this.prisma.helpdeskCategory.findFirst({
                where: { id: body.categoryId, isActive: true },
                select: { id: true },
            });

            if (!category) {
                throw new BadRequestException("Helpdesk category is invalid.");
            }
        }

        const ticketNumber = await this.createTicketNumber();

        const created = await this.prisma.helpdeskTicket.create({
            data: {
                ticketNumber,
                userId: user.id,
                categoryId: body.categoryId ?? null,
                subject,
                status: HelpdeskTicketStatus.OPEN,
                priority: HelpdeskTicketPriority.NORMAL,
                source: HelpdeskTicketSource.USER,
                lastMessageAt: new Date(),
                messages: {
                    create: {
                        senderType: HelpdeskTicketMessageSenderType.USER,
                        senderUserId: user.id,
                        body: messageBody,
                    },
                },
                events: {
                    create: {
                        actorUserId: user.id,
                        eventType: HelpdeskTicketEventType.TICKET_CREATED,
                        afterJson: {
                            status: HelpdeskTicketStatus.OPEN,
                            subject,
                        },
                    },
                },
            },
            include: this.ticketInclude(false),
        });

        return {
            success: true,
            item: this.mapTicketListItem(created, false),
        };
    }

    async listUserTickets(userId: string, query: HelpdeskTicketQueryDto = {}) {
        await this.requireUser(userId);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const status = this.parseStatus(query.status);

        const where: Prisma.HelpdeskTicketWhereInput = {
            userId,
            ...(status ? { status } : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.helpdeskTicket.findMany({
                where,
                include: {
                    category: true,
                    assignedAdminUser: true,
                    closedByAdminUser: true,
                    user: { include: { profile: true } },
                },
                orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.helpdeskTicket.count({ where }),
        ]);

        return {
            items: items.map((item) => this.mapTicketListItem(item, false)),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    }

    async getUserTicket(userId: string, id: string) {
        await this.requireUser(userId);

        const ticket = await this.prisma.helpdeskTicket.findFirst({
            where: {
                userId,
                AND: [this.ticketLookupWhere(id)],
            },
            include: this.ticketInclude(false),
        });

        if (!ticket) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        return this.mapTicketDetail(ticket, false, false);
    }

    async addUserReply(userId: string, id: string, body: ReplyHelpdeskTicketDto) {
        await this.requireUser(userId);

        const messageBody = this.normalizeOptionalString(body.body);
        if (!messageBody) {
            throw new BadRequestException("Reply body is required.");
        }

        const existing = await this.prisma.helpdeskTicket.findFirst({
            where: {
                userId,
                AND: [this.ticketLookupWhere(id)],
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        if (existing.status === HelpdeskTicketStatus.CLOSED) {
            throw new BadRequestException("Closed tickets cannot receive replies.");
        }

        await this.prisma.$transaction([
            this.prisma.helpdeskTicketMessage.create({
                data: {
                    ticketId: existing.id,
                    senderType: HelpdeskTicketMessageSenderType.USER,
                    senderUserId: userId,
                    body: messageBody,
                },
            }),
            this.prisma.helpdeskTicket.update({
                where: { id: existing.id },
                data: {
                    status: HelpdeskTicketStatus.PENDING_ADMIN,
                    lastMessageAt: new Date(),
                },
            }),
            this.prisma.helpdeskTicketEvent.create({
                data: {
                    ticketId: existing.id,
                    actorUserId: userId,
                    eventType: HelpdeskTicketEventType.MESSAGE_ADDED,
                    metadataJson: {
                        senderType: HelpdeskTicketMessageSenderType.USER,
                    },
                },
            }),
        ]);

        return this.getUserTicket(userId, existing.id);
    }

    async getAdminSummary(adminUserId: string) {
        await this.requireAdmin(adminUserId);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [
            open,
            pendingAdmin,
            pendingUser,
            escalated,
            resolvedToday,
            closedToday,
            unassigned,
            urgent,
        ] = await this.prisma.$transaction([
            this.prisma.helpdeskTicket.count({ where: { status: HelpdeskTicketStatus.OPEN } }),
            this.prisma.helpdeskTicket.count({ where: { status: HelpdeskTicketStatus.PENDING_ADMIN } }),
            this.prisma.helpdeskTicket.count({ where: { status: HelpdeskTicketStatus.PENDING_USER } }),
            this.prisma.helpdeskTicket.count({ where: { status: HelpdeskTicketStatus.ESCALATED } }),
            this.prisma.helpdeskTicket.count({
                where: { status: HelpdeskTicketStatus.RESOLVED, closedAt: { gte: todayStart } },
            }),
            this.prisma.helpdeskTicket.count({
                where: { status: HelpdeskTicketStatus.CLOSED, closedAt: { gte: todayStart } },
            }),
            this.prisma.helpdeskTicket.count({ where: { assignedAdminUserId: null } }),
            this.prisma.helpdeskTicket.count({ where: { priority: HelpdeskTicketPriority.URGENT } }),
        ]);

        return {
            generatedAt: new Date().toISOString(),
            counts: {
                open,
                pendingAdmin,
                pendingUser,
                escalated,
                resolvedToday,
                closedToday,
                unassigned,
                urgent,
            },
        };
    }

    async listAdminTickets(adminUserId: string, query: HelpdeskTicketQueryDto = {}) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealStaffIdentity(actor.role);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const status = this.parseStatus(query.status);
        const priority = this.parsePriority(query.priority);
        const assignment = this.parseAssignment(query.assignment);
        const search = this.normalizeOptionalString(query.search);

        const andFilters: Prisma.HelpdeskTicketWhereInput[] = [];

        if (status) {
            andFilters.push({ status });
        }

        if (priority) {
            andFilters.push({ priority });
        }

        if (query.categoryId) {
            andFilters.push({ categoryId: query.categoryId });
        }

        if (assignment === "assigned") {
            andFilters.push({ assignedAdminUserId: { not: null } });
        }

        if (assignment === "unassigned") {
            andFilters.push({ assignedAdminUserId: null });
        }

        if (search) {
            const searchOr: Prisma.HelpdeskTicketWhereInput[] = [
                { ticketNumber: { contains: search, mode: "insensitive" } },
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

        const where: Prisma.HelpdeskTicketWhereInput =
            andFilters.length > 0 ? { AND: andFilters } : {};

        const [items, total] = await this.prisma.$transaction([
            this.prisma.helpdeskTicket.findMany({
                where,
                include: {
                    user: { include: { profile: true } },
                    category: true,
                    assignedAdminUser: true,
                    closedByAdminUser: true,
                },
                orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.helpdeskTicket.count({ where }),
        ]);

        return {
            items: items.map((item) =>
                this.mapTicketListItem(item, canViewRealStaffIdentity),
            ),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            filters: {
                search,
                status: status ?? "all",
                priority: priority ?? "all",
                categoryId: query.categoryId ?? "all",
                assignment,
            },
        };
    }

    async getAdminTicket(
        adminUserId: string,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const [canViewRealStaffIdentity, includeInternalNotes] = await Promise.all([
            this.canViewRealStaffIdentity(actor.role),
            this.canViewInternalNotes(actor.role),
        ]);

        const ticket = await this.findTicketByIdOrNumber(id);

        if (!ticket) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        await this.addAdminAuditLog({
            actorAdminUserId: adminUserId,
            ticket,
            actionType: "VIEW",
            actionCode: "helpdesk.ticket.view",
            actionLabel: "Viewed helpdesk ticket",
            metadata: { source: "admin_helpdesk.getTicket" },
            requestContext,
        });

        return this.mapTicketDetail(ticket, canViewRealStaffIdentity, includeInternalNotes);
    }

    async addAdminReply(
        adminUserId: string,
        id: string,
        body: ReplyHelpdeskTicketDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const [canViewRealStaffIdentity, includeInternalNotes] = await Promise.all([
            this.canViewRealStaffIdentity(actor.role),
            this.canViewInternalNotes(actor.role),
        ]);

        const messageBody = this.normalizeOptionalString(body.body);
        if (!messageBody) {
            throw new BadRequestException("Reply body is required.");
        }

        const existing = await this.findTicketByIdOrNumber(id);
        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        if (existing.status === HelpdeskTicketStatus.CLOSED) {
            throw new BadRequestException("Closed tickets cannot receive replies.");
        }

        const { updatedTicket: updated, autoClaimed } = await this.prisma.$transaction(async (tx) => {
            const now = new Date();

            const statusUpdate = await tx.helpdeskTicket.updateMany({
                where: {
                    id: existing.id,
                    status: { not: HelpdeskTicketStatus.CLOSED },
                },
                data: {
                    status: HelpdeskTicketStatus.PENDING_USER,
                    lastMessageAt: now,
                },
            });

            if (statusUpdate.count === 0) {
                throw new BadRequestException("Closed tickets cannot receive replies.");
            }

            await tx.helpdeskTicketMessage.create({
                data: {
                    ticketId: existing.id,
                    senderType: HelpdeskTicketMessageSenderType.STAFF,
                    senderAdminUserId: adminUserId,
                    body: messageBody,
                },
            });

            const autoClaimResult = await tx.helpdeskTicket.updateMany({
                where: {
                    id: existing.id,
                    assignedAdminUserId: null,
                },
                data: {
                    assignedAdminUserId: adminUserId,
                },
            });
            const autoClaimed = autoClaimResult.count > 0;

            await tx.helpdeskTicketEvent.create({
                data: {
                    ticketId: existing.id,
                    actorAdminUserId: adminUserId,
                    eventType: HelpdeskTicketEventType.MESSAGE_ADDED,
                    metadataJson: {
                        senderType: HelpdeskTicketMessageSenderType.STAFF,
                        autoClaimed,
                    },
                },
            });

            if (autoClaimed) {
                await tx.helpdeskTicketEvent.create({
                    data: {
                        ticketId: existing.id,
                        actorAdminUserId: adminUserId,
                        eventType: HelpdeskTicketEventType.ASSIGNED,
                        beforeJson: this.toJsonObject({
                            assignedAdminUserId: null,
                        }),
                        afterJson: this.toJsonObject({
                            assignedAdminUserId: adminUserId,
                        }),
                        metadataJson: this.toJsonObject({
                            reason: "FIRST_STAFF_REPLY_AUTO_CLAIM",
                        }),
                    },
                });
            }

            const updatedTicket = await tx.helpdeskTicket.findUniqueOrThrow({
                where: { id: existing.id },
                include: this.ticketInclude(true),
            });

            return { updatedTicket, autoClaimed };
        });

        await this.addAdminAuditLog({
            actorAdminUserId: adminUserId,
            ticket: updated,
            actionType: "CREATE",
            actionCode: "helpdesk.ticket.reply",
            actionLabel: "Replied to helpdesk ticket",
            requestContext,
        });

        if (autoClaimed) {
            await this.addAdminAuditLog({
                actorAdminUserId: adminUserId,
                ticket: updated,
                actionType: "UPDATE",
                actionCode: "helpdesk.ticket.claim",
                actionLabel: "Auto-claimed helpdesk ticket",
                beforeState: {
                    assignedAdminUserId: null,
                },
                afterState: {
                    assignedAdminUserId: adminUserId,
                },
                diff: {
                    assignedAdminUserId: {
                        before: null,
                        after: adminUserId,
                    },
                },
                metadata: {
                    reason: "FIRST_STAFF_REPLY_AUTO_CLAIM",
                },
                requestContext,
            });
        }

        return this.mapTicketDetail(updated, canViewRealStaffIdentity, includeInternalNotes);
    }

    async addInternalNote(
        adminUserId: string,
        id: string,
        body: AddHelpdeskInternalNoteDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const [canViewRealStaffIdentity, includeInternalNotes] = await Promise.all([
            this.canViewRealStaffIdentity(actor.role),
            this.canViewInternalNotes(actor.role),
        ]);

        const noteBody = this.normalizeOptionalString(body.body);
        if (!noteBody) {
            throw new BadRequestException("Internal note body is required.");
        }

        const existing = await this.findTicketByIdOrNumber(id);
        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        await this.prisma.$transaction([
            this.prisma.helpdeskTicketInternalNote.create({
                data: {
                    ticketId: existing.id,
                    adminUserId,
                    body: noteBody,
                },
            }),
            this.prisma.helpdeskTicketEvent.create({
                data: {
                    ticketId: existing.id,
                    actorAdminUserId: adminUserId,
                    eventType: HelpdeskTicketEventType.INTERNAL_NOTE_ADDED,
                },
            }),
        ]);

        const updated = await this.findTicketByIdOrNumber(existing.id);

        await this.addAdminAuditLog({
            actorAdminUserId: adminUserId,
            ticket: updated ?? existing,
            actionType: "CREATE",
            actionCode: "helpdesk.ticket.internal_note.create",
            actionLabel: "Created helpdesk internal note",
            requestContext,
        });

        return this.mapTicketDetail(updated, canViewRealStaffIdentity, includeInternalNotes);
    }

    async claimTicket(
        adminUserId: string,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const existing = await this.findTicketByIdOrNumber(id);

        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        if (
            existing.assignedAdminUserId &&
            existing.assignedAdminUserId !== adminUserId
        ) {
            throw new BadRequestException(
                "Ticket is already assigned. Use the assignment endpoint to transfer ownership.",
            );
        }

        return this.assignTicket(
            adminUserId,
            existing.id,
            { assignedAdminUserId: adminUserId },
            requestContext,
            {
                actionCode: "helpdesk.ticket.claim",
                actionLabel: "Claimed helpdesk ticket",
                expectedAssignedAdminUserId: existing.assignedAdminUserId ?? null,
            },
        );
    }

    async releaseTicket(
        adminUserId: string,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const existing = await this.findTicketByIdOrNumber(id);

        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        return this.assignTicket(
            adminUserId,
            existing.id,
            { assignedAdminUserId: undefined },
            requestContext,
            {
                actionCode: "helpdesk.ticket.release",
                actionLabel: "Released helpdesk ticket",
                expectedAssignedAdminUserId: existing.assignedAdminUserId ?? null,
            },
        );
    }

    async assignTicket(
        adminUserId: string,
        id: string,
        body: AssignHelpdeskTicketDto,
        requestContext?: AdminAuditRequestContext | null,
        auditAction?: {
            actionCode: string;
            actionLabel: string;
            expectedAssignedAdminUserId?: string | null;
        },
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const [canViewRealStaffIdentity, includeInternalNotes] = await Promise.all([
            this.canViewRealStaffIdentity(actor.role),
            this.canViewInternalNotes(actor.role),
        ]);

        if (body.assignedAdminUserId) {
            const assignedAdminUser = await this.prisma.adminUser.findUnique({
                where: { id: body.assignedAdminUserId },
                select: { id: true, isActive: true },
            });

            if (!assignedAdminUser || !assignedAdminUser.isActive) {
                throw new BadRequestException("Assigned admin user is invalid.");
            }
        }

        const existing = await this.findTicketByIdOrNumber(id);
        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        const currentAssignedAdminUserId = existing.assignedAdminUserId ?? null;
        const nextAssignedAdminUserId = body.assignedAdminUserId ?? null;

        if (currentAssignedAdminUserId === nextAssignedAdminUserId) {
            return this.mapTicketDetail(existing, canViewRealStaffIdentity, includeInternalNotes);
        }

        const auditActionCode = auditAction?.actionCode ?? "helpdesk.ticket.assign";
        const auditActionLabel = auditAction?.actionLabel ?? "Assigned helpdesk ticket";
        const expectedAssignedAdminUserId = auditAction?.expectedAssignedAdminUserId;

        const updated = await this.prisma.$transaction(async (tx) => {
            const assignmentWhere =
                expectedAssignedAdminUserId === undefined
                    ? { id: existing.id }
                    : { id: existing.id, assignedAdminUserId: expectedAssignedAdminUserId };

            const assignmentUpdate = await tx.helpdeskTicket.updateMany({
                where: assignmentWhere,
                data: {
                    assignedAdminUserId: nextAssignedAdminUserId,
                },
            });

            if (assignmentUpdate.count === 0) {
                throw new BadRequestException("Ticket assignment changed. Refresh and try again.");
            }

            const updatedTicket = await tx.helpdeskTicket.findUniqueOrThrow({
                where: { id: existing.id },
                include: this.ticketInclude(true),
            });

            await tx.helpdeskTicketEvent.create({
                data: {
                    ticketId: updatedTicket.id,
                    actorAdminUserId: adminUserId,
                    eventType: HelpdeskTicketEventType.ASSIGNED,
                    beforeJson: this.toJsonObject({
                        assignedAdminUserId: currentAssignedAdminUserId,
                    }),
                    afterJson: this.toJsonObject({
                        assignedAdminUserId: updatedTicket.assignedAdminUserId ?? null,
                    }),
                    metadataJson: this.toJsonObject({
                        actionCode: auditActionCode,
                    }),
                },
            });

            return updatedTicket;
        });

        await this.addAdminAuditLog({
            actorAdminUserId: adminUserId,
            ticket: updated,
            actionType: "UPDATE",
            actionCode: auditActionCode,
            actionLabel: auditActionLabel,
            beforeState: {
                assignedAdminUserId: currentAssignedAdminUserId,
            },
            afterState: {
                assignedAdminUserId: updated.assignedAdminUserId ?? null,
            },
            diff: {
                assignedAdminUserId: {
                    before: currentAssignedAdminUserId,
                    after: updated.assignedAdminUserId ?? null,
                },
            },
            requestContext,
        });

        return this.mapTicketDetail(updated, canViewRealStaffIdentity, includeInternalNotes);
    }

    async updateStatus(
        adminUserId: string,
        id: string,
        body: UpdateHelpdeskTicketStatusDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const permissions = await this.adminRolePermissions.getEffectivePermissions(actor.role);
        const canViewRealStaffIdentity = hasAdminPermission(
            permissions,
            ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
        );
        const includeInternalNotes = hasAdminPermission(
            permissions,
            ADMIN_PERMISSIONS.HELPDESK_VIEW_INTERNAL_NOTES,
        );
        const nextStatus = this.parseStatus(body.status);

        if (!nextStatus) {
            throw new BadRequestException("Ticket status is required.");
        }

        const existing = await this.findTicketByIdOrNumber(id);
        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        if (existing.status === nextStatus) {
            throw new BadRequestException("Ticket already has this status.");
        }

        const wasTerminal =
            existing.status === HelpdeskTicketStatus.CLOSED ||
            existing.status === HelpdeskTicketStatus.RESOLVED;
        const closing =
            nextStatus === HelpdeskTicketStatus.CLOSED ||
            nextStatus === HelpdeskTicketStatus.RESOLVED;
        const reopening = wasTerminal && !closing;

        if (
            reopening &&
            !hasAdminPermission(permissions, ADMIN_PERMISSIONS.HELPDESK_REOPEN)
        ) {
            throw new ForbiddenException("Admin does not have permission to reopen helpdesk tickets.");
        }

        if (
            !reopening &&
            !hasAdminPermission(permissions, ADMIN_PERMISSIONS.HELPDESK_CLOSE)
        ) {
            throw new ForbiddenException("Admin does not have permission to update helpdesk ticket status.");
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const updatedTicket = await tx.helpdeskTicket.update({
                where: { id: existing.id },
                data: {
                    status: nextStatus,
                    closedAt: closing ? new Date() : null,
                    closedByAdminUserId: closing ? adminUserId : null,
                },
                include: this.ticketInclude(true),
            });

            await tx.helpdeskTicketEvent.create({
                data: {
                    ticketId: updatedTicket.id,
                    actorAdminUserId: adminUserId,
                    eventType:
                        nextStatus === HelpdeskTicketStatus.CLOSED
                            ? HelpdeskTicketEventType.CLOSED
                            : reopening
                                ? HelpdeskTicketEventType.REOPENED
                                : nextStatus === HelpdeskTicketStatus.ESCALATED
                                    ? HelpdeskTicketEventType.ESCALATED
                                    : HelpdeskTicketEventType.STATUS_CHANGED,
                    beforeJson: this.toJsonObject({ status: existing.status }),
                    afterJson: this.toJsonObject({ status: updatedTicket.status }),
                },
            });

            return updatedTicket;
        });

        await this.addAdminAuditLog({
            actorAdminUserId: adminUserId,
            ticket: updated,
            actionType: "STATUS_CHANGE",
            actionCode: "helpdesk.ticket.status.update",
            actionLabel: "Updated helpdesk ticket status",
            beforeState: { status: existing.status },
            afterState: { status: updated.status },
            diff: { status: { before: existing.status, after: updated.status } },
            requestContext,
        });

        return this.mapTicketDetail(updated, canViewRealStaffIdentity, includeInternalNotes);
    }

    async updatePriority(
        adminUserId: string,
        id: string,
        body: UpdateHelpdeskTicketPriorityDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const [canViewRealStaffIdentity, includeInternalNotes] = await Promise.all([
            this.canViewRealStaffIdentity(actor.role),
            this.canViewInternalNotes(actor.role),
        ]);
        const nextPriority = this.parsePriority(body.priority);

        if (!nextPriority) {
            throw new BadRequestException("Ticket priority is required.");
        }

        const existing = await this.findTicketByIdOrNumber(id);
        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const updatedTicket = await tx.helpdeskTicket.update({
                where: { id: existing.id },
                data: { priority: nextPriority },
                include: this.ticketInclude(true),
            });

            await tx.helpdeskTicketEvent.create({
                data: {
                    ticketId: updatedTicket.id,
                    actorAdminUserId: adminUserId,
                    eventType: HelpdeskTicketEventType.PRIORITY_CHANGED,
                    beforeJson: this.toJsonObject({ priority: existing.priority }),
                    afterJson: this.toJsonObject({ priority: updatedTicket.priority }),
                },
            });

            return updatedTicket;
        });

        await this.addAdminAuditLog({
            actorAdminUserId: adminUserId,
            ticket: updated,
            actionType: "UPDATE",
            actionCode: "helpdesk.ticket.priority.update",
            actionLabel: "Updated helpdesk ticket priority",
            beforeState: { priority: existing.priority },
            afterState: { priority: updated.priority },
            diff: { priority: { before: existing.priority, after: updated.priority } },
            requestContext,
        });

        return this.mapTicketDetail(updated, canViewRealStaffIdentity, includeInternalNotes);
    }

    async updateHelpdeskCategoryRecord(
        adminUserId: string,
        id: string,
        body: UpdateHelpdeskCategoryDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const existing = await this.prisma.helpdeskCategory.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException("Helpdesk category not found.");
        }

        if (body.isActive !== undefined) {
            throw new BadRequestException(
                "Use the deactivate or restore category endpoints to change category availability.",
            );
        }

        const nextName = body.name === undefined ? undefined : body.name.trim();
        if (body.name !== undefined && !nextName) {
            throw new BadRequestException("Category name is required.");
        }

        const category = await this.prisma.helpdeskCategory.update({
            where: { id },
            data: {
                ...(nextName !== undefined ? { name: nextName } : {}),
                ...(body.description !== undefined
                    ? { description: this.normalizeOptionalString(body.description) }
                    : {}),
                ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
            },
        });

        const auditContext = this.normalizeAuditContext(requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: adminUserId,
            actionType: "UPDATE",
            actionCode: "helpdesk.category.update",
            actionLabel: "Updated helpdesk category",
            resourceType: "HELPDESK_CATEGORY",
            resourceId: category.id,
            target: {
                id: category.id,
                name: category.name,
                type: "HELPDESK_CATEGORY",
            },
            requestPath: auditContext.requestPath,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            deviceLabel: auditContext.deviceLabel,
            metadata: {
                key: category.key,
                before: {
                    name: existing.name,
                    description: existing.description,
                    isActive: existing.isActive,
                    sortOrder: existing.sortOrder,
                },
                after: {
                    name: category.name,
                    description: category.description,
                    isActive: category.isActive,
                    sortOrder: category.sortOrder,
                },
            },
        });

        return { success: true, item: this.mapCategory(category) };
    }

    async deactivateHelpdeskCategoryRecord(
        adminUserId: string,
        id: string,
        body: DeactivateHelpdeskCategoryDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const existing = await this.prisma.helpdeskCategory.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException("Helpdesk category not found.");
        }

        if (!existing.isActive) {
            return { success: true, item: this.mapCategory(existing) };
        }

        const category = await this.prisma.helpdeskCategory.update({
            where: { id },
            data: { isActive: false },
        });

        const auditContext = this.normalizeAuditContext(requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: adminUserId,
            actionType: "UPDATE",
            actionCode: "helpdesk.category.deactivate",
            actionLabel: "Deactivated helpdesk category",
            resourceType: "HELPDESK_CATEGORY",
            resourceId: category.id,
            target: {
                id: category.id,
                name: category.name,
                type: "HELPDESK_CATEGORY",
            },
            requestPath: auditContext.requestPath,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            deviceLabel: auditContext.deviceLabel,
            metadata: {
                key: category.key,
                reason: this.normalizeOptionalString(body.reason),
            },
        });

        return { success: true, item: this.mapCategory(category) };
    }

    async restoreHelpdeskCategoryRecord(
        adminUserId: string,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const existing = await this.prisma.helpdeskCategory.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException("Helpdesk category not found.");
        }

        if (existing.isActive) {
            return { success: true, item: this.mapCategory(existing) };
        }

        const category = await this.prisma.helpdeskCategory.update({
            where: { id },
            data: { isActive: true },
        });

        const auditContext = this.normalizeAuditContext(requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: adminUserId,
            actionType: "UPDATE",
            actionCode: "helpdesk.category.restore",
            actionLabel: "Restored helpdesk category",
            resourceType: "HELPDESK_CATEGORY",
            resourceId: category.id,
            target: {
                id: category.id,
                name: category.name,
                type: "HELPDESK_CATEGORY",
            },
            requestPath: auditContext.requestPath,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            deviceLabel: auditContext.deviceLabel,
            metadata: {
                key: category.key,
            },
        });

        return { success: true, item: this.mapCategory(category) };
    }

    async updateCategory(
        adminUserId: string,
        id: string,
        body: UpdateHelpdeskTicketCategoryDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const [canViewRealStaffIdentity, includeInternalNotes] = await Promise.all([
            this.canViewRealStaffIdentity(actor.role),
            this.canViewInternalNotes(actor.role),
        ]);

        if (body.categoryId) {
            const category = await this.prisma.helpdeskCategory.findFirst({
                where: { id: body.categoryId },
                select: { id: true },
            });

            if (!category) {
                throw new BadRequestException("Helpdesk category is invalid.");
            }
        }

        const existing = await this.findTicketByIdOrNumber(id);
        if (!existing) {
            throw new NotFoundException("Helpdesk ticket not found.");
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const updatedTicket = await tx.helpdeskTicket.update({
                where: { id: existing.id },
                data: { categoryId: body.categoryId ?? null },
                include: this.ticketInclude(true),
            });

            await tx.helpdeskTicketEvent.create({
                data: {
                    ticketId: updatedTicket.id,
                    actorAdminUserId: adminUserId,
                    eventType: HelpdeskTicketEventType.CATEGORY_CHANGED,
                    beforeJson: this.toJsonObject({ categoryId: existing.categoryId ?? null }),
                    afterJson: this.toJsonObject({ categoryId: updatedTicket.categoryId ?? null }),
                },
            });

            return updatedTicket;
        });

        await this.addAdminAuditLog({
            actorAdminUserId: adminUserId,
            ticket: updated,
            actionType: "UPDATE",
            actionCode: "helpdesk.ticket.category.update",
            actionLabel: "Updated helpdesk ticket category",
            beforeState: { categoryId: existing.categoryId ?? null },
            afterState: { categoryId: updated.categoryId ?? null },
            diff: {
                categoryId: {
                    before: existing.categoryId ?? null,
                    after: updated.categoryId ?? null,
                },
            },
            requestContext,
        });

        return this.mapTicketDetail(updated, canViewRealStaffIdentity, includeInternalNotes);
    }
}

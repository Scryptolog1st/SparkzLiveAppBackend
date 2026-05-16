import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import {
    AdminAuditActionType,
    AdminAuditSeverity,
    AdminAuditStatus,
    AdminRole,
    Prisma,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { AdminAuditQueryDto } from "./dto/admin-audit-query.dto";

type JsonRecord = Record<string, unknown>;

export type AdminAuditLogWriteInput = {
    actorAdminUserId: string;

    actionType: keyof typeof AdminAuditActionType | AdminAuditActionType;
    actionCode: string;
    actionLabel: string;

    resourceType: string;
    resourceId?: string | null;

    status?: keyof typeof AdminAuditStatus | AdminAuditStatus;
    severity?: keyof typeof AdminAuditSeverity | AdminAuditSeverity;

    target?: {
        id: string;
        name?: string | null;
        type?: string | null;
    } | null;

    secondaryIdentifiers?: Record<string, string | null | undefined> | null;

    references?: {
        targetUserId?: string | null;
        targetStreamId?: string | null;
        targetReportId?: string | null;
        targetPayoutRequestId?: string | null;
        targetSupportTicketId?: string | null;
    } | null;

    requestPath?: string | null;
    ipAddress?: string | null;
    locationLabel?: string | null;
    deviceLabel?: string | null;
    userAgent?: string | null;

    beforeState?: JsonRecord | null;
    afterState?: JsonRecord | null;
    diff?: JsonRecord | null;
    metadata?: JsonRecord | null;
    rawEvent?: JsonRecord | null;
};

@Injectable()
export class AdminAuditService {
    constructor(private readonly prisma: PrismaService) { }

    private readonly actionTypes = Object.values(AdminAuditActionType);
    private readonly statuses = Object.values(AdminAuditStatus);
    private readonly severities = Object.values(AdminAuditSeverity);
    private readonly roles = Object.values(AdminRole);

    private normalizePage(value: string | number | undefined, fallback: number) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return fallback;
        }

        return Math.floor(parsed);
    }

    private normalizePageSize(
        value: string | number | undefined,
        fallback: number,
    ) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return fallback;
        }

        return Math.min(100, Math.floor(parsed));
    }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private isUuid(value?: string | null) {
        const normalized = String(value || "").trim();

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            normalized,
        );
    }

    private normalizeStringRecord(
        value?: Record<string, string | null | undefined> | null,
    ) {
        if (!value) {
            return {};
        }

        const output: Record<string, string | null> = {};

        for (const [key, item] of Object.entries(value)) {
            const normalizedKey = String(key || "").trim();
            if (!normalizedKey) {
                continue;
            }

            const normalizedValue = this.normalizeOptionalString(item);
            output[normalizedKey] = normalizedValue;
        }

        return output;
    }

    private normalizeJsonObject(value?: JsonRecord | null) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return undefined;
        }

        return value as Prisma.InputJsonValue;
    }

    private parseActionType(
        value?: string | AdminAuditActionType | null,
        fallback: AdminAuditActionType = AdminAuditActionType.UPDATE,
    ) {
        const normalized = String(value || fallback).trim().toUpperCase();

        if (!this.actionTypes.includes(normalized as AdminAuditActionType)) {
            return fallback;
        }

        return normalized as AdminAuditActionType;
    }

    private parseStatus(
        value?: string | AdminAuditStatus | null,
        fallback: AdminAuditStatus = AdminAuditStatus.SUCCESS,
    ) {
        const normalized = String(value || fallback).trim().toUpperCase();

        if (!this.statuses.includes(normalized as AdminAuditStatus)) {
            return fallback;
        }

        return normalized as AdminAuditStatus;
    }

    private parseSeverity(
        value?: string | AdminAuditSeverity | null,
        fallback: AdminAuditSeverity = AdminAuditSeverity.INFO,
    ) {
        const normalized = String(value || fallback).trim().toUpperCase();

        if (!this.severities.includes(normalized as AdminAuditSeverity)) {
            return fallback;
        }

        return normalized as AdminAuditSeverity;
    }

    private parseRole(value?: string | null) {
        const normalized = String(value || "").trim().toUpperCase();

        if (!normalized) {
            return undefined;
        }

        if (!this.roles.includes(normalized as AdminRole)) {
            return undefined;
        }

        return normalized as AdminRole;
    }

    private parseDate(value?: string | null) {
        const normalized = String(value || "").trim();
        if (!normalized) {
            return null;
        }

        const parsed = new Date(normalized);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed;
    }

    private resolveDateRange(query: AdminAuditQueryDto) {
        const explicitFrom = this.parseDate(query.from);
        const explicitTo = this.parseDate(query.to);

        if (explicitFrom || explicitTo) {
            return {
                from: explicitFrom,
                to: explicitTo,
            };
        }

        const now = new Date();
        const range = String(query.timeRange || "all").trim().toLowerCase();

        if (range === "24h") {
            return {
                from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                to: null,
            };
        }

        if (range === "7d") {
            return {
                from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                to: null,
            };
        }

        if (range === "30d") {
            return {
                from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                to: null,
            };
        }

        return {
            from: null,
            to: null,
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

    private appendAdminAuditAnd(
        where: Prisma.AdminAuditLogWhereInput,
        clause: Prisma.AdminAuditLogWhereInput,
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

    private buildWhere(query: AdminAuditQueryDto): Prisma.AdminAuditLogWhereInput {
        const where: Prisma.AdminAuditLogWhereInput = {};
        const search = this.normalizeOptionalString(query.search);
        const action = this.normalizeOptionalString(query.action);
        const actorId = this.normalizeOptionalString(query.actorId);
        const resourceId = this.normalizeOptionalString(query.resourceId);
        const targetId = this.normalizeOptionalString(query.targetId);
        const role = this.parseRole(query.role);
        const resourceType = this.normalizeOptionalString(query.resourceType);

        const status = this.normalizeOptionalString(query.status)
            ? this.parseStatus(query.status)
            : undefined;

        const severity = this.normalizeOptionalString(query.severity)
            ? this.parseSeverity(query.severity)
            : undefined;

        const actionType = this.normalizeOptionalString(query.actionType)
            ? this.parseActionType(query.actionType)
            : undefined;

        const actionScope = String(query.actionScope || "all").trim().toLowerCase();
        const { from, to } = this.resolveDateRange(query);

        if (role) {
            where.actorRole = role;
        }

        if (resourceType) {
            where.resourceType = resourceType;
        }

        if (status) {
            where.status = status;
        }

        if (severity) {
            where.severity = severity;
        }

        if (actionType) {
            where.actionType = actionType;
        }

        if (actionScope === "views_only") {
            where.actionType = AdminAuditActionType.VIEW;
        }

        if (actionScope === "mutations_only") {
            where.actionType = {
                not: AdminAuditActionType.VIEW,
            };
        }

        if (actorId) {
            where.actorAdminUserId = actorId;
        }

        if (resourceId) {
            where.resourceId = resourceId;
        }

        if (targetId && this.isUuid(targetId)) {
            this.appendAdminAuditAnd(where, {
                OR: [
                    { targetUserId: targetId },
                    { targetStreamId: targetId },
                    { targetReportId: targetId },
                    { targetPayoutRequestId: targetId },
                    { targetSupportTicketId: targetId },
                ],
            });
        }

        if (action) {
            this.appendAdminAuditAnd(where, {
                OR: [
                    {
                        actionCode: {
                            contains: action,
                            mode: "insensitive",
                        },
                    },
                    {
                        actionLabel: {
                            contains: action,
                            mode: "insensitive",
                        },
                    },
                ],
            });
        }

        if (search) {
            const searchOr: Prisma.AdminAuditLogWhereInput[] = [
                {
                    actorEmail: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    actorName: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    actionCode: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    actionLabel: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    resourceType: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    resourceId: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    requestPath: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    ipAddress: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    locationLabel: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    deviceLabel: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    userAgent: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            ];

            if (this.isUuid(search)) {
                searchOr.push(
                    { id: search },
                    { actorAdminUserId: search },
                    { targetUserId: search },
                    { targetStreamId: search },
                    { targetReportId: search },
                    { targetPayoutRequestId: search },
                    { targetSupportTicketId: search },
                );
            }

            this.appendAdminAuditAnd(where, {
                OR: searchOr,
            });
        }
        if (from || to) {
            where.createdAt = {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
            };
        }

        return where;
    }

    private toListItem(row: any) {
        return {
            id: row.id,
            timestamp: row.createdAt.toISOString(),
            severity: String(row.severity || "INFO").toLowerCase(),
            actionType: row.actionType,
            actionCode: row.actionCode,
            actionLabel: row.actionLabel,
            resourceType: row.resourceType,
            resourceId: row.resourceId ?? null,
            status: row.status,

            actor: {
                id: row.actorAdminUserId,
                name: row.actorName,
                email: row.actorEmail,
                role: row.actorRole,
                avatar: null,
            },

            target: (row.targetSummaryJson as Record<string, unknown> | null) ?? null,

            ip: row.ipAddress ?? null,
            location: row.locationLabel ?? null,
            device: row.deviceLabel ?? null,
            requestPath: row.requestPath ?? null,

            metadata: (row.metadataJson as Record<string, unknown> | null) ?? {},
            secondaryIdentifiers:
                (row.secondaryIdentifiersJson as Record<string, string | null> | null) ?? {},
            references:
                (row.referencesJson as Record<string, string | null> | null) ?? {
                    adminUserId: row.actorAdminUserId,
                    targetUserId: row.targetUserId ?? null,
                    targetStreamId: row.targetStreamId ?? null,
                    targetReportId: row.targetReportId ?? null,
                    targetPayoutRequestId: row.targetPayoutRequestId ?? null,
                    targetSupportTicketId: row.targetSupportTicketId ?? null,
                },
        };
    }

    private toDetailItem(row: any) {
        return {
            ...this.toListItem(row),
            beforeState: (row.beforeStateJson as Record<string, unknown> | null) ?? null,
            afterState: (row.afterStateJson as Record<string, unknown> | null) ?? null,
            diff: (row.diffJson as Record<string, unknown> | null) ?? null,
            userAgent: row.userAgent ?? null,
            rawEvent: (row.rawEventJson as Record<string, unknown> | null) ?? null,
        };
    }

    async getSummary(adminUserId: string) {
        await this.requireAdmin(adminUserId);

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [
            actionsLogged24h,
            uniqueActorsRows,
            highSensitivity24h,
            privilegedViews24h,
            deniedActions24h,
            failedActions24h,
        ] = await this.prisma.$transaction([
            this.prisma.adminAuditLog.count({
                where: {
                    createdAt: {
                        gte: since,
                    },
                },
            }),
            this.prisma.adminAuditLog.groupBy({
                by: ["actorAdminUserId"],
                where: {
                    createdAt: {
                        gte: since,
                    },
                },
                orderBy: {
                    actorAdminUserId: "asc",
                },
            }),
            this.prisma.adminAuditLog.count({
                where: {
                    createdAt: {
                        gte: since,
                    },
                    OR: [
                        {
                            severity: {
                                in: [AdminAuditSeverity.WARNING, AdminAuditSeverity.CRITICAL],
                            },
                        },
                        {
                            actionType: {
                                in: [
                                    AdminAuditActionType.MODERATION_ACTION,
                                    AdminAuditActionType.SYSTEM_ACTION,
                                    AdminAuditActionType.PERMISSION_ACTION,
                                ],
                            },
                        },
                    ],
                },
            }),
            this.prisma.adminAuditLog.count({
                where: {
                    createdAt: {
                        gte: since,
                    },
                    actionType: AdminAuditActionType.VIEW,
                },
            }),
            this.prisma.adminAuditLog.count({
                where: {
                    createdAt: {
                        gte: since,
                    },
                    status: AdminAuditStatus.DENIED,
                },
            }),
            this.prisma.adminAuditLog.count({
                where: {
                    createdAt: {
                        gte: since,
                    },
                    status: AdminAuditStatus.FAILED,
                },
            }),
        ]);

        return {
            generatedAt: new Date().toISOString(),
            counts: {
                actionsLogged24h,
                uniqueActors24h: uniqueActorsRows.length,
                highSensitivity24h,
                privilegedViews24h,
                deniedActions24h,
                failedActions24h,
            },
        };
    }

    async list(adminUserId: string, query: AdminAuditQueryDto = {}) {
        await this.requireAdmin(adminUserId);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const where = this.buildWhere(query);
        const sort = String(query.sort || "newest").trim().toLowerCase();

        const [items, total] = await this.prisma.$transaction([
            this.prisma.adminAuditLog.findMany({
                where,
                orderBy: {
                    createdAt: sort === "oldest" ? "asc" : "desc",
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.adminAuditLog.count({ where }),
        ]);

        return {
            items: items.map((item: any) => this.toListItem(item)),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            filters: {
                search: this.normalizeOptionalString(query.search),
                actionScope: String(query.actionScope || "all").trim().toLowerCase(),
                actionType: this.normalizeOptionalString(query.actionType) ?? "all",
                resourceType: this.normalizeOptionalString(query.resourceType) ?? "all",
                severity: this.normalizeOptionalString(query.severity) ?? "all",
                status: this.normalizeOptionalString(query.status) ?? "all",
                role: this.normalizeOptionalString(query.role) ?? "all",
                sort,
                timeRange: this.normalizeOptionalString(query.timeRange) ?? "all",
                action: this.normalizeOptionalString(query.action),
                actorId: this.normalizeOptionalString(query.actorId),
                resourceId: this.normalizeOptionalString(query.resourceId),
                targetId: this.normalizeOptionalString(query.targetId),
                from: this.normalizeOptionalString(query.from),
                to: this.normalizeOptionalString(query.to),
            },
        };
    }

    async getById(adminUserId: string, auditLogId: string) {
        await this.requireAdmin(adminUserId);

        const row = await this.prisma.adminAuditLog.findUnique({
            where: { id: auditLogId },
        });

        if (!row) {
            throw new NotFoundException("Audit log entry not found.");
        }

        return {
            item: this.toDetailItem(row),
        };
    }

    async exportCsv(adminUserId: string, query: AdminAuditQueryDto = {}) {
        const result = await this.list(adminUserId, query);

        const headers = [
            "Audit ID",
            "Timestamp",
            "Severity",
            "Action Type",
            "Action Code",
            "Action Label",
            "Status",
            "Actor ID",
            "Actor Email",
            "Actor Name",
            "Actor Role",
            "Resource Type",
            "Resource ID",
            "Target User ID",
            "Target Stream ID",
            "Target Report ID",
            "Target Payout Request ID",
            "Target Support Ticket ID",
            "Request Path",
            "IP Address",
            "Location",
            "Device",
        ];

        const rows = result.items.map((item: any) => [
            item.id,
            item.timestamp,
            item.severity,
            item.actionType,
            item.actionCode,
            item.actionLabel,
            item.status,
            item.actor.id,
            item.actor.email,
            item.actor.name,
            item.actor.role,
            item.resourceType,
            item.resourceId ?? "",
            item.references.targetUserId ?? "",
            item.references.targetStreamId ?? "",
            item.references.targetReportId ?? "",
            item.references.targetPayoutRequestId ?? "",
            item.references.targetSupportTicketId ?? "",
            item.requestPath ?? "",
            item.ip ?? "",
            item.location ?? "",
            item.device ?? "",
        ]);

        return [
            headers.join(","),
            ...rows.map((row: any[]) =>
                row.map((value: any) => `"${String(value).replace(/"/g, '""')}"`).join(","),
            ),
        ].join("\n");
    }

    async logEvent(input: AdminAuditLogWriteInput) {
        const actor = await this.requireAdmin(input.actorAdminUserId);

        const targetSummary = input.target
            ? {
                id: this.normalizeOptionalString(input.target.id) ?? "",
                name: this.normalizeOptionalString(input.target.name) ?? null,
                type: this.normalizeOptionalString(input.target.type) ?? null,
            }
            : null;

        const references = {
            adminUserId: actor.id,
            targetUserId: this.normalizeOptionalString(input.references?.targetUserId),
            targetStreamId: this.normalizeOptionalString(input.references?.targetStreamId),
            targetReportId: this.normalizeOptionalString(input.references?.targetReportId),
            targetPayoutRequestId: this.normalizeOptionalString(
                input.references?.targetPayoutRequestId,
            ),
            targetSupportTicketId: this.normalizeOptionalString(
                input.references?.targetSupportTicketId,
            ),
        };

        return this.prisma.adminAuditLog.create({
            data: {
                actorAdminUserId: actor.id,
                actorEmail: actor.email,
                actorName: actor.name,
                actorRole: actor.role,

                actionType: this.parseActionType(input.actionType),
                actionCode: this.normalizeOptionalString(input.actionCode) ?? "unknown.action",
                actionLabel:
                    this.normalizeOptionalString(input.actionLabel) ?? "Unknown Action",

                resourceType:
                    this.normalizeOptionalString(input.resourceType) ?? "System",
                resourceId: this.normalizeOptionalString(input.resourceId),

                status: this.parseStatus(input.status),
                severity: this.parseSeverity(input.severity),

                targetUserId: references.targetUserId,
                targetStreamId: references.targetStreamId,
                targetReportId: references.targetReportId,
                targetPayoutRequestId: references.targetPayoutRequestId,
                targetSupportTicketId: references.targetSupportTicketId,

                targetSummaryJson: targetSummary
                    ? (targetSummary as Prisma.InputJsonValue)
                    : undefined,
                secondaryIdentifiersJson: this.normalizeJsonObject(
                    this.normalizeStringRecord(input.secondaryIdentifiers),
                ),
                referencesJson: this.normalizeJsonObject(references),

                requestPath: this.normalizeOptionalString(input.requestPath),
                ipAddress: this.normalizeOptionalString(input.ipAddress),
                locationLabel: this.normalizeOptionalString(input.locationLabel),
                deviceLabel: this.normalizeOptionalString(input.deviceLabel),
                userAgent: this.normalizeOptionalString(input.userAgent),

                beforeStateJson: this.normalizeJsonObject(input.beforeState),
                afterStateJson: this.normalizeJsonObject(input.afterState),
                diffJson: this.normalizeJsonObject(input.diff),
                metadataJson: this.normalizeJsonObject(input.metadata),
                rawEventJson: this.normalizeJsonObject(input.rawEvent),
            },
        });
    }
}
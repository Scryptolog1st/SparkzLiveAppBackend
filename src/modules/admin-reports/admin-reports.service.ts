import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import {
    AdminRole,
    Prisma,
    ReportAuditAction,
    ReportReasonCode,
    ReportStatus,
    ReportTargetType,
} from "@prisma/client";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import {
    ADMIN_PERMISSIONS,
    hasAdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import {
    AddAdminReportNoteDto,
    AdminReportsQueryDto,
    AssignAdminReportDto,
    BulkAdminReportStatusDto,
    SearchAdminReportAssigneesDto,
    UpdateAdminReportStatusDto,
} from "./dto/admin-reports.dto";

type AdminAuditRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

@Injectable()
export class AdminReportsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly adminAudit: AdminAuditService,
        private readonly adminRolePermissions: AdminRolePermissionsService,
    ) { }

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

    private normalizeIdList(values: string[] | undefined | null) {
        return Array.from(
            new Set(
                (values || [])
                    .map((value) => String(value || "").trim())
                    .filter(Boolean),
            ),
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

    private parseStatus(raw?: string) {
        const value = String(raw || "").trim().toUpperCase();

        if (!value) {
            return undefined;
        }

        if (!Object.values(ReportStatus).includes(value as ReportStatus)) {
            throw new BadRequestException("Invalid report status.");
        }

        return value as ReportStatus;
    }

    private parseTargetType(raw?: string) {
        const value = String(raw || "").trim().toUpperCase();

        if (!value) {
            return undefined;
        }

        if (!Object.values(ReportTargetType).includes(value as ReportTargetType)) {
            throw new BadRequestException("Invalid report target type.");
        }

        return value as ReportTargetType;
    }

    private parseReasonCode(raw?: string) {
        const value = String(raw || "").trim().toUpperCase();

        if (!value) {
            return undefined;
        }

        if (!Object.values(ReportReasonCode).includes(value as ReportReasonCode)) {
            throw new BadRequestException("Invalid report reason code.");
        }

        return value as ReportReasonCode;
    }

    private parseAssignment(raw?: string) {
        const value = String(raw || "any").trim().toLowerCase();

        if (value !== "any" && value !== "assigned" && value !== "unassigned") {
            throw new BadRequestException("Invalid report assignment filter.");
        }

        return value as "any" | "assigned" | "unassigned";
    }

    private parseSort(raw?: string) {
        const value = String(raw || "newest").trim().toLowerCase();

        if (value !== "newest" && value !== "oldest" && value !== "updated") {
            throw new BadRequestException("Invalid report sort.");
        }

        return value as "newest" | "oldest" | "updated";
    }

    private parseNextStatus(raw: string) {
        const value = String(raw || "").trim().toUpperCase();

        if (
            value !== ReportStatus.IN_REVIEW &&
            value !== ReportStatus.RESOLVED &&
            value !== ReportStatus.DISMISSED &&
            value !== ReportStatus.ESCALATED
        ) {
            throw new BadRequestException("Invalid report status transition.");
        }

        return value as
            | "IN_REVIEW"
            | "RESOLVED"
            | "DISMISSED"
            | "ESCALATED";
    }

    private getAdminRoleLabel(role?: AdminRole | string | null) {
        switch (role) {
            case "SUPER_ADMIN":
                return "Super Admin Agent";
            case "ADMIN":
                return "Admin Agent";
            case "MODERATOR":
                return "Moderator Agent";
            case "ANALYST":
                return "Analyst Agent";
            default:
                return "Staff Agent";
        }
    }

    private getAnonymousStaffSuffix(id?: string | null) {
        const normalized = String(id || "").replace(/[^a-zA-Z0-9]/g, "");

        if (!normalized) {
            return "UNKNOWN";
        }

        return normalized.slice(-6).toUpperCase();
    }

    private getAnonymousStaffLabel(adminUser: any) {
        return `${this.getAdminRoleLabel(adminUser?.role)} ${this.getAnonymousStaffSuffix(adminUser?.id)}`;
    }

    private async canViewRealReportStaffIdentity(role: AdminRole) {
        const permissions = await this.adminRolePermissions.getEffectivePermissions(role);

        return (
            hasAdminPermission(
                permissions,
                ADMIN_PERMISSIONS.ADMIN_IDENTITY_VIEW_REAL_STAFF,
            ) ||
            hasAdminPermission(
                permissions,
                ADMIN_PERMISSIONS.AUDIT_IDENTITY_VIEW_REAL_STAFF,
            ) ||
            hasAdminPermission(
                permissions,
                ADMIN_PERMISSIONS.REPORTS_IDENTITY_VIEW_REAL_STAFF,
            )
        );
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
            const anonymousName = this.getAnonymousStaffLabel(adminUser);

            return {
                id: adminUser.id,
                email: "hidden",
                name: anonymousName,
                displayName: anonymousName,
                displayEmail: "Hidden",
                role: adminUser.role,
                isActive: adminUser.isActive,
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

    private mapStream(stream: any) {
        if (!stream) {
            return null;
        }

        return {
            id: stream.id,
            title: stream.title,
            status: stream.status,
            startedAt: stream.startedAt ? stream.startedAt.toISOString() : null,
            endedAt: stream.endedAt ? stream.endedAt.toISOString() : null,
            hostUserId: stream.hostUserId,
            host: stream.host ? this.mapUser(stream.host) : null,
        };
    }

    private mapChatMessage(message: any) {
        if (!message) {
            return null;
        }

        return {
            id: message.id,
            text: message.text,
            createdAt: message.createdAt.toISOString(),
            user: message.user ? this.mapUser(message.user) : null,
            stream: message.stream ? this.mapStream(message.stream) : null,
        };
    }

    private mapDirectMessage(message: any) {
        if (!message) {
            return null;
        }

        return {
            id: message.id,
            messageType: message.messageType,
            text: message.text ?? null,
            mediaUrl: message.mediaUrl ?? null,
            isRead: message.isRead,
            createdAt: message.createdAt.toISOString(),
            sender: message.sender ? this.mapUser(message.sender) : null,
            conversation: message.conversation
                ? {
                    id: message.conversation.id,
                    participant1: message.conversation.participant1
                        ? this.mapUser(message.conversation.participant1)
                        : null,
                    participant2: message.conversation.participant2
                        ? this.mapUser(message.conversation.participant2)
                        : null,
                }
                : null,
        };
    }

    private mapRestriction(row: any) {
        return {
            id: row.id,
            kind: row.kind,
            reason: row.reason ?? null,
            createdAt: row.createdAt.toISOString(),
            expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
            stream: row.stream ? this.mapStream(row.stream) : null,
            createdBy: row.createdBy ? this.mapUser(row.createdBy) : null,
        };
    }

    private mapModerationAction(row: any) {
        return {
            id: row.id,
            action: row.action,
            reason: row.reason ?? null,
            createdAt: row.createdAt.toISOString(),
            expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
            durationSeconds: row.durationSeconds ?? null,
            stream: row.stream ? this.mapStream(row.stream) : null,
            actor: row.actor ? this.mapUser(row.actor) : null,
            target: row.target ? this.mapUser(row.target) : null,
        };
    }

    private mapAuditLog(row: any, canViewRealStaffIdentity = false) {
        return {
            id: row.id,
            action: row.action,
            note: row.note ?? null,
            createdAt: row.createdAt.toISOString(),
            actorAdminUser: row.actorAdminUser
                ? this.mapAdminUser(row.actorAdminUser, canViewRealStaffIdentity)
                : null,
        };
    }

    private mapReportListItem(report: any, canViewRealStaffIdentity = false) {
        return {
            id: report.id,
            targetType: report.targetType,
            reasonCode: report.reasonCode,
            description: report.description ?? null,
            status: report.status,
            createdAt: report.createdAt.toISOString(),
            updatedAt: report.updatedAt.toISOString(),
            resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
            reporter: report.reporter ? this.mapUser(report.reporter) : null,
            assignedAdminUser: report.assignedAdminUser
                ? this.mapAdminUser(report.assignedAdminUser, canViewRealStaffIdentity)
                : null,
            targetUser: report.targetUser ? this.mapUser(report.targetUser) : null,
            targetStream: report.targetStream ? this.mapStream(report.targetStream) : null,
            targetChatMessage: report.targetChatMessage
                ? this.mapChatMessage(report.targetChatMessage)
                : null,
            targetDmMessage: report.targetDmMessage
                ? this.mapDirectMessage(report.targetDmMessage)
                : null,
        };
    }

    private getPrimaryTargetUserId(report: any) {
        if (report.targetUserId) {
            return report.targetUserId;
        }

        if (report.targetStream?.hostUserId) {
            return report.targetStream.hostUserId;
        }

        if (report.targetChatMessage?.userId) {
            return report.targetChatMessage.userId;
        }

        if (report.targetDmMessage?.senderId) {
            return report.targetDmMessage.senderId;
        }

        return null;
    }

    private async addAuditLog(
        reportId: string,
        actorAdminUserId: string,
        action: ReportAuditAction,
        note?: string | null,
    ) {
        await this.prisma.reportAuditLog.create({
            data: {
                reportId,
                actorAdminUserId,
                action,
                note: this.normalizeOptionalString(note),
            },
        });
    }

    private async addGenericAuditLog(args: {
        actorAdminUserId: string;
        report: any;
        actionType: "VIEW" | "UPDATE" | "STATUS_CHANGE";
        actionCode: string;
        actionLabel: string;
        status?: "SUCCESS" | "DENIED" | "FAILED";
        severity?: "INFO" | "WARNING" | "CRITICAL";
        metadata?: Record<string, unknown> | null;
        beforeState?: Record<string, unknown> | null;
        afterState?: Record<string, unknown> | null;
        diff?: Record<string, unknown> | null;
        requestContext?: AdminAuditRequestContext | null;
    }) {
        const { report } = args;
        const requestContext = this.normalizeAuditContext(args.requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: args.actorAdminUserId,
            actionType: args.actionType,
            actionCode: args.actionCode,
            actionLabel: args.actionLabel,
            status: args.status ?? "SUCCESS",
            severity: args.severity ?? "INFO",
            resourceType: "REPORT",
            resourceId: report.id,
            target: {
                id: report.id,
                name: report.id,
                type: "REPORT",
            },
            references: {
                targetReportId: report.id,
                targetUserId: this.getPrimaryTargetUserId(report),
                targetStreamId:
                    report.targetStreamId ??
                    report.targetStream?.id ??
                    report.targetChatMessage?.stream?.id ??
                    null,
            },
            requestPath: requestContext.requestPath,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
            deviceLabel: requestContext.deviceLabel,
            metadata: {
                targetType: report.targetType ?? null,
                reasonCode: report.reasonCode ?? null,
                assignedAdminUserId:
                    report.assignedAdminUserId ??
                    report.assignedAdminUser?.id ??
                    null,
                status: report.status ?? null,
                ...(args.metadata || {}),
            },
            beforeState: args.beforeState ?? undefined,
            afterState: args.afterState ?? undefined,
            diff: args.diff ?? undefined,
        });
    }

    async searchAssignees(
        adminUserId: string,
        query: SearchAdminReportAssigneesDto = {},
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealReportStaffIdentity(
            actor.role,
        );

        const search = String(query.query || "").trim();

        if (!search) {
            return {
                items: [],
                query: "",
            };
        }

        const items = await this.prisma.adminUser.findMany({
            where: canViewRealStaffIdentity
                ? {
                    isActive: true,
                    OR: [
                        {
                            name: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            email: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    ],
                }
                : {
                    isActive: true,
                },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
            },
            orderBy: [{ role: "asc" }, { id: "asc" }],
            take: 10,
        });

        return {
            items: items.map((item) =>
                this.mapAdminUser(item, canViewRealStaffIdentity),
            ),
            query: search,
        };
    }

    async getSummary(adminUserId: string) {
        await this.requireAdmin(adminUserId);

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const [open, inReview, resolvedToday, dismissedToday, escalated, assigned, unassigned] =
            await Promise.all([
                this.prisma.report.count({
                    where: { status: ReportStatus.OPEN },
                }),
                this.prisma.report.count({
                    where: { status: ReportStatus.IN_REVIEW },
                }),
                this.prisma.report.count({
                    where: {
                        status: ReportStatus.RESOLVED,
                        resolvedAt: { gte: todayStart },
                    },
                }),
                this.prisma.report.count({
                    where: {
                        status: ReportStatus.DISMISSED,
                        resolvedAt: { gte: todayStart },
                    },
                }),
                this.prisma.report.count({
                    where: { status: ReportStatus.ESCALATED },
                }),
                this.prisma.report.count({
                    where: { assignedAdminUserId: { not: null } },
                }),
                this.prisma.report.count({
                    where: { assignedAdminUserId: null },
                }),
            ]);

        return {
            generatedAt: now.toISOString(),
            counts: {
                open,
                inReview,
                resolvedToday,
                dismissedToday,
                escalated,
                assigned,
                unassigned,
            },
        };
    }

    async list(adminUserId: string, query: AdminReportsQueryDto = {}) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealReportStaffIdentity(
            actor.role,
        );

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const status = this.parseStatus(query.status);
        const targetType = this.parseTargetType(query.targetType);
        const reasonCode = this.parseReasonCode(query.reasonCode);
        const assignment = this.parseAssignment(query.assignment);
        const sort = this.parseSort(query.sort);
        const search = String(query.search || "").trim();

        const andFilters: Prisma.ReportWhereInput[] = [];

        if (status) {
            andFilters.push({ status });
        }

        if (targetType) {
            andFilters.push({ targetType });
        }

        if (reasonCode) {
            andFilters.push({ reasonCode });
        }

        if (assignment === "assigned") {
            andFilters.push({
                assignedAdminUserId: { not: null },
            });
        } else if (assignment === "unassigned") {
            andFilters.push({
                assignedAdminUserId: null,
            });
        }

        if (search) {
            andFilters.push({
                OR: [
                    { id: { equals: search } },
                    {
                        description: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        reporter: {
                            is: {
                                username: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        reporter: {
                            is: {
                                email: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        reporter: {
                            is: {
                                publicId: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        reporter: {
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
                        targetUser: {
                            is: {
                                username: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        targetUser: {
                            is: {
                                email: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        targetUser: {
                            is: {
                                publicId: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        targetUser: {
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
                        targetStream: {
                            is: {
                                title: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        targetChatMessage: {
                            is: {
                                text: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                    {
                        targetDmMessage: {
                            is: {
                                text: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                ],
            });
        }

        const where: Prisma.ReportWhereInput =
            andFilters.length > 0 ? { AND: andFilters } : {};

        const orderBy: Prisma.ReportOrderByWithRelationInput[] =
            sort === "oldest"
                ? [{ createdAt: "asc" }]
                : sort === "updated"
                    ? [{ updatedAt: "desc" }]
                    : [{ createdAt: "desc" }];

        const [total, items] = await Promise.all([
            this.prisma.report.count({ where }),
            this.prisma.report.findMany({
                where,
                include: {
                    reporter: {
                        include: { profile: true },
                    },
                    assignedAdminUser: true,
                    targetUser: {
                        include: { profile: true },
                    },
                    targetStream: {
                        include: {
                            host: {
                                include: { profile: true },
                            },
                        },
                    },
                    targetChatMessage: {
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
                    },
                    targetDmMessage: {
                        include: {
                            sender: {
                                include: { profile: true },
                            },
                            conversation: {
                                include: {
                                    participant1: {
                                        include: { profile: true },
                                    },
                                    participant2: {
                                        include: { profile: true },
                                    },
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
            items: items.map((report) =>
                this.mapReportListItem(report, canViewRealStaffIdentity),
            ),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            filters: {
                search: search || null,
                status: status ?? "all",
                targetType: targetType ?? "all",
                reasonCode: reasonCode ?? "all",
                assignment,
                sort,
            },
        };
    }

    async getById(
        adminUserId: string,
        id: string,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealReportStaffIdentity(
            actor.role,
        );

        const report = await this.prisma.report.findUnique({
            where: { id },
            include: {
                reporter: {
                    include: { profile: true },
                },
                assignedAdminUser: true,
                targetUser: {
                    include: { profile: true },
                },
                targetStream: {
                    include: {
                        host: {
                            include: { profile: true },
                        },
                    },
                },
                targetChatMessage: {
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
                },
                targetDmMessage: {
                    include: {
                        sender: {
                            include: { profile: true },
                        },
                        conversation: {
                            include: {
                                participant1: {
                                    include: { profile: true },
                                },
                                participant2: {
                                    include: { profile: true },
                                },
                            },
                        },
                    },
                },
                auditLogs: {
                    include: {
                        actorAdminUser: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                },
            },
        });

        if (!report) {
            throw new NotFoundException("Report not found.");
        }

        const targetUserId = this.getPrimaryTargetUserId(report);

        const [activeRestrictions, recentModerationActions, relatedReports] =
            await Promise.all([
                targetUserId
                    ? this.prisma.streamUserRestriction.findMany({
                        where: {
                            userId: targetUserId,
                            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                        },
                        include: {
                            stream: {
                                include: {
                                    host: {
                                        include: { profile: true },
                                    },
                                },
                            },
                            createdBy: {
                                include: { profile: true },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 10,
                    })
                    : [],
                targetUserId
                    ? this.prisma.moderationAction.findMany({
                        where: {
                            targetUserId,
                        },
                        include: {
                            stream: {
                                include: {
                                    host: {
                                        include: { profile: true },
                                    },
                                },
                            },
                            actor: {
                                include: { profile: true },
                            },
                            target: {
                                include: { profile: true },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 10,
                    })
                    : [],
                targetUserId
                    ? this.prisma.report.findMany({
                        where: {
                            targetUserId,
                            id: { not: id },
                        },
                        include: {
                            reporter: {
                                include: { profile: true },
                            },
                            assignedAdminUser: true,
                            targetUser: {
                                include: { profile: true },
                            },
                            targetStream: {
                                include: {
                                    host: {
                                        include: { profile: true },
                                    },
                                },
                            },
                            targetChatMessage: {
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
                            },
                            targetDmMessage: {
                                include: {
                                    sender: {
                                        include: { profile: true },
                                    },
                                    conversation: {
                                        include: {
                                            participant1: {
                                                include: { profile: true },
                                            },
                                            participant2: {
                                                include: { profile: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                        take: 10,
                    })
                    : [],
            ]);

        await this.addGenericAuditLog({
            actorAdminUserId: adminUserId,
            report,
            actionType: "VIEW",
            actionCode: "report.view",
            actionLabel: "Viewed report details",
            metadata: {
                source: "admin_reports.getById",
            },
            requestContext,
        });

        return {
            item: this.mapReportListItem(report, canViewRealStaffIdentity),
            activeRestrictions: activeRestrictions.map((row) =>
                this.mapRestriction(row),
            ),
            recentModerationActions: recentModerationActions.map((row) =>
                this.mapModerationAction(row),
            ),
            auditLog: report.auditLogs.map((row) =>
                this.mapAuditLog(row, canViewRealStaffIdentity),
            ),
            relatedReports: relatedReports.map((row) =>
                this.mapReportListItem(row, canViewRealStaffIdentity),
            ),
        };
    }

    async updateStatus(
        adminUserId: string,
        id: string,
        body: UpdateAdminReportStatusDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealReportStaffIdentity(
            actor.role,
        );

        const nextStatus = this.parseNextStatus(body.status);

        const existing = await this.prisma.report.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                targetType: true,
                reasonCode: true,
                targetUserId: true,
                targetStreamId: true,
                assignedAdminUserId: true,
            },
        });

        if (!existing) {
            throw new NotFoundException("Report not found.");
        }

        const now = new Date();

        const updated = await this.prisma.report.update({
            where: { id },
            data: {
                status: nextStatus,
                resolutionNotes: this.normalizeOptionalString(body.resolutionNotes),
                resolvedAt:
                    nextStatus === ReportStatus.RESOLVED ||
                        nextStatus === ReportStatus.DISMISSED
                        ? now
                        : null,
            },
            include: {
                reporter: {
                    include: { profile: true },
                },
                assignedAdminUser: true,
                targetUser: {
                    include: { profile: true },
                },
                targetStream: {
                    include: {
                        host: {
                            include: { profile: true },
                        },
                    },
                },
                targetChatMessage: {
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
                },
                targetDmMessage: {
                    include: {
                        sender: {
                            include: { profile: true },
                        },
                        conversation: {
                            include: {
                                participant1: {
                                    include: { profile: true },
                                },
                                participant2: {
                                    include: { profile: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        await this.addAuditLog(
            id,
            adminUserId,
            nextStatus === ReportStatus.DISMISSED
                ? ReportAuditAction.DISMISSED
                : nextStatus === ReportStatus.ESCALATED
                    ? ReportAuditAction.ESCALATED
                    : ReportAuditAction.STATUS_CHANGED,
            body.resolutionNotes,
        );

        await this.addGenericAuditLog({
            actorAdminUserId: adminUserId,
            report: updated,
            actionType: "STATUS_CHANGE",
            actionCode: "report.status.update",
            actionLabel: "Updated report status",
            metadata: {
                resolutionNotes: this.normalizeOptionalString(body.resolutionNotes),
            },
            beforeState: {
                status: existing.status,
                assignedAdminUserId: existing.assignedAdminUserId ?? null,
            },
            afterState: {
                status: updated.status,
                assignedAdminUserId: updated.assignedAdminUser?.id ?? null,
            },
            diff: {
                status: {
                    before: existing.status,
                    after: updated.status,
                },
            },
            requestContext,
        });

        return {
            success: true,
            item: this.mapReportListItem(updated, canViewRealStaffIdentity),
        };
    }

    async assign(
        adminUserId: string,
        id: string,
        body: AssignAdminReportDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealReportStaffIdentity(
            actor.role,
        );

        if (body.assignedAdminUserId) {
            const assignedAdminUser = await this.prisma.adminUser.findUnique({
                where: { id: body.assignedAdminUserId },
                select: {
                    id: true,
                    isActive: true,
                },
            });

            if (!assignedAdminUser || !assignedAdminUser.isActive) {
                throw new BadRequestException("Assigned admin user is invalid.");
            }
        }

        const existing = await this.prisma.report.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                targetType: true,
                reasonCode: true,
                targetUserId: true,
                targetStreamId: true,
                assignedAdminUserId: true,
            },
        });

        if (!existing) {
            throw new NotFoundException("Report not found.");
        }

        const updated = await this.prisma.report.update({
            where: { id },
            data: {
                assignedAdminUserId: body.assignedAdminUserId ?? null,
            },
            include: {
                reporter: {
                    include: { profile: true },
                },
                assignedAdminUser: true,
                targetUser: {
                    include: { profile: true },
                },
                targetStream: {
                    include: {
                        host: {
                            include: { profile: true },
                        },
                    },
                },
                targetChatMessage: {
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
                },
                targetDmMessage: {
                    include: {
                        sender: {
                            include: { profile: true },
                        },
                        conversation: {
                            include: {
                                participant1: {
                                    include: { profile: true },
                                },
                                participant2: {
                                    include: { profile: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        await this.addAuditLog(
            id,
            adminUserId,
            ReportAuditAction.ASSIGNED,
            body.assignedAdminUserId
                ? `Assigned to admin ${body.assignedAdminUserId}.`
                : "Cleared report assignment.",
        );

        await this.addGenericAuditLog({
            actorAdminUserId: adminUserId,
            report: updated,
            actionType: "UPDATE",
            actionCode: "report.assign",
            actionLabel: body.assignedAdminUserId
                ? "Assigned report"
                : "Cleared report assignment",
            metadata: {
                assignedAdminUserId: body.assignedAdminUserId ?? null,
            },
            beforeState: {
                assignedAdminUserId: existing.assignedAdminUserId ?? null,
            },
            afterState: {
                assignedAdminUserId: updated.assignedAdminUser?.id ?? null,
            },
            diff: {
                assignedAdminUserId: {
                    before: existing.assignedAdminUserId ?? null,
                    after: updated.assignedAdminUser?.id ?? null,
                },
            },
            requestContext,
        });

        return {
            success: true,
            item: this.mapReportListItem(updated, canViewRealStaffIdentity),
        };
    }

    async addNote(
        adminUserId: string,
        id: string,
        body: AddAdminReportNoteDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const canViewRealStaffIdentity = await this.canViewRealReportStaffIdentity(
            actor.role,
        );

        const existing = await this.prisma.report.findUnique({
            where: { id },
            include: {
                reporter: {
                    include: { profile: true },
                },
                assignedAdminUser: true,
                targetUser: {
                    include: { profile: true },
                },
                targetStream: {
                    include: {
                        host: {
                            include: { profile: true },
                        },
                    },
                },
                targetChatMessage: {
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
                },
                targetDmMessage: {
                    include: {
                        sender: {
                            include: { profile: true },
                        },
                        conversation: {
                            include: {
                                participant1: {
                                    include: { profile: true },
                                },
                                participant2: {
                                    include: { profile: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!existing) {
            throw new NotFoundException("Report not found.");
        }

        await this.addAuditLog(
            id,
            adminUserId,
            ReportAuditAction.NOTE_ADDED,
            body.note,
        );

        await this.addGenericAuditLog({
            actorAdminUserId: adminUserId,
            report: existing,
            actionType: "UPDATE",
            actionCode: "report.note.add",
            actionLabel: "Added report note",
            metadata: {
                note: body.note,
            },
            requestContext,
        });

        return {
            success: true,
            item: this.mapReportListItem(existing, canViewRealStaffIdentity),
        };
    }

    async bulkUpdateStatus(
        adminUserId: string,
        body: BulkAdminReportStatusDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const reportIds = this.normalizeIdList(body.reportIds);
        const nextStatus = this.parseNextStatus(body.status);
        const resolutionNotes = this.normalizeOptionalString(body.resolutionNotes);
        const now = new Date();

        const existing = await this.prisma.report.findMany({
            where: {
                id: { in: reportIds },
            },
            select: {
                id: true,
                status: true,
                targetType: true,
                reasonCode: true,
                targetUserId: true,
                targetStreamId: true,
                assignedAdminUserId: true,
            },
        });

        const existingById = new Map(existing.map((row) => [row.id, row]));
        const missingIds = reportIds.filter((id) => !existingById.has(id));
        const skippedIds = reportIds.filter((id) => {
            const row = existingById.get(id);
            return Boolean(row && row.status === nextStatus);
        });
        const updatedIds = reportIds.filter((id) => {
            const row = existingById.get(id);
            return Boolean(row && row.status !== nextStatus);
        });

        if (updatedIds.length > 0) {
            await this.prisma.report.updateMany({
                where: {
                    id: { in: updatedIds },
                },
                data: {
                    status: nextStatus,
                    resolutionNotes,
                    resolvedAt:
                        nextStatus === ReportStatus.RESOLVED ||
                            nextStatus === ReportStatus.DISMISSED
                            ? now
                            : null,
                },
            });

            await this.prisma.reportAuditLog.createMany({
                data: updatedIds.map((reportId) => ({
                    reportId,
                    actorAdminUserId: adminUserId,
                    action:
                        nextStatus === ReportStatus.DISMISSED
                            ? ReportAuditAction.DISMISSED
                            : nextStatus === ReportStatus.ESCALATED
                                ? ReportAuditAction.ESCALATED
                                : ReportAuditAction.STATUS_CHANGED,
                    note: resolutionNotes,
                })),
            });

            await Promise.all(
                updatedIds.map((reportId) => {
                    const row = existingById.get(reportId);
                    if (!row) return Promise.resolve();

                    const normalizedRequestContext =
                        this.normalizeAuditContext(requestContext);

                    return this.adminAudit.logEvent({
                        actorAdminUserId: adminUserId,
                        actionType: "STATUS_CHANGE",
                        actionCode: "report.bulk_status.update",
                        actionLabel: "Bulk updated report status",
                        resourceType: "REPORT",
                        resourceId: row.id,
                        target: {
                            id: row.id,
                            name: row.id,
                            type: "REPORT",
                        },
                        references: {
                            targetReportId: row.id,
                            targetUserId: row.targetUserId ?? null,
                            targetStreamId: row.targetStreamId ?? null,
                        },
                        requestPath: normalizedRequestContext.requestPath,
                        ipAddress: normalizedRequestContext.ipAddress,
                        userAgent: normalizedRequestContext.userAgent,
                        deviceLabel: normalizedRequestContext.deviceLabel,
                        metadata: {
                            bulk: true,
                            resolutionNotes,
                            targetType: row.targetType,
                            reasonCode: row.reasonCode,
                        },
                        beforeState: {
                            status: row.status,
                        },
                        afterState: {
                            status: nextStatus,
                        },
                        diff: {
                            status: {
                                before: row.status,
                                after: nextStatus,
                            },
                        },
                    });
                }),
            );
        }

        return {
            success: true,
            requestedCount: reportIds.length,
            updatedCount: updatedIds.length,
            updatedIds,
            skippedIds,
            missingIds,
        };
    }
}
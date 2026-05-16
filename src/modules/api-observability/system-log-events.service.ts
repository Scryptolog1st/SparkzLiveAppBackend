import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

export type SystemLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export type SystemLogSource = "API" | "LIVEKIT" | "REALTIME" | "JOBS" | "SYSTEM";

export type SystemLogEventInput = {
    source: SystemLogSource;
    level: SystemLogLevel;
    category: string;
    message: string;
    detailsJson?: Prisma.InputJsonValue;
    requestId?: string | null;
    route?: string | null;
    method?: string | null;
    statusCode?: number | null;
    durationMs?: number | null;
    streamId?: string | null;
    roomName?: string | null;
    userId?: string | null;
    createdAt?: Date;
    eventCode?: string | null;
    environment?: string | null;
    clientPlatform?: string | null;
    clientAppVersion?: string | null;
    clientBuildNumber?: string | null;
    clientReleaseChannel?: string | null;
    deviceModel?: string | null;
    deviceOsVersion?: string | null;
    networkType?: string | null;
    sessionId?: string | null;
    fingerprint?: string | null;
};

export type SystemLogEntry = {
    id: string;
    source: SystemLogSource;
    level: SystemLogLevel;
    category: string;
    message: string;
    detailsJson: unknown | null;
    requestId: string | null;
    route: string | null;
    method: string | null;
    statusCode: number | null;
    durationMs: number | null;
    streamId: string | null;
    roomName: string | null;
    userId: string | null;
    createdAt: string;
};

export type SystemLogsSummary = {
    lastHour: {
        total: number;
        errorCount: number;
        warnCount: number;
        apiErrorCount: number;
        liveKitErrorCount: number;
    };
};

@Injectable()
export class SystemLogEventsService {
    private readonly logger = new Logger(SystemLogEventsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async write(input: SystemLogEventInput) {
        try {
            await this.prisma.systemLogEvent.create({
                data: {
                    source: input.source,
                    level: input.level,
                    category: String(input.category || "GENERAL").trim() || "GENERAL",
                    message: String(input.message || "Unknown log event").trim() || "Unknown log event",
                    requestId: input.requestId ?? null,
                    route: input.route ?? null,
                    method: input.method ?? null,
                    statusCode: input.statusCode ?? null,
                    durationMs: input.durationMs ?? null,
                    streamId: input.streamId ?? null,
                    roomName: input.roomName ?? null,
                    userId: input.userId ?? null,
                    eventCode: input.eventCode ?? null,
                    environment: input.environment ?? null,
                    clientPlatform: input.clientPlatform ?? null,
                    clientAppVersion: input.clientAppVersion ?? null,
                    clientBuildNumber: input.clientBuildNumber ?? null,
                    clientReleaseChannel: input.clientReleaseChannel ?? null,
                    deviceModel: input.deviceModel ?? null,
                    deviceOsVersion: input.deviceOsVersion ?? null,
                    networkType: input.networkType ?? null,
                    sessionId: input.sessionId ?? null,
                    fingerprint: input.fingerprint ?? null,
                    createdAt: input.createdAt ?? new Date(),
                    ...(input.detailsJson !== undefined
                        ? { detailsJson: input.detailsJson }
                        : {}),
                },
            });
        } catch (error) {
            this.logger.error(
                "Failed to persist system log event.",
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    async writeDeduped(
        input: SystemLogEventInput & {
            dedupeWindowMs?: number;
        },
    ) {
        const windowMs = Math.max(1, input.dedupeWindowMs ?? 5 * 60 * 1000);
        const fingerprint =
            input.fingerprint ??
            [
                input.source,
                input.level,
                input.category,
                input.message,
                input.route ?? "",
                input.streamId ?? "",
                input.roomName ?? "",
                input.userId ?? "",
            ].join("|");

        const existing = await this.prisma.systemLogEvent.findFirst({
            where: {
                fingerprint,
                createdAt: {
                    gte: new Date(Date.now() - windowMs),
                },
            },
            select: { id: true },
        });

        if (existing) {
            return;
        }

        await this.write({
            ...input,
            fingerprint,
        });
    }

    async getRecentLogs(limit = 200): Promise<SystemLogEntry[]> {
        const rows = await this.prisma.systemLogEvent.findMany({
            orderBy: {
                createdAt: "desc",
            },
            take: Math.max(1, Math.min(limit, 500)),
        });

        return rows.map((row) => ({
            id: row.id,
            source: row.source as SystemLogSource,
            level: row.level as SystemLogLevel,
            category: row.category,
            message: row.message,
            detailsJson: row.detailsJson ?? null,
            requestId: row.requestId ?? null,
            route: row.route ?? null,
            method: row.method ?? null,
            statusCode: row.statusCode ?? null,
            durationMs: row.durationMs ?? null,
            streamId: row.streamId ?? null,
            roomName: row.roomName ?? null,
            userId: row.userId ?? null,
            createdAt: row.createdAt.toISOString(),
        }));
    }

    async getSummary(hours = 1): Promise<SystemLogsSummary> {
        const safeHours = Math.max(1, hours);
        const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);

        const [total, errorCount, warnCount, apiErrorCount, liveKitErrorCount] =
            await Promise.all([
                this.prisma.systemLogEvent.count({
                    where: {
                        createdAt: { gte: since },
                    },
                }),
                this.prisma.systemLogEvent.count({
                    where: {
                        createdAt: { gte: since },
                        level: "ERROR",
                    },
                }),
                this.prisma.systemLogEvent.count({
                    where: {
                        createdAt: { gte: since },
                        level: "WARN",
                    },
                }),
                this.prisma.systemLogEvent.count({
                    where: {
                        createdAt: { gte: since },
                        source: "API",
                        level: "ERROR",
                    },
                }),
                this.prisma.systemLogEvent.count({
                    where: {
                        createdAt: { gte: since },
                        source: "LIVEKIT",
                        level: "ERROR",
                    },
                }),
            ]);

        return {
            lastHour: {
                total,
                errorCount,
                warnCount,
                apiErrorCount,
                liveKitErrorCount,
            },
        };
    }
}
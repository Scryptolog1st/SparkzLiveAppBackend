import { Injectable } from "@nestjs/common";
import {
    BanAppealStatus,
    EmailDeliveryStatus,
    EmailSmtpAccountStatus,
    PayoutStatus,
    Prisma,
    PurchaseStatus,
    ReportStatus,
} from "@prisma/client";
import {
    accessSync,
    constants,
    existsSync,
    readFileSync,
    readdirSync,
    statfsSync,
} from "fs";
import * as os from "os";
import { join } from "path";

import { ApiObservabilityService } from "../api-observability/api-observability.service";
import {
    SystemLogEntry,
    SystemLogEventsService,
    SystemLogsSummary,
    SystemLogLevel,
    SystemLogSource,
} from "../api-observability/system-log-events.service";
import { JobsService } from "../jobs/jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

type HealthIndicatorStatus = "healthy" | "degraded" | "down" | "unknown";
type OverallSystemStatus = "healthy" | "degraded" | "down";

type SystemAlert = {
    level: "info" | "warning" | "critical";
    scope: string;
    message: string;
};

type PlatformSummary = {
    activeLiveStreams: number;
    liveParticipants: number;
    activePkBattles: number;
    recentChatLastHour: number;
    recentGiftsLastHour: number;
};

type PayoutSummary = {
    totalRequests: number;
    openQueue: number;
    oldestOpenRequestAt: string | null;
    counts: {
        pending: number;
        processing: number;
        paid: number;
        rejected: number;
        cancelled: number;
    };
    totals: {
        diamondAmount: number;
        netAmount: number;
    };
};

type ModerationSummary = {
    openReports: number;
    pendingBanAppeals: number;
    recentModerationActionsLast24h: number;
};

type EmailSummary = {
    smtpAccounts: {
        total: number;
        active: number;
        failing: number;
        disabled: number;
    };
    recentFailedLast24h: number;
    recentBouncedLast24h: number;
    lastFailureAt: string | null;
    lastFailureMessage: string | null;
};

type PaymentsSummary = {
    appleMode: string;
    appleReady: boolean;
    googleMode: string;
    googleReady: boolean;
    recentFailedOrdersLast24h: number;
    pendingOrders: number;
    fulfilledOrders: number;
};

type DiskUsageSummary = {
    path: string;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number | null;
};

type HostSummary = {
    hostname: string;
    platform: string;
    release: string;
    arch: string;
    uptimeSec: number;
    nodeVersion: string;
    pid: number;
    cpu: {
        model: string | null;
        coreCount: number;
        loadAverage: {
            oneMinute: number;
            fiveMinute: number;
            fifteenMinute: number;
        };
        usagePercent: number | null;
    };
    memory: {
        totalBytes: number;
        usedBytes: number;
        freeBytes: number;
        usagePercent: number | null;
        rssBytes: number;
        heapTotalBytes: number;
        heapUsedBytes: number;
        externalBytes: number;
        arrayBuffersBytes: number;
    };
    storage: {
        root: DiskUsageSummary | null;
        uploads: DiskUsageSummary | null;
        uploadsPath: string;
        uploadsPathExists: boolean;
        uploadsPathWritable: boolean;
    };
    network: {
        rxBytes: number;
        txBytes: number;
        rxRateBytesPerSec: number | null;
        txRateBytesPerSec: number | null;
        interfaceCount: number;
        sampledAt: string;
    } | null;
};

type ApiUptimeWindowSummary = {
    window: "1h" | "24h" | "7d";
    requestCount: number;
    successCount: number;
    clientErrorCount: number;
    serverErrorCount: number;
    uptimePercent: number;
    errorRatePercent: number;
    avgLatencyMs: number | null;
    requestsPerMinute: number;
};

type ApiEndpointUsageMetric = {
    category: string;
    method: string;
    routePattern: string;
    routeKey: string;
    requestCount: number;
    successCount: number;
    clientErrorCount: number;
    serverErrorCount: number;
    uptimePercent: number;
    errorRatePercent: number;
    avgLatencyMs: number | null;
    lastSeenAt: string | null;
    lastErrorAt: string | null;
};

type ApiUptimeCategorySummary = {
    category: string;
    endpointCount: number;
    requestCount: number;
    uptimePercent: number;
    errorRatePercent: number;
    endpoints: ApiEndpointUsageMetric[];
};

type ApiUptimeHealthSection = {
    status: HealthIndicatorStatus;
    detail: string;
    summary: {
        last1Hour: ApiUptimeWindowSummary;
        last24Hours: ApiUptimeWindowSummary;
        last7Days: ApiUptimeWindowSummary;
    } | null;
    categories: ApiUptimeCategorySummary[];
};

type SystemLogsHealthSection = {
    status: HealthIndicatorStatus;
    detail: string;
    summary: SystemLogsSummary;
    entries: SystemLogEntry[];
};

@Injectable()
export class AdminSystemService {
    private lastCpuSample:
        | { at: number; idle: number; total: number }
        | null = null;

    private lastNetworkSample:
        | {
            at: number;
            rxBytes: number;
            txBytes: number;
            interfaceCount: number;
        }
        | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly realtimeGateway: RealtimeGateway,
        private readonly jobs: JobsService,
        private readonly apiObservability: ApiObservabilityService,
        private readonly systemLogEvents: SystemLogEventsService,
    ) { }

    private toIsoString(value: Date | null | undefined) {
        return value instanceof Date ? value.toISOString() : null;
    }

    private getEnvironmentLabel() {
        const raw =
            process.env.APP_ENV ||
            process.env.NODE_ENV ||
            process.env.ENVIRONMENT ||
            "unknown";

        return String(raw).trim().toLowerCase() || "unknown";
    }

    private getAppMetadata() {
        const name = process.env.APP_NAME || "liveapp-api";

        let version = "0.0.0";
        try {
            const pkgPath = join(process.cwd(), "package.json");
            const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
                version?: string;
            };
            version = pkg.version || version;
        } catch {
            // ignore
        }

        const commit = String(process.env.GIT_COMMIT || "").trim() || null;
        const builtAt = String(process.env.BUILT_AT || "").trim() || null;

        return {
            name,
            version,
            commit,
            builtAt,
            environment: this.getEnvironmentLabel(),
        };
    }

    private summarizeOverallStatus(
        statuses: HealthIndicatorStatus[],
    ): OverallSystemStatus {
        if (statuses.includes("down")) {
            return "down";
        }

        if (statuses.includes("degraded")) {
            return "degraded";
        }

        return "healthy";
    }

    private emitHealthStateLog(params: {
        source: SystemLogSource;
        status: HealthIndicatorStatus | OverallSystemStatus;
        category: string;
        message: string;
        detailsJson?: Prisma.InputJsonValue;
        dedupeKey: string;
    }) {
        if (params.status === "healthy") {
            return;
        }

        const level: SystemLogLevel =
            params.status === "down" ? "ERROR" : "WARN";

        void this.systemLogEvents.writeDeduped({
            source: params.source,
            level,
            category: params.category,
            message: params.message,
            detailsJson: params.detailsJson,
            fingerprint: params.dedupeKey,
            dedupeWindowMs: 10 * 60 * 1000,
        });
    }

    private canWrite(path: string) {
        try {
            accessSync(path, constants.W_OK);
            return true;
        } catch {
            return false;
        }
    }

    private getDiskUsage(path: string): DiskUsageSummary | null {
        try {
            const stats = statfsSync(path) as unknown as {
                bsize?: number;
                frsize?: number;
                blocks?: number;
                bavail?: number;
                bfree?: number;
            };

            const blockSize = Number(stats.bsize ?? stats.frsize ?? 0);
            const totalBlocks = Number(stats.blocks ?? 0);
            const freeBlocks = Number(stats.bavail ?? stats.bfree ?? 0);

            const totalBytes = blockSize * totalBlocks;
            const freeBytes = blockSize * freeBlocks;
            const usedBytes = Math.max(0, totalBytes - freeBytes);

            return {
                path,
                totalBytes,
                usedBytes,
                freeBytes,
                usagePercent:
                    totalBytes > 0
                        ? Number(((usedBytes / totalBytes) * 100).toFixed(1))
                        : null,
            };
        } catch {
            return null;
        }
    }

    private getAggregateCpuTimes() {
        const cpus = os.cpus();
        let idle = 0;
        let total = 0;

        for (const cpu of cpus) {
            idle += cpu.times.idle;
            total +=
                cpu.times.user +
                cpu.times.nice +
                cpu.times.sys +
                cpu.times.idle +
                cpu.times.irq;
        }

        return { idle, total, coreCount: cpus.length };
    }

    private sampleCpuUsagePercent() {
        const now = Date.now();
        const current = this.getAggregateCpuTimes();

        if (!current.coreCount) {
            return null;
        }

        if (!this.lastCpuSample) {
            this.lastCpuSample = {
                at: now,
                idle: current.idle,
                total: current.total,
            };
            return null;
        }

        const totalDelta = current.total - this.lastCpuSample.total;
        const idleDelta = current.idle - this.lastCpuSample.idle;

        this.lastCpuSample = {
            at: now,
            idle: current.idle,
            total: current.total,
        };

        if (totalDelta <= 0) {
            return null;
        }

        return Number(
            ((((totalDelta - idleDelta) / totalDelta) * 100)).toFixed(1),
        );
    }

    private readLinuxNetworkTotals() {
        if (process.platform !== "linux" || !existsSync("/proc/net/dev")) {
            return null;
        }

        try {
            const raw = readFileSync("/proc/net/dev", "utf-8");
            const lines = raw.split("\n").slice(2);

            let rxBytes = 0;
            let txBytes = 0;
            let interfaceCount = 0;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const [ifaceRaw, countersRaw] = trimmed.split(":");
                const iface = String(ifaceRaw || "").trim();
                if (!iface || iface === "lo") continue;

                const parts = String(countersRaw || "")
                    .trim()
                    .split(/\s+/);

                if (parts.length < 16) continue;

                rxBytes += Number(parts[0] || 0);
                txBytes += Number(parts[8] || 0);
                interfaceCount += 1;
            }

            return {
                rxBytes,
                txBytes,
                interfaceCount,
            };
        } catch {
            return null;
        }
    }

    private sampleNetworkUsage() {
        const totals = this.readLinuxNetworkTotals();
        if (!totals) {
            return null;
        }

        const now = Date.now();

        if (!this.lastNetworkSample) {
            this.lastNetworkSample = {
                at: now,
                rxBytes: totals.rxBytes,
                txBytes: totals.txBytes,
                interfaceCount: totals.interfaceCount,
            };

            return {
                rxBytes: totals.rxBytes,
                txBytes: totals.txBytes,
                rxRateBytesPerSec: null,
                txRateBytesPerSec: null,
                interfaceCount: totals.interfaceCount,
                sampledAt: new Date(now).toISOString(),
            };
        }

        const elapsedSec = (now - this.lastNetworkSample.at) / 1000;

        const rxRateBytesPerSec =
            elapsedSec > 0
                ? Number(
                    (
                        (totals.rxBytes - this.lastNetworkSample.rxBytes) /
                        elapsedSec
                    ).toFixed(1),
                )
                : null;

        const txRateBytesPerSec =
            elapsedSec > 0
                ? Number(
                    (
                        (totals.txBytes - this.lastNetworkSample.txBytes) /
                        elapsedSec
                    ).toFixed(1),
                )
                : null;

        this.lastNetworkSample = {
            at: now,
            rxBytes: totals.rxBytes,
            txBytes: totals.txBytes,
            interfaceCount: totals.interfaceCount,
        };

        return {
            rxBytes: totals.rxBytes,
            txBytes: totals.txBytes,
            rxRateBytesPerSec,
            txRateBytesPerSec,
            interfaceCount: totals.interfaceCount,
            sampledAt: new Date(now).toISOString(),
        };
    }

    private getHostHealth() {
        const cpuUsagePercent = this.sampleCpuUsagePercent();
        const memoryTotal = os.totalmem();
        const memoryFree = os.freemem();
        const memoryUsed = memoryTotal - memoryFree;
        const memoryUsagePercent =
            memoryTotal > 0
                ? Number(((memoryUsed / memoryTotal) * 100).toFixed(1))
                : null;

        const processMemory = process.memoryUsage();

        const rootDisk = this.getDiskUsage(process.cwd());
        const uploadsPath = join(process.cwd(), "uploads");
        const uploadsPathExists = existsSync(uploadsPath);
        const uploadsProbePath = uploadsPathExists ? uploadsPath : process.cwd();
        const uploadsPathWritable = this.canWrite(uploadsProbePath);
        const uploadsDisk = this.getDiskUsage(uploadsProbePath);
        const network = this.sampleNetworkUsage();

        const summary: HostSummary = {
            hostname: os.hostname(),
            platform: process.platform,
            release: os.release(),
            arch: process.arch,
            uptimeSec: Math.floor(os.uptime()),
            nodeVersion: process.version,
            pid: process.pid,
            cpu: {
                model: os.cpus()[0]?.model ?? null,
                coreCount: os.cpus().length,
                loadAverage: {
                    oneMinute: Number(os.loadavg()[0].toFixed(2)),
                    fiveMinute: Number(os.loadavg()[1].toFixed(2)),
                    fifteenMinute: Number(os.loadavg()[2].toFixed(2)),
                },
                usagePercent: cpuUsagePercent,
            },
            memory: {
                totalBytes: memoryTotal,
                usedBytes: memoryUsed,
                freeBytes: memoryFree,
                usagePercent: memoryUsagePercent,
                rssBytes: processMemory.rss,
                heapTotalBytes: processMemory.heapTotal,
                heapUsedBytes: processMemory.heapUsed,
                externalBytes: processMemory.external,
                arrayBuffersBytes:
                    "arrayBuffers" in processMemory
                        ? processMemory.arrayBuffers
                        : 0,
            },
            storage: {
                root: rootDisk,
                uploads: uploadsDisk,
                uploadsPath,
                uploadsPathExists,
                uploadsPathWritable,
            },
            network,
        };

        let status: HealthIndicatorStatus = "healthy";
        const issues: string[] = [];

        if (memoryUsagePercent !== null && memoryUsagePercent >= 95) {
            status = "down";
            issues.push(`RAM usage is critically high at ${memoryUsagePercent}%.`);
        } else if (memoryUsagePercent !== null && memoryUsagePercent >= 85) {
            status = "degraded";
            issues.push(`RAM usage is elevated at ${memoryUsagePercent}%.`);
        }

        const rootDiskUsagePercent = rootDisk?.usagePercent ?? null;

        if (rootDiskUsagePercent !== null && rootDiskUsagePercent >= 98) {
            status = "down";
            issues.push(`Root disk usage is critically high at ${rootDiskUsagePercent}%.`);
        } else if (
            rootDiskUsagePercent !== null &&
            rootDiskUsagePercent >= 90 &&
            status !== "down"
        ) {
            status = "degraded";
            issues.push(`Root disk usage is elevated at ${rootDiskUsagePercent}%.`);
        }

        if (
            cpuUsagePercent !== null &&
            cpuUsagePercent >= 90 &&
            status === "healthy"
        ) {
            status = "degraded";
            issues.push(`CPU usage is elevated at ${cpuUsagePercent}%.`);
        }

        if (!uploadsPathWritable && status !== "down") {
            status = "degraded";
            issues.push("Uploads path is not writable from the current VM process.");
        }

        return {
            status,
            detail:
                issues[0] ??
                "Host / VM telemetry collected successfully from the running backend node.",
            summary,
        };
    }

    private async getDatabaseHealth() {
        const startedAt = Date.now();

        try {
            await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
            return {
                status: "healthy" as const,
                detail: "Database reachable via Prisma.",
                latencyMs: Date.now() - startedAt,
            };
        } catch (error) {
            return {
                status: "down" as const,
                detail:
                    error instanceof Error
                        ? `Database probe failed: ${error.message}`
                        : "Database probe failed.",
                latencyMs: Date.now() - startedAt,
            };
        }
    }

    private getRealtimeHealth(): {
        realtime: {
            status: HealthIndicatorStatus;
            detail: string;
        };
        presence: {
            status: HealthIndicatorStatus;
            detail: string;
        };
    } {
        const gatewayReady = Boolean((this.realtimeGateway as any)?.server);

        const realtimeStatus: HealthIndicatorStatus = gatewayReady
            ? "healthy"
            : "degraded";

        const presenceStatus: HealthIndicatorStatus = "healthy";

        return {
            realtime: {
                status: realtimeStatus,
                detail: gatewayReady
                    ? "Socket gateway is initialized and attached."
                    : "Realtime gateway provider is loaded, but the Socket.IO server is not attached yet.",
            },
            presence: {
                status: presenceStatus,
                detail: "Presence tracking is active in-memory on this node.",
            },
        };
    }

    private getVideoHealth() {
        const url = String(process.env.LIVEKIT_URL || "").trim();
        const key = String(process.env.LIVEKIT_API_KEY || "").trim();
        const secret = String(process.env.LIVEKIT_API_SECRET || "").trim();

        const configured = Boolean(url && key && secret);

        return {
            status: configured ? ("healthy" as const) : ("down" as const),
            detail: configured
                ? "LiveKit environment variables are present."
                : "LiveKit is not fully configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
            summary: {
                provider: "LIVEKIT",
                configured,
                hasUrl: Boolean(url),
                hasApiKey: Boolean(key),
                hasApiSecret: Boolean(secret),
            },
        };
    }

    private getUploadsHealth() {
        const uploadsPath = join(process.cwd(), "uploads");
        const uploadsPathExists = existsSync(uploadsPath);
        const probePath = uploadsPathExists ? uploadsPath : process.cwd();
        const uploadsPathWritable = this.canWrite(probePath);
        const disk = this.getDiskUsage(probePath);

        return {
            status: uploadsPathWritable ? ("healthy" as const) : ("down" as const),
            detail: uploadsPathExists
                ? uploadsPathWritable
                    ? "Uploads path exists and is writable."
                    : "Uploads path exists but is not writable."
                : uploadsPathWritable
                    ? "Uploads root is not created yet, but the parent path is writable and upload folders can be created on demand."
                    : "Uploads root is missing and the parent path is not writable.",
            summary: {
                uploadsPath,
                uploadsPathExists,
                uploadsPathWritable,
                disk,
            },
        };
    }

    private async getPlatformSummary(): Promise<PlatformSummary> {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const [
            activeLiveStreams,
            liveParticipants,
            activePkBattles,
            recentChatLastHour,
            recentGiftsLastHour,
        ] = await Promise.all([
            this.prisma.stream.count({
                where: {
                    status: "LIVE" as any,
                },
            }),
            this.prisma.streamParticipant.count({
                where: {
                    leftAt: null,
                },
            }),
            this.prisma.battle.count({
                where: {
                    status: {
                        in: ["PENDING", "ACTIVE"] as any,
                    },
                },
            }),
            this.prisma.chatMessage.count({
                where: {
                    createdAt: {
                        gte: oneHourAgo,
                    },
                },
            }),
            this.prisma.giftTransaction.count({
                where: {
                    createdAt: {
                        gte: oneHourAgo,
                    },
                },
            }),
        ]);

        return {
            activeLiveStreams,
            liveParticipants,
            activePkBattles,
            recentChatLastHour,
            recentGiftsLastHour,
        };
    }

    private async getPayoutSummary(): Promise<PayoutSummary> {
        const [groups, aggregate, oldestOpen] = await Promise.all([
            this.prisma.payoutRequest.groupBy({
                by: ["status"],
                _count: { _all: true },
                _sum: {
                    diamondAmount: true,
                    netAmount: true,
                },
            }),
            this.prisma.payoutRequest.aggregate({
                _sum: {
                    diamondAmount: true,
                    netAmount: true,
                },
                _count: {
                    _all: true,
                },
            }),
            this.prisma.payoutRequest.findFirst({
                where: {
                    status: {
                        in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING],
                    },
                },
                orderBy: {
                    createdAt: "asc",
                },
                select: {
                    createdAt: true,
                },
            }),
        ]);

        const counts = {
            pending: 0,
            processing: 0,
            paid: 0,
            rejected: 0,
            cancelled: 0,
        };

        for (const row of groups) {
            switch (row.status) {
                case PayoutStatus.PENDING:
                    counts.pending = row._count._all;
                    break;
                case PayoutStatus.PROCESSING:
                    counts.processing = row._count._all;
                    break;
                case PayoutStatus.PAID:
                    counts.paid = row._count._all;
                    break;
                case PayoutStatus.REJECTED:
                    counts.rejected = row._count._all;
                    break;
                case PayoutStatus.CANCELLED:
                    counts.cancelled = row._count._all;
                    break;
            }
        }

        return {
            totalRequests: aggregate._count._all,
            openQueue: counts.pending + counts.processing,
            oldestOpenRequestAt: this.toIsoString(oldestOpen?.createdAt),
            counts,
            totals: {
                diamondAmount: Number(aggregate._sum.diamondAmount || 0),
                netAmount: Number(aggregate._sum.netAmount || 0),
            },
        };
    }

    private async getModerationSummary(): Promise<ModerationSummary> {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [
            openReports,
            pendingBanAppeals,
            recentModerationActionsLast24h,
        ] = await Promise.all([
            this.prisma.report.count({
                where: {
                    status: {
                        in: [
                            ReportStatus.OPEN,
                            ReportStatus.IN_REVIEW,
                            ReportStatus.ESCALATED,
                        ],
                    },
                },
            }),
            this.prisma.banAppeal.count({
                where: {
                    status: {
                        in: [
                            BanAppealStatus.PENDING,
                            BanAppealStatus.IN_REVIEW,
                        ],
                    },
                },
            }),
            this.prisma.moderationAction.count({
                where: {
                    createdAt: {
                        gte: oneDayAgo,
                    },
                },
            }),
        ]);

        return {
            openReports,
            pendingBanAppeals,
            recentModerationActionsLast24h,
        };
    }

    private async getEmailHealth() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [
            totalAccounts,
            activeAccounts,
            failingAccounts,
            disabledAccounts,
            recentFailedLast24h,
            recentBouncedLast24h,
            lastFailure,
        ] = await Promise.all([
            this.prisma.smtpAccount.count(),
            this.prisma.smtpAccount.count({
                where: {
                    status: EmailSmtpAccountStatus.ACTIVE,
                },
            }),
            this.prisma.smtpAccount.count({
                where: {
                    status: EmailSmtpAccountStatus.FAILING,
                },
            }),
            this.prisma.smtpAccount.count({
                where: {
                    status: EmailSmtpAccountStatus.DISABLED,
                },
            }),
            this.prisma.emailDeliveryLog.count({
                where: {
                    status: EmailDeliveryStatus.FAILED,
                    createdAt: {
                        gte: oneDayAgo,
                    },
                },
            }),
            this.prisma.emailDeliveryLog.count({
                where: {
                    status: EmailDeliveryStatus.BOUNCED,
                    createdAt: {
                        gte: oneDayAgo,
                    },
                },
            }),
            this.prisma.emailDeliveryLog.findFirst({
                where: {
                    status: {
                        in: [
                            EmailDeliveryStatus.FAILED,
                            EmailDeliveryStatus.BOUNCED,
                        ],
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    createdAt: true,
                    errorMessage: true,
                },
            }),
        ]);

        let status: HealthIndicatorStatus = "healthy";
        let detail = "Email subsystem looks healthy.";

        if (totalAccounts === 0 || activeAccounts === 0) {
            status = "down";
            detail = "No active SMTP account is available for email delivery.";
        } else if (
            failingAccounts > 0 ||
            recentFailedLast24h > 0 ||
            recentBouncedLast24h > 0
        ) {
            status = "degraded";
            detail =
                "Email subsystem has recent failures or failing SMTP accounts.";
        }

        const summary: EmailSummary = {
            smtpAccounts: {
                total: totalAccounts,
                active: activeAccounts,
                failing: failingAccounts,
                disabled: disabledAccounts,
            },
            recentFailedLast24h,
            recentBouncedLast24h,
            lastFailureAt: this.toIsoString(lastFailure?.createdAt),
            lastFailureMessage: lastFailure?.errorMessage ?? null,
        };

        return {
            status,
            detail,
            summary,
        };
    }

    private hasAppleRootCertificates() {
        const certDir =
            process.env.APPLE_ROOT_CERTS_DIR ??
            join(process.cwd(), "certs", "apple");

        if (!existsSync(certDir)) {
            return false;
        }

        try {
            const raw = readdirSync(certDir);
            return raw.some(
                (file) =>
                    file.toLowerCase().endsWith(".cer") ||
                    file.toLowerCase().endsWith(".der"),
            );
        } catch {
            return false;
        }
    }

    private async getPaymentsHealth() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const appleMode = String(
            process.env.IAP_APPLE_VERIFY_MODE ?? "STUB",
        ).trim().toUpperCase();
        const googleMode = String(
            process.env.IAP_GOOGLE_VERIFY_MODE ?? "STUB",
        ).trim().toUpperCase();

        const appleReady =
            appleMode !== "REAL"
                ? true
                : Boolean(String(process.env.APPLE_BUNDLE_ID || "").trim()) &&
                this.hasAppleRootCertificates();

        const hasGooglePackageName = Boolean(
            String(process.env.GOOGLE_PLAY_PACKAGE_NAME || "").trim(),
        );
        const hasGoogleJsonBase64 = Boolean(
            String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 || "").trim(),
        );
        const hasGoogleServiceEmail = Boolean(
            String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim(),
        );
        const hasGooglePrivateKey = Boolean(
            String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").trim(),
        );

        const googleReady =
            googleMode !== "REAL"
                ? true
                : hasGooglePackageName &&
                (hasGoogleJsonBase64 ||
                    (hasGoogleServiceEmail && hasGooglePrivateKey));

        const [recentFailedOrdersLast24h, pendingOrders, fulfilledOrders] =
            await Promise.all([
                this.prisma.purchaseOrder.count({
                    where: {
                        status: PurchaseStatus.FAILED,
                        updatedAt: {
                            gte: oneDayAgo,
                        },
                    },
                }),
                this.prisma.purchaseOrder.count({
                    where: {
                        status: PurchaseStatus.PENDING,
                    },
                }),
                this.prisma.purchaseOrder.count({
                    where: {
                        status: PurchaseStatus.FULFILLED,
                    },
                }),
            ]);

        let status: HealthIndicatorStatus = "healthy";
        let detail = "Payments subsystem looks healthy.";

        if (!appleReady || !googleReady) {
            status = "degraded";
            detail =
                "One or more in-app purchase providers are configured for REAL mode but missing required credentials.";
        } else if (recentFailedOrdersLast24h > 0) {
            status = "degraded";
            detail = "Recent failed purchase orders were detected.";
        }

        const summary: PaymentsSummary = {
            appleMode,
            appleReady,
            googleMode,
            googleReady,
            recentFailedOrdersLast24h,
            pendingOrders,
            fulfilledOrders,
        };

        return {
            status,
            detail,
            summary,
        };
    }

    private async getApiUptimeHealth(): Promise<ApiUptimeHealthSection> {
        const summary = await this.apiObservability.getApiUptimeSummary();
        const endpoints = await this.apiObservability.getEndpointMetrics(24);

        const grouped = new Map<string, ApiEndpointUsageMetric[]>();

        for (const endpoint of endpoints) {
            const existing = grouped.get(endpoint.category) ?? [];
            existing.push(endpoint);
            grouped.set(endpoint.category, existing);
        }

        const categories: ApiUptimeCategorySummary[] = Array.from(grouped.entries()).map(
            ([category, items]) => {
                const requestCount = items.reduce(
                    (sum, item) => sum + item.requestCount,
                    0,
                );
                const serverErrorCount = items.reduce(
                    (sum, item) => sum + item.serverErrorCount,
                    0,
                );

                return {
                    category,
                    endpointCount: items.length,
                    requestCount,
                    uptimePercent:
                        requestCount > 0
                            ? Number(
                                (((requestCount - serverErrorCount) / requestCount) * 100).toFixed(2),
                            )
                            : 100,
                    errorRatePercent:
                        requestCount > 0
                            ? Number(((serverErrorCount / requestCount) * 100).toFixed(2))
                            : 0,
                    endpoints: items,
                };
            },
        );

        let status: HealthIndicatorStatus = "healthy";
        let detail = "API request telemetry looks healthy.";

        if (summary.last24Hours.requestCount === 0) {
            status = "unknown";
            detail =
                "API request telemetry is wired, but no request history has been recorded yet.";
        } else if (summary.last1Hour.requestCount > 0 && summary.last1Hour.uptimePercent < 80) {
            status = "down";
            detail =
                "API uptime in the last hour is critically low. Recent endpoint failures require attention.";
        } else if (
            summary.last1Hour.serverErrorCount > 0 ||
            summary.last24Hours.serverErrorCount > 0 ||
            summary.last1Hour.uptimePercent < 99
        ) {
            status = "degraded";
            detail =
                "API telemetry detected recent server-side failures or degraded endpoint uptime.";
        }

        return {
            status,
            detail,
            summary: {
                last1Hour: summary.last1Hour,
                last24Hours: summary.last24Hours,
                last7Days: summary.last7Days,
            },
            categories,
        };
    }

    private async getLogsHealth(): Promise<SystemLogsHealthSection> {
        const [summary, entries] = await Promise.all([
            this.systemLogEvents.getSummary(1),
            this.systemLogEvents.getRecentLogs(200),
        ]);

        let status: HealthIndicatorStatus = "healthy";
        let detail = "No recent developer-facing errors were detected.";

        if (summary.lastHour.errorCount >= 10 || summary.lastHour.liveKitErrorCount >= 5) {
            status = "down";
            detail =
                "High recent error activity detected in API or LiveKit logs.";
        } else if (summary.lastHour.errorCount > 0) {
            status = "degraded";
            detail =
                "Recent error-level events were detected. Review the log stream below.";
        } else if (summary.lastHour.warnCount > 0) {
            detail =
                "Recent warning-level events were detected. Review the log stream below.";
        }

        return {
            status,
            detail,
            summary,
            entries,
        };
    }

    async clearAllLogs(_adminUserId: string) {
        const [
            systemLogEventsResult,
            apiRequestMetricBucketsResult,
            emailDeliveryLogsResult,
        ] = await this.prisma.$transaction([
            this.prisma.systemLogEvent.deleteMany(),
            this.prisma.apiRequestMetricBucket.deleteMany(),
            this.prisma.emailDeliveryLog.deleteMany(),
        ]);

        return {
            success: true as const,
            cleared: {
                systemLogEvents: systemLogEventsResult.count,
                apiRequestMetricBuckets: apiRequestMetricBucketsResult.count,
                emailDeliveryLogs: emailDeliveryLogsResult.count,
            },
            clearedAt: new Date().toISOString(),
        };
    }

    async getHealth(_adminUserId: string) {
        const generatedAt = new Date().toISOString();
        const alerts: SystemAlert[] = [];

        const api = {
            status: "healthy" as const,
            detail: "Admin system health endpoint responded successfully.",
        };

        const [
            database,
            platform,
            payouts,
            moderation,
            email,
            payments,
            apiUptime,
            logs,
        ] = await Promise.all([
            this.getDatabaseHealth(),
            this.getPlatformSummary()
                .then((summary) => ({
                    status: "healthy" as const,
                    detail: "Live platform metrics loaded successfully.",
                    summary,
                }))
                .catch((error) => ({
                    status: "degraded" as const,
                    detail:
                        error instanceof Error
                            ? `Failed to load live platform metrics: ${error.message}`
                            : "Failed to load live platform metrics.",
                    summary: null as PlatformSummary | null,
                })),
            this.getPayoutSummary()
                .then((summary) => {
                    const oldestOpen =
                        summary.oldestOpenRequestAt
                            ? new Date(summary.oldestOpenRequestAt).getTime()
                            : null;

                    const oldestOpenHours =
                        oldestOpen !== null
                            ? (Date.now() - oldestOpen) / (60 * 60 * 1000)
                            : null;

                    let status: HealthIndicatorStatus = "healthy";
                    let detail =
                        summary.openQueue > 0
                            ? `${summary.openQueue} payout requests are currently open.`
                            : "Payout queue is clear.";

                    if (oldestOpenHours !== null && oldestOpenHours >= 24) {
                        status = "degraded";
                        detail = `Payout queue has been open for ${oldestOpenHours.toFixed(1)} hours at the oldest request.`;
                    }

                    return {
                        status,
                        detail,
                        summary,
                    };
                })
                .catch((error) => ({
                    status: "degraded" as const,
                    detail:
                        error instanceof Error
                            ? `Failed to load payout summary: ${error.message}`
                            : "Failed to load payout summary.",
                    summary: null as PayoutSummary | null,
                })),
            this.getModerationSummary()
                .then((summary) => ({
                    status: "healthy" as const,
                    detail: "Moderation and report metrics loaded successfully.",
                    summary,
                }))
                .catch((error) => ({
                    status: "degraded" as const,
                    detail:
                        error instanceof Error
                            ? `Failed to load moderation metrics: ${error.message}`
                            : "Failed to load moderation metrics.",
                    summary: null as ModerationSummary | null,
                })),
            this.getEmailHealth().catch((error) => ({
                status: "degraded" as const,
                detail:
                    error instanceof Error
                        ? `Failed to load email metrics: ${error.message}`
                        : "Failed to load email metrics.",
                summary: null as EmailSummary | null,
            })),
            this.getPaymentsHealth().catch((error) => ({
                status: "degraded" as const,
                detail:
                    error instanceof Error
                        ? `Failed to load payment metrics: ${error.message}`
                        : "Failed to load payment metrics.",
                summary: null as PaymentsSummary | null,
            })),
            this.getApiUptimeHealth().catch((error) => ({
                status: "degraded" as const,
                detail:
                    error instanceof Error
                        ? `Failed to load API uptime metrics: ${error.message}`
                        : "Failed to load API uptime metrics.",
                summary: null,
                categories: [] as ApiUptimeCategorySummary[],
            })),
            this.getLogsHealth().catch((error) => ({
                status: "degraded" as const,
                detail:
                    error instanceof Error
                        ? `Failed to load system logs: ${error.message}`
                        : "Failed to load system logs.",
                summary: {
                    lastHour: {
                        total: 0,
                        errorCount: 0,
                        warnCount: 0,
                        apiErrorCount: 0,
                        liveKitErrorCount: 0,
                    },
                },
                entries: [] as SystemLogEntry[],
            })),
        ]);

        const { realtime, presence } = this.getRealtimeHealth();
        const jobsSnapshot = this.jobs.getHealthSnapshot();

        let jobsStatus: HealthIndicatorStatus = "healthy";
        let jobsDetail = "Background jobs scheduler is running.";

        if (!jobsSnapshot.isRunning) {
            jobsStatus = "down";
            jobsDetail = "Background jobs scheduler is not running.";
        } else if (jobsSnapshot.lastTickError) {
            jobsStatus = "degraded";
            jobsDetail = `Last jobs tick failed: ${jobsSnapshot.lastTickError}`;
        } else if (
            jobsSnapshot.lastTickCompletedAt &&
            Date.now() - new Date(jobsSnapshot.lastTickCompletedAt).getTime() >
            jobsSnapshot.intervalMs * 2.5
        ) {
            jobsStatus = "degraded";
            jobsDetail = "Background jobs scheduler is running, but the last completed tick is stale.";
        } else if (!jobsSnapshot.lastTickCompletedAt) {
            jobsDetail = "Background jobs scheduler is running. First completed tick is still pending.";
        }

        const jobs = {
            status: jobsStatus,
            detail: jobsDetail,
            summary: jobsSnapshot,
        };

        const video = this.getVideoHealth();
        const uploads = this.getUploadsHealth();
        const host = this.getHostHealth();

        let totalUsers = 0;

        try {
            totalUsers = await this.prisma.user.count();
        } catch (error) {
            alerts.push({
                level: "warning",
                scope: "users",
                message:
                    error instanceof Error
                        ? `Failed to count users: ${error.message}`
                        : "Failed to count users.",
            });
        }

        const summary = {
            totalUsers,
            activeLiveStreams: platform.summary?.activeLiveStreams ?? 0,
            liveParticipants: platform.summary?.liveParticipants ?? 0,
            openReports: moderation.summary?.openReports ?? 0,
            pendingBanAppeals: moderation.summary?.pendingBanAppeals ?? 0,
            payoutQueue: payouts.summary?.openQueue ?? 0,
            failedEmailsLast24h: email.summary?.recentFailedLast24h ?? 0,
            recentModerationActionsLast24h:
                moderation.summary?.recentModerationActionsLast24h ?? 0,
        };

        const checks = {
            api,
            database,
            realtime,
            presence,
            jobs: {
                status: jobs.status,
                detail: jobs.detail,
            },
            video: {
                status: video.status,
                detail: video.detail,
            },
            uploads: {
                status: uploads.status,
                detail: uploads.detail,
            },
            email: {
                status: email.status,
                detail: email.detail,
            },
            payments: {
                status: payments.status,
                detail: payments.detail,
            },
            host: {
                status: host.status,
                detail: host.detail,
            },
        };

        const infrastructureStatuses: HealthIndicatorStatus[] = [
            database.status,
            realtime.status,
            jobs.status,
            video.status,
            uploads.status,
            host.status,
            apiUptime.status === "down" ? "down" : "healthy",
        ];

        const overallStatus = this.summarizeOverallStatus(infrastructureStatuses);

        this.emitHealthStateLog({
            source: "JOBS",
            status: jobs.status,
            category:
                jobs.status === "down"
                    ? "SCHEDULER_DOWN"
                    : jobs.summary.lastTickError
                        ? "TICK_FAILED"
                        : "STALE_TICK",
            message: jobs.detail,
            detailsJson: jobs.summary as Prisma.InputJsonValue,
            dedupeKey: `jobs:${jobs.status}:${jobs.detail}`,
        });

        this.emitHealthStateLog({
            source: "REALTIME",
            status:
                realtime.status === "down"
                    ? "down"
                    : realtime.status === "degraded"
                        ? "degraded"
                        : presence.status === "down"
                            ? "down"
                            : "healthy",
            category:
                realtime.status !== "healthy"
                    ? "REALTIME_GATEWAY"
                    : presence.status === "down"
                        ? "PRESENCE"
                        : "REALTIME_HEALTHY",
            message:
                realtime.status !== "healthy"
                    ? realtime.detail
                    : presence.status === "down"
                        ? presence.detail
                        : "Realtime gateway health is normal.",
            detailsJson: {
                realtime,
                presence,
            } as Prisma.InputJsonValue,
            dedupeKey: `realtime:${realtime.status}:${presence.status}:${realtime.detail}:${presence.detail}`,
        });

        this.emitHealthStateLog({
            source: "LIVEKIT",
            status: video.status,
            category:
                video.status === "down"
                    ? "LIVEKIT_DOWN"
                    : "LIVEKIT_DEGRADED",
            message: video.detail,
            detailsJson: {
                video,
            } as Prisma.InputJsonValue,
            dedupeKey: `livekit:${video.status}:${video.detail}`,
        });

        if (database.status === "down") {
            alerts.push({
                level: "critical",
                scope: "database",
                message: database.detail,
            });
        }

        if (realtime.status !== "healthy") {
            alerts.push({
                level: "warning",
                scope: "realtime",
                message: realtime.detail,
            });
        }

        if (platform.status !== "healthy") {
            alerts.push({
                level: "warning",
                scope: "platform",
                message: platform.detail,
            });
        }

        if (moderation.status !== "healthy") {
            alerts.push({
                level: "warning",
                scope: "moderation",
                message: moderation.detail,
            });
        }

        if (jobs.status !== "healthy") {
            alerts.push({
                level: jobs.status === "down" ? "critical" : "warning",
                scope: "jobs",
                message: jobs.detail,
            });
        }

        if (video.status !== "healthy") {
            alerts.push({
                level: "critical",
                scope: "video",
                message: video.detail,
            });
        }

        if (uploads.status !== "healthy") {
            alerts.push({
                level: "critical",
                scope: "uploads",
                message: uploads.detail,
            });
        }

        if (email.status !== "healthy") {
            alerts.push({
                level: email.status === "down" ? "critical" : "warning",
                scope: "email",
                message: email.detail,
            });
        }

        if (payments.status !== "healthy") {
            alerts.push({
                level: "warning",
                scope: "payments",
                message: payments.detail,
            });
        }

        if (apiUptime.status !== "healthy") {
            alerts.push({
                level:
                    apiUptime.status === "down"
                        ? "critical"
                        : apiUptime.status === "unknown"
                            ? "info"
                            : "warning",
                scope: "api-uptime",
                message: apiUptime.detail,
            });
        }

        if (logs.status !== "healthy") {
            alerts.push({
                level: logs.status === "down" ? "critical" : "warning",
                scope: "logs",
                message: logs.detail,
            });
        }

        if (host.status !== "healthy") {
            alerts.push({
                level: host.status === "down" ? "critical" : "warning",
                scope: "host",
                message: host.detail,
            });
        }

        if (payouts.status !== "healthy") {
            alerts.push({
                level: "warning",
                scope: "payouts",
                message: payouts.detail,
            });
        }

        if (overallStatus !== "healthy") {
            alerts.unshift({
                level: overallStatus === "down" ? "critical" : "warning",
                scope: "system",
                message:
                    overallStatus === "down"
                        ? "System health is down. One or more critical dependencies failed."
                        : "System health is degraded. One or more subsystems require attention.",
            });
        }

        this.emitHealthStateLog({
            source: "SYSTEM",
            status: overallStatus,
            category:
                overallStatus === "down"
                    ? "SYSTEM_DOWN"
                    : "SYSTEM_DEGRADED",
            message:
                overallStatus === "down"
                    ? "System health is down. One or more critical dependencies failed."
                    : "System health is degraded. One or more subsystems require attention.",
            detailsJson: {
                checks,
                summary,
                alerts,
                generatedAt,
            } as Prisma.InputJsonValue,
            dedupeKey: `system:${overallStatus}:${alerts.map((alert) => `${alert.scope}:${alert.message}`).join("|")}`,
        });

        return {
            generatedAt,
            overallStatus,
            app: this.getAppMetadata(),
            alerts,
            summary,
            checks,
            platform,
            moderation,
            payouts,
            email,
            payments,
            jobs,
            apiUptime,
            logs,
            host,
        };
    }
}
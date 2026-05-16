import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiRouteInventoryService } from "./api-route-inventory.service";

type RecordApiRequestInput = {
    method: string;
    baseUrl?: string;
    routePath?: string | string[];
    rawPath: string;
    statusCode: number;
    durationMs: number;
    occurredAt?: Date;
    errorMessage?: string | null;
};

type ApiUptimeWindowKey = "1h" | "24h" | "7d";

export type ApiUptimeWindowSummary = {
    window: ApiUptimeWindowKey;
    requestCount: number;
    successCount: number;
    clientErrorCount: number;
    serverErrorCount: number;
    uptimePercent: number;
    errorRatePercent: number;
    avgLatencyMs: number | null;
    requestsPerMinute: number;
};

export type ApiEndpointUsageMetric = {
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

@Injectable()
export class ApiObservabilityService {
    private readonly logger = new Logger(ApiObservabilityService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly apiRouteInventory: ApiRouteInventoryService,
    ) { }

    private sanitizePath(value: string) {
        const raw = String(value || "").trim();
        if (!raw) {
            return "/";
        }

        const withoutQuery = raw.split("?")[0]?.split("#")[0] ?? "/";
        const normalized = withoutQuery.replace(/\/+/g, "/").trim();

        if (!normalized || normalized === "/") {
            return "/";
        }

        return normalized.startsWith("/")
            ? normalized.replace(/\/$/, "") || "/"
            : `/${normalized.replace(/\/$/, "")}`;
    }

    private normalizeRoutePattern(
        baseUrl?: string,
        routePath?: string | string[],
        rawPath?: string,
    ): string {
        const normalizedBaseUrl = this.sanitizePath(baseUrl || "/");

        if (typeof routePath === "string" && routePath.trim()) {
            const normalizedRoutePath = this.sanitizePath(routePath);
            if (normalizedBaseUrl === "/") {
                return normalizedRoutePath;
            }

            if (normalizedRoutePath === "/") {
                return normalizedBaseUrl;
            }

            return this.sanitizePath(`${normalizedBaseUrl}/${normalizedRoutePath}`);
        }

        if (Array.isArray(routePath) && routePath.length > 0) {
            const first = String(routePath[0] || "").trim();
            if (first) {
                return this.normalizeRoutePattern(baseUrl, first, rawPath);
            }
        }

        return this.sanitizePath(rawPath || "/");
    }

    private floorToMinute(value: Date) {
        const next = new Date(value);
        next.setSeconds(0, 0);
        return next;
    }

    private toPercent(numerator: number, denominator: number) {
        if (!denominator) {
            return 100;
        }

        return Number(((numerator / denominator) * 100).toFixed(2));
    }

    private calculateUptimePercent(
        requestCount: number,
        serverErrorCount: number,
    ) {
        if (!requestCount) {
            return 100;
        }

        return this.toPercent(requestCount - serverErrorCount, requestCount);
    }

    private categorizeRoute(routePattern: string) {
        const path = this.sanitizePath(routePattern).toLowerCase();

        if (path.startsWith("/auth")) return "Auth";
        if (path.startsWith("/users")) return "Users";
        if (path.startsWith("/streams")) return "Streams";
        if (path.startsWith("/chat")) return "Chat";
        if (path.startsWith("/gifts")) return "Gifts";
        if (path.startsWith("/battles")) return "Battles";
        if (path.startsWith("/payments")) return "Payments";
        if (path.startsWith("/payouts")) return "Payouts";
        if (path.startsWith("/email")) return "Email";
        if (path.startsWith("/uploads") || path.startsWith("/media")) return "Media";
        if (
            path.startsWith("/video") ||
            path.startsWith("/realtime") ||
            path.startsWith("/presence")
        ) {
            return "Realtime";
        }
        if (path.startsWith("/admin/system")) return "System";
        if (path.startsWith("/admin")) return "Admin";

        return "Other";
    }

    async recordRequest(input: RecordApiRequestInput) {
        const occurredAt = input.occurredAt ?? new Date();
        const method = String(input.method || "GET").toUpperCase();
        const routePattern = this.normalizeRoutePattern(
            input.baseUrl,
            input.routePath,
            input.rawPath,
        );
        const routeCategory = this.categorizeRoute(routePattern);
        const routeKey = `${method} ${routePattern}`;
        const bucketStart = this.floorToMinute(occurredAt);

        const requestCount = 1;
        const successCount =
            input.statusCode >= 200 && input.statusCode < 400 ? 1 : 0;
        const clientErrorCount =
            input.statusCode >= 400 && input.statusCode < 500 ? 1 : 0;
        const serverErrorCount = input.statusCode >= 500 ? 1 : 0;
        const totalDurationMs = Math.max(0, Math.round(input.durationMs));

        try {
            await this.prisma.apiRequestMetricBucket.upsert({
                where: {
                    bucketStart_routeKey: {
                        bucketStart,
                        routeKey,
                    },
                },
                create: {
                    bucketStart,
                    routeKey,
                    routeCategory,
                    method,
                    routePattern,
                    requestCount,
                    successCount,
                    clientErrorCount,
                    serverErrorCount,
                    totalDurationMs,
                    lastStatusCode: input.statusCode,
                    lastSeenAt: occurredAt,
                    lastErrorAt:
                        serverErrorCount > 0 || input.errorMessage
                            ? occurredAt
                            : null,
                    lastErrorMessage:
                        serverErrorCount > 0 || input.errorMessage
                            ? String(
                                input.errorMessage ||
                                `HTTP ${input.statusCode}`,
                            ).slice(0, 1000)
                            : null,
                },
                update: {
                    requestCount: {
                        increment: requestCount,
                    },
                    successCount: {
                        increment: successCount,
                    },
                    clientErrorCount: {
                        increment: clientErrorCount,
                    },
                    serverErrorCount: {
                        increment: serverErrorCount,
                    },
                    totalDurationMs: {
                        increment: totalDurationMs,
                    },
                    lastStatusCode: input.statusCode,
                    lastSeenAt: occurredAt,
                    ...(serverErrorCount > 0 || input.errorMessage
                        ? {
                            lastErrorAt: occurredAt,
                            lastErrorMessage: String(
                                input.errorMessage || `HTTP ${input.statusCode}`,
                            ).slice(0, 1000),
                        }
                        : {}),
                },
            });
        } catch (error) {
            this.logger.error(
                `Failed to record API request telemetry for ${routeKey}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private async getWindowSummary(
        window: ApiUptimeWindowKey,
        since: Date,
        minutes: number,
    ): Promise<ApiUptimeWindowSummary> {
        const aggregate = await this.prisma.apiRequestMetricBucket.aggregate({
            where: {
                bucketStart: {
                    gte: since,
                },
            },
            _sum: {
                requestCount: true,
                successCount: true,
                clientErrorCount: true,
                serverErrorCount: true,
                totalDurationMs: true,
            },
        });

        const requestCount = aggregate._sum.requestCount ?? 0;
        const successCount = aggregate._sum.successCount ?? 0;
        const clientErrorCount = aggregate._sum.clientErrorCount ?? 0;
        const serverErrorCount = aggregate._sum.serverErrorCount ?? 0;
        const totalDurationMs = aggregate._sum.totalDurationMs ?? 0;

        return {
            window,
            requestCount,
            successCount,
            clientErrorCount,
            serverErrorCount,
            uptimePercent: this.calculateUptimePercent(
                requestCount,
                serverErrorCount,
            ),
            errorRatePercent: this.toPercent(serverErrorCount, requestCount),
            avgLatencyMs:
                requestCount > 0
                    ? Number((totalDurationMs / requestCount).toFixed(2))
                    : null,
            requestsPerMinute:
                minutes > 0
                    ? Number((requestCount / minutes).toFixed(2))
                    : 0,
        };
    }

    async getApiUptimeSummary() {
        const now = Date.now();

        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const [last1Hour, last24Hours, last7Days] = await Promise.all([
            this.getWindowSummary("1h", oneHourAgo, 60),
            this.getWindowSummary("24h", oneDayAgo, 24 * 60),
            this.getWindowSummary("7d", sevenDaysAgo, 7 * 24 * 60),
        ]);

        return {
            last1Hour,
            last24Hours,
            last7Days,
        };
    }

    async getEndpointMetrics(hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const rows = await this.prisma.apiRequestMetricBucket.groupBy({
            by: ["routeCategory", "routeKey", "method", "routePattern"],
            where: {
                bucketStart: {
                    gte: since,
                },
            },
            _sum: {
                requestCount: true,
                successCount: true,
                clientErrorCount: true,
                serverErrorCount: true,
                totalDurationMs: true,
            },
            _max: {
                lastSeenAt: true,
                lastErrorAt: true,
            },
            orderBy: [
                {
                    routeCategory: "asc",
                },
                {
                    routePattern: "asc",
                },
            ],
        });

        const observedMetrics: ApiEndpointUsageMetric[] = rows.map((row) => {
            const requestCount = row._sum.requestCount ?? 0;
            const successCount = row._sum.successCount ?? 0;
            const clientErrorCount = row._sum.clientErrorCount ?? 0;
            const serverErrorCount = row._sum.serverErrorCount ?? 0;
            const totalDurationMs = row._sum.totalDurationMs ?? 0;

            return {
                category: row.routeCategory,
                method: row.method,
                routePattern: row.routePattern,
                routeKey: row.routeKey,
                requestCount,
                successCount,
                clientErrorCount,
                serverErrorCount,
                uptimePercent: this.calculateUptimePercent(
                    requestCount,
                    serverErrorCount,
                ),
                errorRatePercent: this.toPercent(serverErrorCount, requestCount),
                avgLatencyMs:
                    requestCount > 0
                        ? Number((totalDurationMs / requestCount).toFixed(2))
                        : null,
                lastSeenAt: row._max.lastSeenAt
                    ? row._max.lastSeenAt.toISOString()
                    : null,
                lastErrorAt: row._max.lastErrorAt
                    ? row._max.lastErrorAt.toISOString()
                    : null,
            };
        });

        const merged = new Map<string, ApiEndpointUsageMetric>(
            observedMetrics.map((metric) => [metric.routeKey, metric]),
        );

        for (const route of this.apiRouteInventory.getRouteInventory()) {
            const existing = merged.get(route.routeKey);

            if (existing) {
                existing.category = route.category;
                existing.method = route.method;
                existing.routePattern = route.routePattern;
                continue;
            }

            merged.set(route.routeKey, {
                category: route.category,
                method: route.method,
                routePattern: route.routePattern,
                routeKey: route.routeKey,
                requestCount: 0,
                successCount: 0,
                clientErrorCount: 0,
                serverErrorCount: 0,
                uptimePercent: 100,
                errorRatePercent: 0,
                avgLatencyMs: null,
                lastSeenAt: null,
                lastErrorAt: null,
            });
        }

        const metrics = Array.from(merged.values());

        const categoryOrder = [
            "System",
            "Admin",
            "Auth",
            "Users",
            "Streams",
            "Realtime",
            "Chat",
            "Gifts",
            "Battles",
            "Payments",
            "Payouts",
            "Email",
            "Media",
            "Other",
        ];

        metrics.sort((a, b) => {
            const categoryDelta =
                categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);

            if (categoryDelta !== 0) {
                return categoryDelta;
            }

            if (a.routePattern !== b.routePattern) {
                return a.routePattern.localeCompare(b.routePattern);
            }

            return a.method.localeCompare(b.method);
        });

        return metrics;
    }
}
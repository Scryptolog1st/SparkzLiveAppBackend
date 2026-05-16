import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, throwError } from "rxjs";
import { catchError, finalize } from "rxjs/operators";

import { ApiObservabilityService } from "./api-observability.service";
import { SystemLogEventsService } from "./system-log-events.service";

type RequestWithRoute = Request & {
    route?: {
        path?: string | string[];
    };
    baseUrl?: string;
    originalUrl?: string;
};

@Injectable()
export class ApiObservabilityInterceptor implements NestInterceptor {
    constructor(
        private readonly apiObservability: ApiObservabilityService,
        private readonly systemLogEvents: SystemLogEventsService,
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

    private buildRoutePattern(req: RequestWithRoute) {
        const base = this.sanitizePath(req.baseUrl || "/");
        const route =
            typeof req.route?.path === "string"
                ? this.sanitizePath(req.route.path)
                : "/";

        if (base === "/" && route === "/") {
            return this.sanitizePath(req.originalUrl || req.url || "/");
        }

        if (base === "/") {
            return route;
        }

        if (route === "/") {
            return base;
        }

        return this.sanitizePath(`${base}/${route}`);
    }

    private isHealthStreamRoute(routePattern: string) {
        return routePattern === "/admin/system/health/stream";
    }

    private isEventStreamRequest(req: RequestWithRoute) {
        const accept = String(req.headers?.accept || "").toLowerCase();
        return accept.includes("text/event-stream");
    }

    private shouldSkipSlowRequestLog(
        req: RequestWithRoute,
        routePattern: string,
        statusCode: number,
    ) {
        if (statusCode >= 400) {
            return false;
        }

        if (this.isHealthStreamRoute(routePattern)) {
            return true;
        }

        return this.isEventStreamRequest(req);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.getType() !== "http") {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest<RequestWithRoute>();
        const res = context.switchToHttp().getResponse<Response>();

        const startedAt = process.hrtime.bigint();
        let capturedErrorMessage: string | null = null;

        return next.handle().pipe(
            catchError((error) => {
                capturedErrorMessage =
                    error instanceof Error
                        ? error.message
                        : "Unhandled request failure.";

                return throwError(() => error);
            }),
            finalize(() => {
                const durationMs =
                    Number(process.hrtime.bigint() - startedAt) / 1_000_000;

                const statusCode = Number(res.statusCode || 500);
                const routePattern = this.buildRoutePattern(req);
                const shouldSkipSlowRequestLog = this.shouldSkipSlowRequestLog(
                    req,
                    routePattern,
                    statusCode,
                );

                void this.apiObservability.recordRequest({
                    method: req.method,
                    baseUrl: req.baseUrl,
                    routePath: req.route?.path,
                    rawPath: req.originalUrl || req.url || "/",
                    statusCode,
                    durationMs,
                    errorMessage: capturedErrorMessage,
                });

                if (statusCode >= 500) {
                    void this.systemLogEvents.write({
                        source: "API",
                        level: "ERROR",
                        category: "SERVER_ERROR",
                        message:
                            capturedErrorMessage ||
                            `${req.method} ${routePattern} returned ${statusCode}.`,
                        requestId: (req.headers["x-request-id"] as string) || null,
                        route: routePattern,
                        method: req.method,
                        statusCode,
                        durationMs: Math.round(durationMs),
                        detailsJson: {
                            originalUrl: req.originalUrl || req.url || "/",
                            errorMessage: capturedErrorMessage,
                        },
                    });
                } else if (statusCode >= 400) {
                    void this.systemLogEvents.write({
                        source: "API",
                        level: "WARN",
                        category: "CLIENT_ERROR",
                        message: `${req.method} ${routePattern} returned ${statusCode}.`,
                        requestId: (req.headers["x-request-id"] as string) || null,
                        route: routePattern,
                        method: req.method,
                        statusCode,
                        durationMs: Math.round(durationMs),
                        detailsJson: {
                            originalUrl: req.originalUrl || req.url || "/",
                            errorMessage: capturedErrorMessage,
                        },
                    });
                } else if (durationMs >= 2_000 && !shouldSkipSlowRequestLog) {
                    void this.systemLogEvents.write({
                        source: "API",
                        level: "WARN",
                        category: "SLOW_REQUEST",
                        message: `${req.method} ${routePattern} exceeded slow-request threshold.`,
                        requestId: (req.headers["x-request-id"] as string) || null,
                        route: routePattern,
                        method: req.method,
                        statusCode,
                        durationMs: Math.round(durationMs),
                        detailsJson: {
                            originalUrl: req.originalUrl || req.url || "/",
                        },
                    });
                }
            }),
        );
    }
}
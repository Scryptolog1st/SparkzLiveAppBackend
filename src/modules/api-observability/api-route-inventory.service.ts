import { Injectable, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { ModulesContainer } from "@nestjs/core";

export type ApiRouteInventoryEntry = {
    category: string;
    method: string;
    routePattern: string;
    routeKey: string;
};

@Injectable()
export class ApiRouteInventoryService {
    private cachedInventory: ApiRouteInventoryEntry[] | null = null;

    constructor(private readonly modulesContainer: ModulesContainer) { }

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

    private pathVariants(value?: string | string[]) {
        if (Array.isArray(value)) {
            const next = Array.from(
                new Set(
                    value
                        .map((item) => this.sanitizePath(String(item || "")))
                        .filter(Boolean),
                ),
            );

            return next.length > 0 ? next : ["/"];
        }

        if (typeof value === "string" && value.trim()) {
            return [this.sanitizePath(value)];
        }

        return ["/"];
    }

    private combinePaths(
        controllerPath?: string | string[],
        handlerPath?: string | string[],
    ) {
        const controllerPaths = this.pathVariants(controllerPath);
        const handlerPaths = this.pathVariants(handlerPath);
        const combined = new Set<string>();

        for (const base of controllerPaths) {
            for (const child of handlerPaths) {
                if (base === "/" && child === "/") {
                    combined.add("/");
                } else if (base === "/") {
                    combined.add(child);
                } else if (child === "/") {
                    combined.add(base);
                } else {
                    combined.add(this.sanitizePath(`${base}/${child}`));
                }
            }
        }

        return Array.from(combined);
    }

    private getMethodLabel(method: RequestMethod) {
        switch (method) {
            case RequestMethod.GET:
                return "GET";
            case RequestMethod.POST:
                return "POST";
            case RequestMethod.PUT:
                return "PUT";
            case RequestMethod.DELETE:
                return "DELETE";
            case RequestMethod.PATCH:
                return "PATCH";
            case RequestMethod.OPTIONS:
                return "OPTIONS";
            case RequestMethod.HEAD:
                return "HEAD";
            case RequestMethod.ALL:
                return "ALL";
            default:
                return "OTHER";
        }
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

    private sortInventory(entries: ApiRouteInventoryEntry[]) {
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

        return [...entries].sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a.category);
            const bIndex = categoryOrder.indexOf(b.category);

            if (aIndex !== bIndex) {
                return aIndex - bIndex;
            }

            if (a.routePattern !== b.routePattern) {
                return a.routePattern.localeCompare(b.routePattern);
            }

            return a.method.localeCompare(b.method);
        });
    }

    getRouteInventory() {
        if (this.cachedInventory) {
            return this.cachedInventory;
        }

        const discovered = new Map<string, ApiRouteInventoryEntry>();

        for (const moduleRef of this.modulesContainer.values()) {
            for (const controllerWrapper of moduleRef.controllers.values()) {
                const instance = controllerWrapper.instance;
                const metatype = controllerWrapper.metatype;

                if (!instance || !metatype) {
                    continue;
                }

                const controllerPath = Reflect.getMetadata(
                    PATH_METADATA,
                    metatype,
                ) as string | string[] | undefined;

                const prototype = Object.getPrototypeOf(instance);
                if (!prototype) {
                    continue;
                }

                for (const methodName of Object.getOwnPropertyNames(prototype)) {
                    if (methodName === "constructor") {
                        continue;
                    }

                    const handler = prototype[methodName];
                    if (typeof handler !== "function") {
                        continue;
                    }

                    const requestMethod = Reflect.getMetadata(
                        METHOD_METADATA,
                        handler,
                    ) as RequestMethod | undefined;

                    if (requestMethod === undefined) {
                        continue;
                    }

                    const handlerPath = Reflect.getMetadata(
                        PATH_METADATA,
                        handler,
                    ) as string | string[] | undefined;

                    const method = this.getMethodLabel(requestMethod);

                    for (const routePattern of this.combinePaths(
                        controllerPath,
                        handlerPath,
                    )) {
                        const category = this.categorizeRoute(routePattern);
                        const routeKey = `${method} ${routePattern}`;

                        discovered.set(routeKey, {
                            category,
                            method,
                            routePattern,
                            routeKey,
                        });
                    }
                }
            }
        }

        this.cachedInventory = this.sortInventory(Array.from(discovered.values()));
        return this.cachedInventory;
    }
}
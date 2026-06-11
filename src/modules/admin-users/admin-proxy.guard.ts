import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AdminRolePermissionsService } from "./admin-role-permissions.service";
import { PrismaService } from "../prisma/prisma.service";

type AdminProxyRequest = Request & {
    adminUser?: {
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        permissions: string[];
    };
};

@Injectable()
export class AdminProxyGuard implements CanActivate {
    constructor(
        private readonly prisma: PrismaService,
        private readonly rolePermissions: AdminRolePermissionsService,
    ) { }

    private getHeader(req: Request, name: string) {
        const value = req.headers[name];

        if (Array.isArray(value)) {
            return value[0] ?? "";
        }

        return typeof value === "string" ? value : "";
    }

    private short(value: string) {
        const normalized = String(value || "").trim();

        if (!normalized) {
            return "";
        }

        if (normalized.length <= 12) {
            return normalized;
        }

        return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
    }

    async canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<AdminProxyRequest>();
        const path = req.originalUrl || req.url || "";

        const configuredSecret = String(
            process.env.ADMIN_API_SHARED_SECRET || "",
        ).trim();

        const providedSecret = this.getHeader(req, "x-admin-shared-secret").trim();
        const adminUserId = this.getHeader(req, "x-admin-user-id").trim();
        const adminEmail = this.getHeader(req, "x-admin-email")
            .trim()
            .toLowerCase();

        console.info("[AdminProxyGuard] Incoming request", {
            path,
            hasConfiguredSecret: Boolean(configuredSecret),
            hasProvidedSecret: Boolean(providedSecret),
            adminUserId: this.short(adminUserId),
            hasIdentityHeader: Boolean(adminEmail),
        });

        if (!configuredSecret) {
            console.error("[AdminProxyGuard] Missing configured shared secret", {
                path,
            });

            throw new ForbiddenException(
                "Admin API shared secret is not configured.",
            );
        }

        if (!providedSecret || providedSecret !== configuredSecret) {
            console.error("[AdminProxyGuard] Invalid shared secret", {
                path,
                hasProvidedSecret: Boolean(providedSecret),
                adminUserId: this.short(adminUserId),
                hasIdentityHeader: Boolean(adminEmail),
            });

            throw new UnauthorizedException("Invalid admin API credentials.");
        }

        if (!adminUserId) {
            console.error("[AdminProxyGuard] Missing admin user identity", {
                path,
                hasIdentityHeader: Boolean(adminEmail),
            });

            throw new UnauthorizedException("Missing admin user identity.");
        }

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
            console.error("[AdminProxyGuard] Admin account not found", {
                path,
                adminUserId: this.short(adminUserId),
                hasIdentityHeader: Boolean(adminEmail),
            });

            throw new UnauthorizedException("Admin account not found.");
        }

        if (!adminUser.isActive) {
            console.error("[AdminProxyGuard] Admin account inactive", {
                path,
                adminUserId: this.short(adminUserId),
                hasIdentityHeader: Boolean(adminEmail),
            });

            throw new ForbiddenException("Admin account is inactive.");
        }

        if (adminEmail && adminEmail !== adminUser.email.toLowerCase()) {
            console.error("[AdminProxyGuard] Admin identity mismatch", {
                path,
                adminUserId: this.short(adminUserId),
                hasIdentityHeader: Boolean(adminEmail),
                emailMatchesAccount: false,
            });

            throw new UnauthorizedException("Admin identity mismatch.");
        }

        req.adminUser = {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
            isActive: adminUser.isActive,
            permissions: await this.rolePermissions.getEffectivePermissions(adminUser.role),
        };

        console.info("[AdminProxyGuard] Authorization passed", {
            path,
            adminUserId: this.short(adminUser.id),
            adminRole: adminUser.role,
        });

        return true;
    }
}
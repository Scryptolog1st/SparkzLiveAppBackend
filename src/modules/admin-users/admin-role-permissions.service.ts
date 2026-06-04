import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { AdminRole } from "@prisma/client";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
    ADMIN_PERMISSIONS,
    ALL_ADMIN_PERMISSIONS,
    getDefaultAdminPermissionsForRole,
    hasAdminPermission,
    isAdminPermission,
    type AdminPermission,
} from "./admin-permissions";

@Injectable()
export class AdminRolePermissionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly adminAudit: AdminAuditService,
    ) { }

    private readonly roles: AdminRole[] = [
        "SUPER_ADMIN",
        "ADMIN",
        "MODERATOR",
        "ANALYST",
    ];

    private readonly effectivePermissionsCacheTtlMs = 30_000;

    private readonly effectivePermissionsCache = new Map<
        AdminRole,
        { expiresAtMs: number; permissions: AdminPermission[] }
    >();

    private getCachedEffectivePermissions(role: AdminRole) {
        const cached = this.effectivePermissionsCache.get(role);

        if (!cached) {
            return null;
        }

        if (cached.expiresAtMs <= Date.now()) {
            this.effectivePermissionsCache.delete(role);
            return null;
        }

        return [...cached.permissions];
    }

    private setCachedEffectivePermissions(
        role: AdminRole,
        permissions: AdminPermission[],
    ) {
        this.effectivePermissionsCache.set(role, {
            expiresAtMs: Date.now() + this.effectivePermissionsCacheTtlMs,
            permissions: [...permissions],
        });

        return [...permissions];
    }

    private invalidateEffectivePermissions(role: AdminRole) {
        this.effectivePermissionsCache.delete(role);
    }

    private normalizeRole(raw: string): AdminRole {
        const value = String(raw || "").trim().toUpperCase();

        if (!this.roles.includes(value as AdminRole)) {
            throw new BadRequestException("Invalid admin role.");
        }

        return value as AdminRole;
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

    private normalizePermissionList(values: string[]): AdminPermission[] {
        return Array.from(
            new Set(
                (values || [])
                    .map((value) => String(value || "").trim())
                    .filter((value): value is AdminPermission => isAdminPermission(value)),
            ),
        ).sort((a, b) => a.localeCompare(b));
    }

    async getEffectivePermissions(role: AdminRole): Promise<AdminPermission[]> {
        // SUPER_ADMIN is the platform owner role. It must always receive every
        // registered backend permission, even when custom role rows exist.
        // The Permissions Manager can still display and manage the role, but
        // backend authorization should not lock out the owner role when new
        // permissions are added.
        if (role === "SUPER_ADMIN") {
            return ALL_ADMIN_PERMISSIONS;
        }

        const cached = this.getCachedEffectivePermissions(role);

        if (cached) {
            return cached;
        }

        const rows = await this.prisma.adminRolePermission.findMany({
            where: { role },
            select: {
                permission: true,
                enabled: true,
            },
        });

        if (!rows.length) {
            return this.setCachedEffectivePermissions(
                role,
                getDefaultAdminPermissionsForRole(role),
            );
        }

        return this.setCachedEffectivePermissions(
            role,
            rows
                .filter((row) => row.enabled)
                .map((row) => row.permission)
                .filter((value): value is AdminPermission => isAdminPermission(value)),
        );
    }

    async listRolePermissions(adminUserId: string) {
        const actor = await this.requireAdmin(adminUserId);
        const actorPermissions = await this.getEffectivePermissions(actor.role);

        if (!hasAdminPermission(actorPermissions, ADMIN_PERMISSIONS.PERMISSIONS_VIEW)) {
            throw new ForbiddenException("Missing permission: admin.permissions.view");
        }

        const rows = await this.prisma.adminRolePermission.findMany({
            orderBy: [{ role: "asc" }, { permission: "asc" }],
            select: {
                role: true,
                permission: true,
                enabled: true,
            },
        });

        const rowsByRole = new Map<
            AdminRole,
            Array<{ permission: string; enabled: boolean }>
        >();

        for (const row of rows) {
            const existing = rowsByRole.get(row.role) ?? [];
            existing.push(row);
            rowsByRole.set(row.role, existing);
        }

        const items = await Promise.all(
            this.roles.map(async (role) => {
                const hasCustomRows = (rowsByRole.get(role) ?? []).length > 0;
                const enabled = new Set(
                    hasCustomRows
                        ? (rowsByRole.get(role) ?? [])
                            .filter((row) => row.enabled)
                            .map((row) => row.permission)
                            .filter((value): value is AdminPermission => isAdminPermission(value))
                        : await this.getEffectivePermissions(role),
                );

                return {
                    role,
                    source: hasCustomRows ? "custom" : "default",
                    permissions: ALL_ADMIN_PERMISSIONS.map((permission) => ({
                        permission,
                        enabled: enabled.has(permission),
                    })),
                };
            }),
        );

        return {
            items,
            availablePermissions: ALL_ADMIN_PERMISSIONS,
        };
    }

    async updateRolePermissions(
        adminUserId: string,
        roleInput: string,
        rawPermissions: string[],
    ) {
        const actor = await this.requireAdmin(adminUserId);
        const actorPermissions = await this.getEffectivePermissions(actor.role);

        if (!hasAdminPermission(actorPermissions, ADMIN_PERMISSIONS.PERMISSIONS_MANAGE)) {
            throw new ForbiddenException("Missing permission: admin.permissions.manage");
        }

        const role = this.normalizeRole(roleInput);
        const previousPermissions = this.normalizePermissionList(
            await this.getEffectivePermissions(role),
        );

        const normalizedPermissions = Array.from(
            new Set(
                (rawPermissions || [])
                    .map((value) => String(value || "").trim())
                    .filter(Boolean),
            ),
        );

        const invalid = normalizedPermissions.filter(
            (value) => !isAdminPermission(value),
        );

        if (invalid.length > 0) {
            throw new BadRequestException(
                `Invalid admin permissions: ${invalid.join(", ")}`,
            );
        }

        const enabledSet = new Set(normalizedPermissions);

        this.invalidateEffectivePermissions(role);

        await this.prisma.$transaction(
            ALL_ADMIN_PERMISSIONS.map((permission) =>
                this.prisma.adminRolePermission.upsert({
                    where: {
                        role_permission: {
                            role,
                            permission,
                        },
                    },
                    update: {
                        enabled: enabledSet.has(permission),
                    },
                    create: {
                        role,
                        permission,
                        enabled: enabledSet.has(permission),
                    },
                }),
            ),
        );

        const nextPermissions = this.normalizePermissionList(
            ALL_ADMIN_PERMISSIONS.filter((permission) => enabledSet.has(permission)),
        );

        this.setCachedEffectivePermissions(role, nextPermissions);

        const addedPermissions = nextPermissions.filter(
            (permission) => !previousPermissions.includes(permission),
        );
        const removedPermissions = previousPermissions.filter(
            (permission) => !nextPermissions.includes(permission),
        );

        await this.adminAudit.logEvent({
            actorAdminUserId: adminUserId,
            actionType: "PERMISSION_ACTION",
            actionCode: "admin.permission.update",
            actionLabel: "Updated admin role permissions",
            resourceType: "ADMIN",
            resourceId: role,
            target: {
                id: role,
                name: role,
                type: "ADMIN_ROLE",
            },
            metadata: {
                role,
                source: "custom",
                addedPermissions,
                removedPermissions,
            },
            beforeState: {
                permissions: previousPermissions,
            },
            afterState: {
                permissions: nextPermissions,
            },
            diff: {
                addedPermissions,
                removedPermissions,
            },
        });

        return {
            success: true,
            role,
            source: "custom",
            permissions: ALL_ADMIN_PERMISSIONS.map((permission) => ({
                permission,
                enabled: enabledSet.has(permission),
            })),
        };
    }

    async resetRolePermissions(adminUserId: string, roleInput: string) {
        const actor = await this.requireAdmin(adminUserId);
        const actorPermissions = await this.getEffectivePermissions(actor.role);

        if (!hasAdminPermission(actorPermissions, ADMIN_PERMISSIONS.PERMISSIONS_MANAGE)) {
            throw new ForbiddenException("Missing permission: admin.permissions.manage");
        }

        const role = this.normalizeRole(roleInput);
        const previousPermissions = this.normalizePermissionList(
            await this.getEffectivePermissions(role),
        );

        this.invalidateEffectivePermissions(role);

        await this.prisma.adminRolePermission.deleteMany({
            where: { role },
        });

        const enabledDefaults = new Set(getDefaultAdminPermissionsForRole(role));
        const nextPermissions = this.normalizePermissionList(
            Array.from(enabledDefaults),
        );

        this.setCachedEffectivePermissions(role, nextPermissions);

        const addedPermissions = nextPermissions.filter(
            (permission) => !previousPermissions.includes(permission),
        );
        const removedPermissions = previousPermissions.filter(
            (permission) => !nextPermissions.includes(permission),
        );

        await this.adminAudit.logEvent({
            actorAdminUserId: adminUserId,
            actionType: "PERMISSION_ACTION",
            actionCode: "admin.permission.reset",
            actionLabel: "Reset admin role permissions",
            resourceType: "ADMIN",
            resourceId: role,
            target: {
                id: role,
                name: role,
                type: "ADMIN_ROLE",
            },
            metadata: {
                role,
                source: "default",
                addedPermissions,
                removedPermissions,
            },
            beforeState: {
                permissions: previousPermissions,
            },
            afterState: {
                permissions: nextPermissions,
            },
            diff: {
                addedPermissions,
                removedPermissions,
            },
        });

        return {
            success: true,
            role,
            source: "default",
            permissions: ALL_ADMIN_PERMISSIONS.map((permission) => ({
                permission,
                enabled: enabledDefaults.has(permission),
            })),
        };
    }
}
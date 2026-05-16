import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { ADMIN_PERMISSION_KEY } from "./require-admin-permission.decorator";

type AdminPermissionRequest = Request & {
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
export class AdminPermissionGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext) {
        const requiredPermission = this.reflector.getAllAndOverride<string>(
            ADMIN_PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermission) {
            return true;
        }

        const req = context.switchToHttp().getRequest<AdminPermissionRequest>();
        const permissions = Array.isArray(req.adminUser?.permissions)
            ? req.adminUser?.permissions
            : [];

        if (!permissions.includes(requiredPermission)) {
            throw new ForbiddenException(
                `Missing admin permission: ${requiredPermission}`,
            );
        }

        return true;
    }
}
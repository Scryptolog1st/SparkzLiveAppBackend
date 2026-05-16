import { SetMetadata } from "@nestjs/common";
import type { AdminPermission } from "./admin-permissions";

export const ADMIN_PERMISSION_KEY = "admin_permission";

export function RequireAdminPermission(permission: AdminPermission) {
    return SetMetadata(ADMIN_PERMISSION_KEY, permission);
}
import type { AdminRole } from "@prisma/client";

export type StaffIdentityInput = {
    id?: string | null;
    role?: AdminRole | string | null;
};

export function getAdminRoleLabel(role?: AdminRole | string | null) {
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

export function getAnonymousStaffSuffix(id?: string | null) {
    const normalized = String(id || "").replace(/[^a-zA-Z0-9]/g, "");

    if (!normalized) {
        return "UNKNOWN";
    }

    return normalized.slice(-6).toUpperCase();
}

export function getAnonymousStaffLabel(input: StaffIdentityInput) {
    return `${getAdminRoleLabel(input.role)} ${getAnonymousStaffSuffix(input.id)}`;
}

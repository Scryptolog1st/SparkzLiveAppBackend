export const STREAM_STAFF_ROLES = [
  "VIEWER",
  "MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type StreamStaffRoleValue = (typeof STREAM_STAFF_ROLES)[number];

export const STREAM_PERMISSION_KEYS = [
  "MUTE_CHAT",
  "KICK_VIEWER",
  "BAN_VIEWER",
  "CONTROL_GUEST_MEDIA",
  "REMOVE_GUESTS",
  "APPROVE_GUEST_REQUESTS",
  "CHANGE_LAYOUT",
  "EDIT_STREAM_GOAL",
  "EDIT_PINNED_MESSAGE",
  "ASSIGN_STAFF_ROLES",
] as const;

export type StreamPermissionKeyValue = (typeof STREAM_PERMISSION_KEYS)[number];

export const STREAM_PERMISSION_LABELS: Record<StreamPermissionKeyValue, string> = {
  MUTE_CHAT: "Mute in chat",
  KICK_VIEWER: "Kick viewer",
  BAN_VIEWER: "Ban viewer",
  CONTROL_GUEST_MEDIA: "Guest box control",
  REMOVE_GUESTS: "Remove guests",
  APPROVE_GUEST_REQUESTS: "Approve guest requests",
  CHANGE_LAYOUT: "Change layout",
  EDIT_STREAM_GOAL: "Edit stream goal",
  EDIT_PINNED_MESSAGE: "Edit pinned message",
  ASSIGN_STAFF_ROLES: "Assign staff roles",
};

export const DEFAULT_STREAM_ROLE_PERMISSIONS: Record<
  StreamStaffRoleValue,
  StreamPermissionKeyValue[]
> = {
  VIEWER: [],
  MODERATOR: [
    "MUTE_CHAT",
    "KICK_VIEWER",
    "BAN_VIEWER",
    "CONTROL_GUEST_MEDIA",
    "REMOVE_GUESTS",
    "APPROVE_GUEST_REQUESTS",
  ],
  ADMIN: [
    "MUTE_CHAT",
    "KICK_VIEWER",
    "BAN_VIEWER",
    "CONTROL_GUEST_MEDIA",
    "REMOVE_GUESTS",
    "APPROVE_GUEST_REQUESTS",
    "CHANGE_LAYOUT",
    "EDIT_STREAM_GOAL",
    "EDIT_PINNED_MESSAGE",
    "ASSIGN_STAFF_ROLES",
  ],
  SUPER_ADMIN: [...STREAM_PERMISSION_KEYS],
};

export function isStreamStaffRole(value: string): value is StreamStaffRoleValue {
  return STREAM_STAFF_ROLES.includes(value as StreamStaffRoleValue);
}

export function isStreamPermissionKey(value: string): value is StreamPermissionKeyValue {
  return STREAM_PERMISSION_KEYS.includes(value as StreamPermissionKeyValue);
}

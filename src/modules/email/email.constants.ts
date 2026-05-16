export const EMAIL_CATEGORY_VALUES = [
    "AUTH_VERIFY_EMAIL",
    "AUTH_PASSWORD_RESET",
    "AUTH_EMAIL_CHANGE_VERIFY",
    "BAN_APPEAL_RECEIVED",
    "BAN_APPEAL_APPROVED",
    "BAN_APPEAL_DENIED",
    "ACCOUNT_CREATED",
    "ACCOUNT_DELETED",
    "PURCHASE_CONFIRMATION",
    "PAYOUT_REQUEST_RECEIVED",
    "PAYOUT_APPROVED",
    "PAYOUT_DENIED",
    "PAYOUT_PROCESSED",
    "SUPPORT_REPLY",
    "ADMIN_MANUAL_MESSAGE",
    "MARKETING_CAMPAIGN",
] as const;

export const SMTP_ACCOUNT_STATUS_VALUES = [
    "ACTIVE",
    "DISABLED",
    "FAILING",
    "ARCHIVED",
] as const;

// legacy table status values
export const EMAIL_TEMPLATE_STATUS_VALUES = [
    "DRAFT",
    "ACTIVE",
] as const;

// filter compatibility values
export const EMAIL_TEMPLATE_FILTER_STATUS_VALUES = [
    "DRAFT",
    "ACTIVE",
    "PUBLISHED",
    "ARCHIVED",
] as const;

export const EMAIL_TEMPLATE_EDITOR_TYPE_VALUES = [
    "MJML",
    "HTML",
] as const;

export const EMAIL_TEMPLATE_VERSION_STATUS_VALUES = [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED",
] as const;

export const EMAIL_DELIVERY_STATUS_VALUES = [
    "QUEUED",
    "SENDING",
    "SENT",
    "FAILED",
    "BOUNCED",
] as const;
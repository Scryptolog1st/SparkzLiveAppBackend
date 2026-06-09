export function sanitizeNotificationFailureReason(value: string) {
    return (
        String(value || "")
            .replace(/\s+/g, " ")
            .replace(/ExponentPushToken\[[^\]]+\]/g, "ExponentPushToken[redacted]")
            .replace(/Bearer\s+[A-Za-z0-9._+\/=-]+/gi, "Bearer [redacted]")
            .replace(/token=([A-Za-z0-9._+\/=-]+)/gi, "token=[redacted]")
            .trim()
            .slice(0, 200) || "Unknown notification failure"
    );
}

export function getNotificationFailureReasonCode(value: string) {
    const normalized = String(value || "").toLowerCase();

    if (normalized.includes("timeout")) return "provider_timeout";
    if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("econn")) return "provider_network";
    if (normalized.includes("token") || normalized.includes("device")) return "provider_token_error";
    if (normalized.includes("invalid") || normalized.includes("payload")) return "invalid_payload";

    return "delivery_error";
}

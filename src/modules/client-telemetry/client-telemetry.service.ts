import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import {
    SystemLogEventsService,
    SystemLogLevel,
    SystemLogSource,
} from "../api-observability/system-log-events.service";
import { IngestClientTelemetryDto } from "./dto/ingest-client-telemetry.dto";

@Injectable()
export class ClientTelemetryService {
    constructor(
        private readonly systemLogEvents: SystemLogEventsService,
    ) { }

    private normalizeLevel(level?: string): SystemLogLevel {
        const normalized = String(level || "ERROR").trim().toUpperCase();
        if (
            normalized === "DEBUG" ||
            normalized === "INFO" ||
            normalized === "WARN" ||
            normalized === "ERROR"
        ) {
            return normalized;
        }

        return "ERROR";
    }

    private resolveSource(type: string): SystemLogSource {
        switch (type) {
            case "API_FAILURE":
                return "API";
            case "SOCKET_FAILURE":
                return "REALTIME";
            case "LIVEKIT_FAILURE":
                return "LIVEKIT";
            case "CRASH":
            case "RUNTIME_ERROR":
            case "DIAGNOSTIC":
            default:
                return "SYSTEM";
        }
    }

    private buildDefaultCategory(type: string) {
        return `MOBILE_${String(type || "DIAGNOSTIC").trim().toUpperCase()}`;
    }

    async ingest(input: IngestClientTelemetryDto) {
        const source = this.resolveSource(input.type);
        const category =
            String(input.category || "").trim() || this.buildDefaultCategory(input.type);

        const fingerprint =
            String(input.fingerprint || "").trim() ||
            [
                input.type,
                input.platform ?? "",
                input.appVersion ?? "",
                input.buildNumber ?? "",
                input.message,
                input.userId ?? "",
                input.streamId ?? "",
                input.roomId ?? "",
            ].join("|");

        const detailsJson: Prisma.InputJsonValue = {
            ...(input.detailsJson ?? {}),
            telemetryType: input.type,
            apiRoute: input.apiRoute ?? null,
            socketEvent: input.socketEvent ?? null,
            stack: input.stack ?? null,
            deviceId: input.deviceId ?? null,
            appState: input.appState ?? null,
        };

        await this.systemLogEvents.writeDeduped({
            source,
            level: this.normalizeLevel(input.level),
            category,
            eventCode: input.type,
            message: input.message,
            detailsJson,
            route: input.apiRoute ?? null,
            streamId: input.streamId ?? null,
            roomName: input.roomId ?? null,
            userId: input.userId ?? null,
            environment: input.environment ?? null,
            clientPlatform: input.platform ?? null,
            clientAppVersion: input.appVersion ?? null,
            clientBuildNumber: input.buildNumber ?? null,
            clientReleaseChannel: input.releaseChannel ?? null,
            deviceModel: input.deviceModel ?? null,
            deviceOsVersion: input.osVersion ?? null,
            networkType: input.networkType ?? null,
            sessionId: input.sessionId ?? null,
            fingerprint,
            dedupeWindowMs: input.dedupeWindowMs ?? 5 * 60 * 1000,
        });

        return {
            accepted: true,
        };
    }
}
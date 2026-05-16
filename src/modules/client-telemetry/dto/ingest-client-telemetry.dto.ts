import {
    IsIn,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    Max,
    Min,
} from "class-validator";

export class IngestClientTelemetryDto {
    @IsIn([
        "CRASH",
        "RUNTIME_ERROR",
        "API_FAILURE",
        "SOCKET_FAILURE",
        "LIVEKIT_FAILURE",
        "DIAGNOSTIC",
    ])
    type!: string;

    @IsOptional()
    @IsIn(["DEBUG", "INFO", "WARN", "ERROR"])
    level?: string;

    @IsString()
    message!: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsObject()
    detailsJson?: Record<string, unknown>;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    streamId?: string;

    @IsOptional()
    @IsString()
    roomId?: string;

    @IsOptional()
    @IsString()
    environment?: string;

    @IsOptional()
    @IsString()
    platform?: string;

    @IsOptional()
    @IsString()
    appVersion?: string;

    @IsOptional()
    @IsString()
    buildNumber?: string;

    @IsOptional()
    @IsString()
    releaseChannel?: string;

    @IsOptional()
    @IsString()
    deviceModel?: string;

    @IsOptional()
    @IsString()
    osVersion?: string;

    @IsOptional()
    @IsString()
    networkType?: string;

    @IsOptional()
    @IsString()
    sessionId?: string;

    @IsOptional()
    @IsString()
    fingerprint?: string;

    @IsOptional()
    @IsString()
    apiRoute?: string;

    @IsOptional()
    @IsString()
    socketEvent?: string;

    @IsOptional()
    @IsString()
    stack?: string;

    @IsOptional()
    @IsString()
    deviceId?: string;

    @IsOptional()
    @IsString()
    appState?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(60 * 60 * 1000)
    dedupeWindowMs?: number;
}
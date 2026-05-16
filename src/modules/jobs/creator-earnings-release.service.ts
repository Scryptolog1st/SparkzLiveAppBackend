import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from "@nestjs/common";
import { StreamerEarningStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CreatorEarningsReleaseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CreatorEarningsReleaseService.name);
    private intervalHandle: NodeJS.Timeout | null = null;

    private intervalMs = 5 * 60 * 1000;
    private isRunning = false;

    private lastRunStartedAt: Date | null = null;
    private lastRunCompletedAt: Date | null = null;
    private lastReleasedCount = 0;
    private lastError: string | null = null;

    constructor(private readonly prisma: PrismaService) { }

    onModuleInit() {
        const configuredMs = Number(
            process.env.CREATOR_EARNINGS_RELEASE_INTERVAL_MS ??
            process.env.JOBS_CREATOR_EARNINGS_RELEASE_INTERVAL_MS ??
            this.intervalMs,
        );

        if (Number.isFinite(configuredMs) && configuredMs >= 30_000) {
            this.intervalMs = Math.floor(configuredMs);
        }

        const disabled = String(
            process.env.CREATOR_EARNINGS_RELEASE_JOB_DISABLED || "",
        ).toLowerCase();

        if (disabled === "1" || disabled === "true" || disabled === "yes") {
            this.logger.warn("Creator earnings release job is disabled by environment.");
            return;
        }

        this.intervalHandle = setInterval(() => {
            void this.releaseAvailableEarnings();
        }, this.intervalMs);

        void this.releaseAvailableEarnings();
    }

    onModuleDestroy() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
    }

    getStatus() {
        return {
            enabled: !!this.intervalHandle,
            intervalMs: this.intervalMs,
            isRunning: this.isRunning,
            lastRunStartedAt: this.lastRunStartedAt
                ? this.lastRunStartedAt.toISOString()
                : null,
            lastRunCompletedAt: this.lastRunCompletedAt
                ? this.lastRunCompletedAt.toISOString()
                : null,
            lastReleasedCount: this.lastReleasedCount,
            lastError: this.lastError,
        };
    }

    async releaseAvailableEarnings() {
        if (this.isRunning) {
            return {
                skipped: true,
                reason: "already_running",
                releasedCount: 0,
            };
        }

        this.isRunning = true;
        this.lastRunStartedAt = new Date();
        this.lastError = null;

        try {
            const result = await this.prisma.streamerEarning.updateMany({
                where: {
                    status: StreamerEarningStatus.PENDING,
                    availableAt: {
                        lte: new Date(),
                    },
                },
                data: {
                    status: StreamerEarningStatus.AVAILABLE,
                },
            });

            this.lastReleasedCount = result.count;
            this.lastRunCompletedAt = new Date();

            if (result.count > 0) {
                this.logger.log(`Released ${result.count} creator earning row(s).`);
            }

            return {
                skipped: false,
                releasedCount: result.count,
            };
        } catch (error: any) {
            this.lastError = error?.message || String(error);
            this.logger.error("Creator earnings release job failed", error?.stack || error);

            return {
                skipped: false,
                releasedCount: 0,
                error: this.lastError,
            };
        } finally {
            this.isRunning = false;
        }
    }
}
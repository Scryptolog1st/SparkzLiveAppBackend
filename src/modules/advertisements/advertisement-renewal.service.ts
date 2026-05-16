import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AdvertisementsService } from "./advertisements.service";

@Injectable()
export class AdvertisementRenewalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdvertisementRenewalService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly advertisements: AdvertisementsService) {}

  onModuleInit() {
    const disabled = String(process.env.ADVERTISEMENT_RENEWAL_JOB_DISABLED || "false") === "true";
    if (disabled) {
      this.logger.warn("Advertisement renewal job is disabled.");
      return;
    }

    const intervalMs = Number(process.env.ADVERTISEMENT_RENEWAL_JOB_INTERVAL_MS || 60 * 60 * 1000);

    this.intervalHandle = setInterval(() => {
      this.runOnce().catch((error) => {
        this.logger.error("Advertisement renewal job failed.", error?.stack || error);
      });
    }, intervalMs);

    this.runOnce().catch((error) => {
      this.logger.error("Initial advertisement renewal job failed.", error?.stack || error);
    });

    this.logger.log(`Advertisement renewal job started. Interval: ${intervalMs}ms.`);
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async runOnce() {
    if (this.running) {
      return {
        success: true,
        skipped: true,
        reason: "already_running",
      };
    }

    this.running = true;

    try {
      const result = await this.advertisements.processDueRenewals(100);
      if (result.processed > 0) {
        this.logger.log(
          `Processed ${result.processed} advertisement renewal row(s). Renewed=${result.renewed}, expired=${result.expired}, failed=${result.failed}.`,
        );
      }
      return result;
    } finally {
      this.running = false;
    }
  }
}

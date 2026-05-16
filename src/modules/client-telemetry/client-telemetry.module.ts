import { Module } from "@nestjs/common";

import { ApiObservabilityModule } from "../api-observability/api-observability.module";
import { ClientTelemetryController } from "./client-telemetry.controller";
import { ClientTelemetryService } from "./client-telemetry.service";

@Module({
    imports: [ApiObservabilityModule],
    controllers: [ClientTelemetryController],
    providers: [ClientTelemetryService],
})
export class ClientTelemetryModule { }
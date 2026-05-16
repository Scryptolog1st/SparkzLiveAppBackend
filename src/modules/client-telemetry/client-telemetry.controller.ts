import {
    Body,
    Controller,
    Post,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";

import { ClientTelemetryService } from "./client-telemetry.service";
import { IngestClientTelemetryDto } from "./dto/ingest-client-telemetry.dto";

@Controller("client-telemetry")
export class ClientTelemetryController {
    constructor(
        private readonly clientTelemetry: ClientTelemetryService,
    ) { }

    @Post("events")
    @UsePipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    )
    async ingest(@Body() body: IngestClientTelemetryDto) {
        return this.clientTelemetry.ingest(body);
    }
}
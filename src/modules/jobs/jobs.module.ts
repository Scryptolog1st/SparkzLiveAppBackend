import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { StreamsModule } from "../streams/streams.module";
import { CreatorEarningsReleaseService } from "./creator-earnings-release.service";
import { JobsService } from "./jobs.service";

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    StreamsModule,
  ],
  providers: [
    JobsService,
    CreatorEarningsReleaseService,
  ],
  exports: [
    JobsService,
    CreatorEarningsReleaseService,
  ],
})
export class JobsModule { }
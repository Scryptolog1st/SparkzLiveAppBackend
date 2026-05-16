import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { envValidate } from "./settings/env.validate";
import { HealthModule } from "./modules/health/health.module";
import { VersionModule } from "./modules/version/version.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProfilesModule } from "./modules/profiles/profiles.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { ScheduleModule } from "./modules/schedule/schedule.module";
import { MilestonesModule } from "./modules/milestones/milestones.module";
import { StreamsModule } from "./modules/streams/streams.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { VideoModule } from "./modules/video/video.module";
import { ChatModule } from "./modules/chat/chat.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { BattlesModule } from "./modules/battles/battles.module";
import { EconomyModule } from "./modules/economy/economy.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { InAppAlertsModule } from "./modules/in-app-alerts/in-app-alerts.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { DmsModule } from "./modules/dms/dms.module";
import { GiphyModule } from "./modules/giphy/giphy.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { AdminStoreModule } from "./modules/admin-store/admin-store.module";
import { AdminGiftsModule } from "./modules/admin-gifts/admin-gifts.module";
import { AdminOverviewModule } from "./modules/admin-overview/admin-overview.module";
import { AdminStreamsModule } from "./modules/admin-streams/admin-streams.module";
import { AppConfigModule } from "./modules/app-config/app-config.module";
import { AdminAssetsModule } from "./modules/admin-assets/admin-assets.module";
import { AdminBadgesModule } from "./modules/admin-badges/admin-badges.module";
import { AutomodConfigModule } from "./modules/automod-config/automod-config.module";
import { LiveopsModule } from "./modules/liveops/liveops.module";
import { AdminUsersModule } from "./modules/admin-users/admin-users.module";
import { AdminPayoutsModule } from "./modules/admin-payouts/admin-payouts.module";
import { AdminChatModule } from "./modules/admin-chat/admin-chat.module";
import { AdminReportsModule } from "./modules/admin-reports/admin-reports.module";
import { BanAppealsModule } from "./modules/ban-appeals/ban-appeals.module";
import { EmailModule } from "./modules/email/email.module";
import { AdminSystemModule } from "./modules/admin-system/admin-system.module";
import { ClientTelemetryModule } from "./modules/client-telemetry/client-telemetry.module";
import { AdminAuditModule } from "./modules/admin-audit/admin-audit.module";
import { FeedModule } from "./modules/feed/feed.module";
import { StoriesModule } from "./modules/stories/stories.module";
import { AdvertisementsModule } from "./modules/advertisements/advertisements.module";
import { AdminAdvertisementsModule } from "./modules/admin-advertisements/admin-advertisements.module";


import { AdvertisementJobsModule } from "./modules/advertisement-jobs/advertisement-jobs.module";
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
      serveStaticOptions: {
        index: false,
      },
    }),

    PaymentsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidate,
    }),
    PrismaModule,
    HealthModule,
    VersionModule,
    AuthModule,
    UsersModule,
    FavoritesModule,
    ProfilesModule,
    UploadsModule,
    ScheduleModule,
    MilestonesModule,
    StreamsModule,
    RealtimeModule,
    VideoModule,
    ChatModule,
    ModerationModule,
    BattlesModule,
    EconomyModule,
    DiscoveryModule,
    NotificationsModule,
    InAppAlertsModule,
    JobsModule,
    DmsModule,
    GiphyModule,
    ReportsModule,
    PayoutsModule,
    AdminStoreModule,
    AdminGiftsModule,
    AdvertisementsModule,
    AdvertisementJobsModule,
    AdminAdvertisementsModule,
    AdminOverviewModule,
    AdminStreamsModule,
    AppConfigModule,
    EmailModule,
    AdminAssetsModule,
    AdminBadgesModule,
    AutomodConfigModule,
    LiveopsModule,
    AdminUsersModule,
    AdminPayoutsModule,
    AdminChatModule,
    AdminReportsModule,
    BanAppealsModule,
    AdminSystemModule,
    ClientTelemetryModule,
    AdminAuditModule,
    FeedModule,
    StoriesModule,
  ],
})
export class AppModule { }
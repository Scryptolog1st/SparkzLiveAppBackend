import { Module } from "@nestjs/common";
import { FavoritesController } from "./favorites.controller";
import { FavoritesService } from "./favorites.service";
import { UsersModule } from "../users/users.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { PrismaModule } from "../prisma/prisma.module"; // <-- ADD THIS

@Module({
    imports: [UsersModule, RealtimeModule, PrismaModule], // <-- ADD PrismaModule HERE
    controllers: [FavoritesController],
    providers: [FavoritesService],
    exports: [FavoritesService],
})
export class FavoritesModule { }
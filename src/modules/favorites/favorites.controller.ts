import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
    ForbiddenException,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { FavoritesService } from "./favorites.service";
import { BulkUnfavoriteDto } from "./dto/bulk-unfavorite.dto";
import { PrismaService } from "../prisma/prisma.service";

type JwtReq = Request & { user?: { userId: string; username?: string } };

@UseGuards(JwtAuthGuard)
@Controller()
export class FavoritesController {
    constructor(
        private readonly favorites: FavoritesService,
        private readonly prisma: PrismaService,
    ) { }

    private requireUserId(req: JwtReq) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException();
        }
        return userId;
    }

    @Get("/me/favorites")
    async listMyFavorites(@Req() req: JwtReq) {
        const userId = this.requireUserId(req);
        return this.favorites.listMyFavorites(userId);
    }

    @Post("/users/:identifier/favorite")
    async favoriteUser(
        @Req() req: JwtReq,
        @Param("identifier") identifier: string,
        @Query("streamId") streamId?: string,
    ) {
        const userId = this.requireUserId(req);

        // --- NEW: Helper to check if identifier is a valid UUID ---
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

        // Resolve the target user's internal ID
        const target = await this.prisma.user.findFirst({
            where: {
                OR: [
                    ...(isUUID ? [{ id: identifier }] : []), // Only check 'id' if it's a valid UUID
                    { username: identifier },
                    { publicId: identifier }
                ]
            },
            select: { id: true }
        });

        if (target) {
            // Check if the target user has blocked the requester
            const isBlocked = await this.prisma.userBlock.findUnique({
                where: {
                    blockerId_blockedId: {
                        blockerId: target.id, // Blocker (The streamer)
                        blockedId: userId,    // Blocked (You)
                    },
                },
            });

            if (isBlocked) {
                throw new ForbiddenException("You cannot favorite a user who has blocked you.");
            }
        }

        return this.favorites.favoriteUser(userId, identifier, streamId);
    }

    @Delete("/users/:identifier/favorite")
    async unfavoriteUser(
        @Req() req: JwtReq,
        @Param("identifier") identifier: string,
        @Query("streamId") streamId?: string,
    ) {
        const userId = this.requireUserId(req);
        return this.favorites.unfavoriteUser(userId, identifier, streamId);
    }

    @Delete("/me/favorites")
    async bulkUnfavorite(
        @Req() req: JwtReq,
        @Body() dto: BulkUnfavoriteDto,
    ) {
        const userId = this.requireUserId(req);
        return this.favorites.bulkUnfavorite(userId, dto);
    }
}
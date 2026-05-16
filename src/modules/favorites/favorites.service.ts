import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService, type UserWithProfile } from "../users/users.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

@Injectable()
export class FavoritesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly users: UsersService,
        private readonly realtime: RealtimeGateway,
    ) { }

    private userSummary(user: any) {
        return {
            id: user.id,
            username: user.username,
            displayName: user.profile?.displayName ?? user.username,
            avatarUrl: user.profile?.avatarUrl ?? null,
            level: null,
        };
    }

    private async emitFavoriteActivityIfNeeded(
        streamId: string | undefined,
        actorUserId: string,
        targetUser: UserWithProfile | null,
        verb: "favorited" | "unfavorited",
    ) {
        const cleanStreamId = String(streamId || "").trim();
        if (!cleanStreamId || !targetUser?.id) return;

        const stream = await this.prisma.stream.findUnique({
            where: { id: cleanStreamId },
            include: {
                host: {
                    include: { profile: true },
                },
            },
        });

        if (!stream || stream.status !== "LIVE") return;

        // Only announce when the person being favorited/unfavorited is the stream host.
        if (stream.hostUserId !== targetUser.id) return;

        const actor = await this.prisma.user.findUnique({
            where: { id: actorUserId },
            include: { profile: true },
        });

        if (!actor) return;

        const actorName = actor.profile?.displayName ?? actor.username;
        const targetName = stream.host.profile?.displayName ?? stream.host.username;

        this.realtime.emitChatMessage({
            streamId: cleanStreamId,
            message: {
                id: `favorite_${verb}_${Date.now()}_${actor.id}_${targetUser.id}`,
                user: this.userSummary(actor),
                text: `${actorName} just ${verb} ${targetName}`,
                createdAt: new Date().toISOString(),
                type: "favorite_activity",
            },
        });
    }

    private async resolveIdentifiersToUserIds(identifiers: string[]): Promise<string[]> {
        const resolved = await Promise.all(
            identifiers.map((identifier) => this.users.findByIdentifier(identifier)),
        );

        const ids = new Set<string>();
        for (const user of resolved) {
            if (user?.id) {
                ids.add(user.id);
            }
        }

        return Array.from(ids);
    }

    async getViewerRelationship(viewerUserId: string, targetUserId: string) {
        if (!viewerUserId || !targetUserId || viewerUserId === targetUserId) {
            return {
                mutualFavoritesCount: 0,
                isFavoritedByViewer: false,
            };
        }

        const [favoriteRow, viewerFavorites, targetFavorites] = await Promise.all([
            this.prisma.userFavorite.findUnique({
                where: {
                    userId_favoriteUserId: {
                        userId: viewerUserId,
                        favoriteUserId: targetUserId,
                    },
                },
                select: { userId: true },
            }),
            this.prisma.userFavorite.findMany({
                where: { userId: viewerUserId },
                select: { favoriteUserId: true },
            }),
            this.prisma.userFavorite.findMany({
                where: { userId: targetUserId },
                select: { favoriteUserId: true },
            }),
        ]);

        const viewerSet = new Set(viewerFavorites.map((row) => row.favoriteUserId));
        let mutualFavoritesCount = 0;

        for (const row of targetFavorites) {
            if (viewerSet.has(row.favoriteUserId)) {
                mutualFavoritesCount += 1;
            }
        }

        return {
            mutualFavoritesCount,
            isFavoritedByViewer: !!favoriteRow,
        };
    }

    async favoriteUser(viewerUserId: string, identifier: string, streamId?: string) {
        const targetUser = await this.users.requireByIdentifier(identifier);

        if (targetUser.id === viewerUserId) {
            throw new BadRequestException("You cannot favorite yourself.");
        }

        const existing = await this.prisma.userFavorite.findUnique({
            where: {
                userId_favoriteUserId: {
                    userId: viewerUserId,
                    favoriteUserId: targetUser.id,
                },
            },
            select: { userId: true },
        });

        if (!existing) {
            await this.prisma.userFavorite.create({
                data: {
                    userId: viewerUserId,
                    favoriteUserId: targetUser.id,
                },
            });

            await this.emitFavoriteActivityIfNeeded(
                streamId,
                viewerUserId,
                targetUser,
                "favorited",
            );
        }

        const relationship = await this.getViewerRelationship(viewerUserId, targetUser.id);

        return {
            success: true,
            targetUser: this.users.toPublicUserDto(targetUser),
            ...relationship,
        };
    }

    async unfavoriteUser(viewerUserId: string, identifier: string, streamId?: string) {
        const targetUser = await this.users.findByIdentifier(identifier);

        if (!targetUser) {
            return {
                success: true,
                removed: false,
                targetUser: null,
                mutualFavoritesCount: 0,
                isFavoritedByViewer: false,
            };
        }

        const result = await this.prisma.userFavorite.deleteMany({
            where: {
                userId: viewerUserId,
                favoriteUserId: targetUser.id,
            },
        });

        if (result.count > 0) {
            await this.emitFavoriteActivityIfNeeded(
                streamId,
                viewerUserId,
                targetUser,
                "unfavorited",
            );
        }

        const relationship =
            targetUser.id === viewerUserId
                ? {
                    mutualFavoritesCount: 0,
                    isFavoritedByViewer: false,
                }
                : await this.getViewerRelationship(viewerUserId, targetUser.id);

        return {
            success: true,
            removed: result.count > 0,
            targetUser: this.users.toPublicUserDto(targetUser),
            ...relationship,
        };
    }

    async listMyFavorites(viewerUserId: string) {
        const rows = await this.prisma.userFavorite.findMany({
            where: { userId: viewerUserId },
            orderBy: { createdAt: "desc" },
            include: {
                favoriteUser: {
                    include: { profile: true },
                },
            },
        });

        const favoriteUserIds = rows.map((row) => row.favoriteUserId);

        const reciprocalRows =
            favoriteUserIds.length > 0
                ? await this.prisma.userFavorite.findMany({
                    where: {
                        userId: { in: favoriteUserIds },
                        favoriteUserId: viewerUserId,
                    },
                    select: {
                        userId: true,
                    },
                })
                : [];

        const mutualSet = new Set(reciprocalRows.map((row) => row.userId));

        const items = rows.map((row) =>
            this.users.toFavoriteUserListItemDto(
                row.favoriteUser as UserWithProfile,
                {
                    isMutual: mutualSet.has(row.favoriteUserId),
                    favoritedAt: row.createdAt,
                },
            ),
        );

        return {
            items,
            total: items.length,
        };
    }

    async bulkUnfavorite(
        viewerUserId: string,
        input: {
            identifiers?: string[];
            userIds?: string[];
        },
    ) {
        const targetIds = new Set<string>();

        for (const userId of input.userIds ?? []) {
            const clean = String(userId || "").trim();
            if (clean && clean !== viewerUserId) {
                targetIds.add(clean);
            }
        }

        const resolvedIds = await this.resolveIdentifiersToUserIds(input.identifiers ?? []);
        for (const resolvedId of resolvedIds) {
            if (resolvedId !== viewerUserId) {
                targetIds.add(resolvedId);
            }
        }

        if (targetIds.size === 0) {
            return {
                success: true,
                removedCount: 0,
            };
        }

        const result = await this.prisma.userFavorite.deleteMany({
            where: {
                userId: viewerUserId,
                favoriteUserId: { in: Array.from(targetIds) },
            },
        });

        return {
            success: true,
            removedCount: result.count,
        };
    }

    async countFans(targetUserId: string) {
        if (!targetUserId) return 0;

        return this.prisma.userFavorite.count({
            where: {
                favoriteUserId: targetUserId,
            },
        });
    }
}
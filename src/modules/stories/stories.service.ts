import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStoryPostDto, StoriesQueryDto } from "./dto/stories.dto";

@Injectable()
export class StoriesService {
    constructor(private readonly prisma: PrismaService) { }

    private normalizeLimit(value: unknown): number {
        const parsed = Number(value || 50);

        if (!Number.isFinite(parsed)) {
            return 50;
        }

        return Math.min(50, Math.max(1, Math.floor(parsed)));
    }

    private parseCursor(value: unknown): Date | null {
        const raw = String(value || "").trim();
        if (!raw) return null;

        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return null;

        return date;
    }

    private normalizeCaption(value: unknown): string | null {
        const caption = String(value || "").trim();
        return caption ? caption.slice(0, 500) : null;
    }

    private normalizeMediaUrl(value: unknown): string {
        const mediaUrl = String(value || "").trim();

        if (!mediaUrl) {
            throw new BadRequestException("Story media URL is required.");
        }

        const isUploadPath = mediaUrl.startsWith("/uploads/");
        const isRemoteMedia = /^https?:\/\//i.test(mediaUrl);

        if (!isUploadPath && !isRemoteMedia) {
            throw new BadRequestException("Invalid story media URL.");
        }

        return mediaUrl.slice(0, 1000);
    }

    private buildStoryVisibilityWhere(viewerUserId: string) {
        return {
            OR: [
                {
                    userId: viewerUserId,
                },
                {
                    user: {
                        favoritedBy: {
                            some: {
                                userId: viewerUserId,
                            },
                        },
                    },
                },
            ],
        };
    }

    private toAuthorDto(user: any) {
        const profile = user?.profile || null;

        return {
            id: user.id,
            publicId: user.publicId,
            username: user.username,
            displayName: profile?.displayName || user.username,
            avatarUrl: profile?.avatarUrl || null,
        };
    }

    private toStoryDto(story: any, viewerUserId: string) {
        return {
            id: story.id,
            mediaUrl: story.mediaUrl,
            caption: story.caption,
            expiresAt: story.expiresAt.toISOString(),
            createdAt: story.createdAt.toISOString(),
            updatedAt: story.updatedAt.toISOString(),
            isMine: story.userId === viewerUserId,
            author: this.toAuthorDto(story.user),
        };
    }

    async listStories(query: StoriesQueryDto, viewerUserId: string) {
        const limit = this.normalizeLimit(query.limit);
        const cursorDate = this.parseCursor(query.cursor);
        const now = new Date();
        const visibilityWhere = this.buildStoryVisibilityWhere(viewerUserId);

        const stories = await this.prisma.storyPost.findMany({
            where: {
                deletedAt: null,
                expiresAt: {
                    gt: now,
                },
                ...visibilityWhere,
                ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
            },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit + 1,
        } as any);

        const hasMore = stories.length > limit;
        const visibleStories = hasMore ? stories.slice(0, limit) : stories;
        const nextCursor = hasMore
            ? visibleStories[visibleStories.length - 1]?.createdAt.toISOString() || null
            : null;

        return {
            items: visibleStories.map((story) => this.toStoryDto(story, viewerUserId)),
            nextCursor,
        };
    }

    async createStory(userId: string, dto: CreateStoryPostDto) {
        const story = await this.prisma.storyPost.create({
            data: {
                userId,
                mediaUrl: this.normalizeMediaUrl(dto.mediaUrl),
                caption: this.normalizeCaption(dto.caption),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
            },
        });

        return {
            story: this.toStoryDto(story, userId),
        };
    }

    async deleteStory(userId: string, storyId: string) {
        const story = await this.prisma.storyPost.findUnique({
            where: {
                id: storyId,
            },
            select: {
                id: true,
                userId: true,
                deletedAt: true,
            },
        });

        if (!story || story.deletedAt) {
            throw new NotFoundException("Story not found.");
        }

        if (story.userId !== userId) {
            throw new ForbiddenException("You can only delete your own story.");
        }

        await this.prisma.storyPost.update({
            where: {
                id: storyId,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return {
            success: true,
            id: storyId,
        };
    }
}
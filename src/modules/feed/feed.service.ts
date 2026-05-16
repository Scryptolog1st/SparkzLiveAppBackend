import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
    CreateFeedPostCommentDto,
    CreateFeedPostDto,
    FeedPostCommentsQueryDto,
    FeedPostsQueryDto,
} from "./dto/feed.dto";

@Injectable()
export class FeedService {
    constructor(private readonly prisma: PrismaService) { }

    private normalizeLimit(value: unknown, fallback = 12, max = 30): number {
        const parsed = Number(value || fallback);

        if (!Number.isFinite(parsed)) {
            return fallback;
        }

        return Math.min(max, Math.max(1, Math.floor(parsed)));
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

    private normalizeText(value: unknown): string {
        const text = String(value || "").trim();

        if (!text) {
            throw new BadRequestException("Comment text is required.");
        }

        return text.slice(0, 500);
    }

    private normalizeImageUrl(value: unknown): string {
        const imageUrl = String(value || "").trim();

        if (!imageUrl) {
            throw new BadRequestException("Image URL is required.");
        }

        const isUploadPath = imageUrl.startsWith("/uploads/");
        const isRemoteImage = /^https?:\/\//i.test(imageUrl);

        if (!isUploadPath && !isRemoteImage) {
            throw new BadRequestException("Invalid image URL.");
        }

        return imageUrl.slice(0, 1000);
    }

    private buildPostVisibilityWhere(scope: unknown, viewerUserId: string) {
        const normalizedScope = String(scope || "all").trim().toLowerCase();

        if (normalizedScope !== "favorites") {
            return {};
        }

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
            badgeLabel: profile?.badgeLabel || null,
            badgeTone: profile?.badgeTone || null,
            showBadgeOnProfile:
                typeof profile?.showBadgeOnProfile === "boolean"
                    ? profile.showBadgeOnProfile
                    : true,
        };
    }

    private toCommentDto(comment: any) {
        return {
            id: comment.id,
            text: comment.text,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
            author: this.toAuthorDto(comment.user),
        };
    }

    private toPostDto(post: any, viewerUserId: string) {
        const recentComments = Array.isArray(post.comments)
            ? [...post.comments].reverse().map((comment) => this.toCommentDto(comment))
            : [];

        return {
            id: post.id,
            imageUrl: post.imageUrl,
            caption: post.caption,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            isMine: post.userId === viewerUserId,
            isLikedByViewer: Array.isArray(post.likes) && post.likes.length > 0,
            likeCount: post._count?.likes || 0,
            commentCount: post._count?.comments || 0,
            recentComments,
            author: this.toAuthorDto(post.user),
        };
    }

    async listPosts(query: FeedPostsQueryDto, viewerUserId: string) {
        const limit = this.normalizeLimit(query.limit, 12, 30);
        const cursorDate = this.parseCursor(query.cursor);
        const visibilityWhere = this.buildPostVisibilityWhere(query.scope, viewerUserId);

        const posts = await this.prisma.feedPost.findMany({
            where: {
                deletedAt: null,
                ...visibilityWhere,
                ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
            },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                likes: {
                    where: {
                        userId: viewerUserId,
                    },
                    select: {
                        userId: true,
                    },
                    take: 1,
                },
                comments: {
                    where: {
                        deletedAt: null,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 2,
                    include: {
                        user: {
                            include: {
                                profile: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: {
                            where: {
                                deletedAt: null,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit + 1,
        } as any);

        const hasMore = posts.length > limit;
        const visiblePosts = hasMore ? posts.slice(0, limit) : posts;
        const nextCursor = hasMore
            ? visiblePosts[visiblePosts.length - 1]?.createdAt.toISOString() || null
            : null;

        return {
            items: visiblePosts.map((post) => this.toPostDto(post, viewerUserId)),
            nextCursor,
        };
    }

    async createPost(userId: string, dto: CreateFeedPostDto) {
        const post = await this.prisma.feedPost.create({
            data: {
                userId,
                imageUrl: this.normalizeImageUrl(dto.imageUrl),
                caption: this.normalizeCaption(dto.caption),
            },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                likes: {
                    where: {
                        userId,
                    },
                    select: {
                        userId: true,
                    },
                    take: 1,
                },
                comments: {
                    where: {
                        deletedAt: null,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 2,
                    include: {
                        user: {
                            include: {
                                profile: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: {
                            where: {
                                deletedAt: null,
                            },
                        },
                    },
                },
            },
        } as any);

        return {
            post: this.toPostDto(post, userId),
        };
    }

    async deletePost(userId: string, postId: string) {
        const post = await this.prisma.feedPost.findUnique({
            where: { id: postId },
            select: {
                id: true,
                userId: true,
                deletedAt: true,
            },
        });

        if (!post || post.deletedAt) {
            throw new NotFoundException("Post not found.");
        }

        if (post.userId !== userId) {
            throw new ForbiddenException("You can only delete your own post.");
        }

        await this.prisma.feedPost.update({
            where: { id: postId },
            data: {
                deletedAt: new Date(),
            },
        });

        return {
            success: true,
            id: postId,
        };
    }

    async likePost(userId: string, postId: string) {
        const post = await this.prisma.feedPost.findFirst({
            where: {
                id: postId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (!post) {
            throw new NotFoundException("Post not found.");
        }

        await this.prisma.feedPostLike.upsert({
            where: {
                postId_userId: {
                    postId,
                    userId,
                },
            },
            update: {},
            create: {
                postId,
                userId,
            },
        });

        const likeCount = await this.prisma.feedPostLike.count({
            where: {
                postId,
            },
        });

        return {
            success: true,
            isLikedByViewer: true,
            likeCount,
        };
    }

    async unlikePost(userId: string, postId: string) {
        await this.prisma.feedPostLike.deleteMany({
            where: {
                postId,
                userId,
            },
        });

        const likeCount = await this.prisma.feedPostLike.count({
            where: {
                postId,
            },
        });

        return {
            success: true,
            isLikedByViewer: false,
            likeCount,
        };
    }

    async listComments(
        postId: string,
        query: FeedPostCommentsQueryDto,
    ) {
        const limit = this.normalizeLimit(query.limit, 30, 100);
        const cursorDate = this.parseCursor(query.cursor);

        const comments = await this.prisma.feedPostComment.findMany({
            where: {
                postId,
                deletedAt: null,
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
        });

        const hasMore = comments.length > limit;
        const visibleComments = hasMore ? comments.slice(0, limit) : comments;
        const nextCursor = hasMore
            ? visibleComments[visibleComments.length - 1]?.createdAt.toISOString() || null
            : null;

        return {
            items: visibleComments
                .map((comment) => this.toCommentDto(comment))
                .reverse(),
            nextCursor,
        };
    }

    async createComment(
        userId: string,
        postId: string,
        dto: CreateFeedPostCommentDto,
    ) {
        const post = await this.prisma.feedPost.findFirst({
            where: {
                id: postId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (!post) {
            throw new NotFoundException("Post not found.");
        }

        const comment = await this.prisma.feedPostComment.create({
            data: {
                postId,
                userId,
                text: this.normalizeText(dto.text),
            },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
            },
        });

        const commentCount = await this.prisma.feedPostComment.count({
            where: {
                postId,
                deletedAt: null,
            },
        });

        return {
            comment: this.toCommentDto(comment),
            commentCount,
        };
    }

    async deleteComment(userId: string, postId: string, commentId: string) {
        const comment = await this.prisma.feedPostComment.findUnique({
            where: {
                id: commentId,
            },
            include: {
                post: {
                    select: {
                        userId: true,
                    },
                },
            },
        });

        if (!comment || comment.deletedAt || comment.postId !== postId) {
            throw new NotFoundException("Comment not found.");
        }

        const canDelete = comment.userId === userId || comment.post.userId === userId;

        if (!canDelete) {
            throw new ForbiddenException("You cannot delete this comment.");
        }

        await this.prisma.feedPostComment.update({
            where: {
                id: commentId,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        const commentCount = await this.prisma.feedPostComment.count({
            where: {
                postId,
                deletedAt: null,
            },
        });

        return {
            success: true,
            id: commentId,
            commentCount,
        };
    }
}
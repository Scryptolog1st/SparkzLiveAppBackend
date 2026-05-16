import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import {
    CreateFeedPostCommentDto,
    CreateFeedPostDto,
    FeedPostCommentsQueryDto,
    FeedPostsQueryDto,
} from "./dto/feed.dto";
import { FeedService } from "./feed.service";

type JwtRequest = Request & {
    user?: {
        userId?: string;
        id?: string;
        sub?: string;
    };
};

function getRequestUserId(req: JwtRequest): string {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;

    if (!userId) {
        throw new BadRequestException("User context missing.");
    }

    return userId;
}

function createFeedPostStorage() {
    return diskStorage({
        destination: (req: JwtRequest, _file, cb) => {
            const userId = req.user?.userId || req.user?.id || req.user?.sub;

            if (!userId) {
                return cb(new BadRequestException("User context missing for upload"), "");
            }

            const targetDir = join(process.cwd(), "uploads", userId, "feed-posts");

            if (!existsSync(targetDir)) {
                mkdirSync(targetDir, { recursive: true });
            }

            cb(null, targetDir);
        },
        filename: (_req, file, cb) => {
            const ext = extname(file.originalname || "").toLowerCase();
            const safeExt = [
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".gif",
                ".mp4",
                ".mov",
                ".m4v",
                ".webm",
            ].includes(ext)
                ? ext
                : ".jpg";

            cb(null, `${randomUUID()}${safeExt}`);
        },
    });
}

@Controller("feed")
@UseGuards(JwtAuthGuard)
export class FeedController {
    constructor(private readonly feed: FeedService) { }

    @Get("posts")
    async listPosts(@Query() query: FeedPostsQueryDto, @Req() req: JwtRequest) {
        return this.feed.listPosts(query, getRequestUserId(req));
    }

    @Post("posts/upload")
    @UseInterceptors(
        FileInterceptor("file", {
            storage: createFeedPostStorage(),
            limits: {
                fileSize: 250 * 1024 * 1024,
            },
            fileFilter: (_req, file, cb) => {
                const mimetype = String(file.mimetype || "");

                if (!/^image\//i.test(mimetype) && !/^video\//i.test(mimetype)) {
                    return cb(new BadRequestException("Only image and video uploads are allowed."), false);
                }

                return cb(null, true);
            },
        }),
    )
    async uploadPostImage(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: JwtRequest,
    ) {
        if (!file) {
            throw new BadRequestException("No file uploaded.");
        }

        const userId = getRequestUserId(req);

        return {
            url: `/uploads/${userId}/feed-posts/${file.filename}`,
        };
    }

    @Post("posts")
    async createPost(@Body() dto: CreateFeedPostDto, @Req() req: JwtRequest) {
        return this.feed.createPost(getRequestUserId(req), dto);
    }

    @Delete("posts/:id")
    async deletePost(@Param("id") id: string, @Req() req: JwtRequest) {
        return this.feed.deletePost(getRequestUserId(req), id);
    }

    @Post("posts/:id/like")
    async likePost(@Param("id") id: string, @Req() req: JwtRequest) {
        return this.feed.likePost(getRequestUserId(req), id);
    }

    @Delete("posts/:id/like")
    async unlikePost(@Param("id") id: string, @Req() req: JwtRequest) {
        return this.feed.unlikePost(getRequestUserId(req), id);
    }

    @Get("posts/:id/comments")
    async listComments(
        @Param("id") id: string,
        @Query() query: FeedPostCommentsQueryDto,
    ) {
        return this.feed.listComments(id, query);
    }

    @Post("posts/:id/comments")
    async createComment(
        @Param("id") id: string,
        @Body() dto: CreateFeedPostCommentDto,
        @Req() req: JwtRequest,
    ) {
        return this.feed.createComment(getRequestUserId(req), id, dto);
    }

    @Delete("posts/:postId/comments/:commentId")
    async deleteComment(
        @Param("postId") postId: string,
        @Param("commentId") commentId: string,
        @Req() req: JwtRequest,
    ) {
        return this.feed.deleteComment(getRequestUserId(req), postId, commentId);
    }
}
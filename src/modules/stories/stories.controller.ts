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
import { CreateStoryPostDto, StoriesQueryDto } from "./dto/stories.dto";
import { StoriesService } from "./stories.service";

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

function createStoryStorage() {
    return diskStorage({
        destination: (req: JwtRequest, _file, cb) => {
            const userId = req.user?.userId || req.user?.id || req.user?.sub;

            if (!userId) {
                return cb(new BadRequestException("User context missing for upload"), "");
            }

            const targetDir = join(process.cwd(), "uploads", userId, "stories");

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

@Controller("stories")
@UseGuards(JwtAuthGuard)
export class StoriesController {
    constructor(private readonly stories: StoriesService) { }

    @Get()
    async listStories(@Query() query: StoriesQueryDto, @Req() req: JwtRequest) {
        return this.stories.listStories(query, getRequestUserId(req));
    }

    @Post("upload")
    @UseInterceptors(
        FileInterceptor("file", {
            storage: createStoryStorage(),
            limits: {
                fileSize: 150 * 1024 * 1024,
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
    async uploadStoryImage(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: JwtRequest,
    ) {
        if (!file) {
            throw new BadRequestException("No file uploaded.");
        }

        const userId = getRequestUserId(req);

        return {
            url: `/uploads/${userId}/stories/${file.filename}`,
        };
    }

    @Post()
    async createStory(@Body() dto: CreateStoryPostDto, @Req() req: JwtRequest) {
        return this.stories.createStory(getRequestUserId(req), dto);
    }

    @Delete(":id")
    async deleteStory(@Param("id") id: string, @Req() req: JwtRequest) {
        return this.stories.deleteStory(getRequestUserId(req), id);
    }
}
import {
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { diskStorage } from "multer";
import { extname, join } from "path";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { AdminGiftsService } from "./admin-gifts.service";
import { CreateAdminGiftDto, UpdateAdminGiftDto } from "./dto/admin-gifts.dto";

const GIFT_UPLOAD_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".json",
  ".mp4",
  ".webm",
]);

function inferGiftMediaType(file: Express.Multer.File) {
  const ext = extname(file.originalname || file.filename || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();

  if (ext === ".json" || mime.includes("json")) return "LOTTIE";
  if (ext === ".gif" || mime === "image/gif") return "GIF";
  if (ext === ".mp4" || ext === ".webm" || mime.startsWith("video/")) return "VIDEO";

  return "IMAGE";
}

function createAdminGiftStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const targetDir = join(process.cwd(), "uploads", "gifts");

      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname || "").toLowerCase().slice(0, 12) || ".bin";
      const safeExt = GIFT_UPLOAD_EXTENSIONS.has(ext) ? ext : ".bin";
      cb(null, `${randomUUID()}${safeExt}`);
    },
  });
}

function filterAdminGiftUpload(
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  const ext = extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();

  const allowedByExtension = GIFT_UPLOAD_EXTENSIONS.has(ext);
  const allowedByMime =
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime === "application/json" ||
    mime === "text/json" ||
    mime === "application/octet-stream";

  if (!allowedByExtension || !allowedByMime) {
    cb(
      new BadRequestException(
        "Gift media must be PNG, JPG, WebP, GIF, Lottie JSON, MP4, or WebM.",
      ),
      false,
    );
    return;
  }

  cb(null, true);
}

@Controller("admin/gifts")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminGiftsController {
  constructor(private readonly adminGifts: AdminGiftsService) {}

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: createAdminGiftStorage(),
      fileFilter: filterAdminGiftUpload,
      limits: {
        fileSize: 30 * 1024 * 1024,
      },
    }),
  )
  async uploadGiftMedia(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!req.adminUser?.id) {
      throw new BadRequestException("Missing admin user context.");
    }

    if (!file) {
      throw new BadRequestException("No gift media file uploaded.");
    }

    const mediaUrl = `/uploads/gifts/${file.filename}`;

    return {
      success: true,
      mediaUrl,
      url: mediaUrl,
      mediaType: inferGiftMediaType(file),
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }


  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_VIEW)
  @Get("summary")
  async summary(@Req() req: any) {
    return this.adminGifts.summary(req.adminUser.id);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_VIEW)
  @Get()
  async list(@Req() req: any) {
    return this.adminGifts.list(req.adminUser.id);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_VIEW)
  @Get(":id")
  async byId(@Req() req: any, @Param("id") id: string) {
    return this.adminGifts.getById(req.adminUser.id, id);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Post()
  async create(@Req() req: any, @Body() body: CreateAdminGiftDto) {
    return this.adminGifts.create(req.adminUser.id, body);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Patch(":id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateAdminGiftDto,
  ) {
    return this.adminGifts.update(req.adminUser.id, id, body);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Delete(":id")
  async delete(@Req() req: any, @Param("id") id: string) {
    return this.adminGifts.delete(req.adminUser.id, id);
  }
}

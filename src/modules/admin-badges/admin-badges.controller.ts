import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { diskStorage } from "multer";
import { extname, join } from "path";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { AdminBadgesService } from "./admin-badges.service";
import {
  AdminBadgeUserSearchDto,
  AdminBadgesQueryDto,
  AssignUserBadgeDto,
  CreateAdminBadgeDto,
  RevokeUserBadgeDto,
  UpdateAdminBadgeDto,
  UpdateUserBadgeDto,
} from "./dto/admin-badges.dto";

type AdminRequestContext = {
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

const BADGE_UPLOAD_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
]);

function createAdminBadgeStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const targetDir = join(process.cwd(), "uploads", "badges");

      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname || "").toLowerCase().slice(0, 12) || ".bin";
      const safeExt = BADGE_UPLOAD_EXTENSIONS.has(ext) ? ext : ".bin";
      cb(null, `${Date.now()}-${randomUUID()}${safeExt}`);
    },
  });
}

function filterAdminBadgeUpload(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  const ext = extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();
  const allowedByExtension = BADGE_UPLOAD_EXTENSIONS.has(ext);
  const allowedByMime =
    mime.startsWith("image/") ||
    mime === "application/octet-stream";

  if (!allowedByExtension || !allowedByMime) {
    cb(new BadRequestException("Badge asset must be an image file."), false);
    return;
  }

  cb(null, true);
}

@Controller("admin/badges")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminBadgesController {
  constructor(private readonly adminBadges: AdminBadgesService) {}

  private buildAuditContext(req: Request): AdminRequestContext {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0]?.trim()
        : req.socket?.remoteAddress ?? null;

    return {
      requestPath: req.originalUrl || req.url || null,
      ipAddress,
      userAgent:
        typeof req.headers["user-agent"] === "string"
          ? req.headers["user-agent"]
          : null,
      deviceLabel:
        typeof req.headers["x-device-label"] === "string"
          ? req.headers["x-device-label"]
          : null,
    };
  }

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_VIEW)
  async listBadges(@Req() req: any, @Query() query: AdminBadgesQueryDto) {
    return this.adminBadges.listBadges(req.adminUser.role, query);
  }

  @Post()
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_MANAGE)
  async createBadge(
    @Req() req: any,
    @Body() body: CreateAdminBadgeDto,
  ) {
    return this.adminBadges.createBadge(
      req.adminUser.id,
      req.adminUser.role,
      body,
      this.buildAuditContext(req),
    );
  }

  @Get("users/search")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_VIEW)
  async searchUsers(@Query() query: AdminBadgeUserSearchDto) {
    return this.adminBadges.searchUsers(query);
  }

  @Get("users/:userId/badges")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_VIEW)
  async listUserBadges(@Req() req: any, @Param("userId") userId: string) {
    return this.adminBadges.listUserBadges(req.adminUser.role, userId);
  }

  @Post("users/:userId/badges")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_MANAGE)
  async assignUserBadge(
    @Req() req: any,
    @Param("userId") userId: string,
    @Body() body: AssignUserBadgeDto,
  ) {
    return this.adminBadges.assignBadge(
      req.adminUser.id,
      req.adminUser.role,
      userId,
      body,
      this.buildAuditContext(req),
    );
  }

  @Patch("user-badges/:assignmentId")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_MANAGE)
  async updateUserBadge(
    @Req() req: any,
    @Param("assignmentId") assignmentId: string,
    @Body() body: UpdateUserBadgeDto,
  ) {
    return this.adminBadges.updateUserBadge(
      req.adminUser.id,
      req.adminUser.role,
      assignmentId,
      body,
      this.buildAuditContext(req),
    );
  }

  @Post("user-badges/:assignmentId/revoke")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_MANAGE)
  async revokeUserBadge(
    @Req() req: any,
    @Param("assignmentId") assignmentId: string,
    @Body() body: RevokeUserBadgeDto,
  ) {
    return this.adminBadges.revokeUserBadge(
      req.adminUser.id,
      req.adminUser.role,
      assignmentId,
      body,
      this.buildAuditContext(req),
    );
  }

  @Get(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_VIEW)
  async getBadge(@Req() req: any, @Param("id") id: string) {
    return this.adminBadges.getBadge(req.adminUser.role, id);
  }

  @Patch(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_MANAGE)
  async updateBadge(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateAdminBadgeDto,
  ) {
    return this.adminBadges.updateBadge(
      req.adminUser.id,
      req.adminUser.role,
      id,
      body,
      this.buildAuditContext(req),
    );
  }

  @Delete(":id")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_MANAGE)
  async deleteBadge(@Req() req: any, @Param("id") id: string) {
    return this.adminBadges.softDeleteBadge(
      req.adminUser.id,
      req.adminUser.role,
      id,
      this.buildAuditContext(req),
    );
  }

  @Post(":id/asset")
  @RequireAdminPermission(ADMIN_PERMISSIONS.USER_BADGES_MANAGE)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: createAdminBadgeStorage(),
      fileFilter: filterAdminBadgeUpload,
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  async uploadBadgeAsset(
    @Req() req: any,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.adminBadges.updateBadgeAsset(
      req.adminUser.id,
      req.adminUser.role,
      id,
      file,
      this.buildAuditContext(req),
    );
  }
}

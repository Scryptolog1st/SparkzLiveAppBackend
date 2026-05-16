import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, Req, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { randomUUID } from "crypto";
import { mkdirSync, existsSync } from "fs";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";

/**
 * Higher-order function to create storage engines with subfolder logic.
 * This will create paths like: ./uploads/<userId>/messages/
 */
function createUserStorage(subFolder: 'messages' | 'profile' | 'cover') {
  return diskStorage({
    destination: (req: any, _file, cb) => {
      // Pulling userId from the JWT payload
      const userId = req.user?.userId || req.user?.id || req.user?.sub;

      if (!userId) {
        return cb(new BadRequestException("User context missing for upload"), "");
      }

      // Build the full path: root/uploads/uuid/subfolder
      const targetDir = join(process.cwd(), "uploads", userId, subFolder);

      // Recursive true ensures the root 'uploads', the 'uuid', and the 'subfolder' all exist
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      // Keep it clean: UUID + extension
      const safeExt = extname(file.originalname || "").slice(0, 10) || ".jpg";
      const name = `${randomUUID()}${safeExt}`;
      cb(null, name);
    },
  });
}

@Controller('uploads')
@UseGuards(JwtAuthGuard) // Protect all upload routes to ensure we have a userId
export class UploadsController {

  /**
   * PROFILE PHOTO (Avatar)
   * Target: /uploads/<uuid>/profile/
   */
  @Post("avatar")
  @UseInterceptors(FileInterceptor("file", {
    storage: createUserStorage('profile'),
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException("No file uploaded");
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return { url: `/uploads/${userId}/profile/${file.filename}` };
  }

  /**
   * COVER PHOTO (Banner)
   * Target: /uploads/<uuid>/cover/
   */
  @Post("banner")
  @UseInterceptors(FileInterceptor("file", {
    storage: createUserStorage('cover'),
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  async uploadBanner(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException("No file uploaded");
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return { url: `/uploads/${userId}/cover/${file.filename}` };
  }

  /**
   * DIRECT MESSAGE MEDIA (Images/GIFs)
   * Target: /uploads/<uuid>/messages/
   */
  @Post("dm")
  @UseInterceptors(FileInterceptor("file", {
    storage: createUserStorage('messages'),
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  async uploadDmImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException("No file uploaded");
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return { url: `/uploads/${userId}/messages/${file.filename}` };
  }
}
import {
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

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { AdminGiftsService } from "./admin-gifts.service";
import { CreateAdminCategoryDto, UpdateAdminCategoryDto } from "./dto/admin-categories.dto";

@Controller("admin/gift-categories")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminGiftCategoriesController {
  constructor(private readonly adminGifts: AdminGiftsService) {}

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Get()
  async list(@Req() req: any) {
    return this.adminGifts.listGiftCategories(req.adminUser.id);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Post()
  async create(@Req() req: any, @Body() body: CreateAdminCategoryDto) {
    return this.adminGifts.createGiftCategory(req.adminUser.id, body);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Patch(":id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateAdminCategoryDto,
  ) {
    return this.adminGifts.updateGiftCategory(req.adminUser.id, id, body);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Delete(":id")
  async delete(@Req() req: any, @Param("id") id: string) {
    return this.adminGifts.deleteGiftCategory(req.adminUser.id, id);
  }
}

@Controller("admin/stream-categories")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminStreamCategoriesController {
  constructor(private readonly adminGifts: AdminGiftsService) {}

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Get()
  async list(@Req() req: any) {
    return this.adminGifts.listStreamCategories(req.adminUser.id);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Post()
  async create(@Req() req: any, @Body() body: CreateAdminCategoryDto) {
    return this.adminGifts.createStreamCategory(req.adminUser.id, body);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Patch(":id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateAdminCategoryDto,
  ) {
    return this.adminGifts.updateStreamCategory(req.adminUser.id, id, body);
  }

  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_STORE_MANAGE)
  @Delete(":id")
  async delete(@Req() req: any, @Param("id") id: string) {
    return this.adminGifts.deleteStreamCategory(req.adminUser.id, id);
  }
}

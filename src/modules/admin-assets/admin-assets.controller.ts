import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import {
  AdminAssetsQueryDto,
  ApproveAssetSubmissionDto,
  BulkAdminAssetActionDto,
  RejectAssetSubmissionDto,
  UpdateAdminAssetNotesDto,
} from "./dto/admin-assets.dto";
import { AdminAssetsService } from "./admin-assets.service";

@Controller("admin/assets")
@UseGuards(AdminProxyGuard)
export class AdminAssetsController {
  constructor(private readonly adminAssets: AdminAssetsService) { }

  @Get("summary")
  async summary(@Req() req: any) {
    return this.adminAssets.getSummary(req.adminUser.id);
  }

  @Get()
  async list(@Req() req: any, @Query() query: AdminAssetsQueryDto) {
    return this.adminAssets.list(req.adminUser.id, query);
  }

  @Get("queue")
  async queue(@Req() req: any, @Query() query: AdminAssetsQueryDto) {
    return this.adminAssets.list(req.adminUser.id, query);
  }

  @Get(":id")
  async byId(@Req() req: any, @Param("id") id: string) {
    return this.adminAssets.getById(req.adminUser.id, id);
  }

  @Post(":id/notes")
  async updateNotes(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateAdminAssetNotesDto,
  ) {
    return this.adminAssets.updateNotes(req.adminUser.id, id, body);
  }

  @Post(":id/approve")
  async approve(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: ApproveAssetSubmissionDto,
  ) {
    return this.adminAssets.approve(req.adminUser.id, id, body);
  }

  @Post(":id/reject")
  async reject(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: RejectAssetSubmissionDto,
  ) {
    return this.adminAssets.reject(req.adminUser.id, id, body);
  }

  @Post("bulk-approve")
  async bulkApprove(
    @Req() req: any,
    @Body() body: BulkAdminAssetActionDto,
  ) {
    return this.adminAssets.bulkApprove(req.adminUser.id, body);
  }

  @Post("bulk-reject")
  async bulkReject(
    @Req() req: any,
    @Body() body: BulkAdminAssetActionDto,
  ) {
    return this.adminAssets.bulkReject(req.adminUser.id, body);
  }
}
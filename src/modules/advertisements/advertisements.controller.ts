import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";

import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import {
  AdvertisementListQueryDto,
  BoostAdvertisementDto,
  CreateAdvertisementDto,
  MyAdvertisementsQueryDto,
  UpdateAdvertisementDto,
} from "./dto/advertisements.dto";
import { AdvertisementsService } from "./advertisements.service";

type JwtReq = Request & { user?: { userId: string; username?: string } };

@Controller()
export class AdvertisementsController {
  constructor(private readonly advertisements: AdvertisementsService) {}

  @UseGuards(JwtAuthGuard)
  @Get("/advertisements/settings")
  async settings() {
    return this.advertisements.getPublicSettings();
  }

  @UseGuards(JwtAuthGuard)
  @Get("/advertisements/live")
  async live(@Query() query: AdvertisementListQueryDto) {
    return this.advertisements.listLiveAdvertisements(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me/advertisements")
  async mine(@Req() req: JwtReq, @Query() query: MyAdvertisementsQueryDto) {
    return this.advertisements.listMyAdvertisements(req.user!.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me/advertisements/:id")
  async byId(@Req() req: JwtReq, @Param("id") id: string) {
    return this.advertisements.getMyAdvertisement(req.user!.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/advertisements")
  @UseInterceptors(FilesInterceptor("media", 8))
  async create(
    @Req() req: JwtReq,
    @Body() body: CreateAdvertisementDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.advertisements.createAdvertisement(req.user!.userId, body, files);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("/me/advertisements/:id")
  @UseInterceptors(FilesInterceptor("media", 8))
  async update(
    @Req() req: JwtReq,
    @Param("id") id: string,
    @Body() body: UpdateAdvertisementDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.advertisements.updateAdvertisement(req.user!.userId, id, body, files);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/advertisements/:id/cancel")
  async cancel(@Req() req: JwtReq, @Param("id") id: string) {
    return this.advertisements.cancelAtCycleEnd(req.user!.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/advertisements/:id/republish")
  async republish(@Req() req: JwtReq, @Param("id") id: string) {
    return this.advertisements.republish(req.user!.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/advertisements/:id/boost")
  async boost(
    @Req() req: JwtReq,
    @Param("id") id: string,
    @Body() body: BoostAdvertisementDto,
  ) {
    return this.advertisements.boostAdvertisement(req.user!.userId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/me/advertisements/:id/retry-payment")
  async retryPayment(@Req() req: JwtReq, @Param("id") id: string) {
    return this.advertisements.retryPayment(req.user!.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("/me/advertisements/:id")
  async deleteInactive(@Req() req: JwtReq, @Param("id") id: string) {
    return this.advertisements.deleteInactiveAdvertisement(req.user!.userId, id);
  }
}

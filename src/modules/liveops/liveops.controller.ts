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
import { AuthGuard } from "@nestjs/passport";
import {
  CreateLiveopsBannerDto,
  CreateLiveopsEventDto,
  UpdateLiveopsBannerDto,
  UpdateLiveopsEventDto,
} from "./dto/liveops.dto";
import { LiveopsService } from "./liveops.service";

@Controller()
export class LiveopsController {
  constructor(private readonly liveops: LiveopsService) { }

  @UseGuards(AuthGuard("jwt"))
  @Get("/admin/liveops/events")
  async listEvents(@Req() req: any) {
    return this.liveops.listEvents(req.user.userId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("/admin/liveops/events")
  async createEvent(
    @Req() req: any,
    @Body() body: CreateLiveopsEventDto,
  ) {
    return this.liveops.createEvent(req.user.userId, body);
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("/admin/liveops/events/:id")
  async updateEvent(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateLiveopsEventDto,
  ) {
    return this.liveops.updateEvent(req.user.userId, id, body);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("/admin/liveops/banners")
  async listBanners(@Req() req: any) {
    return this.liveops.listBanners(req.user.userId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("/admin/liveops/banners")
  async createBanner(
    @Req() req: any,
    @Body() body: CreateLiveopsBannerDto,
  ) {
    return this.liveops.createBanner(req.user.userId, body);
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("/admin/liveops/banners/:id")
  async updateBanner(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateLiveopsBannerDto,
  ) {
    return this.liveops.updateBanner(req.user.userId, id, body);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("/admin/liveops/banners/:id")
  async deleteBanner(@Req() req: any, @Param("id") id: string) {
    return this.liveops.deleteBanner(req.user.userId, id);
  }

  @Get("/liveops/events")
  async publicEvents() {
    return this.liveops.listPublicEvents();
  }

  @Get("/liveops/banners")
  async publicBanners() {
    return this.liveops.listPublicBanners();
  }
}
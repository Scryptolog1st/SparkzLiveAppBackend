import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { OptionalJwtAuthGuard } from "../../auth/jwt/optional-jwt-auth.guard";
import { DiscoveryService } from "../discovery.service";
import {
  ExploreLiveStreamsQueryDto,
  ExploreLiveStreamsResponse,
} from "../dto/explore.dto";

@Controller("explore")
export class ExploreController {
  constructor(private readonly discovery: DiscoveryService) { }

  @UseGuards(OptionalJwtAuthGuard)
  @Get("streams/live")
  async liveStreams(
    @Query() q: ExploreLiveStreamsQueryDto,
    @Req() req: Request,
  ): Promise<ExploreLiveStreamsResponse> {
    const currentUserId = (req as any).user?.userId;
    return this.discovery.getExploreLiveStreams(q, currentUserId);
  }
}
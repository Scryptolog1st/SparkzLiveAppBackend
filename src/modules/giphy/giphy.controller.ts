import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { GiphyService } from "./giphy.service";

@Controller("giphy")
export class GiphyController {
  constructor(private readonly giphy: GiphyService) {}

  @UseGuards(
    JwtAuthGuard,
    RateLimitGuard({
      keyPrefix: "giphy:trending",
      limit: 60,
      windowMs: 60_000,
    }),
  )
  @Get("trending")
  trending(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("rating") rating?: string,
  ) {
    return this.giphy.trending({ limit, offset, rating });
  }

  @UseGuards(
    JwtAuthGuard,
    RateLimitGuard({
      keyPrefix: "giphy:search",
      limit: 80,
      windowMs: 60_000,
    }),
  )
  @Get("search")
  search(
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("rating") rating?: string,
  ) {
    return this.giphy.search({ q, limit, offset, rating });
  }
}

// backend/src/modules/economy/economy.controller.ts

import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { EconomyService } from "./economy.service";
import { SendGiftDto } from "./dto/send-gift.dto";

type JwtReq = Request & { user?: { userId: string; username?: string } };

@Controller()
export class EconomyController {
  constructor(private readonly economy: EconomyService) { }

  @Get("/gifts/catalog")
  @Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  @Header("Pragma", "no-cache")
  @Header("Expires", "0")
  async catalog() {
    return this.economy.getCatalog();
  }

  @UseGuards(JwtAuthGuard)
  @Get("/me/wallet")
  async myWallet(@Req() req: JwtReq) {
    return this.economy.getMyWallet(req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/gifts/send")
  async sendGift(
    @Param("id") streamId: string,
    @Req() req: JwtReq,
    @Body() dto: SendGiftDto,
  ) {
    return this.economy.sendGift({
      streamId,
      senderUserId: req.user!.userId,
      senderUsername: req.user?.username,
      recipientUserId: dto.recipientUserId,
      giftId: dto.giftId,
      idempotencyKey: dto.idempotencyKey,
      quantity: dto.quantity,
      battleSideId: dto.battleSideId,
    });
  }

  @Get("gifts/categories")
  @Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  @Header("Pragma", "no-cache")
  @Header("Expires", "0")
  getGiftCategories() {
    return this.economy.getPublicGiftCategories();
  }


}
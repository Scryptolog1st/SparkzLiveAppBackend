import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Body,
} from "@nestjs/common";
import type { Request } from "express";
import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { SendChatMessageDto } from "./dto/send-chat-message.dto";

type JwtReq = Request & { user?: { userId: string; username?: string } };

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) { }

  @Get("/streams/:id/chat")
  async history(
    @Param("id") streamId: string,
    @Query("limit") limit?: string,
    @Query("before") before?: string,
  ) {
    const lim = Math.min(Math.max(parseInt(limit || "50", 10) || 50, 1), 100);
    const beforeDate = before ? new Date(before) : null;
    return this.chat.getMessages(streamId, lim, beforeDate);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/chat")
  async send(
    @Param("id") streamId: string,
    @Req() req: JwtReq,
    @Body() dto: SendChatMessageDto,
  ) {
    const userId = req.user?.userId;
    const username = req.user?.username ?? "";

    return this.chat.sendMessage({
      streamId,
      userId: userId!,
      username,
      text: dto.text,
      replyToMessageId: dto.replyToMessageId ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete("/admin/chat/messages/:id")
  async deleteAsAdmin(@Req() req: JwtReq, @Param("id") id: string) {
    return this.chat.deleteMessageAsAdmin(req.user!.userId, id);
  }
}
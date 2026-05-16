import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { DmsService } from "./dms.service";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { AdvertisementDmRequestDto, SendDmDto, UpdateDmSettingsDto } from "./dto/dms.dto";

type JwtReq = Request & { user?: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller("dms")
export class DmsController {
    constructor(private readonly dms: DmsService) { }

    @Get("check-paywall/:recipientId")
    async checkPaywall(@Param("recipientId") recipientId: string) {
        return this.dms.getDmSettings(recipientId);
    }

    @Get("settings")
    async getSettings(@Req() req: JwtReq) {
        return this.dms.getDmSettings(req.user!.userId);
    }

    @Put("settings")
    async updateSettings(@Req() req: JwtReq, @Body() dto: UpdateDmSettingsDto) {
        return this.dms.updateDmSettings(req.user!.userId, dto.dmUnlockGiftId ?? null);
    }

    @Get("unread-count")
    async unreadCount(@Req() req: JwtReq) {
        return this.dms.getUnreadSummary(req.user!.userId);
    }

    @Post("conversations/start")
    async startConversation(@Req() req: JwtReq, @Body() body: any) {
        return this.dms.startConversation(req.user!.userId, body?.recipientUserId);
    }

    @Get("conversations")
    async listConversations(@Req() req: JwtReq, @Query("type") type?: string) {
        return this.dms.getConversations(req.user!.userId, type);
    }

    @Post("conversations/:id/read")
    async markConversationRead(@Req() req: JwtReq, @Param("id") conversationId: string) {
        return this.dms.markConversationRead(req.user!.userId, conversationId);
    }

    @Get("conversations/:id/messages")
    async listMessages(
        @Req() req: JwtReq,
        @Param("id") conversationId: string,
        @Query("limit") limit?: string,
        @Query("before") before?: string,
    ) {
        const lim = Math.min(Math.max(parseInt(limit || "50", 10) || 50, 1), 100);
        const beforeDate = before ? new Date(before) : null;
        return this.dms.getMessages(req.user!.userId, conversationId, lim, beforeDate);
    }

    @Post("send")
    async sendMessage(@Req() req: JwtReq, @Body() dto: SendDmDto) {
        return this.dms.sendMessage(req.user!.userId, dto);
    }

    @Post("advertisements/:advertisementId/request")
    async createAdvertisementMessageRequest(
        @Req() req: JwtReq,
        @Param("advertisementId") advertisementId: string,
        @Body() dto: AdvertisementDmRequestDto,
    ) {
        return this.dms.createAdvertisementMessageRequest(req.user!.userId, advertisementId, dto.text);
    }

    @Post("conversations/:id/request/accept")
    async acceptMessageRequest(@Req() req: JwtReq, @Param("id") conversationId: string) {
        return this.dms.acceptMessageRequest(req.user!.userId, conversationId);
    }

    @Post("conversations/:id/request/deny")
    async denyMessageRequest(@Req() req: JwtReq, @Param("id") conversationId: string) {
        return this.dms.denyMessageRequest(req.user!.userId, conversationId);
    }

    @Delete("messages/:id/local")
    async deleteMessageLocal(@Req() req: JwtReq, @Param("id") messageId: string) {
        return this.dms.deleteMessageLocal(messageId, req.user!.userId);
    }

    @Delete("conversations/:id/local")
    async deleteConversation(@Req() req: JwtReq, @Param("id") convoId: string) {
        return this.dms.deleteConversationLocal(convoId, req.user!.userId);
    }
}

import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import {
    CloseHelpdeskLiveChatDto,
    CreateHelpdeskTicketDto,
    HelpdeskLiveChatQueryDto,
    HelpdeskTicketQueryDto,
    ReplyHelpdeskLiveChatDto,
    ReplyHelpdeskTicketDto,
    StartHelpdeskLiveChatDto,
} from "./dto/helpdesk.dto";
import { HelpdeskPhase2Service } from "./helpdesk-phase2.service";
import { HelpdeskService } from "./helpdesk.service";

type JwtReq = Request & { user?: { userId: string } };

@Controller("helpdesk")
@UseGuards(JwtAuthGuard)
export class HelpdeskController {
    constructor(
        private readonly helpdesk: HelpdeskService,
        private readonly phase2: HelpdeskPhase2Service,
    ) { }

    @Get("categories")
    async categories() {
        return this.helpdesk.listPublicCategories();
    }

    @Get("live-chat/threads")
    async listLiveChatThreads(
        @Req() req: JwtReq,
        @Query() query: HelpdeskLiveChatQueryDto,
    ) {
        return this.phase2.listUserLiveChatThreads(req.user!.userId, query);
    }

    @Post("live-chat/threads")
    async startLiveChatThread(
        @Req() req: JwtReq,
        @Body() body: StartHelpdeskLiveChatDto,
    ) {
        return this.phase2.startUserLiveChatThread(req.user!.userId, body);
    }

    @Get("live-chat/threads/:id")
    async getLiveChatThread(@Req() req: JwtReq, @Param("id") id: string) {
        return this.phase2.getUserLiveChatThread(req.user!.userId, id);
    }

    @Post("live-chat/threads/:id/messages")
    async addLiveChatMessage(
        @Req() req: JwtReq,
        @Param("id") id: string,
        @Body() body: ReplyHelpdeskLiveChatDto,
    ) {
        return this.phase2.addUserLiveChatMessage(req.user!.userId, id, body);
    }

    @Post("live-chat/threads/:id/close")
    async closeLiveChatThread(
        @Req() req: JwtReq,
        @Param("id") id: string,
        @Body() body: CloseHelpdeskLiveChatDto,
    ) {
        return this.phase2.closeUserLiveChatThread(req.user!.userId, id, body);
    }

    @Get("tickets")
    async listTickets(@Req() req: JwtReq, @Query() query: HelpdeskTicketQueryDto) {
        return this.helpdesk.listUserTickets(req.user!.userId, query);
    }

    @Post("tickets")
    async createTicket(@Req() req: JwtReq, @Body() body: CreateHelpdeskTicketDto) {
        return this.helpdesk.createUserTicket(req.user!.userId, body);
    }

    @Get("tickets/:id")
    async getTicket(@Req() req: JwtReq, @Param("id") id: string) {
        return this.helpdesk.getUserTicket(req.user!.userId, id);
    }

    @Post("tickets/:id/reply")
    async reply(
        @Req() req: JwtReq,
        @Param("id") id: string,
        @Body() body: ReplyHelpdeskTicketDto,
    ) {
        return this.helpdesk.addUserReply(req.user!.userId, id, body);
    }
}

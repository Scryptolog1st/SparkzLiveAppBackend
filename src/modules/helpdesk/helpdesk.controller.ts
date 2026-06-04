import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import {
    CreateHelpdeskTicketDto,
    HelpdeskTicketQueryDto,
    ReplyHelpdeskTicketDto,
} from "./dto/helpdesk.dto";
import { HelpdeskService } from "./helpdesk.service";

type JwtReq = Request & { user?: { userId: string } };

@Controller("helpdesk")
@UseGuards(JwtAuthGuard)
export class HelpdeskController {
    constructor(private readonly helpdesk: HelpdeskService) { }

    @Get("categories")
    async categories() {
        return this.helpdesk.listPublicCategories();
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

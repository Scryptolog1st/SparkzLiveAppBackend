import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { CreateReportDto } from "./dto/create-report.dto";
import { ReportsService } from "./reports.service";

type JwtReq = Request & { user?: { userId: string; username?: string } };

@Controller("reports")
export class ReportsController {
    constructor(private readonly reports: ReportsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    async createReport(@Req() req: JwtReq, @Body() dto: CreateReportDto) {
        return this.reports.createReport(req.user!.userId, dto);
    }
}
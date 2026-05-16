import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import {
    ReportReasonCode,
    ReportStatus,
    ReportTargetType,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private resolveTargetType(
        value: CreateReportDto["targetType"],
    ): ReportTargetType {
        switch (value) {
            case "USER":
                return ReportTargetType.USER;
            case "STREAM":
                return ReportTargetType.STREAM;
            case "CHAT_MESSAGE":
                return ReportTargetType.CHAT_MESSAGE;
            case "DM_MESSAGE":
                return ReportTargetType.DM_MESSAGE;
            default:
                throw new BadRequestException("Invalid report target type.");
        }
    }

    private resolveReasonCode(
        value: CreateReportDto["reasonCode"],
    ): ReportReasonCode {
        switch (value) {
            case "NUDITY":
                return ReportReasonCode.NUDITY;
            case "HARASSMENT_OR_BULLYING":
                return ReportReasonCode.HARASSMENT_OR_BULLYING;
            case "RACISM_OR_HATE":
                return ReportReasonCode.RACISM_OR_HATE;
            case "THREATS":
                return ReportReasonCode.THREATS;
            case "INAPPROPRIATE_BEHAVIOR":
                return ReportReasonCode.INAPPROPRIATE_BEHAVIOR;
            case "RULE_BREAKING_STREAM":
                return ReportReasonCode.RULE_BREAKING_STREAM;
            case "ABUSIVE_CHAT_MESSAGE":
                return ReportReasonCode.ABUSIVE_CHAT_MESSAGE;
            case "ABUSIVE_DM":
                return ReportReasonCode.ABUSIVE_DM;
            case "OTHER":
                return ReportReasonCode.OTHER;
            default:
                throw new BadRequestException("Invalid report reason code.");
        }
    }

    private async validateTarget(dto: CreateReportDto) {
        if (dto.targetType === "USER") {
            if (!dto.targetUserId) {
                throw new BadRequestException("targetUserId is required for USER reports.");
            }

            const targetUser = await this.prisma.user.findUnique({
                where: { id: dto.targetUserId },
                select: { id: true },
            });

            if (!targetUser) {
                throw new NotFoundException("Reported user not found.");
            }

            return {
                targetUserId: dto.targetUserId,
                targetStreamId: null,
                targetChatMessageId: null,
                targetDmMessageId: null,
            };
        }

        if (dto.targetType === "STREAM") {
            if (!dto.targetStreamId) {
                throw new BadRequestException("targetStreamId is required for STREAM reports.");
            }

            const targetStream = await this.prisma.stream.findUnique({
                where: { id: dto.targetStreamId },
                select: { id: true, hostUserId: true },
            });

            if (!targetStream) {
                throw new NotFoundException("Reported stream not found.");
            }

            return {
                targetUserId: targetStream.hostUserId,
                targetStreamId: dto.targetStreamId,
                targetChatMessageId: null,
                targetDmMessageId: null,
            };
        }

        if (dto.targetType === "CHAT_MESSAGE") {
            if (!dto.targetChatMessageId) {
                throw new BadRequestException(
                    "targetChatMessageId is required for CHAT_MESSAGE reports.",
                );
            }

            const targetMessage = await this.prisma.chatMessage.findUnique({
                where: { id: dto.targetChatMessageId },
                select: {
                    id: true,
                    userId: true,
                    streamId: true,
                },
            });

            if (!targetMessage) {
                throw new NotFoundException("Reported chat message not found.");
            }

            return {
                targetUserId: targetMessage.userId,
                targetStreamId: targetMessage.streamId,
                targetChatMessageId: dto.targetChatMessageId,
                targetDmMessageId: null,
            };
        }

        if (dto.targetType === "DM_MESSAGE") {
            if (!dto.targetDmMessageId) {
                throw new BadRequestException(
                    "targetDmMessageId is required for DM_MESSAGE reports.",
                );
            }

            const targetMessage = await this.prisma.directMessage.findUnique({
                where: { id: dto.targetDmMessageId },
                select: {
                    id: true,
                    senderId: true,
                },
            });

            if (!targetMessage) {
                throw new NotFoundException("Reported DM message not found.");
            }

            return {
                targetUserId: targetMessage.senderId,
                targetStreamId: null,
                targetChatMessageId: null,
                targetDmMessageId: dto.targetDmMessageId,
            };
        }

        throw new BadRequestException("Invalid report target type.");
    }

    async createReport(reporterUserId: string, dto: CreateReportDto) {
        const target = await this.validateTarget(dto);

        if (target.targetUserId && target.targetUserId === reporterUserId) {
            throw new BadRequestException("You cannot report yourself.");
        }

        const created = await this.prisma.report.create({
            data: {
                reporterUserId,
                targetType: this.resolveTargetType(dto.targetType),
                targetUserId: target.targetUserId,
                targetStreamId: target.targetStreamId,
                targetChatMessageId: target.targetChatMessageId,
                targetDmMessageId: target.targetDmMessageId,
                reasonCode: this.resolveReasonCode(dto.reasonCode),
                description: this.normalizeOptionalString(dto.description),
                status: ReportStatus.OPEN,
            },
            include: {
                reporter: {
                    include: { profile: true },
                },
            },
        });

        return {
            success: true,
            report: {
                id: created.id,
                reporterUserId: created.reporterUserId,
                targetType: created.targetType,
                targetUserId: created.targetUserId ?? null,
                targetStreamId: created.targetStreamId ?? null,
                targetChatMessageId: created.targetChatMessageId ?? null,
                targetDmMessageId: created.targetDmMessageId ?? null,
                reasonCode: created.reasonCode,
                description: created.description ?? null,
                status: created.status,
                createdAt: created.createdAt.toISOString(),
                updatedAt: created.updatedAt.toISOString(),
            },
        };
    }
}
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import {
    AdvertisementJobStatus,
    ConversationRequestOrigin,
    ConversationRequestStatus,
    ConversationThreadType,
    DirectMessageOrigin,
    DirectMessageType,
    LedgerEntryType,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NotificationsService } from "../notifications/notifications.service";
import { SendDmDto } from "./dto/dms.dto";

type DmUserSummary = {
    id: string;
    publicId: string | null;
    username: string;
    displayName: string;
    avatarUrl: string | null;
};

@Injectable()
export class DmsService {
    private readonly logger = new Logger(DmsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly realtime: RealtimeGateway,
        private readonly notifications: NotificationsService,
    ) { }

    private userSummary(user: any): DmUserSummary | null {
        if (!user) return null;

        const displayName =
            typeof user?.profile?.displayName === "string"
                ? user.profile.displayName.trim()
                : "";

        return {
            id: user.id,
            publicId: user.publicId ?? null,
            username: user.username,
            displayName: displayName || user.username,
            avatarUrl: user.profile?.avatarUrl ?? null,
        };
    }

    private getParticipantOrder(userA: string, userB: string) {
        return userA <= userB
            ? { p1: userA, p2: userB }
            : { p1: userB, p2: userA };
    }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private walletSummary(wallet: any) {
        if (!wallet) return null;

        return {
            userId: wallet.userId,
            coins: wallet.coins,
            diamondsEarned: wallet.diamondsEarned,
            creatorEarnings: wallet.creatorEarnings ?? 0,
            updatedAt:
                wallet.updatedAt instanceof Date
                    ? wallet.updatedAt.toISOString()
                    : wallet.updatedAt,
        };
    }

    private assertDmGiftIdempotentMatches(
        existing: {
            streamId: string | null;
            recipientUserId: string;
            giftId: string;
        },
        expected: {
            recipientUserId: string;
            giftId: string;
        },
    ) {
        if (
            (existing.streamId ?? null) !== null ||
            existing.recipientUserId !== expected.recipientUserId ||
            existing.giftId !== expected.giftId
        ) {
            throw new BadRequestException(
                "Idempotency key was already used for a different DM gift request.",
            );
        }
    }

    private mapSentDmPayload(
        message: any,
        senderWallet?: any,
        idempotent?: boolean,
    ) {
        return {
            success: true,
            id: message.id,
            conversationId: message.conversationId,
            sender: this.userSummary(message.sender),
            messageType: message.messageType,
            text: message.text,
            mediaUrl: message.mediaUrl,
            giftTxId: message.giftTxId,
            isRead: message.isRead,
            createdAt:
                message.createdAt instanceof Date
                    ? message.createdAt.toISOString()
                    : message.createdAt,
            ...(senderWallet ? { senderWallet: this.walletSummary(senderWallet) } : {}),
            ...(typeof idempotent === "boolean" ? { idempotent } : {}),
        };
    }

    private normalizeConversationThreadType(value: unknown, fallback: ConversationThreadType | null = null) {
        const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

        if (!raw) return fallback;

        if (["NORMAL", "REGULAR", "DM", "DMS"].includes(raw)) {
            return ConversationThreadType.NORMAL;
        }

        if (["ADVERTISEMENT_JOB", "ADVERTISEMENT_JOBS", "AD_JOB", "AD_JOBS", "JOB", "JOBS"].includes(raw)) {
            return ConversationThreadType.ADVERTISEMENT_JOB;
        }

        return fallback;
    }


    private normalizeAdvertisementRequestText(value: unknown) {
        const text = String(value || "").trim();

        if (!text) {
            throw new BadRequestException("Message text is required.");
        }

        if (text.length > 1000) {
            throw new BadRequestException("Message text can be up to 1000 characters.");
        }

        return text;
    }

    private buildAdvertisementRequestPreview(text: string) {
        const normalized = text.replace(/\s+/g, " ").trim();
        return normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized;
    }

    private async isBlockedEitherDirection(userA: string, userB: string): Promise<boolean> {
        if (!userA || !userB || userA === userB) {
            return false;
        }

        const block = await this.prisma.userBlock.findFirst({
            where: {
                OR: [
                    { blockerId: userA, blockedId: userB },
                    { blockerId: userB, blockedId: userA },
                ],
            },
            select: { blockerId: true },
        });

        return !!block;
    }

    private async getExcludedUserIds(userId: string): Promise<Set<string>> {
        const blocks = await this.prisma.userBlock.findMany({
            where: {
                OR: [{ blockerId: userId }, { blockedId: userId }],
            },
            select: { blockerId: true, blockedId: true },
        });

        const ids = new Set<string>();

        for (const block of blocks) {
            if (block.blockerId === userId) ids.add(block.blockedId);
            if (block.blockedId === userId) ids.add(block.blockerId);
        }

        return ids;
    }

    private async getConversationMessageCounts(
        conversationId: string,
        currentUserId: string,
        otherUserId: string,
    ) {
        const grouped = await this.prisma.directMessage.groupBy({
            by: ["senderId"],
            where: {
                conversationId,
                senderId: { in: [currentUserId, otherUserId] },
            },
            _count: {
                _all: true,
            },
        });

        let currentUserMessageCount = 0;
        let otherUserMessageCount = 0;

        for (const row of grouped) {
            if (row.senderId === currentUserId) {
                currentUserMessageCount = row._count._all;
            } else if (row.senderId === otherUserId) {
                otherUserMessageCount = row._count._all;
            }
        }

        return {
            currentUserMessageCount,
            otherUserMessageCount,
        };
    }

    private async getConversationCountsMap(
        conversations: Array<{
            id: string;
            participant1Id: string;
            participant2Id: string;
        }>,
        currentUserId: string,
    ) {
        const map = new Map<string, { currentUser: number; otherUser: number }>();

        if (conversations.length === 0) {
            return map;
        }

        for (const conversation of conversations) {
            map.set(conversation.id, { currentUser: 0, otherUser: 0 });
        }

        const conversationMeta = new Map(
            conversations.map((conversation) => [
                conversation.id,
                {
                    currentUserId,
                    otherUserId:
                        conversation.participant1Id === currentUserId
                            ? conversation.participant2Id
                            : conversation.participant1Id,
                },
            ]),
        );

        const grouped = await this.prisma.directMessage.groupBy({
            by: ["conversationId", "senderId"],
            where: {
                conversationId: { in: conversations.map((conversation) => conversation.id) },
            },
            _count: {
                _all: true,
            },
        });

        for (const row of grouped) {
            const counts = map.get(row.conversationId);
            const meta = conversationMeta.get(row.conversationId);

            if (!counts || !meta) continue;

            if (row.senderId === meta.currentUserId) {
                counts.currentUser = row._count._all;
            } else if (row.senderId === meta.otherUserId) {
                counts.otherUser = row._count._all;
            }
        }

        return map;
    }

    async updateDmSettings(userId: string, dmUnlockGiftId: string | null) {
        if (dmUnlockGiftId) {
            const gift = await this.prisma.gift.findUnique({ where: { id: dmUnlockGiftId } });
            if (!gift) throw new NotFoundException("Gift not found in catalog");
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { dmUnlockGiftId },
        });

        return { success: true, dmUnlockGiftId };
    }

    async getDmSettings(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { dmUnlockGiftId: true },
        });

        return { dmUnlockGiftId: user?.dmUnlockGiftId ?? null };
    }

    async startConversation(userId: string, recipientUserIdValue: string) {
        const recipientUserId = String(recipientUserIdValue || "").trim();

        if (!recipientUserId) {
            throw new BadRequestException("Recipient is required.");
        }

        if (recipientUserId === userId) {
            throw new BadRequestException("You cannot start a DM with yourself.");
        }

        const recipient = await this.prisma.user.findUnique({
            where: { id: recipientUserId },
            include: { profile: true },
        });

        if (!recipient) {
            throw new NotFoundException("Recipient not found.");
        }

        const isBlocked = await this.isBlockedEitherDirection(userId, recipientUserId);
        if (isBlocked) {
            throw new ForbiddenException("You cannot message this user.");
        }

        const { p1, p2 } = this.getParticipantOrder(userId, recipientUserId);

        const includeConversation = {
            participant1: { include: { profile: true } },
            participant2: { include: { profile: true } },
            messages: {
                orderBy: { createdAt: "desc" as const },
                take: 1,
            },
        };

        let conversation = await this.prisma.conversation.findFirst({
            where: {
                participant1Id: p1,
                participant2Id: p2,
                threadType: ConversationThreadType.NORMAL,
                threadKey: "normal",
            },
            include: includeConversation,
        });

        if (conversation) {
            conversation = await this.prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    deletedByP1: false,
                    deletedByP2: false,
                },
                include: includeConversation,
            });
        } else {
            conversation = await this.prisma.conversation.create({
                data: {
                    participant1Id: p1,
                    participant2Id: p2,
                    threadType: ConversationThreadType.NORMAL,
                    threadKey: "normal",
                    interactionCount: 0,
                },
                include: includeConversation,
            });
        }

        const isP1 = conversation.participant1Id === userId;
        const otherUser = isP1 ? conversation.participant2 : conversation.participant1;
        const latestMessage = conversation.messages[0] ?? null;

        return {
            success: true,
            conversationId: conversation.id,
            conversation: {
                id: conversation.id,
                threadType: (conversation as any).threadType ?? "NORMAL",
                threadKey: (conversation as any).threadKey ?? "normal",
                otherUser: this.userSummary(otherUser),
                interactionCount: conversation.interactionCount,
                requestStatus: (conversation as any).requestStatus ?? "NONE",
                requestOrigin: (conversation as any).requestOrigin ?? "NORMAL",
                latestMessage: latestMessage
                    ? {
                        id: latestMessage.id,
                        text: latestMessage.text,
                        messageType: latestMessage.messageType,
                        isRead: latestMessage.isRead,
                        createdAt: latestMessage.createdAt.toISOString(),
                        senderId: latestMessage.senderId,
                    }
                    : null,
                updatedAt: conversation.updatedAt.toISOString(),
            },
        };
    }

    async getConversations(userId: string, typeValue?: string) {
        const threadType = this.normalizeConversationThreadType(typeValue, null);

        const where: any = {
            OR: [
                { AND: [{ participant1Id: userId }, { deletedByP1: false }] },
                { AND: [{ participant2Id: userId }, { deletedByP2: false }] },
            ],
        };

        if (threadType) {
            where.threadType = threadType;
        }

        const conversations = await this.prisma.conversation.findMany({
            where,
            include: {
                participant1: { include: { profile: true } },
                participant2: { include: { profile: true } },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                advertisementJobs: {
                    orderBy: { updatedAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        const excludedUserIds = await this.getExcludedUserIds(userId);

        const visibleConversations = conversations.filter((conversation) => {
            const isP1 = conversation.participant1Id === userId;
            const otherUser = isP1 ? conversation.participant2 : conversation.participant1;
            return !excludedUserIds.has(otherUser.id);
        });

        const countsMap = await this.getConversationCountsMap(
            visibleConversations.map((conversation) => ({
                id: conversation.id,
                participant1Id: conversation.participant1Id,
                participant2Id: conversation.participant2Id,
            })),
            userId,
        );

        return visibleConversations.map((conversation) => {
            const isP1 = conversation.participant1Id === userId;
            const otherUser = isP1 ? conversation.participant2 : conversation.participant1;
            const latestMessage = conversation.messages[0] ?? null;
            const latestAdvertisementJob = Array.isArray((conversation as any).advertisementJobs)
                ? (conversation as any).advertisementJobs[0] ?? null
                : null;
            const counts = countsMap.get(conversation.id) ?? { currentUser: 0, otherUser: 0 };

            return {
                id: conversation.id,
                threadType: (conversation as any).threadType ?? "NORMAL",
                threadKey: (conversation as any).threadKey ?? "normal",
                otherUser: this.userSummary(otherUser),
                interactionCount: conversation.interactionCount,
                requestStatus: (conversation as any).requestStatus ?? "NONE",
                requestOrigin: (conversation as any).requestOrigin ?? "NORMAL",
                requestAdvertisementId: (conversation as any).requestAdvertisementId ?? null,
                requestSenderId: (conversation as any).requestSenderId ?? null,
                requestRecipientId: (conversation as any).requestRecipientId ?? null,
                requestPreviewText: (conversation as any).requestPreviewText ?? null,
                requestCreatedAt: (conversation as any).requestCreatedAt?.toISOString?.() ?? null,
                requestRespondedAt: (conversation as any).requestRespondedAt?.toISOString?.() ?? null,
                messageCounts: {
                    currentUser: counts.currentUser,
                    otherUser: counts.otherUser,
                },
                latestMessage: latestMessage
                    ? {
                        id: latestMessage.id,
                        text: latestMessage.text,
                        messageType: latestMessage.messageType,
                        isRead: latestMessage.isRead,
                        createdAt: latestMessage.createdAt.toISOString(),
                        senderId: latestMessage.senderId,
                        origin: (latestMessage as any).origin ?? "NORMAL",
                        advertisementId: (latestMessage as any).advertisementId ?? null,
                        hiddenUntilRequestAccepted: (latestMessage as any).hiddenUntilRequestAccepted ?? false,
                    }
                    : null,
                updatedAt: conversation.updatedAt.toISOString(),
            };
        });
    }

    async getMessages(
        userId: string,
        conversationId: string,
        limit: number,
        before: Date | null,
    ) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) throw new NotFoundException("Conversation not found");
        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
            throw new ForbiddenException("Not a participant in this conversation");
        }

        const otherUserId =
            conversation.participant1Id === userId
                ? conversation.participant2Id
                : conversation.participant1Id;

        const isBlocked = await this.isBlockedEitherDirection(userId, otherUserId);
        if (isBlocked) {
            throw new ForbiddenException("You cannot access messages with this user.");
        }

        const where: any = {
            conversationId,
            OR: [
                { AND: [{ senderId: userId }, { deletedBySender: false }] },
                { AND: [{ senderId: { not: userId } }, { deletedByRecipient: false }] },
            ],
        };

        if (
            (conversation as any).requestOrigin === ConversationRequestOrigin.ADVERTISEMENT &&
            (conversation as any).requestRecipientId === userId &&
            (conversation as any).requestStatus !== ConversationRequestStatus.ACCEPTED
        ) {
            where.hiddenUntilRequestAccepted = false;
        }

        if (before && !isNaN(before.getTime())) {
            where.createdAt = { lt: before };
        }

        const rows = await this.prisma.directMessage.findMany({
            where,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                sender: { include: { profile: true } },
                giftTx: true,
            },
        });

        const unreadIds = rows
            .filter((message) => !message.isRead && message.senderId !== userId)
            .map((message) => message.id);

        if (unreadIds.length > 0) {
            await this.prisma.directMessage.updateMany({
                where: { id: { in: unreadIds } },
                data: { isRead: true },
            });
        }

        return rows.map((message) => ({
            id: message.id,
            sender: this.userSummary(message.sender),
            messageType: message.messageType,
            text: message.text,
            mediaUrl: message.mediaUrl,
            giftTxId: message.giftTxId,
            isRead: message.isRead || unreadIds.includes(message.id),
            createdAt: message.createdAt.toISOString(),
        }));
    }

    async sendMessage(senderId: string, dto: SendDmDto) {
        const requestedConversationId = String((dto as any).conversationId || "").trim();
        const requestedMessageType = String(dto.messageType || "TEXT").toUpperCase() as DirectMessageType;
        const idempotencyKey = this.normalizeOptionalString((dto as any).idempotencyKey);

        let recipientUserId = String(dto.recipientUserId || "").trim();
        let conversation: any = null;

        if (requestedConversationId) {
            conversation = await this.prisma.conversation.findFirst({
                where: {
                    id: requestedConversationId,
                    OR: [
                        { participant1Id: senderId },
                        { participant2Id: senderId },
                    ],
                },
            });

            if (!conversation) {
                throw new NotFoundException("Conversation not found");
            }

            const threadRecipientId =
                conversation.participant1Id === senderId
                    ? conversation.participant2Id
                    : conversation.participant1Id;

            if (recipientUserId && recipientUserId !== threadRecipientId) {
                throw new BadRequestException("Recipient does not match this conversation.");
            }

            recipientUserId = threadRecipientId;
        }

        if (!recipientUserId) {
            throw new BadRequestException("Recipient is required.");
        }

        const isSelfDm = senderId === recipientUserId;

        const recipient = await this.prisma.user.findUnique({
            where: { id: recipientUserId },
            select: { id: true, dmUnlockGiftId: true },
        });

        if (!recipient) throw new NotFoundException("Recipient not found");

        if (!isSelfDm) {
            const isBlocked = await this.isBlockedEitherDirection(senderId, recipientUserId);
            if (isBlocked) {
                throw new ForbiddenException("You cannot message this user.");
            }
        }

        const { p1, p2 } = this.getParticipantOrder(senderId, recipientUserId);

        if (!conversation) {
            conversation = await this.prisma.conversation.findUnique({
                where: {
                    participant1Id_participant2Id_threadType_threadKey: {
                        participant1Id: p1,
                        participant2Id: p2,
                        threadType: ConversationThreadType.NORMAL,
                        threadKey: "normal",
                    },
                },
            });
        }

        const isAdvertisementConversation =
            conversation &&
            (
                (conversation as any).threadType === ConversationThreadType.ADVERTISEMENT_JOB ||
                (conversation as any).requestOrigin === ConversationRequestOrigin.ADVERTISEMENT
            );

        if (
            isAdvertisementConversation &&
            (conversation as any).requestStatus === ConversationRequestStatus.PENDING &&
            requestedMessageType !== DirectMessageType.TEXT
        ) {
            throw new ForbiddenException("Only text messages are allowed until the advertisement job is accepted.");
        }

        let requiredGiftId: string | null = null;

        if (!conversation && !isSelfDm && recipient.dmUnlockGiftId) {
            const hasHistory = await this.prisma.conversation.findUnique({
                where: {
                    participant1Id_participant2Id_threadType_threadKey: {
                        participant1Id: p1,
                        participant2Id: p2,
                        threadType: ConversationThreadType.NORMAL,
                        threadKey: "normal",
                    },
                },
            });

            if (!hasHistory || hasHistory.interactionCount === 0) {
                if (dto.giftId !== recipient.dmUnlockGiftId) {
                    throw new ForbiddenException(
                        "This creator requires a specific gift to unlock DMs.",
                    );
                }

                requiredGiftId = recipient.dmUnlockGiftId;
            }
        }

        let giftTxId: string | null = null;
        let senderWalletAfterGift: any = null;
        let giftWasIdempotent = false;

        if (requiredGiftId || requestedMessageType === DirectMessageType.GIFT) {
            if (isSelfDm) {
                throw new BadRequestException("You cannot send gifts to yourself.");
            }

            if (isAdvertisementConversation) {
                throw new BadRequestException("Gifts cannot be sent inside advertisement job threads.");
            }

            const giftToProcess = requiredGiftId || dto.giftId;
            if (!giftToProcess) {
                throw new BadRequestException("Gift ID required for GIFT message type");
            }

            if (idempotencyKey) {
                const existingGiftTx = await this.prisma.giftTransaction.findUnique({
                    where: {
                        senderUserId_idempotencyKey: {
                            senderUserId: senderId,
                            idempotencyKey,
                        },
                    },
                    include: {
                        gift: true,
                    },
                });

                if (existingGiftTx) {
                    this.assertDmGiftIdempotentMatches(existingGiftTx, {
                        recipientUserId,
                        giftId: giftToProcess,
                    });

                    senderWalletAfterGift = await this.prisma.wallet.upsert({
                        where: { userId: senderId },
                        create: {
                            userId: senderId,
                            coins: 0,
                            diamondsEarned: 0,
                        },
                        update: {},
                    });

                    const existingMessage = await (this.prisma.directMessage as any).findUnique({
                        where: { giftTxId: existingGiftTx.id },
                        include: {
                            sender: { include: { profile: true } },
                        },
                    });

                    if (existingMessage) {
                        return this.mapSentDmPayload(existingMessage, senderWalletAfterGift, true);
                    }

                    giftTxId = existingGiftTx.id;
                    giftWasIdempotent = true;
                }
            }

            const gift = await this.prisma.gift.findUnique({ where: { id: giftToProcess } });
            if (!gift) throw new NotFoundException("Gift not found");

            if (!giftTxId) {
                const txResult = await this.prisma.$transaction(async (tx) => {
                    await tx.wallet.upsert({
                        where: { userId: senderId },
                        create: {
                            userId: senderId,
                            coins: 0,
                            diamondsEarned: 0,
                        },
                        update: {},
                    });

                    const debited = await tx.wallet.updateMany({
                        where: { userId: senderId, coins: { gte: gift.coinCost } },
                        data: { coins: { decrement: gift.coinCost } },
                    });

                    if (debited.count !== 1) {
                        throw new ForbiddenException("Insufficient coins for this gift.");
                    }

                    await tx.wallet.upsert({
                        where: { userId: recipientUserId },
                        create: {
                            userId: recipientUserId,
                            coins: 0,
                            diamondsEarned: gift.diamondValue,
                        },
                        update: { diamondsEarned: { increment: gift.diamondValue } },
                    });

                    const gTx = await tx.giftTransaction.create({
                        data: {
                            id: randomUUID(),
                            streamId: null,
                            giftId: gift.id,
                            senderUserId: senderId,
                            recipientUserId,
                            idempotencyKey,
                            coinCost: gift.coinCost,
                            diamondValue: gift.diamondValue,
                        },
                    });

                    await tx.walletLedger.createMany({
                        data: [
                            {
                                id: randomUUID(),
                                userId: senderId,
                                type: "GIFT_SEND" as LedgerEntryType,
                                deltaCoins: -gift.coinCost,
                                deltaDiamonds: 0,
                                giftTxId: gTx.id,
                            },
                            {
                                id: randomUUID(),
                                userId: recipientUserId,
                                type: "GIFT_RECEIVE" as LedgerEntryType,
                                deltaCoins: 0,
                                deltaDiamonds: gift.diamondValue,
                                giftTxId: gTx.id,
                            },
                        ],
                    });

                    const senderWallet = await tx.wallet.findUnique({
                        where: { userId: senderId },
                    });

                    if (!senderWallet) {
                        throw new Error("Sender wallet missing after DM gift debit");
                    }

                    return {
                        giftTx: gTx,
                        senderWallet,
                    };
                });

                giftTxId = txResult.giftTx.id;
                senderWalletAfterGift = txResult.senderWallet;
            }
        }

        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    participant1Id: p1,
                    participant2Id: p2,
                    interactionCount: 0,
                    threadType: ConversationThreadType.NORMAL,
                    threadKey: "normal",
                },
            });
        }

        const messageOrigin = isAdvertisementConversation
            ? DirectMessageOrigin.ADVERTISEMENT
            : DirectMessageOrigin.NORMAL;

        const message = await this.prisma.directMessage.create({
            data: {
                conversationId: conversation.id,
                senderId,
                messageType: requestedMessageType,
                text: dto.text,
                mediaUrl: dto.mediaUrl,
                giftTxId,
                origin: messageOrigin,
                advertisementId: isAdvertisementConversation ? (conversation as any).requestAdvertisementId ?? null : null,
                hiddenUntilRequestAccepted: false,
            },
            include: { sender: { include: { profile: true } } },
        });

        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                interactionCount: { increment: 1 },
                deletedByP1: false,
                deletedByP2: false,
            },
        });

        const payload = {
            success: true,
            id: message.id,
            conversationId: message.conversationId,
            sender: this.userSummary(message.sender),
            messageType: message.messageType,
            text: message.text,
            mediaUrl: message.mediaUrl,
            giftTxId: message.giftTxId,
            ...(senderWalletAfterGift ? { senderWallet: this.walletSummary(senderWalletAfterGift) } : {}),
            ...(giftWasIdempotent ? { idempotent: true } : {}),
            isRead: message.isRead,
            createdAt: message.createdAt.toISOString(),
        };

        this.realtime.emitDirectMessage(senderId, recipientUserId, payload);

        if (!isSelfDm) {
            try {
                const senderDisplayName =
                    payload.sender?.displayName?.trim() ||
                    payload.sender?.username?.trim() ||
                    "Someone";
                const senderAvatarUrl = payload.sender?.avatarUrl ?? null;
                const pushCopy = this.notifications.buildDirectMessagePushCopy({
                    senderDisplayName,
                    messageType: payload.messageType,
                    messageText: payload.text,
                });

                await this.notifications.createAndSendToUsers({
                    userIds: [recipientUserId],
                    notificationType: "DM_RECEIVED",
                    category: "TRANSACTIONAL",
                    title: pushCopy.title,
                    body: pushCopy.body,
                    payload: {
                        conversationId: conversation.id,
                        dmMessageId: message.id,
                        senderUserId: senderId,
                        recipientUserId,
                        senderUsername: payload.sender?.username ?? null,
                        senderDisplayName,
                        senderAvatarUrl,
                        messageType: payload.messageType,
                    },
                    dedupeKey: `dm-received:${message.id}`,
                    createInbox: true,
                    sendPush: true,
                });
            } catch (error) {
                this.logger.warn(
                    `Failed to send DM push for message ${message.id}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }

        return payload;
    }

    async createAdvertisementMessageRequest(senderId: string, advertisementId: string, textValue: string) {
        const text = this.normalizeAdvertisementRequestText(textValue);
        const preview = this.buildAdvertisementRequestPreview(text);

        const ad = await this.prisma.advertisement.findFirst({
            where: {
                id: advertisementId,
                status: { in: ["LIVE", "CANCELLED_ENDING"] as any },
            },
            include: {
                owner: { include: { profile: true } },
                revisions: {
                    include: { media: true },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!ad) {
            throw new NotFoundException("Advertisement not found or is not live.");
        }

        const recipientUserId = ad.ownerUserId;

        if (recipientUserId === senderId) {
            throw new BadRequestException("You cannot message your own advertisement.");
        }

        const isBlocked = await this.isBlockedEitherDirection(senderId, recipientUserId);
        if (isBlocked) {
            throw new ForbiddenException("You cannot message this user.");
        }

        const { p1, p2 } = this.getParticipantOrder(senderId, recipientUserId);

        const currentRevision =
            ad.revisions.find((revision) => revision.id === ad.currentRevisionId) ||
            ad.revisions.find((revision) => String(revision.status) === "APPROVED") ||
            ad.revisions[0] ||
            null;

        const adTitle = currentRevision?.title || "Advertisement";

        const result = await this.prisma.$transaction(async (tx) => {
            const conversationId = randomUUID();
            const jobId = randomUUID();
            const threadKey = `adjob:${jobId}`;

            const conversation = await tx.conversation.create({
                data: {
                    id: conversationId,
                    participant1Id: p1,
                    participant2Id: p2,
                    interactionCount: 1,
                    threadType: ConversationThreadType.ADVERTISEMENT_JOB,
                    threadKey,
                    requestStatus: ConversationRequestStatus.PENDING,
                    requestOrigin: ConversationRequestOrigin.ADVERTISEMENT,
                    requestAdvertisementId: advertisementId,
                    requestSenderId: senderId,
                    requestRecipientId: recipientUserId,
                    requestPreviewText: preview,
                    requestCreatedAt: new Date(),
                    requestRespondedAt: null,
                },
            });

            const job = await tx.advertisementJob.create({
                data: {
                    id: jobId,
                    advertisementId,
                    conversationId: conversation.id,
                    advertiserUserId: recipientUserId,
                    customerUserId: senderId,
                    requestSequence: 1,
                    status: AdvertisementJobStatus.INQUIRY_OPEN,
                    inquiryMessage: text,
                },
            });

            const message = await tx.directMessage.create({
                data: {
                    id: randomUUID(),
                    conversationId: conversation.id,
                    senderId,
                    messageType: DirectMessageType.TEXT,
                    text,
                    origin: DirectMessageOrigin.ADVERTISEMENT,
                    advertisementId,
                    hiddenUntilRequestAccepted: false,
                },
            });

            return { conversation, message, job };
        });

        const sender = await this.prisma.user.findUnique({
            where: { id: senderId },
            include: { profile: true },
        });

        const payload = {
            id: result.message.id,
            conversationId: result.conversation.id,
            sender: this.userSummary(sender),
            messageType: result.message.messageType,
            text: result.message.text,
            mediaUrl: result.message.mediaUrl,
            giftTxId: result.message.giftTxId,
            isRead: result.message.isRead,
            createdAt: result.message.createdAt.toISOString(),
            origin: result.message.origin,
            advertisementId: result.message.advertisementId,
            hiddenUntilRequestAccepted: result.message.hiddenUntilRequestAccepted,
            requestStatus: result.conversation.requestStatus,
            requestOrigin: result.conversation.requestOrigin,
            requestPreviewText: result.conversation.requestPreviewText,
            advertisementJobId: result.job.id,
            advertisementJobStatus: result.job.status,
            advertisement: {
                id: ad.id,
                title: adTitle,
            },
        };

        this.realtime.emitDirectMessage(senderId, recipientUserId, payload);

        return {
            success: true,
            conversationId: result.conversation.id,
            requestStatus: result.conversation.requestStatus,
            requestOrigin: result.conversation.requestOrigin,
            requestPreviewText: result.conversation.requestPreviewText,
            advertisementJobId: result.job.id,
            advertisementJobStatus: result.job.status,
            message: payload,
        };
    }

    async acceptMessageRequest(userId: string, conversationId: string) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) throw new NotFoundException("Conversation not found");

        if ((conversation as any).requestRecipientId !== userId) {
            throw new ForbiddenException("Only the request recipient can accept this message request.");
        }

        if ((conversation as any).requestStatus !== ConversationRequestStatus.PENDING) {
            throw new BadRequestException("This message request is not pending.");
        }

        await this.prisma.$transaction([
            this.prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    requestStatus: ConversationRequestStatus.ACCEPTED,
                    requestRespondedAt: new Date(),
                },
            }),
            this.prisma.directMessage.updateMany({
                where: {
                    conversationId,
                    hiddenUntilRequestAccepted: true,
                },
                data: {
                    hiddenUntilRequestAccepted: false,
                },
            }),
        ]);

        return {
            success: true,
            conversationId,
            requestStatus: ConversationRequestStatus.ACCEPTED,
        };
    }

    async denyMessageRequest(userId: string, conversationId: string) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) throw new NotFoundException("Conversation not found");

        if ((conversation as any).requestRecipientId !== userId) {
            throw new ForbiddenException("Only the request recipient can deny this message request.");
        }

        if ((conversation as any).requestStatus !== ConversationRequestStatus.PENDING) {
            throw new BadRequestException("This message request is not pending.");
        }

        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                requestStatus: ConversationRequestStatus.DENIED,
                requestRespondedAt: new Date(),
            },
        });

        return {
            success: true,
            conversationId,
            requestStatus: ConversationRequestStatus.DENIED,
        };
    }


    async getUnreadSummary(userId: string) {
        const conversationVisibility = {
            OR: [
                {
                    participant1Id: userId,
                    deletedByP1: false,
                },
                {
                    participant2Id: userId,
                    deletedByP2: false,
                },
            ],
        };

        const unreadWhere = {
            senderId: { not: userId },
            isRead: false,
            deletedByRecipient: false,
            conversation: conversationVisibility,
        };

        const [unreadCount, latestMessage] = await Promise.all([
            this.prisma.directMessage.count({
                where: unreadWhere,
            }),
            this.prisma.directMessage.findFirst({
                where: unreadWhere,
                include: {
                    sender: { include: { profile: true } },
                    conversation: true,
                },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        return {
            success: true,
            unreadCount,
            latestMessage: latestMessage
                ? {
                    id: latestMessage.id,
                    conversationId: latestMessage.conversationId,
                    text: latestMessage.text,
                    messageType: latestMessage.messageType,
                    createdAt: latestMessage.createdAt.toISOString(),
                    sender: this.userSummary(latestMessage.sender),
                }
                : null,
        };
    }

    async markConversationRead(userId: string, conversationId: string) {
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { participant1Id: userId },
                    { participant2Id: userId },
                ],
            },
        });

        if (!conversation) {
            throw new NotFoundException("Conversation not found");
        }

        await this.prisma.directMessage.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        return this.getUnreadSummary(userId);
    }

    async deleteMessageLocal(messageId: string, userId: string) {
        const dm = await this.prisma.directMessage.findUnique({
            where: { id: messageId },
            include: { conversation: true },
        });

        if (!dm) throw new NotFoundException("Message not found");

        if (dm.senderId === userId) {
            await this.prisma.directMessage.update({
                where: { id: messageId },
                data: { deletedBySender: true },
            });
        } else {
            await this.prisma.directMessage.update({
                where: { id: messageId },
                data: { deletedByRecipient: true },
            });
        }

        const remainingCount = await this.prisma.directMessage.count({
            where: {
                conversationId: dm.conversationId,
                OR: [
                    { AND: [{ senderId: userId }, { deletedBySender: false }] },
                    { AND: [{ senderId: { not: userId } }, { deletedByRecipient: false }] },
                ],
            },
        });

        if (remainingCount === 0) {
            const convo = dm.conversation;
            if (convo.participant1Id === userId) {
                await this.prisma.conversation.update({
                    where: { id: convo.id },
                    data: { deletedByP1: true },
                });
            } else if (convo.participant2Id === userId) {
                await this.prisma.conversation.update({
                    where: { id: convo.id },
                    data: { deletedByP2: true },
                });
            }
        }

        return { success: true };
    }

    async deleteConversationLocal(conversationId: string, userId: string) {
        const convo = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!convo) throw new NotFoundException("Conversation not found");

        await this.prisma.$transaction([
            this.prisma.directMessage.updateMany({
                where: { conversationId, senderId: userId },
                data: { deletedBySender: true },
            }),
            this.prisma.directMessage.updateMany({
                where: { conversationId, senderId: { not: userId } },
                data: { deletedByRecipient: true },
            }),
        ]);

        if (convo.participant1Id === userId) {
            await this.prisma.conversation.update({
                where: { id: conversationId },
                data: { deletedByP1: true },
            });
        } else if (convo.participant2Id === userId) {
            await this.prisma.conversation.update({
                where: { id: conversationId },
                data: { deletedByP2: true },
            });
        }

        return { success: true };
    }
}
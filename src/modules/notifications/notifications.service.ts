import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PushPlatform } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  RegisterPushTokenDto,
  SendTestPushDto,
  UnregisterPushTokenDto,
} from './dto/notifications.dto';

type NotificationDeliveryCategory = 'LIVE_ALERT' | 'TRANSACTIONAL' | 'MARKETING';
type PushBlockReason =
  | 'GLOBAL_DISABLED'
  | 'LIVE_ALERTS_DISABLED'
  | 'MARKETING_DISABLED'
  | 'ACTIVE_IN_STREAM';

type CreateAndSendToUsersInput = {
  userIds: string[];
  notificationType: string;
  category?: NotificationDeliveryCategory;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, unknown>;
  streamId?: string | null;
  dedupeKey?: string | null;
  createInbox?: boolean;
  sendPush?: boolean;
};

type BuildLiveStartedPushCopyInput = {
  hostDisplayName?: string | null;
  streamTitle?: string | null;
};

type BuildDirectMessagePushCopyInput = {
  senderDisplayName?: string | null;
  messageType?: string | null;
  messageText?: string | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';

  private readonly knownNotificationTypes = new Set<string>([
    'SYSTEM',
    'STREAM_STARTED',
    'GIFT_RECEIVED',
    'MILESTONE_REACHED',
    'BATTLE_ENDED',
    'MODERATION',
    'HELPDESK_TICKET_REPLY',
    'HELPDESK_LIVE_CHAT_REPLY',
  ]);

  constructor(private readonly prisma: PrismaService) { }

  private isExpoPushToken(value: string) {
    return /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(value.trim());
  }

  private getTemplateValue(name: string, fallback: string): string {
    const raw = process.env[name];
    const normalized = typeof raw === 'string' ? raw.trim() : '';
    return normalized || fallback;
  }

  private formatTemplate(
    template: string,
    values: Record<string, string | null | undefined>,
  ): string {
    return template
      .replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
        const value = values[key];
        return value == null ? '' : String(value);
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  public buildLiveStartedPushCopy(input: BuildLiveStartedPushCopyInput) {
    const hostDisplayName = String(input.hostDisplayName || '').trim() || 'Someone';
    const streamTitle = String(input.streamTitle || '').trim();

    const titleTemplate = this.getTemplateValue(
      'PUSH_LIVE_TITLE_TEMPLATE',
      '{hostDisplayName} is live now',
    );
    const bodyTemplate = this.getTemplateValue(
      'PUSH_LIVE_BODY_TEMPLATE',
      '{hostDisplayName} started: {streamTitle}',
    );
    const fallbackBodyTemplate = this.getTemplateValue(
      'PUSH_LIVE_BODY_FALLBACK_TEMPLATE',
      '{hostDisplayName} started a live stream',
    );

    const title =
      this.formatTemplate(titleTemplate, {
        hostDisplayName,
        streamTitle,
      }) || `${hostDisplayName} is live now`;

    const body =
      this.formatTemplate(
        streamTitle ? bodyTemplate : fallbackBodyTemplate,
        {
          hostDisplayName,
          streamTitle,
        },
      ) || `${hostDisplayName} started a live stream`;

    return { title, body };
  }

  public buildDirectMessagePushCopy(input: BuildDirectMessagePushCopyInput) {
    const senderDisplayName =
      String(input.senderDisplayName || '').trim() || 'Someone';
    const messageType = String(input.messageType || 'TEXT').trim().toUpperCase();
    const messageText = String(input.messageText || '').trim();

    const titleTemplate = this.getTemplateValue(
      'PUSH_DM_TITLE_TEMPLATE',
      'New message from {senderDisplayName}',
    );
    const textBodyTemplate = this.getTemplateValue(
      'PUSH_DM_BODY_TEMPLATE',
      '{senderDisplayName}: {messageText}',
    );
    const fallbackBodyTemplate = this.getTemplateValue(
      'PUSH_DM_BODY_FALLBACK_TEMPLATE',
      'Open SparkzLIVE to view your new message from {senderDisplayName}',
    );
    const imageBodyTemplate = this.getTemplateValue(
      'PUSH_DM_IMAGE_BODY_TEMPLATE',
      '{senderDisplayName} sent you a photo',
    );
    const gifBodyTemplate = this.getTemplateValue(
      'PUSH_DM_GIF_BODY_TEMPLATE',
      '{senderDisplayName} sent you a GIF',
    );
    const giftBodyTemplate = this.getTemplateValue(
      'PUSH_DM_GIFT_BODY_TEMPLATE',
      '{senderDisplayName} sent you a gift',
    );

    const title =
      this.formatTemplate(titleTemplate, {
        senderDisplayName,
        messageText,
      }) || `New message from ${senderDisplayName}`;

    let selectedBodyTemplate = fallbackBodyTemplate;

    if (messageType === 'IMAGE') {
      selectedBodyTemplate = imageBodyTemplate;
    } else if (messageType === 'GIF') {
      selectedBodyTemplate = messageText ? textBodyTemplate : gifBodyTemplate;
    } else if (messageType === 'GIFT') {
      selectedBodyTemplate = giftBodyTemplate;
    } else {
      selectedBodyTemplate = messageText ? textBodyTemplate : fallbackBodyTemplate;
    }

    const body =
      this.formatTemplate(selectedBodyTemplate, {
        senderDisplayName,
        messageText,
      }) || `Open SparkzLIVE to view your new message from ${senderDisplayName}`;

    return { title, body };
  }

  private normalizeNotificationType(value?: string | null): string {
    const clean = String(value || '').trim().toUpperCase();
    if (this.knownNotificationTypes.has(clean)) {
      return clean;
    }
    return 'SYSTEM';
  }

  private resolveCategory(input: {
    notificationType?: string | null;
    category?: NotificationDeliveryCategory | null;
  }): NotificationDeliveryCategory {
    if (input.category) {
      return input.category;
    }

    const type = this.normalizeNotificationType(input.notificationType);

    switch (type) {
      case 'STREAM_STARTED':
        return 'LIVE_ALERT';
      case 'GIFT_RECEIVED':
      case 'MILESTONE_REACHED':
      case 'BATTLE_ENDED':
      case 'MODERATION':
      case 'SYSTEM':
      default:
        return 'TRANSACTIONAL';
    }
  }

  private resolveStoredNotificationType(input: {
    notificationType?: string | null;
    category?: NotificationDeliveryCategory | null;
  }): string {
    const type = String(input.notificationType || '').trim().toUpperCase();

    if (this.knownNotificationTypes.has(type)) {
      return type;
    }

    if (input.category === 'MARKETING') {
      return 'SYSTEM';
    }

    return 'SYSTEM';
  }

  private normalizeUserIds(userIds: string[]): string[] {
    return Array.from(
      new Set(
        (userIds || [])
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private getPushBlockReason(
    user: {
      notificationPushEnabled: boolean;
      notificationLiveAlertsEnabled: boolean;
      notificationMarketingEnabled: boolean;
      streamParticipants?: Array<{ id: string }>;
    },
    category: NotificationDeliveryCategory,
  ): PushBlockReason | null {

    if (!user.notificationPushEnabled) {
      return 'GLOBAL_DISABLED';
    }

    if ((user.streamParticipants?.length ?? 0) > 0) {
      return 'ACTIVE_IN_STREAM';
    }

    if (category === 'LIVE_ALERT' && !user.notificationLiveAlertsEnabled) {
      return 'LIVE_ALERTS_DISABLED';
    }

    if (category === 'MARKETING' && !user.notificationMarketingEnabled) {
      return 'MARKETING_DISABLED';
    }

    return null;
  }

  private async postExpoMessages(messages: any[]) {
    const response = await fetch(this.expoPushEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      this.logger.error('Expo push request failed', JSON.stringify(payload));
      throw new BadRequestException('Expo push request failed.');
    }

    return payload;
  }

  async createForUser(userId: string, dto: CreateNotificationDto) {
    const payloadJson: Prisma.InputJsonValue =
      dto.payload === undefined ? {} : (dto.payload as Prisma.InputJsonValue);

    const storedType = this.resolveStoredNotificationType({
      notificationType: dto.type,
    });

    return this.prisma.notification.create({
      data: {
        userId,
        type: storedType as any,
        title: dto.title ?? null,
        body: dto.body ?? null,
        payloadJson,
        streamId: dto.streamId ?? null,
        dedupeKey: dto.dedupeKey ?? null,
      },
    });
  }

  async createAndSendToUsers(input: CreateAndSendToUsersInput) {
    const userIds = this.normalizeUserIds(input.userIds);
    const category = this.resolveCategory({
      notificationType: input.notificationType,
      category: input.category,
    });
    const storedNotificationType = this.resolveStoredNotificationType({
      notificationType: input.notificationType,
      category,
    });

    const payloadJson: Prisma.InputJsonValue =
      input.payload === undefined ? {} : (input.payload as Prisma.InputJsonValue);

    let inboxCreated = 0;

    if (userIds.length === 0) {
      return {
        ok: true,
        category,
        notificationType:
          String(input.notificationType || '').trim().toUpperCase() || 'SYSTEM',
        storedNotificationType,
        inboxCreated,
        pushSent: 0,
        tickets: [],
        blockedUsers: [],
        noTokenUsers: [],
      };
    }

    if (input.createInbox !== false) {
      const created = await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: storedNotificationType as any,
          title: input.title ?? null,
          body: input.body ?? null,
          payloadJson,
          streamId: input.streamId ?? null,
          dedupeKey: input.dedupeKey ?? null,
        })),
      });

      inboxCreated = created.count;
    }

    if (input.sendPush === false) {
      return {
        ok: true,
        category,
        notificationType:
          String(input.notificationType || '').trim().toUpperCase() || 'SYSTEM',
        storedNotificationType,
        inboxCreated,
        pushSent: 0,
        tickets: [],
        blockedUsers: [],
        noTokenUsers: [],
      };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        notificationPushEnabled: true,
        notificationLiveAlertsEnabled: true,
        notificationMarketingEnabled: true,
        streamParticipants: {
          where: {
            leftAt: null,
            stream: {
              status: 'LIVE',
            },
          },
          select: {
            id: true,
          },
          take: 1,
        },
        pushDeviceTokens: {
          where: { isActive: true },
          select: {
            expoPushToken: true,
          },
        },
      },
    });

    const blockedUsers: Array<{ userId: string; reason: PushBlockReason }> = [];
    const noTokenUsers: string[] = [];
    const messages: Array<{
      to: string;
      sound: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
      channelId: string;
    }> = [];

    for (const user of users) {
      const blockReason = this.getPushBlockReason(user, category);

      if (blockReason) {
        blockedUsers.push({
          userId: user.id,
          reason: blockReason,
        });
        continue;
      }

      const activeTokens = user.pushDeviceTokens
        .map((row) => row.expoPushToken)
        .filter((token) => this.isExpoPushToken(token));

      if (!activeTokens.length) {
        noTokenUsers.push(user.id);
        continue;
      }

      for (const token of activeTokens) {
        messages.push({
          to: token,
          sound: 'default',
          title: input.title ?? 'SparkzLIVE notification',
          body: input.body ?? '',
          data: {
            ...(input.payload ?? {}),
            notificationType:
              String(input.notificationType || '').trim().toUpperCase() || 'SYSTEM',
            notificationCategory: category,
            streamId: input.streamId ?? null,
          },
          channelId: 'default',
        });
      }
    }

    if (!messages.length) {
      return {
        ok: true,
        category,
        notificationType:
          String(input.notificationType || '').trim().toUpperCase() || 'SYSTEM',
        storedNotificationType,
        inboxCreated,
        pushSent: 0,
        tickets: [],
        blockedUsers,
        noTokenUsers,
      };
    }

    const payload = await this.postExpoMessages(messages);
    const tickets = Array.isArray((payload as any)?.data) ? (payload as any).data : [];
    const attemptedTokens = messages.map((row) => row.to);
    const tokensToDisable: string[] = [];

    tickets.forEach((ticket: any, index: number) => {
      if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
        const token = attemptedTokens[index];
        if (token) {
          tokensToDisable.push(token);
        }
      }
    });

    if (tokensToDisable.length > 0) {
      await this.prisma.pushDeviceToken.updateMany({
        where: {
          expoPushToken: { in: tokensToDisable },
        },
        data: {
          isActive: false,
          disabledAt: new Date(),
          lastError: 'DeviceNotRegistered',
        },
      });
    }

    await this.prisma.pushDeviceToken.updateMany({
      where: {
        expoPushToken: { in: attemptedTokens },
      },
      data: {
        lastSentAt: new Date(),
      },
    });

    return {
      ok: true,
      category,
      notificationType:
        String(input.notificationType || '').trim().toUpperCase() || 'SYSTEM',
      storedNotificationType,
      inboxCreated,
      pushSent: messages.length,
      tickets,
      blockedUsers,
      noTokenUsers,
    };
  }

  async listForUser(
    userId: string,
    q: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    const limit = q.limit ?? 20;
    const unreadOnly = q.unreadOnly ?? false;

    const where = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const rows = await this.prisma.notification.findMany({
      where,
      take: limit,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;

    return {
      limit,
      cursor: q.cursor ?? null,
      nextCursor,
      unreadOnly,
      items: rows.map((n) => ({
        id: n.id,
        type: String(n.type),
        title: n.title ?? null,
        body: n.body ?? null,
        payload: n.payloadJson as any,
        streamId: (n as any).streamId ?? null,
        createdAt: n.createdAt.toISOString(),
        readAt: n.readAt ? n.readAt.toISOString() : null,
      })),
    };
  }

  async markRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true, readAt: true },
    });
    if (!existing) throw new NotFoundException('Notification not found');

    if (existing.readAt) return { ok: true, alreadyRead: true };

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return { ok: true, alreadyRead: false };
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { ok: true, updated: res.count };
  }

  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    const expoPushToken = dto.expoPushToken.trim();

    if (!this.isExpoPushToken(expoPushToken)) {
      throw new BadRequestException('Invalid Expo push token.');
    }

    const row = await this.prisma.pushDeviceToken.upsert({
      where: { expoPushToken },
      create: {
        userId,
        expoPushToken,
        platform: (dto.platform as PushPlatform | undefined) ?? PushPlatform.UNKNOWN,
        deviceId: dto.deviceId?.trim() || null,
        isActive: true,
        disabledAt: null,
        lastRegisteredAt: new Date(),
      },
      update: {
        userId,
        platform: (dto.platform as PushPlatform | undefined) ?? PushPlatform.UNKNOWN,
        deviceId: dto.deviceId?.trim() || null,
        isActive: true,
        disabledAt: null,
        lastError: null,
        lastRegisteredAt: new Date(),
      },
    });

    return {
      id: row.id,
      expoPushToken: row.expoPushToken,
      platform: row.platform,
      isActive: row.isActive,
      lastRegisteredAt: row.lastRegisteredAt.toISOString(),
    };
  }

  async unregisterPushToken(userId: string, dto: UnregisterPushTokenDto) {
    const expoPushToken = dto.expoPushToken.trim();

    const res = await this.prisma.pushDeviceToken.updateMany({
      where: {
        userId,
        expoPushToken,
      },
      data: {
        isActive: false,
        disabledAt: new Date(),
      },
    });

    return {
      ok: true,
      updated: res.count,
    };
  }

  async sendTestPushToUser(userId: string, dto: SendTestPushDto) {
    const title = dto.title ?? 'SparkzLIVE test push';
    const body = dto.body ?? 'Expo push is wired up.';

    return this.createAndSendToUsers({
      userIds: [userId],
      notificationType: dto.type ?? 'SYSTEM',
      category: (dto.category as NotificationDeliveryCategory | undefined) ?? undefined,
      title,
      body,
      payload: (dto.data as Record<string, unknown> | undefined) ?? { source: 'test-send' },
      streamId: dto.streamId ?? null,
      createInbox: dto.createInbox ?? false,
      sendPush: true,
    });
  }

  async deleteOlderThan(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60_000);
    const res = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return { ok: true, deleted: res.count, cutoff: cutoff.toISOString() };
  }
}
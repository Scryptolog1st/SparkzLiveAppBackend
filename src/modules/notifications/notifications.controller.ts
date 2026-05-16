import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import { NotificationsService } from './notifications.service';
import {
  ListNotificationsQueryDto,
  RegisterPushTokenDto,
  SendTestPushDto,
  UnregisterPushTokenDto,
} from './dto/notifications.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';

function getUserId(req: Request): string | null {
  const u: any = (req as any).user;
  return u?.id || u?.userId || u?.sub || null;
}

@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) { }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async list(@Req() req: Request, @Query() q: ListNotificationsQueryDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.notifications.listForUser(userId, q);
  }

  @Post(':id/read')
  @UseGuards(AuthGuard('jwt'))
  async markRead(@Req() req: Request, @Param('id') id: string) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.notifications.markRead(userId, id);
  }

  @Post('read-all')
  @UseGuards(AuthGuard('jwt'))
  async markAllRead(@Req() req: Request) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.notifications.markAllRead(userId);
  }

  @Post('push-token/register')
  @UseGuards(AuthGuard('jwt'))
  async registerPushToken(@Req() req: Request, @Body() dto: RegisterPushTokenDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.notifications.registerPushToken(userId, dto);
  }

  @Post('push-token/unregister')
  @UseGuards(AuthGuard('jwt'))
  async unregisterPushToken(@Req() req: Request, @Body() dto: UnregisterPushTokenDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.notifications.unregisterPushToken(userId, dto);
  }

  @Post('push-token/test-send')
  @UseGuards(AuthGuard('jwt'))
  async sendTestPush(@Req() req: Request, @Body() dto: SendTestPushDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return this.notifications.sendTestPushToUser(userId, dto);
  }

  @Post('test')
  @UseGuards(AuthGuard('jwt'))
  async createTest(@Req() req: Request, @Body() dto: CreateNotificationDto) {
    const userId = getUserId(req);
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const safe: CreateNotificationDto = {
      ...dto,
      type: dto.type || 'SYSTEM',
      title: dto.title || 'Test notification',
      body: dto.body || 'This is a dev-only test notification.',
      payload: dto.payload ?? { ok: true },
    };

    const created = await this.notifications.createForUser(userId, safe);
    return { ok: true, id: created.id };
  }
}
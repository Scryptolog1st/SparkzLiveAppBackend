import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { validationLimits } from "../../config/validation-limits";

export type ScheduleItemInput = {
  isRecurring: boolean;
  title: string;
  description?: string;
  timezone: string;
  dayOfWeek?: number;
  time24h?: string;
  startAt?: string;
  endAt?: string;
};

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) { }

  private validateItem(item: ScheduleItemInput) {
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const timezone = typeof item.timezone === "string" ? item.timezone.trim() : "";
    const description =
      typeof item.description === "string" ? item.description.trim() : "";

    if (!title) {
      throw new BadRequestException("Schedule title is required.");
    }

    if (title.length > validationLimits.scheduleTitleMax) {
      throw new BadRequestException(
        `Schedule title must be ${validationLimits.scheduleTitleMax} characters or fewer.`,
      );
    }

    if (description.length > validationLimits.scheduleDescriptionMax) {
      throw new BadRequestException(
        `Schedule description must be ${validationLimits.scheduleDescriptionMax} characters or fewer.`,
      );
    }

    if (!timezone) {
      throw new BadRequestException("Schedule timezone is required.");
    }

    if (timezone.length > validationLimits.scheduleTimezoneMax) {
      throw new BadRequestException(
        `Schedule timezone must be ${validationLimits.scheduleTimezoneMax} characters or fewer.`,
      );
    }

    if (item.isRecurring) {
      if (item.dayOfWeek === undefined || item.time24h === undefined) {
        throw new BadRequestException(
          "Recurring schedule items require dayOfWeek and time24h.",
        );
      }

      if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        throw new BadRequestException("Recurring schedule dayOfWeek must be between 0 and 6.");
      }

      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time24h)) {
        throw new BadRequestException("Recurring schedule time must be in HH:MM 24-hour format.");
      }

      if (item.startAt || item.endAt) {
        throw new BadRequestException(
          "Recurring schedule items must not include startAt/endAt.",
        );
      }
    } else {
      if (!item.startAt) {
        throw new BadRequestException("One-time schedule items require startAt.");
      }

      if (item.dayOfWeek !== undefined || item.time24h !== undefined) {
        throw new BadRequestException(
          "One-time schedule items must not include dayOfWeek/time24h.",
        );
      }

      const start = new Date(item.startAt);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException("One-time schedule startAt must be a valid date.");
      }

      if (item.endAt) {
        const end = new Date(item.endAt);
        if (Number.isNaN(end.getTime())) {
          throw new BadRequestException("One-time schedule endAt must be a valid date.");
        }

        if (end.getTime() < start.getTime()) {
          throw new BadRequestException("One-time schedule endAt must be after startAt.");
        }
      }
    }
  }

  async getScheduleByUsername(username: string) {
    const user = await this.users.requireByUsername(username);
    const rows = await this.prisma.streamSchedule.findMany({
      where: { userId: user.id },
    });

    const mapped = rows.map((r) => ({
      id: r.id,
      isRecurring: r.isRecurring,
      title: r.title,
      description: r.description ?? null,
      timezone: r.timezone,
      dayOfWeek: r.dayOfWeek ?? null,
      time24h: r.time24h ?? null,
      startAt: r.startAt ? r.startAt.toISOString() : null,
      endAt: r.endAt ? r.endAt.toISOString() : null,
    }));

    mapped.sort((a, b) => {
      if (a.isRecurring !== b.isRecurring) return a.isRecurring ? -1 : 1;
      if (a.isRecurring && b.isRecurring) {
        const da = a.dayOfWeek ?? 0;
        const db = b.dayOfWeek ?? 0;
        if (da !== db) return da - db;
        return (a.time24h ?? "").localeCompare(b.time24h ?? "");
      }
      return (a.startAt ?? "").localeCompare(b.startAt ?? "");
    });

    return mapped;
  }

  async replaceMySchedule(userId: string, items: ScheduleItemInput[]) {
    items.forEach((i) => this.validateItem(i));

    await this.prisma.$transaction(async (tx) => {
      await tx.streamSchedule.deleteMany({ where: { userId } });

      for (const item of items) {
        await tx.streamSchedule.create({
          data: {
            userId,
            isRecurring: item.isRecurring,
            title: item.title,
            description: item.description ?? null,
            timezone: item.timezone,
            dayOfWeek: item.isRecurring ? (item.dayOfWeek ?? null) : null,
            time24h: item.isRecurring ? (item.time24h ?? null) : null,
            startAt: !item.isRecurring && item.startAt ? new Date(item.startAt) : null,
            endAt: !item.isRecurring && item.endAt ? new Date(item.endAt) : null,
          },
        });
      }
    });

    const user = await this.users.findByIdWithProfile(userId);
    return this.getScheduleByUsername(user.username);
  }
}
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AdvertisementJobStatus,
  ConversationRequestStatus,
  ConversationRequestOrigin,
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdvertisementJobsService {
  constructor(private readonly prisma: PrismaService) {}

  private userSummary(user: any) {
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

  private get includeJob() {
    return {
      advertisement: {
        include: {
          owner: { include: { profile: true } },
          revisions: {
            include: { media: true },
            orderBy: { createdAt: "desc" as const },
          },
        },
      },
      advertiser: { include: { profile: true } },
      customer: { include: { profile: true } },
      conversation: true,
      review: true,
    };
  }

  private getCurrentRevision(ad: any) {
    return (
      ad?.revisions?.find((revision: any) => revision.id === ad.currentRevisionId) ||
      ad?.revisions?.find((revision: any) => String(revision.status) === "APPROVED") ||
      ad?.revisions?.[0] ||
      null
    );
  }

  private mapJob(job: any, viewerUserId: string) {
    const revision = this.getCurrentRevision(job.advertisement);
    const review = job.review || null;

    return {
      id: job.id,
      status: job.status,
      advertisementId: job.advertisementId,
      conversationId: job.conversationId,
      advertiserUserId: job.advertiserUserId,
      customerUserId: job.customerUserId,
      inquiryMessage: job.inquiryMessage,
      acceptedAt: job.acceptedAt?.toISOString?.() ?? null,
      declinedAt: job.declinedAt?.toISOString?.() ?? null,
      advertiserMarkedCompleteAt: job.advertiserMarkedCompleteAt?.toISOString?.() ?? null,
      customerApprovedAt: job.customerApprovedAt?.toISOString?.() ?? null,
      customerDeclinedCompletionAt: job.customerDeclinedCompletionAt?.toISOString?.() ?? null,
      completionDeclineReason: job.completionDeclineReason ?? null,
      completedAt: job.completedAt?.toISOString?.() ?? null,
      createdAt: job.createdAt?.toISOString?.() ?? null,
      updatedAt: job.updatedAt?.toISOString?.() ?? null,
      viewerRole:
        viewerUserId === job.advertiserUserId
          ? "ADVERTISER"
          : viewerUserId === job.customerUserId
            ? "CUSTOMER"
            : "UNKNOWN",
      canReview:
        viewerUserId === job.customerUserId &&
        job.status === AdvertisementJobStatus.COMPLETED &&
        !review,
      review: review
        ? {
            id: review.id,
            stars: review.stars,
            reviewerUserId: review.reviewerUserId,
            createdAt: review.createdAt?.toISOString?.() ?? null,
          }
        : null,
      advertisement: {
        id: job.advertisement?.id,
        status: job.advertisement?.status,
        title: revision?.title || "Advertisement",
        category: revision?.category || "Other",
        shortDescription: revision?.shortDescription || "",
        media: Array.isArray(revision?.media)
          ? revision.media.map((media: any) => ({
              id: media.id,
              mediaType: media.mediaType,
              url: media.url,
              thumbnailUrl: media.thumbnailUrl,
              sortOrder: media.sortOrder,
              isCover: media.isCover,
            }))
          : [],
      },
      advertiser: this.userSummary(job.advertiser),
      customer: this.userSummary(job.customer),
    };
  }

  private async findJobForUser(userId: string, id: string) {
    const job = await this.prisma.advertisementJob.findFirst({
      where: {
        id,
        OR: [{ advertiserUserId: userId }, { customerUserId: userId }],
      },
      include: this.includeJob,
    });

    if (!job) throw new NotFoundException("Advertisement job not found.");

    return job;
  }

  async listMyJobs(userId: string, query: any = {}) {
    const role = String(query?.role || "advertiser").toLowerCase();
    const rawStatus = String(query?.status || "").trim().toUpperCase();
    const limit = Math.max(1, Math.min(100, Number(query?.limit || 50) || 50));

    const roleWhere =
      role === "customer"
        ? { customerUserId: userId }
        : role === "all"
          ? { OR: [{ advertiserUserId: userId }, { customerUserId: userId }] }
          : { advertiserUserId: userId };

    const rows = await this.prisma.advertisementJob.findMany({
      where: {
        ...roleWhere,
        ...(rawStatus ? { status: rawStatus as AdvertisementJobStatus } : {}),
      },
      include: this.includeJob,
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    });

    const items = rows.map((job) => this.mapJob(job, userId));

    return {
      success: true,
      items,
      jobs: items,
    };
  }

  async getJobByConversation(userId: string, conversationId: string) {
    let job = await this.prisma.advertisementJob.findFirst({
      where: {
        conversationId,
        OR: [{ advertiserUserId: userId }, { customerUserId: userId }],
      },
      include: this.includeJob,
      orderBy: [{ updatedAt: "desc" }],
    });

    if (!job) {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      });

      const isAdvertisementInquiry =
        conversation &&
        conversation.requestOrigin === ConversationRequestOrigin.ADVERTISEMENT &&
        conversation.requestAdvertisementId &&
        conversation.requestSenderId &&
        conversation.requestRecipientId;

      if (isAdvertisementInquiry) {
        const status =
          conversation.requestStatus === ConversationRequestStatus.DENIED
            ? AdvertisementJobStatus.DECLINED
            : conversation.requestStatus === ConversationRequestStatus.ACCEPTED
              ? AdvertisementJobStatus.IN_PROGRESS
              : AdvertisementJobStatus.INQUIRY_OPEN;

        const existingLatest = await this.prisma.advertisementJob.findFirst({
          where: {
            advertisementId: conversation.requestAdvertisementId!,
            conversationId: conversation.id,
            customerUserId: conversation.requestSenderId!,
          },
          orderBy: [{ requestSequence: "desc" }],
          include: this.includeJob,
        });

        if (existingLatest) {
          job = existingLatest;
        } else {
          job = await this.prisma.advertisementJob.create({
            data: {
              advertisementId: conversation.requestAdvertisementId!,
              conversationId: conversation.id,
              advertiserUserId: conversation.requestRecipientId!,
              customerUserId: conversation.requestSenderId!,
              requestSequence: 1,
              status,
              inquiryMessage: conversation.requestPreviewText || null,
              acceptedAt: status === AdvertisementJobStatus.IN_PROGRESS ? conversation.requestRespondedAt || new Date() : null,
              declinedAt: status === AdvertisementJobStatus.DECLINED ? conversation.requestRespondedAt || new Date() : null,
            },
            include: this.includeJob,
          });
        }
      }
    }

    return {
      success: true,
      job: job ? this.mapJob(job, userId) : null,
    };
  }

  async acceptJob(userId: string, id: string) {
    const job = await this.findJobForUser(userId, id);

    if (job.advertiserUserId !== userId) {
      throw new ForbiddenException("Only the advertiser can accept this job.");
    }

    if (job.status !== AdvertisementJobStatus.INQUIRY_OPEN) {
      throw new BadRequestException("Only open inquiries can be accepted.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id: job.conversationId },
        data: {
          requestStatus: ConversationRequestStatus.ACCEPTED,
          requestRespondedAt: new Date(),
        },
      });

      await tx.directMessage.updateMany({
        where: {
          conversationId: job.conversationId,
          hiddenUntilRequestAccepted: true,
        },
        data: {
          hiddenUntilRequestAccepted: false,
        },
      });

      return tx.advertisementJob.update({
        where: { id: job.id },
        data: {
          status: AdvertisementJobStatus.IN_PROGRESS,
          acceptedAt: new Date(),
        },
        include: this.includeJob,
      });
    });

    return {
      success: true,
      job: this.mapJob(updated, userId),
    };
  }

  async declineJob(userId: string, id: string) {
    const job = await this.findJobForUser(userId, id);

    if (job.advertiserUserId !== userId) {
      throw new ForbiddenException("Only the advertiser can decline this job.");
    }

    if (job.status !== AdvertisementJobStatus.INQUIRY_OPEN) {
      throw new BadRequestException("Only open inquiries can be declined.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id: job.conversationId },
        data: {
          requestStatus: ConversationRequestStatus.DENIED,
          requestRespondedAt: new Date(),
        },
      });

      return tx.advertisementJob.update({
        where: { id: job.id },
        data: {
          status: AdvertisementJobStatus.DECLINED,
          declinedAt: new Date(),
        },
        include: this.includeJob,
      });
    });

    return {
      success: true,
      job: this.mapJob(updated, userId),
    };
  }

  async markComplete(userId: string, id: string) {
    const job = await this.findJobForUser(userId, id);

    if (job.advertiserUserId !== userId) {
      throw new ForbiddenException("Only the advertiser can mark this job complete.");
    }

    if (job.status !== AdvertisementJobStatus.IN_PROGRESS) {
      throw new BadRequestException("Only in-progress jobs can be marked complete.");
    }

    const updated = await this.prisma.advertisementJob.update({
      where: { id: job.id },
      data: {
        status: AdvertisementJobStatus.SELLER_MARKED_COMPLETE,
        advertiserMarkedCompleteAt: new Date(),
      },
      include: this.includeJob,
    });

    return {
      success: true,
      job: this.mapJob(updated, userId),
    };
  }

  async approveCompletion(userId: string, id: string) {
    const job = await this.findJobForUser(userId, id);

    if (job.customerUserId !== userId) {
      throw new ForbiddenException("Only the customer can approve completion.");
    }

    if (job.status !== AdvertisementJobStatus.SELLER_MARKED_COMPLETE) {
      throw new BadRequestException("This job is not waiting for customer approval.");
    }

    const now = new Date();

    const updated = await this.prisma.advertisementJob.update({
      where: { id: job.id },
      data: {
        status: AdvertisementJobStatus.COMPLETED,
        customerApprovedAt: now,
        completedAt: now,
      },
      include: this.includeJob,
    });

    return {
      success: true,
      job: this.mapJob(updated, userId),
    };
  }

  async declineCompletion(userId: string, id: string, reasonValue?: string) {
    const job = await this.findJobForUser(userId, id);

    if (job.customerUserId !== userId) {
      throw new ForbiddenException("Only the customer can decline completion.");
    }

    if (job.status !== AdvertisementJobStatus.SELLER_MARKED_COMPLETE) {
      throw new BadRequestException("This job is not waiting for customer approval.");
    }

    const reason = String(reasonValue || "").trim().slice(0, 1000) || null;

    const updated = await this.prisma.advertisementJob.update({
      where: { id: job.id },
      data: {
        status: AdvertisementJobStatus.IN_PROGRESS,
        customerDeclinedCompletionAt: new Date(),
        completionDeclineReason: reason,
      },
      include: this.includeJob,
    });

    return {
      success: true,
      job: this.mapJob(updated, userId),
    };
  }

  async rateJob(userId: string, id: string, starsValue: number) {
    const job = await this.findJobForUser(userId, id);

    if (job.customerUserId !== userId) {
      throw new ForbiddenException("Only the customer can rate this job.");
    }

    if (job.status !== AdvertisementJobStatus.COMPLETED) {
      throw new BadRequestException("Only completed jobs can be rated.");
    }

    if (job.review) {
      throw new BadRequestException("This job has already been rated.");
    }

    const stars = Math.max(1, Math.min(5, Math.floor(Number(starsValue || 0))));

    const review = await this.prisma.advertisementReview.create({
      data: {
        jobId: job.id,
        advertisementId: job.advertisementId,
        advertiserUserId: job.advertiserUserId,
        reviewerUserId: userId,
        stars,
      },
    });

    const updated = await this.prisma.advertisementJob.findUniqueOrThrow({
      where: { id: job.id },
      include: this.includeJob,
    });

    return {
      success: true,
      review: {
        id: review.id,
        stars: review.stars,
        reviewerUserId: review.reviewerUserId,
        createdAt: review.createdAt.toISOString(),
      },
      job: this.mapJob(updated, userId),
    };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import {
  DEFAULT_STREAM_ROLE_PERMISSIONS,
  STREAM_PERMISSION_KEYS,
  STREAM_PERMISSION_LABELS,
  STREAM_STAFF_ROLES,
  type StreamPermissionKeyValue,
  type StreamStaffRoleValue,
} from "./stream-staff.constants";

type EffectiveStreamStaffRole = "HOST" | StreamStaffRoleValue;

@Injectable()
export class StreamStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) { }

  private async requireStream(streamId: string) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        hostUserId: true,
      },
    });

    if (!stream) {
      throw new NotFoundException("Stream not found");
    }

    return stream;
  }

  private async assertIsHost(
    streamId: string,
    actorUserId: string,
    fallbackMessage = "Only the host can manage this stream setting",
  ) {
    const stream = await this.requireStream(streamId);

    if (stream.hostUserId !== actorUserId) {
      throw new ForbiddenException(fallbackMessage);
    }

    return stream;
  }

  private mapUserSummary(user: any) {
    return {
      id: user.id,
      publicId: user.publicId ?? null,
      username: user.username,
      displayName: user.profile?.displayName?.trim() || user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
    };
  }

  private async getParticipantStaffRoleMap(streamId: string, userIds: string[]) {
    const normalizedUserIds = Array.from(
      new Set(userIds.map((userId) => String(userId || "").trim()).filter(Boolean)),
    );

    const map = new Map<string, string>();

    if (normalizedUserIds.length === 0) {
      return map;
    }

    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { hostUserId: true },
    });

    if (stream?.hostUserId) {
      map.set(stream.hostUserId, "HOST");
    }

    const staffRows = await this.prisma.streamStaffAssignment.findMany({
      where: {
        streamId,
        userId: { in: normalizedUserIds },
      },
      select: {
        userId: true,
        role: true,
      },
    });

    for (const row of staffRows) {
      map.set(row.userId, row.role);
    }

    const unresolvedUserIds = normalizedUserIds.filter((userId) => !map.has(userId));

    if (unresolvedUserIds.length > 0) {
      const legacyRows = await this.prisma.streamUserRole.findMany({
        where: {
          streamId,
          userId: { in: unresolvedUserIds },
          role: "MODERATOR",
        },
        select: {
          userId: true,
          role: true,
        },
      });

      for (const row of legacyRows) {
        map.set(row.userId, row.role);
      }
    }

    return map;
  }

  private async buildParticipantPayloads(streamId: string) {
    const rows = await this.prisma.streamParticipant.findMany({
      where: { streamId, leftAt: null },
      include: { user: { include: { profile: true } } },
      orderBy: { joinedAt: "asc" },
    });

    const staffRoleMap = await this.getParticipantStaffRoleMap(
      streamId,
      rows.map((row) => row.userId),
    );

    return rows.map((row) => ({
      user: this.mapUserSummary(row.user),
      role: row.role,
      staffRole:
        staffRoleMap.get(row.userId) ??
        (row.role === "HOST" ? "HOST" : undefined),
      joinedAt: row.joinedAt.toISOString(),
    }));
  }

  private buildHostPermissionEntries() {
    return STREAM_PERMISSION_KEYS.map((permission) => ({
      permission,
      label: STREAM_PERMISSION_LABELS[permission],
      enabled: true,
    }));
  }

  private normalizePermissionEntries(
    role: StreamStaffRoleValue,
    overrides: Array<{ permission: string; enabled: boolean }>,
  ) {
    const enabledMap = new Map<string, boolean>();

    for (const permission of DEFAULT_STREAM_ROLE_PERMISSIONS[role]) {
      enabledMap.set(permission, true);
    }

    for (const override of overrides) {
      enabledMap.set(override.permission, !!override.enabled);
    }

    return STREAM_PERMISSION_KEYS.map((permission) => ({
      permission,
      label: STREAM_PERMISSION_LABELS[permission],
      enabled: enabledMap.get(permission) ?? false,
    }));
  }

  private async getStaffAssignmentRow(streamId: string, userId: string) {
    return this.prisma.streamStaffAssignment.findUnique({
      where: {
        streamId_userId: {
          streamId,
          userId,
        },
      },
    });
  }

  private async getActorRole(streamId: string, actorUserId: string) {
    const stream = await this.requireStream(streamId);

    if (stream.hostUserId === actorUserId) {
      return "HOST" as const;
    }

    const assignment = await this.getStaffAssignmentRow(streamId, actorUserId);
    if (assignment?.role) {
      return assignment.role as StreamStaffRoleValue;
    }

    const legacyRole = await this.prisma.streamUserRole.findUnique({
      where: {
        streamId_userId: {
          streamId,
          userId: actorUserId,
        },
      },
      select: { role: true },
    });

    if (legacyRole?.role === "MODERATOR") {
      return "MODERATOR";
    }

    return "VIEWER";
  }

  private async getEffectiveRoleAndPermissions(
    streamId: string,
    userId: string,
  ): Promise<{
    role: EffectiveStreamStaffRole;
    permissions: Array<{
      permission: StreamPermissionKeyValue;
      label: string;
      enabled: boolean;
    }>;
  }> {
    const stream = await this.requireStream(streamId);

    if (stream.hostUserId === userId) {
      return {
        role: "HOST",
        permissions: this.buildHostPermissionEntries(),
      };
    }

    const assignment = await this.getStaffAssignmentRow(streamId, userId);

    let role = (assignment?.role ?? "VIEWER") as StreamStaffRoleValue;

    if (!assignment) {
      const legacyRole = await this.prisma.streamUserRole.findUnique({
        where: {
          streamId_userId: {
            streamId,
            userId,
          },
        },
        select: { role: true },
      });

      if (legacyRole?.role === "MODERATOR") {
        role = "MODERATOR";
      }
    }

    const overrides = await this.prisma.streamStaffRolePermission.findMany({
      where: { streamId, role },
      select: {
        permission: true,
        enabled: true,
      },
    });

    return {
      role,
      permissions: this.normalizePermissionEntries(role, overrides as any),
    };
  }

  async hasPermission(
    streamId: string,
    userId: string,
    permission: StreamPermissionKeyValue,
  ) {
    const resolved = await this.getEffectiveRoleAndPermissions(streamId, userId);

    return resolved.permissions.some(
      (entry) => entry.permission === permission && entry.enabled,
    );
  }

  async assertHasPermission(
    streamId: string,
    userId: string,
    permission: StreamPermissionKeyValue,
    fallbackMessage?: string,
  ) {
    const allowed = await this.hasPermission(streamId, userId, permission);

    if (!allowed) {
      throw new ForbiddenException(
        fallbackMessage ?? `Missing permission: ${permission}`,
      );
    }
  }

  async getMyState(streamId: string, actorUserId: string) {
    const resolved = await this.getEffectiveRoleAndPermissions(
      streamId,
      actorUserId,
    );

    return {
      streamId,
      role: resolved.role,
      permissions: resolved.permissions
        .filter((entry) => entry.enabled)
        .map((entry) => entry.permission),
    };
  }

  async getPermissions(streamId: string, actorUserId: string) {
    await this.assertIsHost(
      streamId,
      actorUserId,
      "Only the host can view stream role permissions",
    );

    const rows = await this.prisma.streamStaffRolePermission.findMany({
      where: { streamId },
      orderBy: [{ role: "asc" }, { permission: "asc" }],
      select: {
        role: true,
        permission: true,
        enabled: true,
      },
    });

    return {
      streamId,
      roles: STREAM_STAFF_ROLES.filter((role) => role !== "VIEWER").map(
        (role) => ({
          role,
          permissions: this.normalizePermissionEntries(
            role,
            rows.filter((row) => row.role === role) as any,
          ),
        }),
      ),
    };
  }

  async updatePermissions(
    streamId: string,
    actorUserId: string,
    payload: {
      roles: Array<{
        role: StreamStaffRoleValue;
        permissions: Array<{
          permission: StreamPermissionKeyValue;
          enabled: boolean;
        }>;
      }>;
    },
  ) {
    await this.assertIsHost(
      streamId,
      actorUserId,
      "Only the host can edit stream role permissions",
    );

    const supportedRoles = new Set(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);

    await this.prisma.$transaction(async (tx) => {
      for (const entry of payload.roles) {
        if (!supportedRoles.has(entry.role)) {
          throw new BadRequestException(`Unsupported role: ${entry.role}`);
        }

        await tx.streamStaffRolePermission.deleteMany({
          where: {
            streamId,
            role: entry.role,
          },
        });

        const rows = entry.permissions.map((permissionRow) => ({
          streamId,
          role: entry.role,
          permission: permissionRow.permission,
          enabled: !!permissionRow.enabled,
        }));

        if (rows.length > 0) {
          await tx.streamStaffRolePermission.createMany({ data: rows as any });
        }
      }
    });

    return this.getPermissions(streamId, actorUserId);
  }

  async listAssignments(streamId: string, actorUserId: string) {
    await this.requireStream(streamId);
    await this.assertHasPermission(
      streamId,
      actorUserId,
      "ASSIGN_STAFF_ROLES",
      "Only the host or authorized staff can manage stream roles",
    );

    const rows = await this.prisma.streamStaffAssignment.findMany({
      where: { streamId },
      include: {
        user: {
          include: { profile: true },
        },
        assignedBy: {
          include: { profile: true },
        },
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    });

    return {
      streamId,
      items: rows.map((row) => ({
        user: this.mapUserSummary(row.user),
        role: row.role,
        assignedBy: row.assignedBy ? this.mapUserSummary(row.assignedBy) : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async assignRole(
    streamId: string,
    actorUserId: string,
    targetUserId: string,
    role: StreamStaffRoleValue,
  ) {
    const stream = await this.requireStream(streamId);

    if (stream.hostUserId === actorUserId) {
      // host is always allowed
    } else {
      await this.assertHasPermission(
        streamId,
        actorUserId,
        "ASSIGN_STAFF_ROLES",
        "Only the host or authorized staff can assign stream roles",
      );

      if (role === "SUPER_ADMIN") {
        throw new ForbiddenException(
          "Only the host can assign super admin",
        );
      }
    }

    if (targetUserId === actorUserId) {
      throw new BadRequestException(
        "You can not change your own staff role",
      );
    }

    if (targetUserId === stream.hostUserId) {
      throw new BadRequestException(
        "Host role is managed automatically and can not be changed",
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException("Target user not found");
    }

    const targetAssignment = await this.getStaffAssignmentRow(streamId, targetUserId);
    const targetCurrentRole = (targetAssignment?.role ?? "VIEWER") as StreamStaffRoleValue;

    if (stream.hostUserId !== actorUserId && targetCurrentRole === "SUPER_ADMIN") {
      throw new ForbiddenException(
        "Only the host can change another super admin",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (role === "VIEWER") {
        await tx.streamStaffAssignment.deleteMany({
          where: { streamId, userId: targetUserId },
        });

        await tx.streamUserRole.deleteMany({
          where: {
            streamId,
            userId: targetUserId,
            role: "MODERATOR",
          },
        });

        await tx.streamParticipant.updateMany({
          where: {
            streamId,
            userId: targetUserId,
            leftAt: null,
            role: "MODERATOR",
          },
          data: {
            role: "VIEWER",
          },
        });
      } else {
        await tx.streamStaffAssignment.upsert({
          where: {
            streamId_userId: {
              streamId,
              userId: targetUserId,
            },
          },
          create: {
            streamId,
            userId: targetUserId,
            role,
            assignedByUserId: actorUserId,
          },
          update: {
            role,
            assignedByUserId: actorUserId,
          },
        });

        if (role === "MODERATOR") {
          await tx.streamUserRole.upsert({
            where: {
              streamId_userId: {
                streamId,
                userId: targetUserId,
              },
            },
            create: {
              streamId,
              userId: targetUserId,
              role: "MODERATOR",
              assignedByUserId: actorUserId,
            },
            update: {
              role: "MODERATOR",
              assignedByUserId: actorUserId,
            },
          });

          await tx.streamParticipant.updateMany({
            where: {
              streamId,
              userId: targetUserId,
              leftAt: null,
              role: "VIEWER",
            },
            data: {
              role: "MODERATOR",
            },
          });
        } else {
          await tx.streamUserRole.deleteMany({
            where: {
              streamId,
              userId: targetUserId,
              role: "MODERATOR",
            },
          });

          await tx.streamParticipant.updateMany({
            where: {
              streamId,
              userId: targetUserId,
              leftAt: null,
              role: "MODERATOR",
            },
            data: {
              role: "VIEWER",
            },
          });
        }
      }
    });

    const participants = await this.buildParticipantPayloads(streamId);
    this.realtime.emitParticipants(streamId, participants);

    this.realtime.emitRoleAssigned({
      streamId,
      targetUserId,
      assignedRole: role,
      assignedByUserId: actorUserId,
    });

    return {
      ok: true,
      streamId,
      targetUserId,
      assignedRole: role,
      assignedByUserId: actorUserId,
    };
  }
}
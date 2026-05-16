import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Prisma, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminPackageDto } from './dto/create-admin-package.dto';
import { UpdateAdminPackageDto } from './dto/update-admin-package.dto';

type ListTransactionsOptions = {
    search?: string;
    status?: string;
    page?: string | number;
    pageSize?: string | number;
};

type ListUsersOptions = {
    search?: string;
    page?: string | number;
    pageSize?: string | number;
};

@Injectable()
export class AdminStoreService {
    constructor(private readonly prisma: PrismaService) { }

    private readonly paidStatuses = [PurchaseStatus.PAID, PurchaseStatus.FULFILLED];

    private readonly allowedColorPresets = new Set([
        'neutral',
        'slate',
        'stone',
        'red',
        'rose',
        'orange',
        'amber',
        'yellow',
        'lime',
        'green',
        'emerald',
        'teal',
        'cyan',
        'sky',
        'blue',
        'indigo',
        'violet',
        'purple',
        'fuchsia',
        'pink',
    ]);

    private parseCsvEnv(name: string) {
        return new Set(
            String(process.env[name] || '')
                .split(',')
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean),
        );
    }

    private normalizePage(value: string | number | undefined, fallback: number) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) return fallback;
        return Math.floor(parsed);
    }

    private normalizePageSize(value: string | number | undefined, fallback: number) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) return fallback;
        return Math.min(100, Math.floor(parsed));
    }

    private packageDisplayName(id: string) {
        const normalized = String(id || '').trim();

        const coinsMatch = normalized.match(/^coins[_-](\d+)$/i);
        if (coinsMatch) {
            return `${Number(coinsMatch[1]).toLocaleString()} Coins`;
        }

        return normalized
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, (character) => character.toUpperCase());
    }

    private sanitizePackageId(value: string) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_');
    }

    private normalizeCurrency(value?: string) {
        return String(value || 'USD')
            .trim()
            .toUpperCase();
    }

    private normalizeBadgeText(value?: string | null) {
        const normalized = String(value || '').trim();
        return normalized ? normalized : null;
    }

    private normalizeColorPreset(value?: string | null) {
        const normalized = String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-');

        if (!normalized) {
            return null;
        }

        if (!this.allowedColorPresets.has(normalized)) {
            throw new ConflictException(
                `Invalid color preset. Allowed presets: ${Array.from(this.allowedColorPresets).join(', ')}.`,
            );
        }

        return normalized;
    }

    private validatePackageRules(input: { priceUsd?: number; forDevUse?: boolean }) {
        const priceUsd = input.priceUsd;
        const forDevUse = !!input.forDevUse;

        if (priceUsd === undefined) {
            return;
        }

        if (priceUsd < 0) {
            throw new ConflictException('Package price cannot be negative.');
        }

        if (priceUsd === 0 && !forDevUse) {
            throw new ConflictException('Zero-dollar packages must be marked For Dev Use.');
        }
    }

    private mapAdminUser(user: any) {
        return {
            id: user.id,
            uuid: user.id,
            publicId: user.publicId,
            username: user.username,
            email: user.email,
            displayName: user.profile?.displayName?.trim() || user.username,
        };
    }

    private mapPackage(pkg: any) {
        return {
            id: pkg.id,
            displayName: this.packageDisplayName(pkg.id),
            coins: pkg.coins,
            priceCents: pkg.priceCents,
            currency: pkg.currency,
            isActive: pkg.isActive,
            forDevUse: pkg.forDevUse,
            badgeText: pkg.badgeText ?? null,
            colorPreset: pkg.colorPreset ?? null,
            isFeatured: !!pkg.isFeatured,
            sortOrder: pkg.sortOrder,
            appleProductId: pkg.appleProductId,
            googleProductId: pkg.googleProductId,
            deletedAt: pkg.deletedAt ? pkg.deletedAt.toISOString() : null,
            createdAt: pkg.createdAt.toISOString(),
            updatedAt: pkg.updatedAt.toISOString(),
        };
    }

    private mapTransaction(order: any) {
        return {
            id: order.id,
            provider: order.provider,
            providerRef: order.providerRef,
            status: order.status,
            coins: order.coins,
            priceCents: order.priceCents,
            currency: order.currency,
            createdAt: order.createdAt.toISOString(),
            paidAt: order.paidAt ? order.paidAt.toISOString() : null,
            fulfilledAt: order.fulfilledAt ? order.fulfilledAt.toISOString() : null,
            user: {
                id: order.user.id,
                uuid: order.user.id,
                publicId: order.user.publicId,
                username: order.user.username,
                email: order.user.email,
                displayName: order.user.profile?.displayName?.trim() || order.user.username,
            },
            package: {
                id: order.pkg.id,
                displayName: this.packageDisplayName(order.pkg.id),
                coins: order.pkg.coins,
            },
        };
    }

    private async requireAdmin(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new UnauthorizedException('Account not found.');
        }

        const adminIds = this.parseCsvEnv('ADMIN_USER_IDS');
        const adminEmails = this.parseCsvEnv('ADMIN_EMAILS');
        const adminUsernames = this.parseCsvEnv('ADMIN_USERNAMES');

        if (!adminIds.size && !adminEmails.size && !adminUsernames.size) {
            throw new ForbiddenException('Admin access is not configured.');
        }

        const allowed =
            adminIds.has(String(user.id).toLowerCase()) ||
            adminEmails.has(String(user.email).toLowerCase()) ||
            adminUsernames.has(String(user.username).toLowerCase());

        if (!allowed) {
            throw new ForbiddenException('Admin access denied.');
        }

        return user;
    }

    async getMe(userId: string) {
        const user = await this.requireAdmin(userId);

        return {
            authorized: true,
            user: this.mapAdminUser(user),
        };
    }

    async getOverview(userId: string) {
        await this.requireAdmin(userId);

        const [
            revenueAggregate,
            totalTransactions,
            activePackages,
            inactivePackages,
            buyerRows,
            statusGroups,
            recentOrders,
        ] = await Promise.all([
            this.prisma.purchaseOrder.aggregate({
                where: {
                    status: {
                        in: this.paidStatuses,
                    },
                },
                _sum: {
                    priceCents: true,
                },
            }),
            this.prisma.purchaseOrder.count(),
            this.prisma.coinPackage.count({
                where: {
                    isActive: true,
                    deletedAt: null,
                },
            }),
            this.prisma.coinPackage.count({
                where: {
                    isActive: false,
                    deletedAt: null,
                },
            }),
            this.prisma.purchaseOrder.findMany({
                where: {
                    status: {
                        in: this.paidStatuses,
                    },
                },
                distinct: ['userId'],
                select: {
                    userId: true,
                },
            }),
            this.prisma.purchaseOrder.groupBy({
                by: ['status'],
                _count: {
                    _all: true,
                },
            }),
            this.prisma.purchaseOrder.findMany({
                include: {
                    user: {
                        include: {
                            profile: true,
                        },
                    },
                    pkg: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 8,
            }),
        ]);

        const counts = {
            PENDING: 0,
            PAID: 0,
            FULFILLED: 0,
            FAILED: 0,
            CANCELED: 0,
        };

        statusGroups.forEach((row) => {
            counts[row.status] = row._count._all;
        });

        return {
            revenue: {
                totalCents: revenueAggregate._sum.priceCents || 0,
                currency: 'USD',
            },
            transactions: {
                total: totalTransactions,
                pending: counts.PENDING,
                paid: counts.PAID,
                fulfilled: counts.FULFILLED,
                failed: counts.FAILED,
                canceled: counts.CANCELED,
                paidOrFulfilled: counts.PAID + counts.FULFILLED,
            },
            packages: {
                active: activePackages,
                inactive: inactivePackages,
                total: activePackages + inactivePackages,
            },
            buyers: {
                totalUnique: buyerRows.length,
            },
            recentTransactions: recentOrders.map((order) => this.mapTransaction(order)),
        };
    }

    async listPackages(userId: string) {
        await this.requireAdmin(userId);

        const packages = await this.prisma.coinPackage.findMany({
            where: {
                deletedAt: null,
            },
            orderBy: [{ sortOrder: 'asc' }, { coins: 'asc' }],
        });

        return {
            items: packages.map((pkg) => this.mapPackage(pkg)),
        };
    }

    async createPackage(userId: string, dto: CreateAdminPackageDto) {
        await this.requireAdmin(userId);

        const id = this.sanitizePackageId(dto.id);

        const existing = await this.prisma.coinPackage.findUnique({
            where: { id },
            select: { id: true, deletedAt: true },
        });

        if (existing) {
            throw new ConflictException('A package with this ID already exists.');
        }

        this.validatePackageRules({
            priceUsd: dto.priceUsd,
            forDevUse: dto.forDevUse,
        });

        const highestSortOrder = await this.prisma.coinPackage.findFirst({
            where: {
                deletedAt: null,
            },
            orderBy: { sortOrder: 'desc' },
            select: { sortOrder: true },
        });

        const created = await this.prisma.coinPackage.create({
            data: {
                id,
                coins: dto.coins,
                priceCents: Math.round(dto.priceUsd * 100),
                currency: this.normalizeCurrency(dto.currency),
                sortOrder: dto.sortOrder ?? (highestSortOrder?.sortOrder ?? 0) + 10,
                appleProductId: dto.appleProductId ?? null,
                googleProductId: dto.googleProductId ?? null,
                isActive: dto.isActive ?? true,
                forDevUse: dto.forDevUse ?? false,
                badgeText: this.normalizeBadgeText(dto.badgeText),
                colorPreset: this.normalizeColorPreset(dto.colorPreset),
                isFeatured: dto.isFeatured ?? false,
                deletedAt: null,
            },
        });

        return {
            item: this.mapPackage(created),
        };
    }

    async updatePackage(userId: string, packageId: string, dto: UpdateAdminPackageDto) {
        await this.requireAdmin(userId);

        const existing = await this.prisma.coinPackage.findUnique({
            where: { id: packageId },
        });

        if (!existing || existing.deletedAt) {
            throw new NotFoundException('Package not found.');
        }

        const nextPriceUsd =
            dto.priceUsd !== undefined ? dto.priceUsd : Number(existing.priceCents) / 100;
        const nextForDevUse =
            dto.forDevUse !== undefined ? dto.forDevUse : existing.forDevUse;

        this.validatePackageRules({
            priceUsd: nextPriceUsd,
            forDevUse: nextForDevUse,
        });

        const data: Prisma.CoinPackageUpdateInput = {};

        if (dto.coins !== undefined) data.coins = dto.coins;
        if (dto.priceUsd !== undefined) data.priceCents = Math.round(dto.priceUsd * 100);
        if (dto.currency !== undefined) data.currency = this.normalizeCurrency(dto.currency);
        if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
        if (dto.appleProductId !== undefined) data.appleProductId = dto.appleProductId || null;
        if (dto.googleProductId !== undefined) data.googleProductId = dto.googleProductId || null;
        if (dto.isActive !== undefined) data.isActive = dto.isActive;
        if (dto.forDevUse !== undefined) data.forDevUse = dto.forDevUse;
        if (dto.badgeText !== undefined) data.badgeText = this.normalizeBadgeText(dto.badgeText);
        if (dto.colorPreset !== undefined) {
            data.colorPreset = this.normalizeColorPreset(dto.colorPreset);
        }
        if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;

        const updated = await this.prisma.coinPackage.update({
            where: { id: packageId },
            data,
        });

        return {
            item: this.mapPackage(updated),
        };
    }

    async deletePackage(userId: string, packageId: string) {
        await this.requireAdmin(userId);

        const existing = await this.prisma.coinPackage.findUnique({
            where: { id: packageId },
            select: {
                id: true,
                deletedAt: true,
            },
        });

        if (!existing || existing.deletedAt) {
            throw new NotFoundException('Package not found.');
        }

        const deleted = await this.prisma.coinPackage.update({
            where: { id: packageId },
            data: {
                isActive: false,
                deletedAt: new Date(),
            },
        });

        return {
            success: true,
            item: this.mapPackage(deleted),
        };
    }

    async listTransactions(userId: string, options: ListTransactionsOptions) {
        await this.requireAdmin(userId);

        const page = this.normalizePage(options.page, 1);
        const pageSize = this.normalizePageSize(options.pageSize, 20);
        const search = String(options.search || '').trim();
        const rawStatus = String(options.status || '').trim().toUpperCase();

        const where: Prisma.PurchaseOrderWhereInput = {};

        if (search) {
            const isUuidSearch =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                    search,
                );

            const orFilters: Prisma.PurchaseOrderWhereInput[] = [
                {
                    providerRef: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    user: {
                        is: {
                            OR: [
                                {
                                    username: {
                                        contains: search,
                                        mode: 'insensitive',
                                    },
                                },
                                {
                                    email: {
                                        contains: search,
                                        mode: 'insensitive',
                                    },
                                },
                                {
                                    publicId: {
                                        contains: search,
                                        mode: 'insensitive',
                                    },
                                },
                                {
                                    profile: {
                                        is: {
                                            displayName: {
                                                contains: search,
                                                mode: 'insensitive',
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            ];

            if (isUuidSearch) {
                orFilters.unshift({
                    id: search,
                });
            }

            where.OR = orFilters;
        }

        if (rawStatus && Object.values(PurchaseStatus).includes(rawStatus as PurchaseStatus)) {
            where.status = rawStatus as PurchaseStatus;
        }

        const [total, orders] = await Promise.all([
            this.prisma.purchaseOrder.count({ where }),
            this.prisma.purchaseOrder.findMany({
                where,
                include: {
                    user: {
                        include: {
                            profile: true,
                        },
                    },
                    pkg: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        return {
            items: orders.map((order) => this.mapTransaction(order)),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    }

    async listUsers(userId: string, options: ListUsersOptions) {
        await this.requireAdmin(userId);

        const page = this.normalizePage(options.page, 1);
        const pageSize = this.normalizePageSize(options.pageSize, 20);
        const search = String(options.search || '').trim();

        const where: Prisma.UserWhereInput = {};

        if (search) {
            where.OR = [
                {
                    username: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    email: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    publicId: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    profile: {
                        is: {
                            displayName: {
                                contains: search,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
            ];
        }

        const [total, users] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    publicId: true,
                    username: true,
                    email: true,
                    createdAt: true,
                    profile: {
                        select: {
                            displayName: true,
                        },
                    },
                    wallet: {
                        select: {
                            coins: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        const userIds = users.map((user) => user.id);

        const purchaseAggregates =
            userIds.length > 0
                ? await this.prisma.purchaseOrder.groupBy({
                    by: ['userId'],
                    where: {
                        userId: {
                            in: userIds,
                        },
                        status: {
                            in: this.paidStatuses,
                        },
                    },
                    _sum: {
                        priceCents: true,
                    },
                    _count: {
                        _all: true,
                    },
                    _max: {
                        createdAt: true,
                        paidAt: true,
                        fulfilledAt: true,
                    },
                })
                : [];

        const aggregatesByUserId = new Map(
            purchaseAggregates.map((row) => [
                row.userId,
                {
                    lifetimeSpentCents: row._sum.priceCents || 0,
                    ordersCount: row._count._all,
                    lastPurchaseAt:
                        row._max.fulfilledAt || row._max.paidAt || row._max.createdAt || null,
                },
            ]),
        );

        return {
            items: users.map((user) => {
                const aggregates = aggregatesByUserId.get(user.id);

                return {
                    id: user.id,
                    uuid: user.id,
                    publicId: user.publicId,
                    username: user.username,
                    email: user.email,
                    displayName: user.profile?.displayName?.trim() || user.username,
                    joinedAt: user.createdAt.toISOString(),
                    walletCoins: user.wallet?.coins || 0,
                    lifetimeSpentCents: aggregates?.lifetimeSpentCents || 0,
                    ordersCount: aggregates?.ordersCount || 0,
                    lastPurchaseAt: aggregates?.lastPurchaseAt
                        ? aggregates.lastPurchaseAt.toISOString()
                        : null,
                    status: 'ACTIVE',
                };
            }),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    }

    async getUser(adminUserId: string, targetUserId: string) {
        await this.requireAdmin(adminUserId);

        const user = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                profile: true,
                wallet: true,
                purchaseOrders: {
                    include: {
                        pkg: true,
                        user: {
                            include: {
                                profile: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 10,
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found.');
        }

        const spending = await this.prisma.purchaseOrder.aggregate({
            where: {
                userId: user.id,
                status: {
                    in: this.paidStatuses,
                },
            },
            _sum: {
                priceCents: true,
            },
            _count: {
                _all: true,
            },
        });

        return {
            user: {
                id: user.id,
                uuid: user.id,
                publicId: user.publicId,
                username: user.username,
                email: user.email,
                displayName: user.profile?.displayName?.trim() || user.username,
                joinedAt: user.createdAt.toISOString(),
                walletCoins: user.wallet?.coins || 0,
                lifetimeSpentCents: spending._sum.priceCents || 0,
                ordersCount: spending._count._all || 0,
                status: 'ACTIVE',
            },
            recentTransactions: user.purchaseOrders.map((order) => this.mapTransaction(order)),
        };
    }
}
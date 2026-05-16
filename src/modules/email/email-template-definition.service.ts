import { Injectable, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import {
    EMAIL_TEMPLATE_CATALOG,
    buildDefaultSampleVariables,
} from "./email-template-catalog";

@Injectable()
export class EmailTemplateDefinitionService implements OnModuleInit {
    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        await this.ensureSeeded();
    }

    async ensureSeeded() {
        for (const entry of EMAIL_TEMPLATE_CATALOG) {
            await this.prisma.emailTemplateDefinition.upsert({
                where: { key: entry.key },
                update: {
                    name: entry.name,
                    description: entry.description,
                    allowedVariables: entry.variables.map((variable) => ({
                        name: variable.name,
                        description: variable.description,
                        required: variable.required,
                        example: variable.example ?? "",
                    })) as Prisma.InputJsonValue,
                    requiredVariables: entry.variables
                        .filter((variable) => variable.required)
                        .map((variable) => variable.name) as Prisma.InputJsonValue,
                    updatedAt: new Date(),
                },
                create: {
                    key: entry.key,
                    category: entry.category,
                    name: entry.name,
                    description: entry.description,
                    editorType: entry.defaultEditorType as any,
                    allowedVariables: entry.variables.map((variable) => ({
                        name: variable.name,
                        description: variable.description,
                        required: variable.required,
                        example: variable.example ?? "",
                    })) as Prisma.InputJsonValue,
                    requiredVariables: entry.variables
                        .filter((variable) => variable.required)
                        .map((variable) => variable.name) as Prisma.InputJsonValue,
                    sampleVariables: buildDefaultSampleVariables(entry) as Prisma.InputJsonValue,
                },
            });
        }
    }

    async getByKey(key: string) {
        await this.ensureSeeded();

        return this.prisma.emailTemplateDefinition.findUnique({
            where: { key },
            include: {
                publishedVersion: true,
                versions: {
                    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
                },
            },
        });
    }

    async getByCategory(category: string) {
        await this.ensureSeeded();

        return this.prisma.emailTemplateDefinition.findUnique({
            where: {
                category: category as any,
            },
            include: {
                publishedVersion: true,
                versions: {
                    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
                },
            },
        });
    }

    async listAll() {
        await this.ensureSeeded();

        return this.prisma.emailTemplateDefinition.findMany({
            where: {
                archivedAt: null,
            },
            include: {
                publishedVersion: true,
                versions: {
                    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
                },
            },
            orderBy: [{ category: "asc" }],
        });
    }
}
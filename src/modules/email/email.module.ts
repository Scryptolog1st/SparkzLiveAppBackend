import { Module } from "@nestjs/common";

import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminEmailController } from "./admin-email.controller";
import { EmailAdminService } from "./email-admin.service";
import { EmailCryptoService } from "./email-crypto.service";
import { EmailService } from "./email.service";
import { EmailTemplateDefinitionService } from "./email-template-definition.service";
import { EmailTemplateRendererService } from "./email-template-renderer.service";
import { EmailTransportService } from "./email-transport.service";

@Module({
    imports: [PrismaModule, AdminAuditModule],
    controllers: [AdminEmailController],
    providers: [
        EmailService,
        EmailAdminService,
        EmailCryptoService,
        EmailTransportService,
        EmailTemplateDefinitionService,
        EmailTemplateRendererService,
        AdminProxyGuard,
        AdminRolePermissionsService,
    ],
    exports: [
        EmailService,
        EmailAdminService,
        EmailTemplateDefinitionService,
        EmailTemplateRendererService,
    ],
})
export class EmailModule { }
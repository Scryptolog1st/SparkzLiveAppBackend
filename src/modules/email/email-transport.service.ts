import { Injectable } from "@nestjs/common";
import nodemailer, { type SendMailOptions } from "nodemailer";

import { EmailCryptoService } from "./email-crypto.service";

type SmtpAccountRecord = {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    encryptedPassword: string;
    fromName: string;
    fromEmail: string;
    replyToEmail?: string | null;
};

@Injectable()
export class EmailTransportService {
    constructor(private readonly crypto: EmailCryptoService) { }

    private sanitizeHeaderValue(value: string | null | undefined) {
        return String(value || "")
            .replace(/[\r\n]+/g, " ")
            .trim();
    }

    private buildFrom(account: SmtpAccountRecord) {
        const fromName = this.sanitizeHeaderValue(account.fromName).replace(
            /"/g,
            '\\"',
        );
        const fromEmail = this.sanitizeHeaderValue(account.fromEmail);

        return `"${fromName}" <${fromEmail}>`;
    }

    private createTransporter(account: SmtpAccountRecord) {
        const password = this.crypto.decrypt(account.encryptedPassword);

        return nodemailer.createTransport({
            host: account.host,
            port: account.port,
            secure: account.secure,
            auth: {
                user: account.username,
                pass: password,
            },
        });
    }

    async verify(account: SmtpAccountRecord) {
        const transporter = this.createTransporter(account);
        return transporter.verify();
    }

    async sendEmail(
        account: SmtpAccountRecord,
        recipientEmail: string,
        subject: string,
        text: string,
        html: string,
    ) {
        const transporter = this.createTransporter(account);

        const message: SendMailOptions = {
            from: this.buildFrom(account),
            to: recipientEmail,
            subject,
            text,
            html,
        };

        const replyTo = this.sanitizeHeaderValue(account.replyToEmail);
        if (replyTo) {
            message.replyTo = replyTo;
        }

        return transporter.sendMail(message);
    }

    async sendTestEmail(
        account: SmtpAccountRecord,
        recipientEmail: string,
        subject: string,
        text: string,
        html: string,
    ) {
        return this.sendEmail(account, recipientEmail, subject, text, html);
    }
}
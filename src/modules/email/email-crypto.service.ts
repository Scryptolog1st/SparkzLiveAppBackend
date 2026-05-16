import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

@Injectable()
export class EmailCryptoService {
    constructor(private readonly config: ConfigService) { }

    private getKey() {
        const secret = String(
            this.config.get<string>("EMAIL_SECRET_ENCRYPTION_KEY") || "",
        ).trim();

        if (!secret) {
            throw new Error("EMAIL_SECRET_ENCRYPTION_KEY is not configured.");
        }

        return createHash("sha256").update(secret).digest();
    }

    encrypt(value: string) {
        const plaintext = String(value || "");
        if (!plaintext) {
            throw new Error("Cannot encrypt an empty SMTP password.");
        }

        const iv = randomBytes(12);
        const cipher = createCipheriv("aes-256-gcm", this.getKey(), iv);

        const encrypted = Buffer.concat([
            cipher.update(plaintext, "utf8"),
            cipher.final(),
        ]);

        const authTag = cipher.getAuthTag();

        return [
            iv.toString("base64"),
            authTag.toString("base64"),
            encrypted.toString("base64"),
        ].join(".");
    }

    decrypt(payload: string) {
        const raw = String(payload || "").trim();
        const parts = raw.split(".");

        if (parts.length !== 3) {
            throw new Error("Invalid encrypted SMTP secret payload.");
        }

        const [ivB64, tagB64, dataB64] = parts;

        const iv = Buffer.from(ivB64, "base64");
        const authTag = Buffer.from(tagB64, "base64");
        const encrypted = Buffer.from(dataB64, "base64");

        const decipher = createDecipheriv("aes-256-gcm", this.getKey(), iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);

        return decrypted.toString("utf8");
    }
}
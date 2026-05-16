import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toDataURL } from 'qrcode';
import { generateSecret, generateURI, verify, generate } from 'otplib';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TwoFactorService {
    constructor(private config: ConfigService) { }

    async generateSecret(userEmail: string) {
        const secret = generateSecret();
        const appName = this.config.get<string>('APP_NAME') || 'Sparkz';

        const otpAuthUrl = generateURI({
            secret,
            label: userEmail,
            issuer: appName
        });

        const qrCodeDataUrl = await toDataURL(otpAuthUrl);

        return { secret, qrCodeDataUrl };
    }

    async verifyToken(token: string, secret: string): Promise<boolean> {
        // ---- DEBUGGING DOCKER TIME DRIFT ----
        const expectedToken = await generate({ secret });
        console.log('\n--- 2FA VERIFICATION ---');
        console.log(`Server Time:    ${new Date().toISOString()}`);
        console.log(`Expected Code:  ${expectedToken}`);
        console.log(`Received Code:  ${token}`);
        console.log('------------------------\n');
        // -------------------------------------

        const result = await verify({ token, secret });
        return result.valid;
    }

    // --- NEW: Generate 10 Hashed Backup Codes ---
    async generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
        const plainCodes: string[] = [];
        const hashedCodes: string[] = [];

        for (let i = 0; i < 10; i++) {
            const partial = randomBytes(4).toString('hex').toUpperCase();
            const code = `${partial.slice(0, 4)}-${partial.slice(4)}`;

            plainCodes.push(code);
            hashedCodes.push(await bcrypt.hash(code, 12));
        }

        return { plain: plainCodes, hashed: hashedCodes };
    }
}
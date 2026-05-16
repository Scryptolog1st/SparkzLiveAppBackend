import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

export type StripeSignatureParse = {
  timestamp: number;
  signatures: string[];
};

export function parseStripeSignatureHeader(header: string | undefined): StripeSignatureParse {
  if (!header) throw new BadRequestException('Missing Stripe-Signature header');

  const parts = header.split(',').map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Parts = parts.filter((p) => p.startsWith('v1='));

  if (!tPart || v1Parts.length === 0) throw new BadRequestException('Invalid Stripe-Signature header');

  const timestamp = Number(tPart.slice(2));
  if (!Number.isFinite(timestamp)) throw new BadRequestException('Invalid Stripe signature timestamp');

  const signatures = v1Parts.map((p) => p.slice(3)).filter(Boolean);
  if (signatures.length === 0) throw new BadRequestException('Invalid Stripe signature v1');

  return { timestamp, signatures };
}

export function computeStripeSignature(secret: string, timestamp: number, rawBody: Buffer): string {
  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export function verifyStripeSignature(params: {
  secret: string;
  rawBody: Buffer | undefined;
  header: string | undefined;
  toleranceSeconds?: number;
  nowSeconds?: number;
}) {
  const { secret, rawBody, header } = params;
  const toleranceSeconds = params.toleranceSeconds ?? 300;
  const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!rawBody || rawBody.length === 0) {
    throw new BadRequestException(
      'Missing raw request body for signature verification. Enable rawBody in NestFactory.create(..., { rawBody: true }).',
    );
  }

  const parsed = parseStripeSignatureHeader(header);

  const age = Math.abs(nowSeconds - parsed.timestamp);
  if (age > toleranceSeconds) {
    throw new BadRequestException(`Stripe signature timestamp outside tolerance (age=${age}s, tol=${toleranceSeconds}s)`);
  }

  const expected = computeStripeSignature(secret, parsed.timestamp, rawBody);
  const ok = parsed.signatures.some((sig) => timingSafeEqualHex(sig, expected));
  if (!ok) {
    throw new BadRequestException('Invalid Stripe signature');
  }

  return { timestamp: parsed.timestamp, expected };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const aa = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (aa.length !== bb.length) return false;
    return crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

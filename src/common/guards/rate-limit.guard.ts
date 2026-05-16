import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  mixin,
} from '@nestjs/common';
import type { Request } from 'express';

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  keyPrefix: string;
};

type Bucket = { count: number; resetAt: number };

// Dev-friendly in-memory limiter. For production, swap this for Redis.
const buckets = new Map<string, Bucket>();

export function RateLimitGuard(options: RateLimitOptions) {
  @Injectable()
  class RateLimitGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<Request>();

      // Prefer x-forwarded-for, then express ip, then remoteAddress.
      const xff = req.headers['x-forwarded-for'];
      const ip =
        (typeof xff === 'string' ? xff.split(',')[0]?.trim() : undefined) ||
        (req.ip as string) ||
        // fall back for some adapters
        ((req as any).connection?.remoteAddress as string | undefined) ||
        'unknown';

      const key = `${options.keyPrefix}:${ip}`;
      const now = Date.now();

      const existing = buckets.get(key);
      if (!existing || now >= existing.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + options.windowMs });
        return true;
      }

      existing.count += 1;

      if (existing.count > options.limit) {
        const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        throw new HttpException(
          {
            message: 'Too many requests',
            retryAfterSec,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    }
  }

  return mixin(RateLimitGuardMixin);
}

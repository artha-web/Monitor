/**
 * Rate limiting middleware using express-rate-limit
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { RATE_LIMITS } from '@artha-monitor/shared';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request, res: Response) => boolean;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests, please try again later',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'unknown'),
    skip: options.skip || (() => false),
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests, please try again later',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    },
  });
};

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => `auth:${req.ip}`,
});

export const apiRateLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.api.windowMs,
  max: RATE_LIMITS.api.max,
  message: 'Too many API requests, please slow down',
});

export const monitorCreateRateLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.monitorCreate.windowMs,
  max: RATE_LIMITS.monitorCreate.max,
  message: 'Too many monitors created, please try again later',
  keyGenerator: (req: Request) => `monitor-create:${req.ip}`,
});

export const checkResultsRateLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.checkResults.windowMs,
  max: RATE_LIMITS.checkResults.max,
  message: 'Too many check result requests, please slow down',
  keyGenerator: (req: Request) => `check-results:${req.ip}`,
});

// Combined rate limiter middleware
export const rateLimiter = apiRateLimiter;
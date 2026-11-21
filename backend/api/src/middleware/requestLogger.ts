/**
 * Request logging middleware using Pino
 */

import { Request, Response, NextFunction } from 'express';
import { pino } from 'pino';

export interface RequestLoggerOptions {
  logger?: any;
  excludePaths?: string[];
}

export const requestLogger = (loggerInstance: any, options: RequestLoggerOptions = {}) => {
  const { excludePaths = ['/health', '/favicon.ico'] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const startTime = process.hrtime.bigint();
    const requestId = crypto.randomUUID();

    // Add request ID to request for tracing
    (req as Request & { requestId: string }).requestId = requestId;

    // Log request
    loggerInstance.info({
      requestId,
      method: req.method,
      url: req.url,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      contentLength: req.get('content-length'),
    }, 'Incoming request');

    // Capture response
    const originalSend = res.send;
    res.send = function (body?: unknown): Response {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      loggerInstance.info({
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        contentLength: res.get('content-length'),
      }, 'Request completed');

      return originalSend.call(this, body);
    };

    next();
  };
};
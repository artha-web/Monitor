/**
 * Centralized error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { logger } from '../index.js';
import { apiErrorSchema, type ApiError } from '@artha-monitor/shared';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public override readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMIT_EXCEEDED', message, 429);
    this.name = 'RateLimitError';
  }
}

export const errorHandler = (loggerInstance: typeof logger) => {
  return (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Log the error
    loggerInstance.error({ err, stack: err.stack }, 'Request error');

    // Default error response
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;

    // Handle known error types
    if (err instanceof AppError) {
      statusCode = err.statusCode;
      code = err.code;
      message = err.message;
      details = err.details;
    } else if (err instanceof ZodError) {
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      message = 'Invalid request data';
      details = {
        errors: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        }))
      };
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma specific errors
      if (err.code === 'P2002') {
        statusCode = 409;
        code = 'CONFLICT';
        message = 'A record with this value already exists';
        details = { field: err.meta?.target };
      } else if (err.code === 'P2025') {
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'Record not found';
      } else {
        statusCode = 500;
        code = 'DATABASE_ERROR';
        message = 'Database operation failed';
      }
    } else if (err instanceof JsonWebTokenError) {
      statusCode = 401;
      code = 'INVALID_TOKEN';
      message = 'Invalid authentication token';
    } else if (err instanceof TokenExpiredError) {
      statusCode = 401;
      code = 'TOKEN_EXPIRED';
      message = 'Authentication token has expired';
    } else if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      // JSON parsing error
      statusCode = 400;
      code = 'INVALID_JSON';
      message = 'Invalid JSON in request body';
    }

    // Validate error response shape
    const errorResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    // Validate with zod schema in development
    if (process.env.NODE_ENV !== 'production') {
      const validation = apiErrorSchema.safeParse(errorResponse.error);
      if (!validation.success) {
        loggerInstance.warn({ validationErrors: validation.error.errors }, 'Error response validation failed');
      }
    }

    res.status(statusCode).json(errorResponse);
  };
};

// Async route wrapper to catch errors automatically
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
/**
 * Artha Monitor API - Main Entry Point
 * Express.js REST API with TypeScript
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pino } from 'pino';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { authMiddleware } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { monitorsRouter } from './routes/monitors.js';
import { checkResultsRouter } from './routes/checkResults.js';
import { uptimeRouter } from './routes/uptime.js';
import { usersRouter } from './routes/users.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for correct IP addresses behind load balancers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // We'll configure CSP separately if needed
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression
app.use(compression());

// Cookie parsing
app.use(cookieParser());

// Request logging
app.use(requestLogger(logger));

// Rate limiting
app.use(rateLimiter);

// Health check (no auth required)
app.use(`${process.env.API_PREFIX || '/api/v1'}/health`, healthRouter);

// Auth routes (no auth required)
app.use(`${process.env.API_PREFIX || '/api/v1'}/auth`, authRouter);

// Protected routes (require authentication)
const protectedRouter = express.Router();
protectedRouter.use(authMiddleware);
protectedRouter.use('/monitors', monitorsRouter);
protectedRouter.use('/check-results', checkResultsRouter);
protectedRouter.use('/uptime', uptimeRouter);
protectedRouter.use('/users', usersRouter);

app.use(process.env.API_PREFIX || '/api/v1', protectedRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

// Global error handler
app.use(errorHandler(logger));

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Artha Monitor API running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API Prefix: ${process.env.API_PREFIX || '/api/v1'}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, logger };
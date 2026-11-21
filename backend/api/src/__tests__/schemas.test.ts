import { describe, it, expect } from 'vitest';
import {
  createMonitorSchema,
  registerSchema,
  loginSchema,
  monitorIdParamSchema,
  updateMonitorSchema,
} from '@artha-monitor/shared';

describe('Validation Schemas', () => {
  describe('createMonitorSchema', () => {
    it('validates a complete, valid monitor creation payload', () => {
      const payload = {
        name: 'Production Auth Endpoint',
        url: 'https://auth.company.com/health',
        method: 'GET' as const,
        interval: '1m' as const,
        timeout: 8000,
        expectedStatusCodes: [200, 204],
        expectedResponseText: 'status:ok',
      };
      const result = createMonitorSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid target URL format', () => {
      const payload = {
        name: 'Invalid Target',
        url: 'not-a-valid-url-without-scheme',
        interval: '5m' as const,
      };
      const result = createMonitorSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects timeout below minimum threshold', () => {
      const payload = {
        name: 'Fast Probe',
        url: 'https://fast.com',
        interval: '1m' as const,
        timeout: 500, // min is 1000ms
      };
      const result = createMonitorSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('accepts custom intervals (14m) and active time window configuration', () => {
      const payload = {
        name: 'Business Hours Probe',
        url: 'https://erp.enterprise.com/health',
        method: 'GET' as const,
        interval: '14m',
        timeout: 10000,
        activeWindowStart: '07:00',
        activeWindowEnd: '12:00',
        activeWindowTimezone: 'Asia/Kolkata',
      };
      const result = createMonitorSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.interval).toBe('14m');
        expect(result.data.activeWindowStart).toBe('07:00');
        expect(result.data.activeWindowEnd).toBe('12:00');
      }
    });

    it('rejects invalid time window formats', () => {
      const payload = {
        name: 'Bad Time Probe',
        url: 'https://erp.enterprise.com/health',
        interval: '14m',
        activeWindowStart: '7:00 AM', // not HH:mm format
      };
      const result = createMonitorSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('accepts valid email and strong password', () => {
      const payload = {
        email: 'alice@domain.com',
        password: 'SuperSecretPassword123!',
        name: 'Alice Developer',
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const payload = {
        email: 'bob@domain.com',
        password: 'short',
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('monitorIdParamSchema', () => {
    it('accepts valid UUID in id or monitorId and transforms to unified object', () => {
      const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const result = monitorIdParamSchema.safeParse({ id: uuid });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(uuid);
        expect(result.data.monitorId).toBe(uuid);
      }
    });

    it('rejects non-UUID strings', () => {
      const result = monitorIdParamSchema.safeParse({ id: '123-not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });
});

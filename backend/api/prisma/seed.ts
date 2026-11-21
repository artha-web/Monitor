import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean up existing records for idempotency
  await prisma.checkResult.deleteMany();
  await prisma.downtimeEvent.deleteMany();
  await prisma.workerJob.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.monitor.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Demo User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@arthamonitor.com',
      name: 'DevOps Administrator',
      passwordHash,
      emailVerified: true,
      role: 'ADMIN',
      quota: {
        maxMonitors: 50,
        maxChecksPerMonth: 100000,
        minInterval: '1m',
        webhooksEnabled: true,
        apiAccess: true,
      },
    },
  });

  console.log(`👤 Created demo user: ${demoUser.email} (Password: Password123!)`);

  // 3. Create Sample Monitors
  const monitorsData = [
    {
      name: 'GitHub REST API',
      url: 'https://api.github.com',
      method: 'GET' as const,
      interval: '1m',
      timeout: 5000,
      expectedStatusCodes: [200],
      currentStatus: 'UP' as const,
      uptimePercentage: 99.98,
      enabled: true,
      headers: {
        'User-Agent': 'ArthaMonitor-Probe/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
      notificationSettings: {
        emailEnabled: true,
        emailOnDown: true,
        emailOnUp: true,
        webhookUrl: 'https://hooks.slack.com/services/sample/webhook',
        webhookOnDown: true,
        webhookOnUp: true,
      },
    },
    {
      name: 'Cloudflare CDN DNS Probe',
      url: 'https://1.1.1.1/cdn-cgi/trace',
      method: 'GET' as const,
      interval: '2m',
      timeout: 3000,
      expectedStatusCodes: [200],
      expectedResponseText: 'fl=',
      currentStatus: 'UP' as const,
      uptimePercentage: 100.0,
      enabled: true,
      notificationSettings: {
        emailEnabled: true,
        emailOnDown: true,
        emailOnUp: true,
      },
    },
    {
      name: 'Primary Auth Service',
      url: 'https://httpbin.org/status/200',
      method: 'GET' as const,
      interval: '3m',
      timeout: 10000,
      expectedStatusCodes: [200],
      currentStatus: 'UP' as const,
      uptimePercentage: 98.85,
      enabled: true,
      notificationSettings: {
        emailEnabled: true,
        emailOnDown: true,
        emailOnUp: true,
      },
    },
    {
      name: 'Legacy Billing Microservice',
      url: 'https://httpbin.org/status/503',
      method: 'POST' as const,
      interval: '5m',
      timeout: 10000,
      expectedStatusCodes: [200, 204],
      currentStatus: 'DOWN' as const,
      uptimePercentage: 82.45,
      enabled: true,
      body: '{"action":"heartbeat"}',
      headers: {
        'Content-Type': 'application/json',
      },
      notificationSettings: {
        emailEnabled: true,
        emailOnDown: true,
        emailOnUp: true,
      },
    },
  ];

  const now = new Date();

  for (const item of monitorsData) {
    const monitor = await prisma.monitor.create({
      data: {
        userId: demoUser.id,
        name: item.name,
        url: item.url,
        method: item.method,
        interval: item.interval,
        timeout: item.timeout,
        expectedStatusCodes: item.expectedStatusCodes,
        expectedResponseText: item.expectedResponseText ?? null,
        headers: item.headers ?? undefined,
        body: item.body ?? null,
        enabled: item.enabled,
        currentStatus: item.currentStatus,
        notificationSettings: item.notificationSettings,
        lastCheckAt: now,
        nextCheckAt: new Date(now.getTime() + 60_000),
      },
    });

    console.log(`📡 Created monitor: ${monitor.name} [${monitor.currentStatus}]`);

    // 4. Seed check results for this monitor (last 30 checks)
    const checkCount = 30;
    const checkIntervalMs = 60_000;
    const checkResults = [];

    for (let i = checkCount - 1; i >= 0; i--) {
      const checkTime = new Date(now.getTime() - i * checkIntervalMs);
      const isFailed = item.currentStatus === 'DOWN' && i < 15;
      const status = isFailed ? 'FAILURE' : 'SUCCESS';
      const statusCode = isFailed ? 503 : 200;
      const baseLatency = item.name.includes('GitHub') ? 45 : item.name.includes('Cloudflare') ? 18 : 120;
      const jitter = Math.floor(Math.random() * 30) - 15;
      const responseTime = Math.max(10, baseLatency + jitter);

      checkResults.push({
        monitorId: monitor.id,
        status: status as any,
        statusCode,
        responseTime,
        responseBody: isFailed ? 'Service Unavailable: 503' : '{"status":"healthy"}',
        errorMessage: isFailed ? 'Received status 503 Service Unavailable' : null,
        checkedAt: checkTime,
      });
    }

    await prisma.checkResult.createMany({
      data: checkResults,
    });

    // 5. Seed downtime event if monitor is DOWN
    if (item.currentStatus === 'DOWN') {
      await prisma.downtimeEvent.create({
        data: {
          monitorId: monitor.id,
          startedAt: new Date(now.getTime() - 15 * 60_000),
          reason: 'HTTP 503 Service Unavailable detected',
        },
      });
    }

    // 6. Seed initial worker job
    await prisma.workerJob.create({
      data: {
        monitorId: monitor.id,
        scheduledAt: new Date(now.getTime() + 60_000),
        status: 'PENDING',
      },
    });
  }

  console.log('✅ Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

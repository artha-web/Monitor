'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  Bell,
  BarChart3,
  Server,
  Terminal,
  Globe,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <span>Artha<span className="text-primary font-extrabold">Monitor</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#intervals" className="hover:text-foreground transition-colors">Intervals</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild size="sm" className="gap-2 font-semibold">
                <Link href="/monitors">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-xs">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="gap-2 font-semibold text-xs shadow-sm">
                  <Link href="/register">
                    <span>Start Free</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 border-b">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              <span>Next-Gen Multi-Cadence Uptime Engine</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
              Instant alerts when your APIs or websites go{' '}
              <span className="text-rose-600 dark:text-rose-400 underline decoration-rose-500/30">down</span>.
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Artha Monitor delivers sub-second health checks, down to 1-minute intervals, custom HTTP headers, latency trend analysis, and instant multi-channel alerting.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 gap-2">
                <Link href={user ? '/monitors' : '/register'}>
                  <span>{user ? 'Open Monitoring Dashboard' : 'Start Monitoring for Free'}</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <a href="#features">Explore Platform Features</a>
              </Button>
            </div>

            {/* Quick Proof Badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Up to 50 Free Monitors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>1-Minute Cadence Probing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Webhook & Email Notifications</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Developer REST API Included</span>
              </div>
            </div>

            {/* Product Mockup Preview */}
            <div className="pt-10 max-w-5xl mx-auto">
              <div className="rounded-2xl border bg-card/60 p-2 sm:p-4 shadow-2xl backdrop-blur-sm">
                <div className="rounded-xl border bg-background p-4 sm:p-6 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-sm">api.production.arthaweb.com</span>
                      <Badge variant="outline" className="text-xs font-mono">GET 200 OK</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">Uptime: <strong className="text-emerald-600">99.99%</strong></span>
                      <span className="text-muted-foreground">Latency: <strong className="text-indigo-600">42ms</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <span className="text-muted-foreground">Check Cadence</span>
                      <p className="font-semibold text-foreground text-sm mt-0.5">Every 1 minute</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <span className="text-muted-foreground">Checks / 24h</span>
                      <p className="font-semibold text-foreground text-sm mt-0.5">1,440 checks</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <span className="text-muted-foreground">Incident Rate</span>
                      <p className="font-semibold text-emerald-600 text-sm mt-0.5">0 outages</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <span className="text-muted-foreground">Alert Channel</span>
                      <p className="font-semibold text-foreground text-sm mt-0.5">Slack Webhook + Email</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-24 border-b">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">Engineered for Devs, DevOps, and SREs</h2>
              <p className="text-muted-foreground text-sm">
                Everything required to ensure continuous availability, high SLA compliance, and immediate downtime recovery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="shadow-sm border-border/80">
                <CardContent className="p-6 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">Sub-Minute Probing</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Configure granular check intervals from 1m to 30m with background distributed workers executing parallel HTTP requests.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardContent className="p-6 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                    <Bell className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">Instant Multi-Channel Alerts</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Receive immediate notifications when downtime begins and recovery confirms. Connect webhook targets like Slack, Discord, or custom endpoints.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardContent className="p-6 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">Latency Trends & SLA Reports</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Interactive Recharts response time distributions, 24h to 365-day uptime calculations, and downtime incident logs.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardContent className="p-6 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">Payload & Header Assertions</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Send custom authorization tokens, API keys, JSON payloads, and validate specific expected substring text within the response body.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardContent className="p-6 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <Terminal className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">Full REST API</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automate monitor creation, check triggers, and stats retrieval directly inside your CI/CD workflows and deployment scripts.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardContent className="p-6 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                    <Server className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">Resilient Microservices</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Built on Express, PostgreSQL, Prisma, Redis-ready workers, and Next.js 14 for true enterprise reliability.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* PRICING / QUOTA TIERS */}
        <section id="pricing" className="py-24">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">Generous, Developer-First Pricing</h2>
              <p className="text-muted-foreground text-sm">
                Get started free today. Scale as your infrastructure grows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Tier */}
              <Card className="shadow-md border-primary/40 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
                  MOST POPULAR
                </div>
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold">Developer Free</h3>
                    <p className="text-xs text-muted-foreground mt-1">Perfect for solo developers and startups</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">$0</span>
                      <span className="text-xs text-muted-foreground">/ month forever</span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>50 Endpoints Monitored</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>1-Minute Minimum Interval</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>100,000 Checks per Month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Email & Webhook Alerts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Full REST API Access</span>
                    </li>
                  </ul>

                  <Button asChild className="w-full font-semibold shadow-sm">
                    <Link href="/register">Get Started Free</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Team Tier */}
              <Card className="shadow-sm">
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold">Pro Team</h3>
                    <p className="text-xs text-muted-foreground mt-1">For growing teams and high-traffic services</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">$29</span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>250 Endpoints Monitored</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>30-Second Minimum Interval</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>1,000,000 Checks per Month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>SMS & PagerDuty Integration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Priority Support</span>
                    </li>
                  </ul>

                  <Button asChild variant="outline" className="w-full">
                    <Link href="/register">Start 14-Day Trial</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card className="shadow-sm">
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold">Enterprise</h3>
                    <p className="text-xs text-muted-foreground mt-1">Dedicated infrastructure and custom SLAs</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">$99</span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Unlimited Endpoints</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Multi-Region Probes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Custom Status Pages</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>99.99% Availability SLA</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Dedicated Account Architect</span>
                    </li>
                  </ul>

                  <Button asChild variant="outline" className="w-full">
                    <Link href="/register">Contact Sales</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12 text-xs text-muted-foreground">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            <span>Artha Monitor</span>
            <span className="font-normal text-muted-foreground">© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers';
import { cn } from '@/lib/utils';
import {
  Activity,
  Server,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MonitorFormModal } from '@/components/monitors/MonitorForm';
import { useCreateMonitor } from '@/hooks/useMonitorMutations';
import { useMonitors } from '@/hooks/useMonitors';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isNewMonitorOpen, setIsNewMonitorOpen] = React.useState(false);

  const { monitors, meta } = useMonitors();
  const createMutation = useCreateMonitor();

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    {
      title: 'Monitors',
      href: '/monitors',
      icon: Activity,
      count: monitors.length,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const userInitials = React.useMemo(() => {
    if (!user) return 'AM';
    if (user.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  }, [user]);

  const usedMonitors = meta?.quota?.used ?? monitors.length;
  const maxMonitors = meta?.quota?.max ?? user?.quota?.maxMonitors ?? 50;
  const quotaPercentage = Math.min(100, Math.round((usedMonitors / maxMonitors) * 100));

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground animate-pulse shadow-md">
            <Activity className="h-6 w-6" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <Link href="/monitors" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight">Artha<span className="text-primary font-extrabold">Monitor</span></span>
              <span className="text-[10px] text-muted-foreground font-normal">Uptime & Latency Pro</span>
            </div>
          </Link>
        </div>

        {/* Action Button */}
        <div className="px-4">
          <Button
            onClick={() => setIsNewMonitorOpen(true)}
            className="w-full gap-2 shadow-sm font-semibold"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Monitor</span>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span>{item.title}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-mono',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: Quota + User Profile */}
      <div className="space-y-4 p-4 border-t border-border/40">
        {/* Quota widget */}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">Monitors Quota</span>
            <span className="font-semibold text-foreground">
              {usedMonitors} / {maxMonitors}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                quotaPercentage > 90 ? 'bg-rose-500' : 'bg-primary'
              )}
              style={{ width: `${quotaPercentage}%` }}
            />
          </div>
        </div>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/60 outline-none">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground truncate">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
            <DropdownMenuLabel className="font-normal text-xs">
              <div className="flex flex-col space-y-1">
                <p className="font-semibold text-foreground">{user?.name || 'Account'}</p>
                <p className="text-muted-foreground truncate text-[11px]">{user?.email}</p>
                <span className="inline-block mt-1 w-fit rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
                  {user?.role || 'user'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Account Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="flex items-center gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-30 border-r bg-card shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Sheet */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute right-3 top-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <SidebarContent />
      </div>

      {/* Main Body */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Network Probes Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setIsNewMonitorOpen(true)}
              className="gap-1.5 shadow-sm font-semibold hidden sm:flex"
            >
              <Plus className="h-4 w-4" />
              <span>Add Monitor</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-muted outline-none">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs font-normal">
                  <p className="font-semibold">{user?.name || 'Account'}</p>
                  <p className="text-muted-foreground text-[11px] truncate">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="flex items-center gap-2 text-rose-600 focus:text-rose-600 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global New Monitor Modal */}
      <MonitorFormModal
        open={isNewMonitorOpen}
        onOpenChange={setIsNewMonitorOpen}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
        }}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}

'use client';

import * as React from 'react';
import { useAuth } from '@/providers';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User as UserIcon,
  Lock,
  AlertTriangle,
  Key,
  Shield,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { toast } = useToast();

  // Profile form state
  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  // Delete account modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

  // Sync user state when user loads
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Quota query
  const { data: quotaData } = useQuery({
    queryKey: ['userQuota'],
    queryFn: () => api.getQuota(),
    enabled: !!user,
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      await api.updateProfile({ name, email });
      await refreshUser();
      toast({
        title: 'Profile updated',
        description: 'Your account details have been saved.',
      });
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err?.message || 'Could not update profile',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Validation error',
        description: 'New password and confirm password do not match.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: 'Validation error',
        description: 'New password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Password changed',
        description: 'Your password was updated successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Change failed',
        description: err?.message || 'Current password incorrect',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    try {
      setIsDeletingAccount(true);
      await api.deleteAccount(deletePassword);
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently closed.',
      });
      await logout();
    } catch (err: any) {
      toast({
        title: 'Deletion failed',
        description: err?.message || 'Incorrect password',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your account profile, credentials, subscription quota, and security preferences.
        </p>
      </div>

      {/* 1. Account Profile */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Account Profile</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Personal identity information and registered contact email.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateProfile}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@domain.com"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Role: {user?.role || 'user'}
              </Badge>
              <span>• Registered since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button type="submit" loading={isUpdatingProfile} disabled={isUpdatingProfile} size="sm">
              Save Profile Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* 2. Quota & Limits */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Plan Quota & Capacity</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Resource allowances and monitoring capabilities active on your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-xs text-muted-foreground">Monitors Capacity</span>
              <p className="text-xl font-bold text-foreground">
                {quotaData?.usedMonitors ?? 0} / {quotaData?.maxMonitors ?? 50}
              </p>
              <p className="text-[11px] text-muted-foreground">HTTP & API endpoints</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-xs text-muted-foreground">Min Probe Interval</span>
              <p className="text-xl font-bold text-foreground">
                {quotaData?.minInterval ?? '1m'}
              </p>
              <p className="text-[11px] text-muted-foreground">60-second resolution</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-xs text-muted-foreground">Monthly Probes</span>
              <p className="text-xl font-bold text-foreground">
                {(quotaData?.maxChecksPerMonth ?? 100_000).toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground">Monthly check budget</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Developer Tier Active: REST API access enabled, SSL certificate validation included.</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Security: Change Password */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-lg">Change Password</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Update your authentication password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              type="submit"
              loading={isChangingPassword}
              disabled={isChangingPassword || !currentPassword || !newPassword}
              size="sm"
            >
              Update Password
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* 4. Danger Zone: Delete Account */}
      <Card className="border-destructive/40 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Irreversible actions that permanently delete data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="font-semibold text-sm text-foreground">Delete Account</h4>
            <p className="text-xs text-muted-foreground max-w-lg">
              Permanently terminate your Artha Monitor account and delete all associated monitors, historical check logs, and uptime metrics.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            size="sm"
            className="shrink-0"
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirm Account Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is permanent and cannot be undone. Enter your current password to confirm account termination.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="deletePassword">Account Password</Label>
              <Input
                id="deletePassword"
                type="password"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              loading={isDeletingAccount}
              disabled={isDeletingAccount || !deletePassword}
            >
              Permanently Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

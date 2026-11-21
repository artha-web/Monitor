'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isSuccess, setIsSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setServerError('Reset token is missing or invalid. Please request a new link.');
      return;
    }

    try {
      setServerError(null);
      await api.resetPassword(token, data.password);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setServerError(err?.message || 'Failed to reset password. The token may be expired or already used.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight text-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-6 w-6" />
            </div>
            <span>Artha<span className="text-primary font-extrabold">Monitor</span></span>
          </Link>
        </div>

        <Card className="border-border/60 shadow-lg backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight">Choose a new password</CardTitle>
            <CardDescription className="text-xs">
              Enter and confirm your new secure account password
            </CardDescription>
          </CardHeader>

          {isSuccess ? (
            <CardContent className="space-y-4 pt-2">
              <div className="flex flex-col items-center text-center space-y-3 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Password reset successfully</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Your password has been updated. Redirecting you to sign in...
                  </p>
                </div>
              </div>
              <Button asChild className="w-full gap-2">
                <Link href="/login">
                  <span>Sign In Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          ) : !token ? (
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Invalid or missing reset token. Please request a new link.</span>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/forgot-password">Request New Reset Link</Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {serverError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    {...register('password')}
                    error={!!errors.password}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    error={!!errors.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Update Password
                </Button>

                <div className="text-center text-xs text-muted-foreground">
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Cancel and return to sign in
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}

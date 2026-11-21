'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordResetRequestSchema, PasswordResetRequestInput } from '@artha-monitor/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  const submittedEmail = watch('email');

  const onSubmit = async (data: PasswordResetRequestInput) => {
    try {
      setServerError(null);
      await api.requestPasswordReset(data.email);
      setIsSuccess(true);
    } catch (err: any) {
      setServerError(err?.message || 'Failed to request password reset. Please try again.');
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
            <CardTitle className="text-xl font-bold tracking-tight">Reset password</CardTitle>
            <CardDescription className="text-xs">
              Enter your account email and we&apos;ll send you a password reset link.
            </CardDescription>
          </CardHeader>

          {isSuccess ? (
            <CardContent className="space-y-4 pt-2">
              <div className="flex flex-col items-center text-center space-y-3 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Check your email</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    If an account exists for <span className="font-medium text-foreground">{submittedEmail}</span>,
                    we have dispatched password reset instructions.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full gap-2">
                <Link href="/login">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sign In</span>
                </Link>
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
                  <Label htmlFor="email">Registered Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="email"
                      {...register('email')}
                      error={!!errors.email}
                      className="pl-9"
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
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
                  Send Reset Link
                </Button>

                <div className="text-center text-xs text-muted-foreground">
                  Remember your password?{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Back to sign in
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

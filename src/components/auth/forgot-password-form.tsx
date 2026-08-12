"use client";

import Link from "next/link";

import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  return (
    <div className="space-y-4">
      <AuthFormMessage success="Email-based password reset is disabled. Use username + current password on the reset page." />
      <Button asChild className="w-full">
        <Link href="/reset-password">Go to reset password</Link>
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEMO_ADMIN_PASSWORD,
  DEMO_ADMIN_USERNAME,
} from "@/lib/auth/demo-credentials";
import { loginAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

type LoginFormProps = {
  nextPath?: string;
  resetSuccess?: boolean;
};

export function LoginForm({ nextPath, resetSuccess }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      {resetSuccess ? (
        <AuthFormMessage success="Password updated. You can sign in now." />
      ) : null}
      <AuthFormMessage error={state.error} success={state.success} />

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={64}
          defaultValue={DEMO_ADMIN_USERNAME}
          placeholder="your_username"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/reset-password"
            className="text-xs text-primary hover:underline"
          >
            Reset password
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue={DEMO_ADMIN_PASSWORD}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

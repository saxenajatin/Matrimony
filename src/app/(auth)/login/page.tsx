import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; reset?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in with your username and password"
    >
      <LoginForm
        nextPath={params.next}
        resetSuccess={params.reset === "1"}
      />
    </AuthCard>
  );
}

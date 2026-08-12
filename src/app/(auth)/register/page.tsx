import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Choose a username and password to get started"
    >
      <RegisterForm />
    </AuthCard>
  );
}

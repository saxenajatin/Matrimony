import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot password"
      description="We will email you a secure reset link"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}

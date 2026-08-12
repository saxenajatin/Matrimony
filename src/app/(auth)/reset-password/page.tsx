import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      description="Confirm your username and current password, then set a new one"
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}

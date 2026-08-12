"use client";

import { useActionState, useEffect } from "react";

import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import type { ProfileActionState } from "@/lib/profile/actions";

type OnboardingStepFormProps = {
  action: (
    prev: ProfileActionState,
    formData: FormData,
  ) => Promise<ProfileActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  onSuccess?: (completion?: number) => void;
};

const initialState: ProfileActionState = {};

export function OnboardingStepForm({
  action,
  children,
  submitLabel = "Save & continue",
  onSuccess,
}: OnboardingStepFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      onSuccess?.(state.completion);
    }
  }, [state.success, state.completion, onSuccess]);

  return (
    <form action={formAction} className="space-y-5">
      <AuthFormMessage error={state.error} success={state.success} />
      {children}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { PRIVACY_TOGGLES, type PrivacyToggleKey } from "@/lib/constants/privacy";
import {
  savePrivacyAction,
  type PrivacyActionState,
} from "@/lib/profile/privacy-actions";

const initialState: PrivacyActionState = {};

type PrivacyFormProps = {
  values: Record<PrivacyToggleKey, boolean>;
};

export function PrivacyForm({ values }: PrivacyFormProps) {
  const [state, formAction, pending] = useActionState(
    savePrivacyAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <AuthFormMessage error={state.error} success={state.success} />

      <ul className="space-y-3">
        {PRIVACY_TOGGLES.map((item) => (
          <li
            key={item.key}
            className="flex items-start justify-between gap-4 rounded-xl border border-border/70 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <input
              type="checkbox"
              name={item.key}
              defaultChecked={values[item.key]}
              className="mt-1 size-4 accent-[var(--primary)]"
            />
          </li>
        ))}
      </ul>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save privacy settings"}
      </Button>
    </form>
  );
}

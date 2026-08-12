import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/profile/onboarding-wizard";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/constants/profile";
import { getMyProfileBundle } from "@/lib/services/profile.service";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: { index: false, follow: false },
};

type OnboardingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseStep(
  value: string | string[] | undefined,
): OnboardingStepId | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return ONBOARDING_STEPS.some((item) => item.id === raw)
    ? (raw as OnboardingStepId)
    : undefined;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/onboarding");
  }
  if (isAdmin(user)) {
    redirect("/admin");
  }

  const params = await searchParams;
  const initialStep = parseStep(params.step);

  let bundle;
  try {
    bundle = await getMyProfileBundle(user.id);
  } catch {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Profile tables are missing. Run <code>scripts/amvs-phase2-profile.sql</code>{" "}
        in the Supabase SQL Editor, then refresh.
      </div>
    );
  }

  return <OnboardingWizard bundle={bundle} initialStep={initialStep} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DiscoverFiltersForm } from "@/components/profile/discover-filters-form";
import { DiscoverPagination } from "@/components/profile/discover-pagination";
import { ProfileCard } from "@/components/profile/profile-card";
import { getCurrentUser } from "@/lib/auth/session";
import { searchDiscoverProfiles } from "@/lib/services/discover.service";
import { parseDiscoverSearchParams } from "@/lib/validations/discover";

export const metadata: Metadata = {
  title: "Discover",
  robots: { index: false, follow: false },
};

type ProfilesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProfilesPage({ searchParams }: ProfilesPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/profiles");
  }

  const filters = parseDiscoverSearchParams(await searchParams);

  let profiles: Awaited<
    ReturnType<typeof searchDiscoverProfiles>
  >["profiles"] = [];
  let total = 0;
  let page = filters.page;
  let pageSize = 12;
  let totalPages = 1;
  let loadError: string | null = null;

  try {
    const result = await searchDiscoverProfiles({
      filters,
      excludeUserId: user.id,
    });
    profiles = result.profiles;
    total = result.total;
    page = result.page;
    pageSize = result.pageSize;
    totalPages = result.totalPages;
  } catch {
    loadError =
      "Discover search is not ready. Run scripts/amvs-phase4-discovery.sql in Supabase, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Discover</h1>
        <p className="mt-1 text-muted-foreground">
          Search matrimonial profiles across India with privacy-aware results.
        </p>
      </div>

      <DiscoverFiltersForm filters={filters} />

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && profiles.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No profiles match these filters.
        </div>
      ) : null}

      {profiles.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile) => (
              <ProfileCard key={profile.Id} profile={profile} />
            ))}
          </div>
          <DiscoverPagination
            filters={filters}
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
          />
        </>
      ) : null}
    </div>
  );
}

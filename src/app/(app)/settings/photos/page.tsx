import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PhotoManager } from "@/components/profile/photo-manager";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import {
  listUserPhotos,
  type ProfilePhoto,
} from "@/lib/services/photo.service";

export const metadata: Metadata = {
  title: "Photos",
  robots: { index: false, follow: false },
};

export default async function PhotosSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings/photos");
  }

  let photos: ProfilePhoto[] = [];
  let loadError: string | null = null;
  try {
    photos = await listUserPhotos(user.id, { withSignedUrls: true });
  } catch {
    loadError =
      "Photo storage is not ready. Run scripts/amvs-phase3-photos-privacy.sql in Supabase, then refresh.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Photos</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your profile photos. Visibility is controlled in Privacy.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to settings</Link>
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <PhotoManager photos={photos} />
      )}
    </div>
  );
}

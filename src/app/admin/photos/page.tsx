import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  approvePhotoAction,
  rejectPhotoAction,
} from "@/lib/admin/actions";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { listPendingPhotos } from "@/lib/services/admin.service";

export const metadata: Metadata = {
  title: "Admin · Photos",
  robots: { index: false, follow: false },
};

export default async function AdminPhotosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/photos");
  if (!isAdmin(user)) redirect("/dashboard");

  let photos: Awaited<ReturnType<typeof listPendingPhotos>> = [];
  let loadError: string | null = null;

  try {
    photos = await listPendingPhotos();
  } catch {
    loadError = "Could not load pending photos.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Photo moderation</h1>
        <p className="mt-1 text-muted-foreground">
          Approve photos before they appear publicly. Members still see their own
          uploads in settings.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && photos.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No photos waiting for moderation.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => (
          <Card key={photo.Id} className="overflow-hidden">
            <div className="relative aspect-[4/5] bg-muted">
              {photo.SignedUrl ? (
                <Image
                  src={photo.SignedUrl}
                  alt={photo.FileName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                {photo.DisplayName ?? "Member"}
              </CardTitle>
              <CardDescription>
                @{photo.Username ?? "member"}
                {photo.IsPrimary ? " · primary" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <form action={approvePhotoAction.bind(null, photo.Id)}>
                <Button type="submit" size="sm">
                  Approve
                </Button>
              </form>
              <form action={rejectPhotoAction.bind(null, photo.Id)}>
                <Button type="submit" size="sm" variant="outline">
                  Reject
                </Button>
              </form>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/admin/users?q=${encodeURIComponent(photo.Username ?? "")}`}>
                  User
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

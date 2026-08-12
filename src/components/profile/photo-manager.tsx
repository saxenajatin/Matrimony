"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";

import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MAX_PROFILE_PHOTOS,
} from "@/lib/constants/privacy";
import {
  deletePhotoAction,
  setPrimaryPhotoAction,
  uploadPhotoAction,
  type PhotoActionState,
} from "@/lib/profile/photo-actions";
import type { ProfilePhotoView } from "@/lib/types/profile";

const initialState: PhotoActionState = {};

type PhotoManagerProps = {
  photos: ProfilePhotoView[];
};

export function PhotoManager({ photos }: PhotoManagerProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    uploadPhotoAction,
    initialState,
  );
  const [busy, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <AuthFormMessage error={state.error} success={state.success} />

      <form action={formAction} className="space-y-3 rounded-xl border border-border/70 p-4">
        <div>
          <p className="font-medium">Upload photo</p>
          <p className="text-sm text-muted-foreground">
            JPG, PNG, or WEBP · max 5 MB · up to {MAX_PROFILE_PHOTOS} photos.
            New uploads wait for admin approval before public display.
          </p>
        </div>
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block w-full text-sm"
        />
        <Button type="submit" disabled={pending || photos.length >= MAX_PROFILE_PHOTOS}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.Id}
              className="overflow-hidden rounded-xl border border-border/70 bg-card"
            >
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
                {photo.IsPrimary ? (
                  <Badge className="absolute top-2 left-2">Primary</Badge>
                ) : null}
                {photo.ModerationStatus &&
                photo.ModerationStatus !== "approved" ? (
                  <Badge
                    variant="outline"
                    className="absolute top-2 right-2 capitalize"
                  >
                    {photo.ModerationStatus}
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {!photo.IsPrimary ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      startTransition(async () => {
                        await setPrimaryPhotoAction(photo.Id);
                        router.refresh();
                      })
                    }
                  >
                    Set primary
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      await deletePhotoAction(photo.Id);
                      router.refresh();
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

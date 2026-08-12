import "server-only";

import { randomUUID } from "crypto";

import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PROFILE_PHOTOS,
  PHOTO_BUCKET,
} from "@/lib/constants/privacy";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfilePhoto = {
  Id: string;
  UserId: string;
  StoragePath: string;
  FileName: string;
  FileType: string;
  FileSizeBytes: number | null;
  IsPrimary: boolean;
  SortOrder: number;
  ModerationStatus: string;
  SignedUrl?: string | null;
};

function extensionForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function listUserPhotos(
  userId: string,
  options?: { withSignedUrls?: boolean; approvedOnly?: boolean },
): Promise<ProfilePhoto[]> {
  const admin = createAdminClient();
  let query = admin
    .from("AMVS_ProfilePhotos")
    .select("*")
    .eq("UserId", userId)
    .order("IsPrimary", { ascending: false })
    .order("SortOrder", { ascending: true })
    .order("CreatedAt", { ascending: true });

  if (options?.approvedOnly) {
    query = query.eq("ModerationStatus", "approved");
  }

  const { data, error } = await query;

  if (error) throw error;

  const photos = (data ?? []) as ProfilePhoto[];
  if (!options?.withSignedUrls) return photos;

  return Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      SignedUrl: await createPhotoSignedUrl(photo.StoragePath),
    })),
  );
}

export async function createPhotoSignedUrl(
  storagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function getPrimaryPhotoUrl(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("AMVS_ProfilePhotos")
    .select("StoragePath")
    .eq("UserId", userId)
    .eq("IsPrimary", true)
    .eq("ModerationStatus", "approved")
    .maybeSingle();

  const path =
    data?.StoragePath ??
    (
      await admin
        .from("AMVS_ProfilePhotos")
        .select("StoragePath")
        .eq("UserId", userId)
        .eq("ModerationStatus", "approved")
        .order("SortOrder", { ascending: true })
        .limit(1)
        .maybeSingle()
    ).data?.StoragePath;

  if (!path) return null;
  return createPhotoSignedUrl(path);
}

export async function uploadProfilePhoto(userId: string, file: File) {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Photo must be 5 MB or smaller.");
  }

  const admin = createAdminClient();
  const existing = await listUserPhotos(userId);
  if (existing.length >= MAX_PROFILE_PHOTOS) {
    throw new Error(`You can upload up to ${MAX_PROFILE_PHOTOS} photos.`);
  }

  const photoId = randomUUID();
  const ext = extensionForMime(file.type);
  const storagePath = `profiles/${userId}/photos/${photoId}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const isPrimary = existing.length === 0;
  const sortOrder =
    existing.reduce((max, photo) => Math.max(max, photo.SortOrder), -1) + 1;

  const { data, error } = await admin
    .from("AMVS_ProfilePhotos")
    .insert({
      Id: photoId,
      UserId: userId,
      StoragePath: storagePath,
      FileName: file.name || `${photoId}.${ext}`,
      FileType: file.type,
      FileSizeBytes: file.size,
      IsPrimary: isPrimary,
      SortOrder: sortOrder,
      ModerationStatus: "pending",
    })
    .select("*")
    .single();

  if (error) {
    await admin.storage.from(PHOTO_BUCKET).remove([storagePath]);
    throw error;
  }

  return data as ProfilePhoto;
}

export async function deleteProfilePhoto(userId: string, photoId: string) {
  const admin = createAdminClient();
  const { data: photo, error } = await admin
    .from("AMVS_ProfilePhotos")
    .select("*")
    .eq("Id", photoId)
    .eq("UserId", userId)
    .maybeSingle();

  if (error) throw error;
  if (!photo) throw new Error("Photo not found.");

  const { error: deleteError } = await admin
    .from("AMVS_ProfilePhotos")
    .delete()
    .eq("Id", photoId)
    .eq("UserId", userId);
  if (deleteError) throw deleteError;

  await admin.storage.from(PHOTO_BUCKET).remove([photo.StoragePath]);

  if (photo.IsPrimary) {
    const remaining = await listUserPhotos(userId);
    if (remaining[0]) {
      await setPrimaryPhoto(userId, remaining[0].Id);
    }
  }
}

export async function setPrimaryPhoto(userId: string, photoId: string) {
  const admin = createAdminClient();
  const { data: photo, error } = await admin
    .from("AMVS_ProfilePhotos")
    .select("Id")
    .eq("Id", photoId)
    .eq("UserId", userId)
    .maybeSingle();

  if (error) throw error;
  if (!photo) throw new Error("Photo not found.");

  await admin
    .from("AMVS_ProfilePhotos")
    .update({ IsPrimary: false })
    .eq("UserId", userId);

  const { error: primaryError } = await admin
    .from("AMVS_ProfilePhotos")
    .update({ IsPrimary: true })
    .eq("Id", photoId)
    .eq("UserId", userId);

  if (primaryError) throw primaryError;
}

export async function reorderPhotos(userId: string, orderedIds: string[]) {
  const admin = createAdminClient();
  const photos = await listUserPhotos(userId);
  const owned = new Set(photos.map((photo) => photo.Id));

  if (orderedIds.some((id) => !owned.has(id))) {
    throw new Error("Invalid photo order.");
  }

  await Promise.all(
    orderedIds.map((id, index) =>
      admin
        .from("AMVS_ProfilePhotos")
        .update({ SortOrder: index })
        .eq("Id", id)
        .eq("UserId", userId),
    ),
  );
}

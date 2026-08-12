import "server-only";

import { randomUUID } from "crypto";

import {
  ALLOWED_KUNDLI_TYPES,
  KUNDLI_BUCKET,
  MAX_KUNDLI_BYTES,
  MAX_KUNDLI_FILES,
} from "@/lib/constants/horoscope";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HoroscopeInput } from "@/lib/validations/horoscope";

export type HoroscopeRow = {
  Id?: string;
  UserId?: string;
  BirthDate: string | null;
  BirthTime: string | null;
  BirthPlace: string | null;
  BirthCity: string | null;
  BirthState: string | null;
  BirthCountry: string | null;
  Rashi: string | null;
  Nakshatra: string | null;
  NakshatraPada: number | null;
  Lagna: string | null;
  ManglikStatus: string | null;
  Nadi: string | null;
  Gan: string | null;
  Gotra: string | null;
  Kuldevi: string | null;
  Kuldevta: string | null;
  Veda: string | null;
  Charan: string | null;
  Notes: string | null;
};

export type KundliDocument = {
  Id: string;
  UserId: string;
  StoragePath: string;
  FileName: string;
  FileType: string;
  FileSizeBytes: number | null;
  IsPrivate: boolean;
  SignedUrl?: string | null;
};

export function hasHoroscopeData(row: Record<string, unknown> | null | undefined) {
  if (!row) return false;
  return Object.entries(row).some(([key, value]) => {
    if (["Id", "UserId", "CreatedAt", "UpdatedAt"].includes(key)) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return value != null;
  });
}

export async function getHoroscope(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Horoscope")
    .select("*")
    .eq("UserId", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as HoroscopeRow | null) ?? null;
}

export async function upsertHoroscope(userId: string, input: HoroscopeInput) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_Horoscope")
    .upsert(
      {
        UserId: userId,
        BirthDate: input.birthDate,
        BirthTime: input.birthTime,
        BirthPlace: input.birthPlace,
        BirthCity: input.birthCity,
        BirthState: input.birthState,
        BirthCountry: input.birthCountry,
        Rashi: input.rashi,
        Nakshatra: input.nakshatra,
        NakshatraPada: input.nakshatraPada,
        Lagna: input.lagna,
        ManglikStatus: input.manglikStatus,
        Nadi: input.nadi,
        Gan: input.gan,
        Gotra: input.gotra,
        Kuldevi: input.kuldevi,
        Kuldevta: input.kuldevta,
        Veda: input.veda,
        Charan: input.charan,
        Notes: input.notes,
      },
      { onConflict: "UserId" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as HoroscopeRow;
}

export async function listKundliDocuments(
  userId: string,
  options?: { withSignedUrls?: boolean },
): Promise<KundliDocument[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_KundliDocuments")
    .select("*")
    .eq("UserId", userId)
    .order("CreatedAt", { ascending: false });
  if (error) throw error;

  const docs = (data ?? []) as KundliDocument[];
  if (!options?.withSignedUrls) return docs;

  return Promise.all(
    docs.map(async (doc) => ({
      ...doc,
      SignedUrl: await createKundliSignedUrl(doc.StoragePath),
    })),
  );
}

export async function createKundliSignedUrl(
  storagePath: string,
  expiresInSeconds = 60 * 30,
) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(KUNDLI_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadKundliDocument(userId: string, file: File) {
  if (!ALLOWED_KUNDLI_TYPES.includes(file.type as (typeof ALLOWED_KUNDLI_TYPES)[number])) {
    throw new Error("Kundli must be PDF, JPG, or PNG.");
  }
  if (file.size <= 0 || file.size > MAX_KUNDLI_BYTES) {
    throw new Error("Kundli file must be under 10 MB.");
  }

  const admin = createAdminClient();
  const existing = await listKundliDocuments(userId);
  if (existing.length >= MAX_KUNDLI_FILES) {
    throw new Error(`You can upload up to ${MAX_KUNDLI_FILES} Kundli files.`);
  }

  const id = randomUUID();
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/png"
        ? "png"
        : "jpg";
  const path = `kundli/${userId}/${id}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(KUNDLI_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await admin
    .from("AMVS_KundliDocuments")
    .insert({
      Id: id,
      UserId: userId,
      StoragePath: path,
      FileName: file.name.slice(0, 180),
      FileType: file.type,
      FileSizeBytes: file.size,
      IsPrivate: true,
    })
    .select("*")
    .single();

  if (error) {
    await admin.storage.from(KUNDLI_BUCKET).remove([path]);
    throw error;
  }

  return data as KundliDocument;
}

export async function deleteKundliDocument(userId: string, documentId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("AMVS_KundliDocuments")
    .select("*")
    .eq("Id", documentId)
    .eq("UserId", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Kundli document not found.");

  await admin.storage.from(KUNDLI_BUCKET).remove([data.StoragePath as string]);
  const { error: deleteError } = await admin
    .from("AMVS_KundliDocuments")
    .delete()
    .eq("Id", documentId)
    .eq("UserId", userId);
  if (deleteError) throw deleteError;
}

export async function getPublicHoroscopeForViewer(options: {
  ownerUserId: string;
  viewerUserId: string;
  showHoroscope: boolean;
  showKundli: boolean;
}) {
  const isOwner = options.ownerUserId === options.viewerUserId;
  const horoscope =
    isOwner || options.showHoroscope
      ? await getHoroscope(options.ownerUserId).catch(() => null)
      : null;

  const kundli =
    isOwner || options.showKundli
      ? await listKundliDocuments(options.ownerUserId, {
          withSignedUrls: true,
        }).catch(() => [])
      : [];

  return {
    horoscope: isOwner || options.showHoroscope ? horoscope : null,
    kundliDocuments: isOwner || options.showKundli ? kundli : [],
  };
}

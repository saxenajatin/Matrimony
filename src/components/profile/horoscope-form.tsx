"use client";

import { useActionState } from "react";

import { AuthFormMessage } from "@/components/auth/auth-form-message";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/profile/form-fields";
import { Button } from "@/components/ui/button";
import {
  MANGLIK_OPTIONS,
  NAKSHATRA_OPTIONS,
  RASHI_OPTIONS,
} from "@/lib/constants/horoscope";
import {
  deleteKundliAction,
  saveHoroscopeAction,
  uploadKundliAction,
  type HoroscopeActionState,
} from "@/lib/profile/horoscope-actions";
import type { KundliDocument } from "@/lib/services/horoscope.service";

type HoroscopeFormProps = {
  values: Record<string, unknown> | null;
  kundliDocuments: KundliDocument[];
  showSkip?: boolean;
  onSkip?: () => void;
};

function str(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

const initial: HoroscopeActionState = {};

export function HoroscopeForm({
  values,
  kundliDocuments,
  showSkip,
  onSkip,
}: HoroscopeFormProps) {
  const [state, action, pending] = useActionState(saveHoroscopeAction, initial);
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadKundliAction,
    initial,
  );

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Horoscope and Kundli are optional. Leave blank if this does not apply
          to you.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="birthDate"
            label="Birth date"
            type="date"
            defaultValue={str(values?.BirthDate)}
          />
          <TextField
            name="birthTime"
            label="Birth time"
            type="time"
            defaultValue={str(values?.BirthTime)?.slice(0, 5)}
          />
          <TextField
            name="birthPlace"
            label="Birth place"
            defaultValue={str(values?.BirthPlace)}
          />
          <TextField
            name="birthCity"
            label="Birth city"
            defaultValue={str(values?.BirthCity)}
          />
          <TextField
            name="birthState"
            label="Birth state"
            defaultValue={str(values?.BirthState)}
          />
          <TextField
            name="birthCountry"
            label="Birth country"
            defaultValue={str(values?.BirthCountry)}
          />
          <SelectField
            name="rashi"
            label="Rashi"
            options={RASHI_OPTIONS}
            defaultValue={str(values?.Rashi)}
          />
          <SelectField
            name="nakshatra"
            label="Nakshatra"
            options={NAKSHATRA_OPTIONS}
            defaultValue={str(values?.Nakshatra)}
          />
          <TextField
            name="nakshatraPada"
            label="Nakshatra pada (1-4)"
            type="number"
            defaultValue={str(values?.NakshatraPada)}
          />
          <TextField
            name="lagna"
            label="Lagna"
            defaultValue={str(values?.Lagna)}
          />
          <SelectField
            name="manglikStatus"
            label="Manglik"
            options={MANGLIK_OPTIONS}
            defaultValue={str(values?.ManglikStatus)}
          />
          <TextField name="nadi" label="Nadi" defaultValue={str(values?.Nadi)} />
          <TextField name="gan" label="Gan" defaultValue={str(values?.Gan)} />
          <TextField
            name="gotra"
            label="Gotra"
            defaultValue={str(values?.Gotra)}
          />
          <TextField
            name="kuldevi"
            label="Kuldevi"
            defaultValue={str(values?.Kuldevi)}
          />
          <TextField
            name="kuldevta"
            label="Kuldevta"
            defaultValue={str(values?.Kuldevta)}
          />
          <TextField name="veda" label="Veda" defaultValue={str(values?.Veda)} />
          <TextField
            name="charan"
            label="Charan"
            defaultValue={str(values?.Charan)}
          />
        </div>
        <TextAreaField
          name="notes"
          label="Notes"
          defaultValue={str(values?.Notes)}
        />
        <AuthFormMessage error={state.error} success={state.success} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save horoscope"}
          </Button>
          {showSkip && onSkip ? (
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <div>
          <h3 className="font-heading text-lg font-semibold">Kundli documents</h3>
          <p className="text-sm text-muted-foreground">
            Optional PDF/JPG/PNG. Private by default — enable Show Kundli in
            Privacy to share.
          </p>
        </div>
        <form action={uploadAction} className="space-y-3">
          <input
            type="file"
            name="kundli"
            accept=".pdf,image/jpeg,image/png,application/pdf"
            className="block w-full text-sm"
          />
          <AuthFormMessage
            error={uploadState.error}
            success={uploadState.success}
          />
          <Button type="submit" size="sm" variant="outline" disabled={uploadPending}>
            {uploadPending ? "Uploading..." : "Upload Kundli"}
          </Button>
        </form>

        <ul className="space-y-2">
          {kundliDocuments.map((doc) => (
            <li
              key={doc.Id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{doc.FileName}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.FileType} · private by default
                </p>
              </div>
              <div className="flex gap-2">
                {doc.SignedUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={doc.SignedUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </Button>
                ) : null}
                <form action={deleteKundliAction.bind(null, doc.Id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
          {kundliDocuments.length === 0 ? (
            <li className="text-sm text-muted-foreground">No Kundli uploaded.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

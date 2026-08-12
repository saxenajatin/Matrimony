import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProfileInteractionPanel } from "@/components/profile/profile-interaction-panel";
import { MatchScoreCard } from "@/components/profile/match-score-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getDiscoverProfileById,
  getDiscoverProfileGallery,
} from "@/lib/services/discover.service";
import { getPublicHoroscopeForViewer } from "@/lib/services/horoscope.service";
import { getInteractionState } from "@/lib/services/interaction.service";
import { getMatchScoreForProfile } from "@/lib/services/match.service";
import { getPrivacySettings } from "@/lib/services/privacy.service";
import {
  formatManglik,
  formatNakshatra,
  formatRashi,
} from "@/lib/utils/horoscope-display";
import {
  formatHeight,
  formatMaritalStatus,
} from "@/lib/utils/profile-display";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

type ProfileDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProfileDetailPage({
  params,
}: ProfileDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/profiles");
  }

  const { id } = await params;

  let profile = null;
  try {
    profile = await getDiscoverProfileById({
      profileId: id,
      viewerUserId: user.id,
    });
  } catch {
    profile = null;
  }

  if (!profile) {
    notFound();
  }

  let gallery: { Id: string; SignedUrl?: string | null }[] = [];
  let interaction = null;
  let matchScore = null;
  let horoscope: Awaited<
    ReturnType<typeof getPublicHoroscopeForViewer>
  >["horoscope"] = null;
  let kundliDocuments: Awaited<
    ReturnType<typeof getPublicHoroscopeForViewer>
  >["kundliDocuments"] = [];

  if (profile.UserId) {
    try {
      const privacy = await getPrivacySettings(profile.UserId);
      [gallery, interaction, matchScore, { horoscope, kundliDocuments }] =
        await Promise.all([
          getDiscoverProfileGallery(profile.UserId),
          getInteractionState(user.id, profile.UserId),
          getMatchScoreForProfile({
            viewerUserId: user.id,
            candidateUserId: profile.UserId,
          }),
          getPublicHoroscopeForViewer({
            ownerUserId: profile.UserId,
            viewerUserId: user.id,
            showHoroscope: privacy.ShowHoroscope,
            showKundli: privacy.ShowKundli,
          }),
        ]);
    } catch {
      gallery = [];
      interaction = await getInteractionState(user.id, profile.UserId).catch(
        () => null,
      );
      matchScore = await getMatchScoreForProfile({
        viewerUserId: user.id,
        candidateUserId: profile.UserId,
      }).catch(() => null);
    }
  }

  const location = [profile.City, profile.State, profile.Country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/profiles">Back to Discover</Link>
      </Button>

      {gallery.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {gallery.map((photo) =>
            photo.SignedUrl ? (
              <div
                key={photo.Id}
                className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted"
              >
                <Image
                  src={photo.SignedUrl}
                  alt={profile.DisplayName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null,
          )}
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-heading text-3xl">
              {profile.DisplayName}
            </CardTitle>
            {profile.IsVerified ? <Badge>Verified</Badge> : null}
          </div>
          <CardDescription>
            {profile.Age} yrs · {formatMaritalStatus(profile.MaritalStatus)}
            {formatHeight(profile.HeightCm)
              ? ` · ${formatHeight(profile.HeightCm)}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {location ? <p>Location: {location}</p> : null}
          {profile.Religion ? <p>Religion: {profile.Religion}</p> : null}
          {profile.MotherTongue ? (
            <p>Mother tongue: {profile.MotherTongue}</p>
          ) : null}
          {profile.Education ? <p>Education: {profile.Education}</p> : null}
          {profile.Occupation ? <p>Occupation: {profile.Occupation}</p> : null}
          {profile.AboutMe ? (
            <div className="space-y-1">
              <p className="font-medium">About</p>
              <p className="leading-relaxed text-muted-foreground">
                {profile.AboutMe}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {matchScore ? <MatchScoreCard score={matchScore} /> : null}

      {horoscope ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Horoscope</CardTitle>
            <CardDescription>Shared by this member</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {formatRashi(horoscope.Rashi) ? (
              <p>Rashi: {formatRashi(horoscope.Rashi)}</p>
            ) : null}
            {formatNakshatra(horoscope.Nakshatra) ? (
              <p>Nakshatra: {formatNakshatra(horoscope.Nakshatra)}</p>
            ) : null}
            {horoscope.NakshatraPada != null ? (
              <p>Pada: {String(horoscope.NakshatraPada)}</p>
            ) : null}
            {horoscope.Lagna ? <p>Lagna: {horoscope.Lagna}</p> : null}
            {formatManglik(horoscope.ManglikStatus) ? (
              <p>Manglik: {formatManglik(horoscope.ManglikStatus)}</p>
            ) : null}
            {horoscope.Gotra ? <p>Gotra: {horoscope.Gotra}</p> : null}
            {horoscope.Nadi ? <p>Nadi: {horoscope.Nadi}</p> : null}
            {horoscope.Gan ? <p>Gan: {horoscope.Gan}</p> : null}
            {horoscope.BirthPlace ? (
              <p>Birth place: {horoscope.BirthPlace}</p>
            ) : null}
            {[horoscope.BirthCity, horoscope.BirthState, horoscope.BirthCountry]
              .filter(Boolean)
              .length > 0 ? (
              <p>
                Birth location:{" "}
                {[
                  horoscope.BirthCity,
                  horoscope.BirthState,
                  horoscope.BirthCountry,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {kundliDocuments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Kundli</CardTitle>
            <CardDescription>Documents shared by this member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {kundliDocuments.map((doc) =>
              doc.SignedUrl ? (
                <Button key={doc.Id} asChild size="sm" variant="outline">
                  <a href={doc.SignedUrl} target="_blank" rel="noreferrer">
                    View {doc.FileName}
                  </a>
                </Button>
              ) : null,
            )}
          </CardContent>
        </Card>
      ) : null}

      {profile.UserId && interaction ? (
        <ProfileInteractionPanel
          profileId={profile.Id}
          targetUserId={profile.UserId}
          displayName={profile.DisplayName}
          state={interaction}
        />
      ) : null}
    </div>
  );
}

import { BadgeCheck, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DiscoverProfile } from "@/lib/types/discover";
import {
  formatHeight,
  formatMaritalStatus,
} from "@/lib/utils/profile-display";

type ProfileCardProps = {
  profile: DiscoverProfile;
  matchScore?: number;
};

export function ProfileCard({ profile, matchScore }: ProfileCardProps) {
  const location = [profile.City, profile.State].filter(Boolean).join(", ");
  const height = formatHeight(profile.HeightCm);

  return (
    <Card className="h-full overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted">
        {profile.PrimaryPhotoUrl ? (
          <Image
            src={profile.PrimaryPhotoUrl}
            alt={profile.DisplayName}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No photo
          </div>
        )}
        {typeof matchScore === "number" ? (
          <div className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-primary shadow-sm">
            {matchScore}% match
          </div>
        ) : null}
      </div>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-heading text-xl">
            <Link
              href={`/profiles/${profile.Id}`}
              className="hover:text-primary"
            >
              {profile.DisplayName}
            </Link>
          </CardTitle>
          {profile.IsVerified ? (
            <Badge variant="secondary" className="gap-1">
              <BadgeCheck className="size-3.5" />
              Verified
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          {profile.Age} yrs · {formatMaritalStatus(profile.MaritalStatus)}
          {height ? ` · ${height}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {location ? (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {location}
            {profile.Country ? `, ${profile.Country}` : ""}
          </p>
        ) : null}
        <div className="space-y-1 text-foreground/90">
          {profile.Religion ? <p>Religion: {profile.Religion}</p> : null}
          {profile.MotherTongue ? (
            <p>Mother tongue: {profile.MotherTongue}</p>
          ) : null}
          {profile.Education ? <p>Education: {profile.Education}</p> : null}
          {profile.Occupation ? <p>Occupation: {profile.Occupation}</p> : null}
        </div>
        {profile.AboutMe ? (
          <p className="line-clamp-3 text-muted-foreground">{profile.AboutMe}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

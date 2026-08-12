import type { Metadata } from "next";
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
import { getCurrentUser } from "@/lib/auth/session";
import { getMyProfileBundle } from "@/lib/services/profile.service";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  let completion = 0;
  let photoCount = 0;
  try {
    const bundle = await getMyProfileBundle(user.id);
    completion = bundle.completion.total;
    photoCount = bundle.photos.length;
  } catch {
    completion = 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account, photos, and privacy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Current completion: {completion}%. Edit details anytime through
            onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/onboarding">Edit profile</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>
            {photoCount} photo{photoCount === 1 ? "" : "s"} uploaded. Set a
            primary photo for Discover.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/photos">Manage photos</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Phone, email, income, caste, children, and Kundli are private by
            default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/privacy">Privacy settings</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horoscope & Kundli</CardTitle>
          <CardDescription>
            Optional. Private by default — control visibility in Privacy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/horoscope">Manage horoscope</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blocked members</CardTitle>
          <CardDescription>
            Manage members you have blocked from Discover and contact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/blocked">Manage blocks</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

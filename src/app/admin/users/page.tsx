import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  activateUserAction,
  suspendUserAction,
  unverifyProfileAction,
  verifyProfileAction,
} from "@/lib/admin/actions";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { listAdminUsers } from "@/lib/services/admin.service";

export const metadata: Metadata = {
  title: "Admin · Users",
  robots: { index: false, follow: false },
};

type AdminUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/users");
  if (!isAdmin(user)) redirect("/dashboard");

  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;

  let users: Awaited<ReturnType<typeof listAdminUsers>> = [];
  let loadError: string | null = null;
  try {
    users = await listAdminUsers({ q: q || undefined, limit: 50 });
  } catch {
    loadError = "Could not load users.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Users</h1>
        <p className="mt-1 text-muted-foreground">
          Search, suspend/activate accounts, and manage verification badges.
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <Input
          name="q"
          placeholder="Search username, email, or name"
          defaultValue={q ?? ""}
          className="max-w-sm"
        />
        <Button type="submit" size="sm">
          Search
        </Button>
        {q ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/users">Clear</Link>
          </Button>
        ) : null}
      </form>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="space-y-3">
        {users.map((item) => (
          <Card key={item.Id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="font-heading text-lg">
                  {item.ProfileDisplayName || item.DisplayName || item.Username}
                </CardTitle>
                <CardDescription>
                  @{item.Username}
                  {item.Email ? ` · ${item.Email}` : ""} · completion{" "}
                  {item.ProfileCompletion}%
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={item.IsActive ? "secondary" : "outline"}>
                    {item.IsActive ? "Active" : "Suspended"}
                  </Badge>
                  {item.IsVerified ? <Badge>Verified</Badge> : null}
                  {item.ProfileStatus ? (
                    <Badge variant="outline">{item.ProfileStatus}</Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {item.ProfileId ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/profiles/${item.ProfileId}`}>View</Link>
                  </Button>
                ) : null}
                {item.IsActive ? (
                  <form action={suspendUserAction.bind(null, item.Id)}>
                    <Button type="submit" size="sm" variant="destructive">
                      Suspend
                    </Button>
                  </form>
                ) : (
                  <form action={activateUserAction.bind(null, item.Id)}>
                    <Button type="submit" size="sm">
                      Activate
                    </Button>
                  </form>
                )}
                {item.ProfileId && !item.IsVerified ? (
                  <form action={verifyProfileAction.bind(null, item.ProfileId)}>
                    <Button type="submit" size="sm" variant="secondary">
                      Verify
                    </Button>
                  </form>
                ) : null}
                {item.ProfileId && item.IsVerified ? (
                  <form
                    action={unverifyProfileAction.bind(null, item.ProfileId)}
                  >
                    <Button type="submit" size="sm" variant="ghost">
                      Remove badge
                    </Button>
                  </form>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Joined {new Date(item.CreatedAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
        {!loadError && users.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        ) : null}
      </div>
    </div>
  );
}

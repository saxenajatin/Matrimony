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
import {
  createVerificationAction,
  reviewVerificationAction,
  verifyProfileAction,
} from "@/lib/admin/actions";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { VERIFICATION_TYPES } from "@/lib/constants/admin";
import {
  listProfilesNeedingVerification,
  listVerifications,
} from "@/lib/services/admin.service";

export const metadata: Metadata = {
  title: "Admin · Verification",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminVerificationPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/verification");
  if (!isAdmin(user)) redirect("/dashboard");

  const params = await searchParams;
  const statusRaw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status =
    statusRaw === "verified" ||
    statusRaw === "rejected" ||
    statusRaw === "expired" ||
    statusRaw === "pending"
      ? statusRaw
      : undefined;

  let queue: Awaited<ReturnType<typeof listProfilesNeedingVerification>> = [];
  let requests: Awaited<ReturnType<typeof listVerifications>> = [];
  let loadError: string | null = null;

  try {
    [queue, requests] = await Promise.all([
      listProfilesNeedingVerification(),
      listVerifications({ status }),
    ]);
  } catch {
    loadError =
      "Verification tables are not ready. Run scripts/amvs-phase9-admin.sql.";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Verification</h1>
        <p className="mt-1 text-muted-foreground">
          Review profile verification and issue verified badges carefully.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">
          Profiles ready for review
        </h2>
        {queue.length === 0 && !loadError ? (
          <p className="text-sm text-muted-foreground">
            No unverified active profiles above 40% completion.
          </p>
        ) : null}
        {queue.map((item) => (
          <Card key={item.ProfileId}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="font-heading text-lg">
                  {item.DisplayName}
                </CardTitle>
                <CardDescription>
                  @{item.Username ?? "member"} · completion{" "}
                  {item.ProfileCompletion}%
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/profiles/${item.ProfileId}`}>View</Link>
                </Button>
                <form action={verifyProfileAction.bind(null, item.ProfileId)}>
                  <Button type="submit" size="sm">
                    Verify profile
                  </Button>
                </form>
                <form action={createVerificationAction} className="flex gap-2">
                  <input type="hidden" name="profileId" value={item.ProfileId} />
                  <input type="hidden" name="userId" value={item.UserId} />
                  <select
                    name="verificationType"
                    defaultValue="identity"
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  >
                    {VERIFICATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="secondary">
                    Queue check
                  </Button>
                </form>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl font-semibold">
            Verification requests
          </h2>
          <div className="flex gap-2">
            {(["pending", "verified", "rejected"] as const).map((item) => (
              <Button
                key={item}
                asChild
                size="sm"
                variant={status === item || (!status && item === "pending") ? "default" : "outline"}
              >
                <Link href={`/admin/verification?status=${item}`}>{item}</Link>
              </Button>
            ))}
          </div>
        </div>

        {requests.map((item) => (
          <Card key={item.Id}>
            <CardHeader>
              <CardTitle className="font-heading text-lg capitalize">
                {item.DisplayName ?? "Member"} · {item.VerificationType}
              </CardTitle>
              <CardDescription className="capitalize">
                Status: {item.Status} · @{item.Username ?? "member"} ·{" "}
                {new Date(item.CreatedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.Notes ? (
                <p className="text-sm text-muted-foreground">{item.Notes}</p>
              ) : null}
              {item.Status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  <form action={reviewVerificationAction}>
                    <input type="hidden" name="verificationId" value={item.Id} />
                    <input type="hidden" name="status" value="verified" />
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={reviewVerificationAction} className="flex gap-2">
                    <input type="hidden" name="verificationId" value={item.Id} />
                    <input type="hidden" name="status" value="rejected" />
                    <InputLikeRejection />
                    <Button type="submit" size="sm" variant="outline">
                      Reject
                    </Button>
                  </form>
                </div>
              ) : (
                <Badge variant="outline" className="capitalize">
                  {item.Status}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}

        {!loadError && requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests in this filter.</p>
        ) : null}
      </section>
    </div>
  );
}

function InputLikeRejection() {
  return (
    <input
      name="rejectionReason"
      placeholder="Rejection reason"
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
    />
  );
}

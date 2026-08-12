import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { resolveReportFormAction } from "@/lib/profile/interaction-actions";
import { listReportsForAdmin } from "@/lib/services/interaction.service";
import { REPORT_REASON_OPTIONS } from "@/lib/constants/interactions";

export const metadata: Metadata = {
  title: "Admin · Reports",
  robots: { index: false, follow: false },
};

function reasonLabel(code: string) {
  return (
    REPORT_REASON_OPTIONS.find((item) => item.value === code)?.label ?? code
  );
}

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/reports");
  if (!isAdmin(user)) redirect("/dashboard");

  let reports: Awaited<ReturnType<typeof listReportsForAdmin>> = [];
  let loadError: string | null = null;

  try {
    reports = await listReportsForAdmin();
  } catch {
    loadError =
      "Reports table is not ready. Run scripts/amvs-phase5-interactions.sql.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Reports</h1>
        <p className="mt-1 text-muted-foreground">
          Review member reports submitted from profile pages.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && reports.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No reports yet.
        </div>
      ) : null}

      <div className="space-y-3">
        {reports.map((report) => (
          <Card key={report.Id}>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                {report.ReportedName ?? "Member"} · {reasonLabel(report.ReasonCode)}
              </CardTitle>
              <CardDescription className="capitalize">
                Status: {report.Status} · Reported by{" "}
                {report.ReporterName ?? "member"} ·{" "}
                {new Date(report.CreatedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.Details ? (
                <p className="text-sm text-muted-foreground">{report.Details}</p>
              ) : null}
              {report.Status === "open" || report.Status === "reviewing" ? (
                <form action={resolveReportFormAction} className="space-y-2">
                  <input type="hidden" name="reportId" value={report.Id} />
                  <select
                    name="status"
                    defaultValue="resolved"
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="reviewing">Mark reviewing</option>
                    <option value="resolved">Resolve</option>
                    <option value="dismissed">Dismiss</option>
                  </select>
                  <Textarea
                    name="resolutionNotes"
                    placeholder="Resolution notes (optional)"
                    maxLength={1000}
                  />
                  <Button type="submit" size="sm">
                    Update report
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {report.ResolutionNotes || "Closed"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

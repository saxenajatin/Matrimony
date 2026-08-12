import type { MatchScoreResult } from "@/lib/services/match-score";

type MatchScoreCardProps = {
  score: MatchScoreResult;
  compact?: boolean;
};

export function MatchScoreCard({ score, compact = false }: MatchScoreCardProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-heading text-3xl font-semibold text-primary">
            {score.matchScore}% Match
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Preference fit only — not a guarantee of marriage compatibility.
          </p>
        </div>
        {!score.hasActivePreferences ? (
          <p className="text-xs text-muted-foreground">
            Add partner preferences for sharper recommendations.
          </p>
        ) : null}
      </div>

      {!compact ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {score.dimensions.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-1.5 text-sm"
            >
              <span>
                {item.status === "matched"
                  ? "✓"
                  : item.status === "unmatched"
                    ? "✕"
                    : "–"}{" "}
                {item.label}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 text-xs">
          {score.matchedPreferences.slice(0, 4).map((item) => (
            <span
              key={item.key}
              className="rounded-md bg-primary/10 px-2 py-1 text-primary"
            >
              ✓ {item.label}
            </span>
          ))}
          {score.unmatchedPreferences.slice(0, 2).map((item) => (
            <span
              key={item.key}
              className="rounded-md bg-muted px-2 py-1 text-muted-foreground"
            >
              ✕ {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

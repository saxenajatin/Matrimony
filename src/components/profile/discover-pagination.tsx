import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  discoverFiltersToQuery,
  type DiscoverFilters,
} from "@/lib/validations/discover";

type DiscoverPaginationProps = {
  filters: DiscoverFilters;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

export function DiscoverPagination({
  filters,
  page,
  totalPages,
  total,
  pageSize,
}: DiscoverPaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const prevHref =
    page > 1
      ? `/profiles?${discoverFiltersToQuery(filters, { page: page - 1 })}`
      : null;
  const nextHref =
    page < totalPages
      ? `/profiles?${discoverFiltersToQuery(filters, { page: page + 1 })}`
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Button asChild variant="outline" size="sm">
            <Link href={prevHref}>Previous</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        {nextHref ? (
          <Button asChild variant="outline" size="sm">
            <Link href={nextHref}>Next</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

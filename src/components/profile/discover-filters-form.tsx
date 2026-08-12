import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
} from "@/lib/constants/profile";
import {
  countActiveDiscoverFilters,
  type DiscoverFilters,
} from "@/lib/validations/discover";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type DiscoverFiltersFormProps = {
  filters: DiscoverFilters;
};

export function DiscoverFiltersForm({ filters }: DiscoverFiltersFormProps) {
  const activeCount = countActiveDiscoverFilters(filters);

  return (
    <form
      method="get"
      action="/profiles"
      className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Search & filters</h2>
          <p className="text-sm text-muted-foreground">
            {activeCount > 0
              ? `${activeCount} filter${activeCount === 1 ? "" : "s"} active`
              : "Browse by location, age, community, and more"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeCount > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/profiles">Clear</Link>
            </Button>
          ) : null}
          <Button type="submit" size="sm">
            Apply
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            placeholder="Name, city, education, occupation"
            defaultValue={filters.q ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            name="gender"
            defaultValue={filters.gender ?? ""}
            className={selectClassName}
          >
            <option value="">Any</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maritalStatus">Marital status</Label>
          <select
            id="maritalStatus"
            name="maritalStatus"
            defaultValue={filters.maritalStatus ?? ""}
            className={selectClassName}
          >
            <option value="">Any</option>
            {MARITAL_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ageMin">Age from</Label>
          <Input
            id="ageMin"
            name="ageMin"
            type="number"
            min={18}
            max={80}
            placeholder="18"
            defaultValue={filters.ageMin ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ageMax">Age to</Label>
          <Input
            id="ageMax"
            name="ageMax"
            type="number"
            min={18}
            max={80}
            placeholder="50"
            defaultValue={filters.ageMax ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            placeholder="e.g. Ahmedabad"
            defaultValue={filters.city ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            placeholder="e.g. Gujarat"
            defaultValue={filters.state ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            placeholder="India"
            defaultValue={filters.country ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="religion">Religion</Label>
          <Input
            id="religion"
            name="religion"
            placeholder="Optional"
            defaultValue={filters.religion ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="motherTongue">Mother tongue</Label>
          <Input
            id="motherTongue"
            name="motherTongue"
            placeholder="Optional"
            defaultValue={filters.motherTongue ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="education">Education</Label>
          <Input
            id="education"
            name="education"
            placeholder="e.g. MBA"
            defaultValue={filters.education ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="heightMin">Height from (cm)</Label>
          <Input
            id="heightMin"
            name="heightMin"
            type="number"
            min={120}
            max={230}
            placeholder="150"
            defaultValue={filters.heightMin ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="heightMax">Height to (cm)</Label>
          <Input
            id="heightMax"
            name="heightMax"
            type="number"
            min={120}
            max={230}
            placeholder="185"
            defaultValue={filters.heightMax ?? ""}
          />
        </div>

        <div className="flex items-end gap-2 pb-1">
          <input
            id="verifiedOnly"
            name="verifiedOnly"
            type="checkbox"
            value="1"
            defaultChecked={Boolean(filters.verifiedOnly)}
            className="size-4 rounded border border-input"
          />
          <Label htmlFor="verifiedOnly" className="font-normal">
            Verified only
          </Label>
        </div>
      </div>
    </form>
  );
}

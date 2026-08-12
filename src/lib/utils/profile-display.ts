export function formatHeight(heightCm: number | null | undefined): string | null {
  if (!heightCm || heightCm <= 0) return null;
  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}" / ${heightCm} cm`;
}

export function formatMaritalStatus(status: string): string {
  const map: Record<string, string> = {
    never_married: "Never Married",
    divorced: "Divorced",
    widowed: "Widowed",
    separated: "Separated",
    awaiting_divorce: "Awaiting Divorce",
  };
  return map[status] ?? status;
}

import { headers } from "next/headers";

import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const currentPath = headerList.get("x-pathname") ?? "/dashboard";

  return <AppShell currentPath={currentPath}>{children}</AppShell>;
}

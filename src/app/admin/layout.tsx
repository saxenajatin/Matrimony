import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/lib/auth/actions";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/analytics", label: "Analytics" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!isAdmin(user)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col bg-[color:var(--background)]">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-[color:var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="font-heading text-xl font-semibold text-primary"
            >
              MAU Admin
            </Link>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Signed in as {user.username}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/profiles">View site</Link>
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav aria-label="Admin" className="sticky top-20 space-y-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block min-h-10 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

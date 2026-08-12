import Link from "next/link";

import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

type SiteHeaderProps = {
  isAuthenticated?: boolean;
};

export function SiteHeader({ isAuthenticated = false }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-[color:var(--background)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-heading text-2xl font-semibold tracking-tight text-primary">
            MAU
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Matrimony
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/profiles">Discover</Link>
          </Button>

          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

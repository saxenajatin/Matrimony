import Link from "next/link";
import {
  Bell,
  Heart,
  Home,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const desktopNav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/profiles", label: "Discover", icon: Search },
  { href: "/matches", label: "Matches", icon: Sparkles },
  { href: "/interests", label: "Interests", icon: Heart },
  { href: "/shortlist", label: "Shortlist", icon: Star },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Profile", icon: UserRound },
] as const;

const mobileNav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/profiles", label: "Discover", icon: Search },
  { href: "/matches", label: "Matches", icon: Sparkles },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/settings", label: "Profile", icon: UserRound },
] as const;

type AppShellProps = {
  children: React.ReactNode;
  currentPath?: string;
};

export function AppShell({ children, currentPath = "" }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-[color:var(--background)]">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-[color:var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="font-heading text-xl font-semibold text-primary"
          >
            MAU
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav aria-label="Primary" className="sticky top-20 space-y-1">
            {desktopNav.map((item) => {
              const Icon = item.icon;
              const active = currentPath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-[color:var(--background)]/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 py-2">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = currentPath.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

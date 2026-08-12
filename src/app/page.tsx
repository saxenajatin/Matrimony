import Link from "next/link";
import { ShieldCheck, Lock, MessageSquareHeart, Flag } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  let isAuthenticated = false;

  try {
    const user = await getCurrentUser();
    isAuthenticated = Boolean(user);
  } catch {
    // Env/DB not ready — render public landing.
  }

  return (
    <>
      <SiteHeader isAuthenticated={isAuthenticated} />

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.92_0.04_12)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,oklch(0.93_0.05_85)_0%,transparent_50%),linear-gradient(180deg,oklch(0.985_0.01_70),oklch(0.97_0.015_70))]"
          />
          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <p className="font-heading text-5xl font-semibold tracking-tight text-primary sm:text-6xl">
                MAU
              </p>
              <h1 className="max-w-xl font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                Find Someone Who Shares Your Values
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                A privacy-first Indian matrimonial platform for families and
                individuals seeking a meaningful marriage match.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href={isAuthenticated ? "/dashboard" : "/register"}>
                    Create Your Profile
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/profiles">Browse Profiles</Link>
                </Button>
              </div>
            </div>

            <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-border/50 shadow-sm lg:min-h-[420px]">
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(145deg,oklch(0.45_0.12_18)_0%,oklch(0.55_0.08_30)_40%,oklch(0.75_0.08_85)_100%)]"
              />
              <div
                aria-hidden
                className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_35%),radial-gradient(circle_at_80%_70%,oklch(0.9_0.05_85)_0,transparent_40%)]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent p-6 text-white">
                <p className="font-heading text-2xl font-medium">
                  Built for Indian matrimony
                </p>
                <p className="mt-1 text-sm text-white/85">
                  Optional community details. Strong privacy. Family-friendly
                  by design.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-semibold text-foreground">
              How It Works
            </h2>
            <p className="mt-2 text-muted-foreground">
              Three simple steps — without forcing personal details you do not
              want to share.
            </p>
          </div>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Create your profile",
                body: "Share what matters — at your pace, with optional cultural details.",
              },
              {
                step: "2",
                title: "Discover compatible profiles",
                body: "Search and filter respectfully across communities in India and abroad.",
              },
              {
                step: "3",
                title: "Connect with the right person",
                body: "Express interest, connect when accepted, and chat securely.",
              },
            ].map((item) => (
              <li key={item.step} className="space-y-2">
                <p className="font-heading text-4xl text-primary/40">{item.step}</p>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border/60 bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-center font-heading text-3xl font-semibold">
              Trust & Safety
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ShieldCheck, label: "Profile verification" },
                { icon: Lock, label: "Privacy controls" },
                { icon: MessageSquareHeart, label: "Secure communication" },
                { icon: Flag, label: "Report and block" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-4"
                  >
                    <Icon className="size-5 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-semibold">
              What families say
            </h2>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              Sample content for demonstration
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "We appreciated that extended family details were optional. The focus stayed on values and compatibility.",
                by: "Sample — Mumbai family",
              },
              {
                quote:
                  "Privacy settings made it easy to keep contact and income private until we were ready.",
                by: "Sample — NRI member",
              },
              {
                quote:
                  "Clear, respectful profiles — not a dating app feel. Exactly what we were looking for.",
                by: "Sample — Ahmedabad parent",
              },
            ].map((item) => (
              <blockquote
                key={item.by}
                className="space-y-3 border-l-2 border-primary/30 pl-4"
              >
                <p className="text-sm leading-relaxed text-foreground/90">
                  “{item.quote}”
                </p>
                <footer className="text-xs text-muted-foreground">{item.by}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

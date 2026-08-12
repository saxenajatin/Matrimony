import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Safety",
};

export default function SafetyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-heading text-4xl font-semibold">Safety</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Report suspicious profiles, block unwanted contact, and keep personal
          details private until you choose to share them.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

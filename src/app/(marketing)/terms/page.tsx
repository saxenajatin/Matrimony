import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-heading text-4xl font-semibold">Terms</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Placeholder terms for Phase 1. Full legal terms will be finalized
          before production launch.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

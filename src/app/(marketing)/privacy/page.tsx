import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-heading text-4xl font-semibold">Privacy</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Contact details, income, children information, and Kundli documents
          are private by default. You control what other members can see.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

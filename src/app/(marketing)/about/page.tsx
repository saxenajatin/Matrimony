import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-heading text-4xl font-semibold">About MAU</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          MAU is an Indian matrimonial platform focused on privacy, family
          values, and inclusive cultural options. Religion, caste, horoscope,
          and extended family details are always optional.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/safety", label: "Safety" },
  { href: "/help", label: "Help" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-[color:var(--muted)]/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="font-heading text-xl font-semibold text-primary">MAU</p>
          <p className="max-w-md text-sm text-muted-foreground">
            A privacy-first Indian matrimonial platform for families and
            individuals seeking a respectful path to marriage.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} MAU. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

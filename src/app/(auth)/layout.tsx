import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.04_12),transparent_55%),linear-gradient(180deg,oklch(0.985_0.01_70),oklch(0.97_0.02_70))]"
      />
      <header className="relative z-10 px-4 py-6 sm:px-6">
        <Link href="/" className="font-heading text-xl font-semibold text-primary">
          MAU
        </Link>
      </header>
      <main
        id="main-content"
        className="relative z-10 flex flex-1 items-center justify-center px-4 py-8"
      >
        {children}
      </main>
    </div>
  );
}

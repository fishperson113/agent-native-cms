import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between border-b editorial-rule px-5 py-5 sm:px-8 lg:px-12">
      <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em]">
        Agent Native CMS
      </Link>
      <nav aria-label="Primary navigation" className="flex gap-6 text-sm">
        <Link href="/" className="hover:underline hover:underline-offset-4">Home</Link>
        <Link href="/#articles" className="hover:underline hover:underline-offset-4">Articles</Link>
      </nav>
    </header>
  );
}

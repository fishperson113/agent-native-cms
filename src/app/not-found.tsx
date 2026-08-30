import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">404 / Article not found</p>
        <h1 className="font-serif text-5xl tracking-[-0.04em] sm:text-7xl">This story is not on the shelf.</h1>
        <Link href="/" className="mt-9 inline-block border-b-2 border-[var(--signal)] pb-1 text-sm font-semibold">Browse published articles</Link>
      </div>
    </main>
  );
}

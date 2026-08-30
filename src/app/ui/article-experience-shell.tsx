import Link from "next/link";
import type { ReactNode } from "react";

export function ArticleExperienceShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <nav
        aria-label="Article navigation"
        className="sticky top-0 z-20 flex min-h-14 w-full items-center border-b border-[var(--line)] bg-[color:var(--paper-raised)]/95 px-4 text-[var(--ink)] backdrop-blur-sm sm:px-8"
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold transition-opacity hover:opacity-65 active:translate-y-px"
          >
            <span aria-hidden="true" className="mr-2">←</span>
            Back to home
          </Link>
          <span className="truncate text-right font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            Agent Native CMS
          </span>
        </div>
      </nav>
      {children}
    </div>
  );
}

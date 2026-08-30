"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ArticleDto } from "@/modules/content/application/article.dto";

type PresentationModule = {
  mount: (container: HTMLElement, context: { article: ArticleDto }) => void | (() => void);
};

export function DynamicArticlePresentation({ article, artifactUrl, fallback }: { article: ArticleDto; artifactUrl: string; fallback: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "mounted" | "failed">("loading");

  useEffect(() => {
    let disposed = false;
    let unmount: void | (() => void);
    async function loadPresentation() {
      try {
        const presentation = (await import(/* webpackIgnore: true */ artifactUrl)) as PresentationModule;
        if (disposed || !containerRef.current) return;
        if (typeof presentation.mount !== "function") throw new Error("Presentation artifact does not export mount().");
        unmount = presentation.mount(containerRef.current, { article });
        if (!disposed) setState("mounted");
      } catch (error) {
        console.error("Unable to mount article presentation.", error);
        if (!disposed) setState("failed");
      }
    }
    void loadPresentation();
    return () => { disposed = true; if (typeof unmount === "function") unmount(); };
  }, [article, artifactUrl]);

  if (state === "failed") return fallback;
  return (
    <main className="min-h-dvh" data-presentation-state={state}>
      {state === "loading" ? (
        <div role="status" className="reader-skeleton mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <span className="sr-only">Loading article presentation</span>
          <div className="mb-8 h-3 w-40 bg-[var(--line)]" />
          <div className="h-20 max-w-3xl bg-[var(--line)] sm:h-32" />
          <div className="mt-16 grid gap-5 sm:grid-cols-2"><div className="h-64 bg-[var(--line)]" /><div className="h-64 bg-[var(--line)]" /></div>
        </div>
      ) : null}
      <div ref={containerRef} className={state === "loading" ? "hidden" : ""} />
    </main>
  );
}

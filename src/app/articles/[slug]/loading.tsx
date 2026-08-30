export default function ArticleLoading() {
  return (
    <main role="status" className="reader-skeleton mx-auto min-h-dvh w-full max-w-[1280px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
      <span className="sr-only">Loading article</span>
      <div className="mb-8 h-3 w-40 bg-[var(--line)]" />
      <div className="h-24 max-w-4xl bg-[var(--line)] sm:h-40" />
      <div className="mt-20 ml-auto h-72 max-w-2xl bg-[var(--line)]" />
    </main>
  );
}

import { describe, expect, it } from "vitest";

import { PresentationCompilationError } from "../../domain/article-presentation.errors";
import { EsbuildPresentationCompiler } from "./esbuild-presentation-compiler";

describe("EsbuildPresentationCompiler", () => {
  it("bundles TSX and the CMS SDK into a browser mount artifact", async () => {
    const compiler = new EsbuildPresentationCompiler();
    const result = await compiler.compile(`
      import { ArticleRoot, Hero, Markdown } from "@cms/article-sdk";

      export default function Presentation({ article }) {
        return (
          <ArticleRoot>
            <Hero title={article.title} eyebrow="Uploaded program" />
            <Markdown content={article.markdown} />
          </ArticleRoot>
        );
      }
    `);

    expect(result.code).toContain("function mount");
    expect(result.code.length).toBeGreaterThan(1_000);
    expect(result.warnings).toEqual([]);
  });

  it("allows presentation behavior that preserves the required UX structure", async () => {
    const compiler = new EsbuildPresentationCompiler();
    const result = await compiler.compile(`
      import { ArticleRoot, Hero } from "@cms/article-sdk";
      export default function Presentation({ article }) {
        const load = () => fetch("/anything");
        return <ArticleRoot><Hero title={article.title} /><main onClick={load}>Full layout program</main></ArticleRoot>;
      }
    `);

    expect(result.code).toContain("/anything");
  });

  it("rejects programs that omit the CMS article experience structure", async () => {
    const compiler = new EsbuildPresentationCompiler();
    await expect(
      compiler.compile(`export default function Presentation() { return <main>Missing shell</main>; }`),
    ).rejects.toEqual(
      expect.objectContaining({
        diagnostics: expect.arrayContaining([
          expect.stringContaining("ArticleRoot"),
          expect.stringContaining("Hero"),
        ]),
      }),
    );
  });

  it("rejects fixed horizontal sizing and unstable viewport height", async () => {
    const compiler = new EsbuildPresentationCompiler();
    await expect(
      compiler.compile(`
        import { ArticleRoot, Hero } from "@cms/article-sdk";
        export default function Presentation({ article }) {
          return <ArticleRoot style={{ width: "1200px", height: "100vh" }}><Hero title={article.title} /></ArticleRoot>;
        }
      `),
    ).rejects.toEqual(
      expect.objectContaining({
        diagnostics: expect.arrayContaining([
          expect.stringContaining("fixed width"),
          expect.stringContaining("100dvh"),
        ]),
      }),
    );
  });

  it("requires the article title in the hero", async () => {
    const compiler = new EsbuildPresentationCompiler();
    await expect(
      compiler.compile(`
        import { ArticleRoot, Hero } from "@cms/article-sdk";
        export default function Presentation() {
          return <ArticleRoot><Hero title="Decorative title" /></ArticleRoot>;
        }
      `),
    ).rejects.toEqual(
      expect.objectContaining({
        diagnostics: expect.arrayContaining([
          expect.stringContaining("article.title"),
        ]),
      }),
    );
  });

  it("returns structured diagnostics for syntax failures", async () => {
    const compiler = new EsbuildPresentationCompiler();

    await expect(
      compiler.compile("export default function Presentation( {"),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PRESENTATION_COMPILATION_ERROR",
        diagnostics: expect.arrayContaining([expect.any(String)]),
      }),
    );
    await expect(
      compiler.compile("export default function Presentation( {"),
    ).rejects.toBeInstanceOf(PresentationCompilationError);
  });
});

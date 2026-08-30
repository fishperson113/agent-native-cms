import { fileURLToPath } from "node:url";

import { build, type BuildFailure, type Plugin } from "esbuild";

import { PresentationCompilationError } from "../../domain/article-presentation.errors";
import type {
  CompiledPresentation,
  PresentationCompiler,
} from "../../application/ports/presentation-compiler";

const sdkRuntimePath = fileURLToPath(
  new URL(
    "../../../runtime/infrastructure/article-sdk/sdk-runtime.tsx",
    import.meta.url,
  ),
);

const runtimeEntry = `
import React from "react";
import { createRoot } from "react-dom/client";
import Presentation from "virtual:presentation-source";

export function mount(container, context) {
  const root = createRoot(container);
  root.render(React.createElement(Presentation, context));
  return () => root.unmount();
}
`;

function presentationModules(sourceCode: string): Plugin {
  return {
    name: "presentation-modules",
    setup(pluginBuild) {
      pluginBuild.onResolve(
        { filter: /^virtual:presentation-source$/ },
        () => ({ path: "presentation.tsx", namespace: "presentation-source" }),
      );
      pluginBuild.onLoad(
        { filter: /.*/, namespace: "presentation-source" },
        () => ({
          contents: sourceCode,
          loader: "tsx",
          resolveDir: process.cwd(),
        }),
      );
      pluginBuild.onResolve({ filter: /^@cms\/article-sdk$/ }, () => ({
        path: sdkRuntimePath,
      }));
    },
  };
}

function diagnostics(error: unknown): string[] {
  const failure = error as Partial<BuildFailure>;
  if (Array.isArray(failure.errors) && failure.errors.length > 0) {
    return failure.errors.map((item) => item.text);
  }
  return ["Unknown esbuild compilation failure."];
}

function experienceGuardrailDiagnostics(sourceCode: string): string[] {
  const diagnostics: string[] = [];
  const sdkImport = /from\s+["']@cms\/article-sdk["']/;
  const articleRoot = /<ArticleRoot(?:\s|>)/;
  const hero = /<Hero(?:\s|\/>|>)/;
  const heroWithArticleTitle =
    /<Hero\b[\s\S]*?\btitle\s*=\s*{\s*article\.title\s*}/;
  const fixedHorizontalSize =
    /(?:^|[,;{]\s*)(?:width|minWidth)\s*:\s*(?:["']\d{3,}px["']|\d{3,})(?:\s*[,;}])/m;
  const unstableViewportHeight = /height\s*:\s*["']100vh["']/;

  if (!sdkImport.test(sourceCode)) {
    diagnostics.push(
      'UX guardrail: import presentation primitives from "@cms/article-sdk".',
    );
  }
  if (!articleRoot.test(sourceCode)) {
    diagnostics.push(
      "UX guardrail: render ArticleRoot as the outer presentation element.",
    );
  } else if ((sourceCode.match(/<ArticleRoot(?:\s|>)/g) ?? []).length !== 1) {
    diagnostics.push(
      "UX guardrail: render exactly one ArticleRoot as the outer presentation element.",
    );
  }
  if (!hero.test(sourceCode)) {
    diagnostics.push(
      "UX guardrail: render Hero near the start of ArticleRoot and use article.title.",
    );
  } else if (!heroWithArticleTitle.test(sourceCode)) {
    diagnostics.push(
      "UX guardrail: pass article.title to the Hero title prop.",
    );
  }
  if (fixedHorizontalSize.test(sourceCode)) {
    diagnostics.push(
      "Responsive guardrail: fixed width or minWidth pixel values are not allowed. Use width: 100%, maxWidth, clamp(), or SDK Grid and Stack.",
    );
  }
  if (unstableViewportHeight.test(sourceCode)) {
    diagnostics.push(
      'Responsive guardrail: use minHeight: "100dvh" instead of height: "100vh".',
    );
  }
  return diagnostics;
}

export class EsbuildPresentationCompiler implements PresentationCompiler {
  async compile(sourceCode: string): Promise<CompiledPresentation> {
    try {
      const result = await build({
        stdin: {
          contents: runtimeEntry,
          loader: "tsx",
          resolveDir: process.cwd(),
          sourcefile: "article-presentation-runtime.tsx",
        },
        absWorkingDir: process.cwd(),
        bundle: true,
        platform: "browser",
        format: "esm",
        target: ["es2022"],
        write: false,
        sourcemap: false,
        legalComments: "none",
        logLevel: "silent",
        jsx: "automatic",
        conditions: ["browser"],
        mainFields: ["browser", "module", "main"],
        define: {
          "process.env.NODE_ENV": '"production"',
        },
        plugins: [presentationModules(sourceCode)],
      });

      const output = result.outputFiles[0]?.text;
      if (!output) {
        throw new PresentationCompilationError([
          "esbuild did not produce a browser artifact.",
        ]);
      }

      const guardrailDiagnostics = experienceGuardrailDiagnostics(sourceCode);
      if (guardrailDiagnostics.length > 0) {
        throw new PresentationCompilationError(
          guardrailDiagnostics,
          "The presentation violates the CMS article experience contract.",
        );
      }

      return {
        code: output,
        warnings: result.warnings.map((warning) => warning.text),
      };
    } catch (error) {
      if (error instanceof PresentationCompilationError) {
        throw error;
      }
      throw new PresentationCompilationError(diagnostics(error));
    }
  }
}

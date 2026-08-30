import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const projectRoot = process.cwd();
const sourceRoot = join(projectRoot, "src");
const modulesRoot = join(projectRoot, "src", "modules");
const forbiddenApplicationImports = new Set([
  "next",
  "react",
  "react-dom",
  "drizzle-orm",
  "postgres",
  "esbuild",
  "@modelcontextprotocol/sdk",
]);
const forbiddenProviderPackages = [
  "openai",
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "@google/genai",
  "@ai-sdk/openai",
  "anthropic",
  "cohere-ai",
  "@aws-sdk/client-bedrock-runtime",
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return nested.flat();
}

const sourceFiles = (await filesUnder(modulesRoot)).filter((path) =>
  [".ts", ".tsx"].includes(extname(path)),
);
const violations = [];

for (const path of sourceFiles) {
  const normalized = path.replaceAll("\\", "/");
  const isCoreLayer =
    normalized.includes("/domain/") || normalized.includes("/application/");
  const isSdkDeclarationPayload = normalized.endsWith(
    "/runtime/application/article-presentation-sdk-contract.ts",
  );
  if (!isCoreLayer || isSdkDeclarationPayload) continue;

  const source = await readFile(path, "utf8");
  const importPattern = /(?:import|export)\s+(?:type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (
      [...forbiddenApplicationImports].some(
        (item) => specifier === item || specifier.startsWith(`${item}/`),
      )
    ) {
      violations.push(`${relative(projectRoot, path)} imports ${specifier}`);
    }
  }
}

const allSourceFiles = (await filesUnder(sourceRoot)).filter((path) =>
  [".ts", ".tsx"].includes(extname(path)),
);
for (const path of allSourceFiles) {
  const source = await readFile(path, "utf8");
  const specifierPattern = /(?:from\s+|import\s*)["']([^"']+)["']/g;
  for (const match of source.matchAll(specifierPattern)) {
    const specifier = match[1];
    if (
      forbiddenProviderPackages.some(
        (provider) =>
          specifier === provider || specifier.startsWith(`${provider}/`),
      )
    ) {
      violations.push(
        `${relative(projectRoot, path)} imports model-provider SDK ${specifier}`,
      );
    }
  }
}

const packageJson = JSON.parse(
  await readFile(join(projectRoot, "package.json"), "utf8"),
);
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
for (const provider of forbiddenProviderPackages) {
  if (provider in dependencies) {
    violations.push(`package.json contains model-provider dependency ${provider}`);
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    "Architecture boundaries pass; no model-provider SDK is installed in the kernel.",
  );
}

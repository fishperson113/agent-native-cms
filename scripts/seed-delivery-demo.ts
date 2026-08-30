import { config } from "dotenv";
import { and, eq } from "drizzle-orm";

import { createDatabase } from "../src/infrastructure/database/client";
import {
  articlePresentations,
  articles,
  tenants,
} from "../src/infrastructure/database/schema";
import { EsbuildPresentationCompiler } from "../src/modules/presentation/infrastructure/compiler/esbuild-presentation-compiler";
import { parseMcpEnvironment } from "../src/integrations/mcp/mcp-environment";

config({ path: ".env", quiet: true });

const environment = parseMcpEnvironment(process.env);
const database = createDatabase(environment.DATABASE_URL);
const articleId = "20000000-0000-4000-8000-000000000060";
// A compiled artifact ID is immutable because delivery caches versioned URLs.
// Change this ID whenever the seeded source or SDK contract changes.
const presentationId = "30000000-0000-4000-8000-000000000064";
const slug = "agent-native-runtime-demo";
const sourceCode = `
import { ArticleRoot, Hero, Section, Markdown, Callout } from "@cms/article-sdk";

export default function Presentation({ article }) {
  return (
    <ArticleRoot style={{ minHeight: "100dvh", background: "#10231d", color: "#f1eee4", fontFamily: "Georgia, serif" }}>
      <Hero
        eyebrow="Agent Native CMS"
        title={article.title}
        subtitle="A responsive article experience loaded from the active presentation contract."
        style={{ maxWidth: 1280, margin: "0 auto", borderBottom: "1px solid #66776f" }}
        eyebrowStyle={{ fontFamily: "system-ui, sans-serif", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}
      />
      <Section style={{ maxWidth: 820, margin: "0 auto", fontSize: 20, lineHeight: 1.75 }}>
        <Markdown content={article.markdown} />
        <Callout tone="success">Upload and activate another TSX version. Refresh this URL and the new experience loads without restarting Next.js.</Callout>
      </Section>
    </ArticleRoot>
  );
}
`;

async function seed() {
  const compiler = new EsbuildPresentationCompiler();
  const compiled = await compiler.compile(sourceCode);

  await database.db
    .insert(tenants)
    .values({
      id: environment.CMS_TENANT_ID,
      name: "Agent Native CMS",
      slug: "agent-native-cms",
    })
    .onConflictDoNothing();

  const existing = await database.db.query.articles.findFirst({
    where: and(
      eq(articles.tenantId, environment.CMS_TENANT_ID),
      eq(articles.slug, slug),
    ),
  });

  if (existing) {
    await database.db
      .update(articles)
      .set({
        title: "The article that changes without a deploy",
        markdown:
          "## A stable shell\n\nThe home page stays owned by the CMS kernel. Only this reading experience runs the program selected by the active presentation pointer.\n\n## Try the agent workflow\n\n- Inspect the article\n- Upload a new TSX presentation\n- Activate it\n- Refresh this page",
        status: "published",
      })
      .where(eq(articles.id, existing.id));
  } else {
    await database.db.insert(articles).values({
      id: articleId,
      tenantId: environment.CMS_TENANT_ID,
      title: "The article that changes without a deploy",
      slug,
      markdown:
        "## A stable shell\n\nThe home page stays owned by the CMS kernel. Only this reading experience runs the program selected by the active presentation pointer.\n\n## Try the agent workflow\n\n- Inspect the article\n- Upload a new TSX presentation\n- Activate it\n- Refresh this page",
      status: "published",
    });
  }

  const targetArticleId = existing?.id ?? articleId;
  await database.db
    .insert(articlePresentations)
    .values({
      id: presentationId,
      tenantId: environment.CMS_TENANT_ID,
      articleId: targetArticleId,
      sourceCode,
      compiledCode: compiled.code,
      status: "active",
    })
    .onConflictDoUpdate({
      target: articlePresentations.id,
      set: { sourceCode, compiledCode: compiled.code, status: "active" },
    });

  await database.db
    .update(articles)
    .set({ activePresentationId: presentationId })
    .where(eq(articles.id, targetArticleId));

  console.log(`Delivery demo ready: http://localhost:3000/articles/${slug}`);
}

try {
  await seed();
} finally {
  await database.close();
}

# Coding-agent integration instructions

Current compatibility contract:

- MCP tools: `1.1.0`
- Copyable instructions: `1.1.0`
- `@cms/article-sdk`: `1.1.0`

Tool responses include `meta.contractVersion` and `meta.correlationId`. Use the correlation ID when reporting a failed call to the kernel operator.

Copy the following instructions into a coding agent when MCP prompt discovery is not available:

```text
You are integrating with Agent-Native CMS, a hosted kernel that accepts content and executable presentation programs from external coding agents.

Use the connected cms_* MCP tools. Do not edit or redeploy the CMS kernel to create content.

For articles:
1. Inspect current state with cms_list_articles or cms_get_article.
2. Upload title, optional slug, and Markdown with cms_create_article.
3. Update content or metadata through the corresponding tools.
4. Publish only after tool results confirm the draft is correct.

The CMS owns tenant context, IDs, persistence, compilation, activation, and dynamic loading. You own generation of Markdown and presentation TSX.

For presentations:
1. Retrieve the current SDK contract with cms_get_presentation_sdk.
2. Generate a complete TSX module with one default component accepting { article }.
3. Upload it with cms_upload_article_presentation. Upload does not activate automatically.
4. If compilation fails, fix the returned compileErrors and upload a new version.
5. Inspect versions with cms_get_article_presentation and cms_list_article_presentations.
6. Activate a compiled version with cms_activate_article_presentation. Activate an older compiled version to roll back.
7. Use cms_reset_article_presentation to detach the active version and return to the default presentation.

Article experience rules:
1. Use ArticleRoot as the outer element and render Hero near its start. Uploads missing either primitive fail compilation.
2. The CMS owns the one-line navigation and Back to home link above every article. Do not recreate or obscure it.
3. Design mobile first. Use fluid widths, maxWidth, clamp(), 100dvh, SDK Grid/Stack, and responsive SDK Image. Fixed width or minWidth pixel values fail compilation.
4. Use inline styles for generated presentation styling because dynamic utility classes are not guaranteed in the host CSS build.
5. Keep one coherent theme, one restrained accent, readable 16px body text, accessible contrast, and a prose measure near 65 characters.
6. Avoid three equal feature cards, decorative status dots, fake metrics, repeated micro-labels, glows, gradient text, and unmotivated motion.
7. Preflight at 360px, 768px, and 1440px. Confirm no horizontal overflow, title clipping, or distorted images.

Compilation validates TSX syntax and the versioned article experience guardrails. Do not modify kernel source files.
```

## Local stdio configuration

The exact configuration shape varies by coding-agent client. The command is:

```json
{
  "command": "pnpm",
  "args": [
    "--dir",
    "C:\\workspace\\agent-native-cms",
    "run",
    "mcp:stdio"
  ]
}
```

Before connecting locally:

```text
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

## Hosted Streamable HTTP configuration

Ask the CMS operator for a tenant key issued by `pnpm mcp:admin key:issue`. Then configure an MCP client with the equivalent of:

```json
{
  "url": "https://YOUR_HOST/api/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TENANT_KEY"
  }
}
```

The precise wrapper field used for a remote server varies by coding-agent client, but the URL, stateful Streamable HTTP transport, and authorization header remain the same. Tenant scope comes from the key and must not be supplied by the client. The server issues `MCP-Session-Id` during initialization and the client sends it on subsequent requests. Do not place the bearer key in source control or expose it in browser code.

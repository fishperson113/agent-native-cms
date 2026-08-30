import {
  ARTICLE_PRESENTATION_SDK_VERSION,
  CMS_AGENT_INSTRUCTIONS_VERSION,
  CMS_MCP_CONTRACT_VERSION,
} from "./contract";
import {
  ARTICLE_EXPERIENCE_AGENT_RULES,
  ARTICLE_EXPERIENCE_RULES_VERSION,
} from "@/modules/runtime/application/article-experience-design-rules";

export const AGENT_INTEGRATION_INSTRUCTIONS = `You are integrating with Agent-Native CMS, a hosted kernel that accepts content and executable presentation programs from external coding agents.

Contract versions: MCP ${CMS_MCP_CONTRACT_VERSION}; instructions ${CMS_AGENT_INSTRUCTIONS_VERSION}; presentation SDK ${ARTICLE_PRESENTATION_SDK_VERSION}.

Current article workflow:
1. Call cms_list_articles before creating or changing content when existing state matters.
2. Use cms_create_article to upload a title, slug (optional), and Markdown body.
3. Use cms_update_article_content for Markdown changes.
4. Use cms_update_article_metadata for title or slug changes.
5. Use cms_publish_article only when the content is ready.
6. Read the returned JSON result and handle tool errors before continuing.

Presentation workflow:
1. Call cms_get_presentation_sdk before generating TSX so you use the current @cms/article-sdk contract.
2. Generate one complete TSX module with a default React component accepting { article }.
3. Call cms_upload_article_presentation with the article ID and complete sourceCode.
4. If status is failed, use compileErrors to fix the program and upload a new version. Upload never activates automatically.
5. Inspect versions with cms_get_article_presentation or cms_list_article_presentations.
6. Call cms_activate_article_presentation only for a compiled version. Activating an older compiled version performs a rollback.
7. Call cms_reset_article_presentation to detach the active version and return to the default presentation.

Article experience contract ${ARTICLE_EXPERIENCE_RULES_VERSION}:
${ARTICLE_EXPERIENCE_AGENT_RULES}

Before uploading, perform the complete preflight above. ArticleRoot and Hero are compile-time requirements. The CMS-owned navigation and Back to home link are rendered outside the uploaded program and must not be recreated or visually obscured.

The CMS kernel owns IDs, tenant context, persistence, publication state, compilation, and dynamic loading. The coding agent owns generation of Markdown and, when presentation tools are available, TSX presentation source. The kernel does not call an LLM provider on behalf of the tenant.

Do not edit or redeploy the hosted CMS kernel to create an article or presentation. Send content or programs through the MCP tools instead. Compilation includes syntax checks and the versioned article experience guardrails.`;

export const CMS_MCP_CONTRACT_VERSION = "1.1.0";
export const CMS_AGENT_INSTRUCTIONS_VERSION = "1.1.0";
export const ARTICLE_PRESENTATION_SDK_VERSION = "1.1.0";

export const CMS_MCP_TOOL_NAMES = [
  "cms_get_instructions",
  "cms_create_article",
  "cms_list_articles",
  "cms_get_article",
  "cms_get_article_by_slug",
  "cms_update_article_content",
  "cms_update_article_metadata",
  "cms_publish_article",
  "cms_unpublish_article",
  "cms_delete_article",
  "cms_get_presentation_sdk",
  "cms_upload_article_presentation",
  "cms_get_article_presentation",
  "cms_list_article_presentations",
  "cms_activate_article_presentation",
  "cms_reset_article_presentation",
] as const;

export type CmsMcpToolName = (typeof CMS_MCP_TOOL_NAMES)[number];

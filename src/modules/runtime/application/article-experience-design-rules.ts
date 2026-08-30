export const ARTICLE_EXPERIENCE_RULES_VERSION = "1.0.0";

export const ARTICLE_EXPERIENCE_DESIGN_RULES = {
  cmsOwned: [
    "The CMS renders a one-line navigation bar above every article experience.",
    "The navigation always provides a visible Back to home link to the landing page.",
    "The presentation program controls only the article canvas below that navigation.",
  ],
  requiredStructure: [
    "Import and render ArticleRoot exactly once as the outer presentation element.",
    "Import and render Hero near the start of ArticleRoot with article.title as its title.",
    "Export one default component accepting { article }.",
  ],
  responsive: [
    "Design mobile first and allow every section to collapse to one column below 768px.",
    "Use SDK Grid and Stack instead of fixed multi-column widths.",
    "Use fluid width, maxWidth, clamp(), percentages, and 100dvh. Do not use fixed width or minWidth pixel values.",
    "Use the SDK Image primitive with meaningful alt text. It is responsive by default.",
    "Use inline style values for generated presentation styling. Dynamic utility class names are not guaranteed to exist in the host CSS build.",
  ],
  taste: [
    "Keep the hero to an optional eyebrow, one headline, one short subtitle, and at most one action.",
    "Use one coherent theme and one restrained accent color across the whole article.",
    "Prefer spacing, typography, and sparse dividers over many generic cards.",
    "Avoid three equal feature cards, decorative status dots, fake metrics, excessive uppercase micro-labels, gradients, glows, and scroll gimmicks.",
    "Keep body text readable at 16px or larger, line-height near 1.6, and prose width near 65 characters.",
    "Ensure text and interactive controls have accessible contrast and visible keyboard focus.",
    "Use motion only for feedback or state transitions and respect reduced-motion preferences.",
    "Use no em dash or en dash characters in visible copy.",
  ],
  preflight: [
    "Check the layout at 360px, 768px, and 1440px widths.",
    "Confirm there is no horizontal page overflow.",
    "Confirm the hero title does not clip or exceed three lines on mobile.",
    "Confirm images preserve aspect ratio and never exceed their container.",
    "Confirm the CMS-owned navigation remains visible and the Back to home link works.",
  ],
} as const;

export const ARTICLE_EXPERIENCE_AGENT_RULES = Object.entries(
  ARTICLE_EXPERIENCE_DESIGN_RULES,
)
  .map(
    ([section, rules]) =>
      `${section}:\n${rules.map((rule) => `- ${rule}`).join("\n")}`,
  )
  .join("\n\n");

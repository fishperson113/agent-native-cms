export type ArticleRuntimeContext = {
  article: {
    id: string;
    title: string;
    slug: string;
    markdown: string;
  };
};

export type PresentationMount = (
  container: HTMLElement,
  context: ArticleRuntimeContext,
) => () => void;

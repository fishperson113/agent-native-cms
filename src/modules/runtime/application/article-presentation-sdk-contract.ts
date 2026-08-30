export const ARTICLE_PRESENTATION_SDK_CONTRACT = `
import type { CSSProperties, ReactNode } from "react";

export type ArticleRuntimeContext = {
  article: {
    id: string;
    title: string;
    slug: string;
    markdown: string;
  };
};

export type PresentationProps = ArticleRuntimeContext;

export function ArticleRoot(props: { children: ReactNode; className?: string; style?: CSSProperties }): JSX.Element;
export function Hero(props: { title: string; eyebrow?: string; subtitle?: string; children?: ReactNode; className?: string; style?: CSSProperties; titleStyle?: CSSProperties; eyebrowStyle?: CSSProperties; subtitleStyle?: CSSProperties }): JSX.Element;
export function Section(props: { children: ReactNode; id?: string; className?: string; style?: CSSProperties }): JSX.Element;
export function Markdown(props: { content: string; className?: string }): JSX.Element;
export function Grid(props: { children: ReactNode; columns?: number; gap?: number; minItemWidth?: number; className?: string; style?: CSSProperties }): JSX.Element;
export function Stack(props: { children: ReactNode; gap?: number; className?: string; style?: CSSProperties }): JSX.Element;
export function Card(props: { children: ReactNode; className?: string }): JSX.Element;
export function Callout(props: { children: ReactNode; tone?: "info" | "success" | "warning" }): JSX.Element;
export function Quote(props: { children: ReactNode; cite?: string }): JSX.Element;
export function Badge(props: { children: ReactNode }): JSX.Element;
export function Divider(): JSX.Element;
export function Timeline(props: { items: Array<{ title: string; description?: string }> }): JSX.Element;
export function Image(props: { src: string; alt: string; className?: string; style?: CSSProperties; loading?: "eager" | "lazy" }): JSX.Element;
export function Button(props: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }): JSX.Element;

The program must export one default React component accepting PresentationProps. ArticleRoot must be the outer presentation element and Hero must appear near its start. The CMS renders its own navigation above the presentation.
`.trim();

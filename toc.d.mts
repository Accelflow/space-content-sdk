export type TocHeading = {id: string; text: string; level: number};
export type TocOptions = {
  locale?: 'ja' | 'en'; title?: string; maxLevel?: 2 | 3; className?: string;
  /** Trusted application renderer; escape data if returning custom HTML. */
  render?: (data: {title: string; entries: (TocHeading & {href: string})[]}) => string;
  mobileQuery?: string; mobileOpen?: boolean; desktopOpen?: boolean;
};
export function isTocTitle(text: string): boolean;
export function renderTableOfContents(headings: TocHeading[], options?: TocOptions): string;
export function mountTableOfContents(root: HTMLElement, options?: TocOptions): () => void;

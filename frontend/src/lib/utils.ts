import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** One retrieved passage: its relevance plus where in the document it came from.
 *  The location fields are absent for documents indexed before structural
 *  metadata existed, so every consumer treats them as optional. */
export type RetrievalItem = {
  source: string;
  score: number;
  page?: number;
  recital?: number;
  article?: number;
  chapter?: string;
  document?: string;
};

/** Readable provenance for a citation card: "p. 37 · recital 148". */
export function locationLabel(item?: RetrievalItem): string {
  if (!item) return '';
  const parts: string[] = [];
  if (item.page !== undefined) parts.push(`p. ${item.page}`);
  if (item.recital !== undefined) parts.push(`recital ${item.recital}`);
  if (item.article !== undefined) parts.push(`Article ${item.article}`);
  if (item.chapter) parts.push(`Ch. ${item.chapter}`);
  return parts.join(' · ');
}

/** Same thing abbreviated, for the narrow chart axis: "p.37 §148". */
export function shortLocation(item?: RetrievalItem): string {
  if (!item) return '';
  const page = item.page !== undefined ? `p.${item.page}` : '';
  if (item.recital !== undefined) return `${page} §${item.recital}`.trim();
  if (item.article !== undefined) return `${page} Art.${item.article}`.trim();
  return page;
}

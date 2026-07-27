import type { BookPage } from "../types";

type PageLabelData = Pick<BookPage, "displayNumber">;

export function pageLabel(page: PageLabelData) {
  return `Page ${page.displayNumber}`;
}

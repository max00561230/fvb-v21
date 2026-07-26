import type { BookPage } from "../types";

type PageLabelData = Pick<BookPage, "pageNumber">;

export function pageLabel(page: PageLabelData) {
  return `Page ${page.pageNumber}`;
}

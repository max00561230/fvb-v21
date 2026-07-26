import type { BookPage } from "../types";

type PageLabelData = Pick<BookPage, "pageNumber" | "originalPageNumber">;

export function pageLabel(page: PageLabelData) {
  if (page.originalPageNumber && page.originalPageNumber !== page.pageNumber) {
    return `Page ${page.pageNumber} (original page ${page.originalPageNumber})`;
  }

  return `Page ${page.pageNumber}`;
}

export function originalPageNote(page: PageLabelData) {
  if (page.originalPageNumber && page.originalPageNumber !== page.pageNumber) {
    return `Original page ${page.originalPageNumber}`;
  }

  return null;
}


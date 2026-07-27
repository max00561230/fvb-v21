import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const READING_ORDER_PATH = path.resolve(__dirname, "../src/data/reading-order.json");

export const readingOrderManifest = JSON.parse(
  fs.readFileSync(READING_ORDER_PATH, "utf-8")
);

export const READING_ORDER = readingOrderManifest.pages;
export const INACTIVE_PAGES = readingOrderManifest.inactivePages || [];
export const TOTAL_READING_PAGES = readingOrderManifest.totalPages;
export const ACTIVE_PAGE_IDS = READING_ORDER.map((page) => page.pageId);

const pagesById = new Map(READING_ORDER.map((page) => [page.pageId, page]));
const inactivePagesById = new Map(INACTIVE_PAGES.map((page) => [page.pageId, page]));
const pagesByReadingPosition = new Map(
  READING_ORDER.map((page) => [page.readingPosition, page])
);

export function pageRecordForPageId(pageId) {
  return pagesById.get(pageId) ?? inactivePagesById.get(pageId);
}

export function pageRecordForReadingPosition(readingPosition) {
  return pagesByReadingPosition.get(readingPosition);
}

export function pageNumberForPageId(pageId) {
  return pagesById.get(pageId)?.displayNumber;
}

export function readingPositionForPageId(pageId) {
  return pagesById.get(pageId)?.readingPosition;
}

export function originalPageNumberForPageId(pageId) {
  return pageRecordForPageId(pageId)?.originalPrintedPageNumber ?? null;
}

export function sourceFileForPageId(pageId) {
  return pageRecordForPageId(pageId)?.sourceFile;
}

export function isActivePageId(pageId) {
  return pagesById.has(pageId);
}

export function inactivePageRecordForPageId(pageId) {
  return inactivePagesById.get(pageId);
}

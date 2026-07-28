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

export const EXPECTED_TOTAL_READING_PAGES = 90;
export const REQUIRED_VISIBLE_PAGE_CHECKPOINTS = [
  { displayNumber: 2, pageId: "page-003", sourceFile: "page-03.png" },
  { displayNumber: 89, pageId: "page-002", sourceFile: "page-02.png" },
  { displayNumber: 90, pageId: "page-091", sourceFile: "page-91.png" }
];

const pagesById = new Map(READING_ORDER.map((page) => [page.pageId, page]));
const inactivePagesById = new Map(INACTIVE_PAGES.map((page) => [page.pageId, page]));
const pagesByReadingPosition = new Map(
  READING_ORDER.map((page) => [page.readingPosition, page])
);

function assertExactRange(values, label) {
  const seen = new Set(values);
  if (values.length !== EXPECTED_TOTAL_READING_PAGES) {
    throw new Error(`${label} count is ${values.length}; expected ${EXPECTED_TOTAL_READING_PAGES}.`);
  }
  if (seen.size !== values.length) {
    throw new Error(`${label} contains duplicate values.`);
  }
  for (let i = 1; i <= EXPECTED_TOTAL_READING_PAGES; i += 1) {
    if (!seen.has(i)) {
      throw new Error(`${label} is missing ${i}.`);
    }
  }
}

export function assertAuthoritativeReadingOrder() {
  if (TOTAL_READING_PAGES !== EXPECTED_TOTAL_READING_PAGES || READING_ORDER.length !== EXPECTED_TOTAL_READING_PAGES) {
    throw new Error(`Authoritative reading order has ${READING_ORDER.length}/${TOTAL_READING_PAGES}; expected ${EXPECTED_TOTAL_READING_PAGES}.`);
  }

  assertExactRange(READING_ORDER.map((page) => page.readingPosition), "readingPosition");
  assertExactRange(READING_ORDER.map((page) => page.displayNumber), "displayNumber");

  if (pagesById.has("page-007")) {
    throw new Error("page-007 is a duplicate of page-006 and must not be active.");
  }

  const inactivePage007 = inactivePagesById.get("page-007");
  if (!inactivePage007 || inactivePage007.duplicateOf !== "page-006") {
    throw new Error("page-007 must remain inactive with duplicateOf page-006.");
  }

  for (const checkpoint of REQUIRED_VISIBLE_PAGE_CHECKPOINTS) {
    const page = READING_ORDER.find((entry) => entry.displayNumber === checkpoint.displayNumber);
    if (!page) {
      throw new Error(`Missing visible Page ${checkpoint.displayNumber} checkpoint.`);
    }
    if (page.pageId !== checkpoint.pageId || page.sourceFile !== checkpoint.sourceFile) {
      throw new Error(
        `Visible Page ${checkpoint.displayNumber} must be ${checkpoint.pageId}/${checkpoint.sourceFile}; got ${page.pageId}/${page.sourceFile}.`
      );
    }
  }
}

assertAuthoritativeReadingOrder();

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

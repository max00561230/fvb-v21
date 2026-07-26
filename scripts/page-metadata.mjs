export const INACTIVE_PAGES = [
  {
    id: "page-007",
    duplicateOf: "page-006",
    inactiveReason: "Duplicate scan removed from the active 90-page reading sequence.",
  },
];

const inactivePageIds = new Set(INACTIVE_PAGES.map((page) => page.id));

export const ACTIVE_PAGE_IDS = [
  "page-001",
  "page-003",
  "page-004",
  "page-005",
  "page-006",
  ...Array.from({ length: 81 }, (_, index) => `page-${String(index + 8).padStart(3, "0")}`),
  "page-091",
  "page-089",
  "page-002",
  "page-090",
];

const activePageNumbers = new Map(
  ACTIVE_PAGE_IDS.map((pageId, index) => [pageId, index + 1])
);

export function pageNumberForPageId(pageId) {
  return activePageNumbers.get(pageId);
}

export function originalPageNumberForPageId(pageId) {
  const match = pageId.match(/^page-(\d{3})$/);
  if (!match) return undefined;

  return Number(match[1]);
}

export function isActivePageId(pageId) {
  return activePageNumbers.has(pageId) && !inactivePageIds.has(pageId);
}

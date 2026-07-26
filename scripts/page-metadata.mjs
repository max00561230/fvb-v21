export const PAGE_METADATA = {
  "page-002": {
    originalPageNumber: 89
  }
};

export function metadataForPageId(pageId) {
  return PAGE_METADATA[pageId] ?? {};
}


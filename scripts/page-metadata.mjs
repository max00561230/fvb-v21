export function pageNumberForPageId(pageId) {
  const match = pageId.match(/^page-(\d{3})$/);
  if (!match) return undefined;

  const scanNumber = Number(match[1]);
  if (scanNumber === 2) return 89;
  if (scanNumber >= 3 && scanNumber <= 89) return scanNumber - 1;
  return scanNumber;
}

export function originalPageNumberForPageId(pageId) {
  const match = pageId.match(/^page-(\d{3})$/);
  if (!match) return undefined;

  return Number(match[1]);
}

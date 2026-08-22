import type { BookPage } from "../types";

export function ResponsivePageImage({
  page,
  priority = false
}: {
  page: BookPage;
  priority?: boolean;
}) {
  const originalScanSrc = `${page.masterSrc || page.sources.desktop}?v=original-scan-20260822`;

  return (
    <img
      src={originalScanSrc}
      width={page.width}
      height={page.height}
      alt={`Family heritage book original scan page ${page.displayNumber}`}
      className="page-image original-scan-page-image"
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

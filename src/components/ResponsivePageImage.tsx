import type { BookPage } from "../types";

export function ResponsivePageImage({
  page,
  priority = false
}: {
  page: BookPage;
  priority?: boolean;
}) {
  const fullPictureBookSrc = `/book-pages/full-picture-book-20260822/${page.pageId}.webp?v=full-picture-book-20260822`;

  return (
    <img
      src={fullPictureBookSrc}
      width={page.width}
      height={page.height}
      alt={`Family heritage book page ${page.displayNumber}`}
      className="page-image full-picture-book-page-image"
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}

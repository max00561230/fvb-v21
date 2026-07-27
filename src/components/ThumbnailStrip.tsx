import type { BookPage } from "../types";

export function ThumbnailStrip({
  pages,
  currentPage,
  onSelect
}: {
  pages: BookPage[];
  currentPage: number;
  onSelect: (pageNumber: number) => void;
}) {
  return (
    <div className="thumbnail-strip" aria-label="Page browser">
      <div className="thumbnail-list">
        {pages.map((page) => (
          <button
            key={page.pageId}
            className={`thumbnail-item ${page.displayNumber === currentPage ? "active" : ""}`}
            onClick={() => onSelect(page.displayNumber)}
            aria-label={`Go to page ${page.displayNumber}`}
            aria-current={page.displayNumber === currentPage}
          >
            <img
              src={page.thumbnailSrc}
              alt={`Page ${page.displayNumber}`}
              loading="lazy"
              decoding="async"
              width={60}
              height={80}
            />
            <span className="thumbnail-number">{page.displayNumber}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

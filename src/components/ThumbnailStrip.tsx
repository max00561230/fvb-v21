import type { BookPage } from "../types";
import { pageLabel } from "../lib/pageLabels";

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
            key={page.id}
            className={`thumbnail-item ${page.pageNumber === currentPage ? "active" : ""}`}
            onClick={() => onSelect(page.pageNumber)}
            aria-label={`Go to ${pageLabel(page)}`}
            aria-current={page.pageNumber === currentPage}
          >
            <img
              src={page.thumbnailSrc}
              alt={pageLabel(page)}
              loading="lazy"
              decoding="async"
              width={60}
              height={80}
            />
            <span className="thumbnail-number">{page.pageNumber}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

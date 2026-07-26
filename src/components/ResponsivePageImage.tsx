import type { BookPage } from "../types";

export function ResponsivePageImage({
  page,
  priority = false
}: {
  page: BookPage;
  priority?: boolean;
}) {
  return (
    <picture>
      <source
        media="(min-width: 1200px)"
        srcSet={page.sources.desktop}
        type="image/webp"
      />
      <source
        media="(min-width: 700px)"
        srcSet={page.sources.tablet}
        type="image/webp"
      />
      <img
        src={page.sources.mobile}
        srcSet={[
          `${page.sources.mobile} 1200w`,
          `${page.sources.tablet} 1800w`,
          `${page.sources.desktop} 2400w`
        ].join(", ")}
        sizes="(max-width: 699px) 100vw, (max-width: 1199px) 90vw, 1100px"
        width={page.width}
        height={page.height}
        alt={`Family heritage book page ${page.pageNumber}`}
        className="page-image"
        draggable={false}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
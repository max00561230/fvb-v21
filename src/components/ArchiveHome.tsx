import {
  FVB_FEATURES,
  FvbArchiveNavigation,
  FvbArchiveQuote,
  FvbExhibitCard,
  FvbHeroFrame,
  FvbMuseumHeader,
} from "./FvbMuseumComponents";

export function ArchiveHome({ totalPages }: { totalPages: number }) {
  return (
    <div className="fvb-gallery-shell">
      <FvbMuseumHeader />
      <FvbArchiveNavigation />
      <main className="fvb-gallery-home">
        <FvbHeroFrame totalPages={totalPages} />

        <section className="fvb-exhibit-grid" aria-label="Digital Family History Center sections">
          {FVB_FEATURES.map((feature) => (
            <FvbExhibitCard
              key={feature.id}
              feature={feature}
              countLabel={feature.id === "heritage-book" ? `${totalPages} Pages` : undefined}
            />
          ))}
        </section>

        <FvbArchiveQuote />
      </main>
    </div>
  );
}

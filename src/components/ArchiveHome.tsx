import { Link } from "react-router-dom";
import { Navigation } from "./Navigation";
import { archiveSections } from "../data/archiveSections";

export function ArchiveHome({ totalPages }: { totalPages: number }) {
  return (
    <div className="archive-shell">
      <Navigation />
      <main className="archive-home">
        <section className="archive-hero" aria-labelledby="archive-home-title">
          <div className="archive-hero-copy">
            <p className="archive-kicker">Francis Family Virtual Book</p>
            <h1 id="archive-home-title">Digital Family History Center</h1>
            <p>
              Preserving the original Francis Family Heritage Book while preparing a living archive for future family
              photos, videos, oral histories, documents, and tree records.
            </p>
          </div>
          <div className="archive-hero-panel" aria-label="Archive status">
            <span className="archive-stat-value">{totalPages}</span>
            <span className="archive-stat-label">Preserved Heritage Book pages</span>
          </div>
        </section>

        <section className="archive-grid" aria-label="Digital Family History Center sections">
          {archiveSections.map((section) => (
            <article className="archive-card" key={section.id}>
              <div className="archive-card-icon" aria-hidden="true">{section.icon}</div>
              <p className="archive-card-eyebrow">{section.eyebrow}</p>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
              <div className="archive-card-footer">
                <span>{section.id === "book" ? `${totalPages} pages` : section.countLabel}</span>
                <Link to={section.route} className="archive-card-action">
                  {section.actionLabel}
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

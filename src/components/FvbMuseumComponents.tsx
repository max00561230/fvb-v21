import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { FVB_FEATURES, type FvbFeature } from "../data/fvbFeatures";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/book", label: "Heritage Book" },
  { to: "/tree", label: "Family Tree" },
  { to: "/family", label: "Family Members" },
  { to: "/photos", label: "Photo Gallery" },
  { to: "/videos", label: "Family Videos" },
  { to: "/audio", label: "Oral History" },
  { to: "/documents", label: "Historical Documents" },
  { to: "/search", label: "Search" },
  { to: "/about", label: "About" },
];

export function FvbMuseumHeader() {
  return (
    <header className="fvb-museum-header" aria-label="Francis Family Heritage Archive">
      <span className="fvb-corner-mark fvb-corner-mark-left" aria-hidden="true" />
      <span className="fvb-corner-mark fvb-corner-mark-right" aria-hidden="true" />
      <div className="fvb-seal" aria-hidden="true">F</div>
      <p className="fvb-archive-label">FRANCIS FAMILY HERITAGE ARCHIVE</p>
      <p className="fvb-header-title">Family Virtual Book</p>
      <div className="fvb-header-divider" aria-hidden="true">
        <span />
        <b>◆</b>
        <span />
      </div>
      <p className="fvb-header-subtitle">A Digital Family History Center</p>
    </header>
  );
}

export function FvbArchiveNavigation({ variant = "default" }: { variant?: "default" | "overlay" }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isReader = location.pathname === "/book" || (location.pathname === "/" && location.search.includes("page="));
  const links = variant === "overlay"
    ? navLinks.filter((link) => ["/", "/book", "/search", "/about"].includes(link.to))
    : navLinks;

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/" && !isReader;
    if (to === "/book") return isReader;
    return location.pathname === to;
  };

  if (variant === "overlay") {
    return (
      <nav className="nav-overlay" aria-label="Main navigation">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className={`nav-overlay-link ${isActive(link.to) ? "active" : ""}`}>
            {link.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="fvb-archive-nav" aria-label="Main navigation">
      <div className="fvb-nav-inner">
        <Link to="/" className="fvb-nav-brand" onClick={() => setOpen(false)}>
          <span className="fvb-nav-brand-seal" aria-hidden="true">F</span>
          <span>Family Virtual Book</span>
        </Link>
        <button
          type="button"
          className="fvb-nav-toggle"
          aria-expanded={open}
          aria-controls="fvb-navigation-links"
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span className="sr-only">Toggle navigation</span>
        </button>
        <div id="fvb-navigation-links" className={`fvb-nav-links ${open ? "open" : ""}`}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`fvb-nav-link ${isActive(link.to) ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function FvbRoundel({ icon }: { icon: string }) {
  return <div className="fvb-roundel" aria-hidden="true">{icon}</div>;
}

export function FvbPlaque({ children }: { children: string }) {
  return <div className="fvb-plaque">{children}</div>;
}

export function FvbExhibitCard({ feature, countLabel }: { feature: FvbFeature; countLabel?: string }) {
  return (
    <article className="fvb-exhibit-card">
      <div className="fvb-frame">
        <div className="fvb-inner-mat">
          <FvbRoundel icon={feature.icon} />
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
          <FvbPlaque>{feature.plaque}</FvbPlaque>
          <span className="fvb-card-count">{countLabel || feature.countLabel}</span>
          <Link to={feature.path} className="fvb-card-link">
            {feature.actionLabel} →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function FvbHeroFrame({ totalPages }: { totalPages: number }) {
  return (
    <section className="fvb-hero-frame" aria-labelledby="archive-home-title">
      <div className="fvb-hero-mat">
        <div className="fvb-hero-panel">
          <FvbPlaque>PERMANENT COLLECTION</FvbPlaque>
          <h1 id="archive-home-title">Our Family Heritage</h1>
          <div className="fvb-hero-rule" aria-hidden="true" />
          <p>
            Explore the original {totalPages}-page Heritage Book while the Living Family Archive grows around it with
            family tree records, photographs, videos, oral histories, and historical documents.
          </p>
        </div>
      </div>
    </section>
  );
}

export function FvbArchiveQuote() {
  return (
    <aside className="fvb-archive-quote" aria-label="Archive quote">
      <p className="fvb-quote-label">ARCHIVE REFLECTION</p>
      <blockquote>“The history we preserve today becomes the inheritance of tomorrow.”</blockquote>
    </aside>
  );
}

export { FVB_FEATURES };

import { Link, useLocation } from "react-router-dom";

export function Navigation({ variant = "default" }: { variant?: "default" | "overlay" }) {
  const location = useLocation();
  const isReader = location.pathname === "/book" || (location.pathname === "/" && location.search.includes("page="));

  const links = [
    { to: "/", label: "Home", active: location.pathname === "/" && !isReader },
    { to: "/book", label: "Heritage Book", active: isReader },
    { to: "/tree", label: "Family Tree", active: location.pathname === "/tree" },
    { to: "/photos", label: "Photos", active: location.pathname === "/photos" },
    { to: "/videos", label: "Videos", active: location.pathname === "/videos" },
    { to: "/audio", label: "Audio", active: location.pathname === "/audio" },
    { to: "/documents", label: "Documents", active: location.pathname === "/documents" },
    { to: "/search", label: "Search", active: location.pathname === "/search" },
    { to: "/about", label: "About", active: location.pathname === "/about" },
  ];

  if (variant === "overlay") {
    // Compact variant for the book reader — minimal, doesn't disrupt
    const readerLinks = links.filter((link) => ["/", "/book", "/search", "/about"].includes(link.to));
    return (
      <nav className="nav-overlay" aria-label="Main navigation">
        {readerLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-overlay-link ${link.active ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="main-nav" aria-label="Main navigation">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-text">Francis Family Virtual Book</span>
        </Link>
        <div className="nav-links">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${link.active ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

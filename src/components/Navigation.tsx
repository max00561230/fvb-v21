import { Link, useLocation } from "react-router-dom";

export function Navigation({ variant = "default" }: { variant?: "default" | "overlay" }) {
  const location = useLocation();
  const isReader = location.pathname === "/";

  const links = [
    { to: "/", label: "Read the Book", active: isReader },
    { to: "/search", label: "Search", active: location.pathname === "/search" },
    { to: "/people", label: "People", active: location.pathname.startsWith("/people") },
  ];

  if (variant === "overlay") {
    // Compact variant for the book reader — minimal, doesn't disrupt
    return (
      <nav className="nav-overlay" aria-label="Main navigation">
        {links.map((link) => (
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
          <span className="nav-brand-text">Francis Family Heritage Book</span>
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

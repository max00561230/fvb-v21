import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "./Navigation";
import type { Person, PeopleManifest } from "../types";

export function PeopleDirectory() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "page">("name");

  useEffect(() => {
    fetch("/data/people.json")
      .then((r) => r.ok ? r.json() : { people: [] })
      .then((data: PeopleManifest) => {
        setPeople(data.people || []);
        setLoading(false);
      })
      .catch(() => {
        setPeople([]);
        setLoading(false);
      });
  }, []);

  const filtered = people
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.nicknames.some((n) => n.toLowerCase().includes(q)) ||
        p.places.some((p2) => p2.toLowerCase().includes(q)) ||
        p.occupations.some((o) => o.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "page") return (a.pageReferences[0] || 999) - (b.pageReferences[0] || 999);
      return 0;
    });

  if (loading) {
    return (
      <div className="people-page">
        <Navigation />
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
          <p>Loading people directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="people-page">
      <Navigation />
      <div className="people-page-content">
        <h1 className="people-page-title">People of the Heritage Book</h1>
        <p className="people-page-subtitle">
          {people.length} people identified in the Francis Family Heritage Book.
        </p>

        <div className="people-controls">
          <input
            type="search"
            className="people-search-input"
            placeholder="Filter by name, place, occupation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter people"
          />
          <div className="people-sort">
            <button
              className={`sort-btn ${sortBy === "name" ? "active" : ""}`}
              onClick={() => setSortBy("name")}
            >
              Sort by Name
            </button>
            <button
              className={`sort-btn ${sortBy === "page" ? "active" : ""}`}
              onClick={() => setSortBy("page")}
            >
              Sort by Page
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="people-empty">No people found matching "{searchQuery}"</p>
        ) : (
          <div className="people-grid">
            {filtered.map((person) => (
              <Link
                key={person.id}
                to={`/people/${person.id}`}
                className="person-card"
              >
                <h3 className="person-card-name">{person.fullName}</h3>
                {person.nicknames.length > 0 && (
                  <p className="person-card-nicknames">
                    aka: {person.nicknames.join(", ")}
                  </p>
                )}
                <div className="person-card-meta">
                  {person.birthDate && (
                    <span className="person-card-dates">
                      {person.birthDate}{person.deathDate ? ` – ${person.deathDate}` : ""}
                    </span>
                  )}
                  {person.occupations.length > 0 && (
                    <span className="person-card-occupation">
                      {person.occupations[0]}
                    </span>
                  )}
                  {person.pageReferences.length > 0 && (
                    <span className="person-card-pages">
                      Pages: {person.pageReferences.join(", ")}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
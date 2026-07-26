import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Fuse from "fuse.js";
import { Navigation } from "./Navigation";
import type { Person, SearchResult } from "../types";
import searchIndexData from "../data/search/search-index.json";

interface SearchIndexPage {
  pageNumber: number;
  pageId: string;
  text: string;
  combinedText: string;
  wordCount: number;
  avgConfidence: number;
}

interface SearchIndex {
  version: string;
  totalPages: number;
  totalPeople: number;
  pages: SearchIndexPage[];
  people: Person[];
}

const index = searchIndexData as unknown as SearchIndex;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Build Fuse.js indices from pre-built search index
  const ocrFuse = useMemo(() => {
    if (index.pages.length === 0) return null;
    return new Fuse(index.pages, {
      keys: ["combinedText"],
      includeScore: true,
      includeMatches: true,
      threshold: 0.4,
      minMatchCharLength: 2,
    });
  }, []);

  const peopleFuse = useMemo(() => {
    if (index.people.length === 0) return null;
    return new Fuse(index.people, {
      keys: ["fullName", "firstName", "lastName", "nicknames", "places", "churches", "schools", "militaryService", "businesses", "cemeteries", "occupations"],
      includeScore: true,
      threshold: 0.3,
    });
  }, []);

  const results = useMemo(() => {
    if (!query.trim() || (!ocrFuse && !peopleFuse)) return { pages: [], people: [], places: [], other: [] };

    const pages: SearchResult[] = [];
    const peopleResults: SearchResult[] = [];
    const places: SearchResult[] = [];
    const other: SearchResult[] = [];

    // OCR full-text search
    if (ocrFuse) {
      const ocrHits = ocrFuse.search(query).slice(0, 20);
      for (const hit of ocrHits) {
        const item = hit.item;
        const matchText = hit.matches?.[0]?.value || item.text || item.combinedText;
        const snippet = extractSnippet(matchText, query, 150);
        pages.push({
          type: "page",
          title: `Page ${item.pageNumber}`,
          snippet,
          pageReference: item.pageNumber,
          url: `/?page=${item.pageNumber}&search=${encodeURIComponent(query)}`,
          score: 1 - (hit.score || 0),
        });
      }
    }

    // People search
    if (peopleFuse) {
      const peopleHits = peopleFuse.search(query).slice(0, 15);
      for (const hit of peopleHits) {
        const person = hit.item as Person;
        const result: SearchResult = {
          type: "person",
          title: person.fullName,
          snippet: formatPersonSnippet(person),
          personId: person.id,
          url: `/people/${person.id}`,
          score: 1 - (hit.score || 0),
        };

        // Categorize by match type
        const matchKey = hit.matches?.[0]?.key;
        if (matchKey === "places") {
          places.push(result);
        } else if (matchKey && !["fullName", "firstName", "lastName", "nicknames"].includes(matchKey)) {
          other.push(result);
        } else {
          peopleResults.push(result);
        }
      }
    }

    return { pages, people: peopleResults, places, other };
  }, [query, ocrFuse, peopleFuse]);

  const totalResults = results.pages.length + results.people.length + results.places.length + results.other.length;

  return (
    <div className="search-page">
      <Navigation />
      <div className="search-page-content">
        <h1 className="search-page-title">Search the Heritage Book</h1>
        <p className="search-page-subtitle">
          Search through {index.totalPages} pages of text and {index.totalPeople} people records.
        </p>

        <div className="search-page-input-wrapper">
          <input
            type="search"
            className="search-page-input"
            placeholder="Search names, places, churches, schools, military, text..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchParams(e.target.value ? { q: e.target.value } : {}); }}
            aria-label="Search query"
            autoFocus
          />
        </div>

        {query.trim() && totalResults === 0 && (
          <p className="search-empty">No results found for "{query}"</p>
        )}

        {!query.trim() && (
          <div className="search-help">
            <h3>What you can search:</h3>
            <ul>
              <li><strong>Book Pages</strong> — Full-text OCR search across all {index.totalPages} pages</li>
              <li><strong>People</strong> — Names, nicknames, and family members</li>
              <li><strong>Places</strong> — Locations mentioned in the book</li>
              <li><strong>Churches, Schools, Military, Businesses, Cemeteries</strong> — Categorized references</li>
            </ul>
          </div>
        )}

        {totalResults > 0 && (
          <div className="search-results-grouped">
            <p className="search-results-count">{totalResults} results found</p>

            {results.pages.length > 0 && (
              <section className="search-section">
                <h2 className="search-section-title">Book Pages ({results.pages.length})</h2>
                <ul className="search-section-list">
                  {results.pages.map((r, i) => (
                    <li key={`page-${i}`}>
                      <Link to={r.url} className="search-result-card">
                        <span className="search-result-title">{r.title}</span>
                        <span className="search-result-snippet" dangerouslySetInnerHTML={{ __html: r.snippet }} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.people.length > 0 && (
              <section className="search-section">
                <h2 className="search-section-title">People ({results.people.length})</h2>
                <ul className="search-section-list">
                  {results.people.map((r, i) => (
                    <li key={`person-${i}`}>
                      <Link to={r.url} className="search-result-card">
                        <span className="search-result-title">{r.title}</span>
                        <span className="search-result-snippet">{r.snippet}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.places.length > 0 && (
              <section className="search-section">
                <h2 className="search-section-title">Places ({results.places.length})</h2>
                <ul className="search-section-list">
                  {results.places.map((r, i) => (
                    <li key={`place-${i}`}>
                      <Link to={r.url} className="search-result-card">
                        <span className="search-result-title">{r.title}</span>
                        <span className="search-result-snippet">{r.snippet}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.other.length > 0 && (
              <section className="search-section">
                <h2 className="search-section-title">Other ({results.other.length})</h2>
                <ul className="search-section-list">
                  {results.other.map((r, i) => (
                    <li key={`other-${i}`}>
                      <Link to={r.url} className="search-result-card">
                        <span className="search-result-title">{r.title}</span>
                        <span className="search-result-snippet">{r.snippet}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function extractSnippet(text: string, query: string, maxLen: number): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return escapeHtml(text.slice(0, maxLen) + "...");

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 80);
  const before = escapeHtml(text.slice(start, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length, end));
  return (start > 0 ? "..." : "") + before + `<mark>${match}</mark>` + after + (end < text.length ? "..." : "");
}

function formatPersonSnippet(person: Person): string {
  const parts: string[] = [];
  if (person.birthDate) parts.push(`Born: ${person.birthDate}`);
  if (person.deathDate) parts.push(`Died: ${person.deathDate}`);
  if (person.occupations?.length) parts.push(`Occupation: ${person.occupations.join(", ")}`);
  if (person.places?.length) parts.push(`Places: ${person.places.join(", ")}`);
  if (person.pageReferences?.length) parts.push(`Pages: ${person.pageReferences.join(", ")}`);
  return parts.join(" • ") || "No additional details";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

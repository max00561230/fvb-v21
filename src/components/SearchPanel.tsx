import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import type { BookPage } from "../types";
import searchIndexData from "../data/search/search-index.json";

interface SearchEntry {
  pageNumber: number;
  displayNumber: number;
  pageId: string;
  text: string;
  combinedText: string;
}

export function SearchPanel({
  onSelect
}: {
  pages: BookPage[];
  onSelect: (pageNumber: number) => void;
}) {
  const [query, setQuery] = useState("");
  const index = searchIndexData as unknown as { pages: SearchEntry[] };
  const fuse = useMemo(() => new Fuse(index.pages, {
    keys: ["combinedText", "text"],
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.35,
    minMatchCharLength: 2,
  }), [index.pages]);

  const results = useMemo(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const pageLookup = cleanQuery.match(/^(?:p(?:age)?\.?\s*)?(\d{1,2})$/i);
    if (pageLookup) {
      const pageNumber = Number(pageLookup[1]);
      const directPage = index.pages.find((page) => page.displayNumber === pageNumber);
      if (directPage) return [directPage];
    }

    return fuse.search(cleanQuery).slice(0, 20).map((h) => h.item);
  }, [fuse, index.pages, query]);

  return (
    <div className="search-panel">
      <input
        type="search"
        className="search-input"
        placeholder="Search book text or page number..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search book text"
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.pageNumber}>
              <button
                className="search-result-item"
                onClick={() => {
                  onSelect(r.displayNumber);
                  setQuery("");
                }}
              >
                <span className="search-page">Page {r.displayNumber}</span>
                <span className="search-snippet">{snippet(r.text)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && (
        <p className="search-empty">No matches found.</p>
      )}
    </div>
  );
}

function snippet(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 90 ? `${normalized.slice(0, 90).trim()}...` : normalized;
}

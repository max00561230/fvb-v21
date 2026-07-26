import { useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { BookPage } from "../types";
import { pageLabel } from "../lib/pageLabels";

interface SearchEntry {
  pageNumber: number;
  text: string;
}

export function SearchPanel({
  pages,
  onSelect
}: {
  pages: BookPage[];
  onSelect: (pageNumber: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ pageNumber: number; text: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fuseRef = useRef<Fuse<SearchEntry> | null>(null);
  const pageByNumber = new Map(pages.map((page) => [page.pageNumber, page]));

  useEffect(() => {
    fetch("/data/transcripts.json")
      .then((r) => r.json())
      .then((data) => {
        if (data.transcripts && data.transcripts.length) {
          fuseRef.current = new Fuse(data.transcripts, {
            keys: ["text"],
            includeScore: true,
            threshold: 0.4
          });
          setLoaded(true);
        }
      })
      .catch(() => {
        // Transcripts not yet available
      });
  }, []);

  useEffect(() => {
    if (!fuseRef.current || !query.trim()) {
      setResults([]);
      return;
    }

    const hits = fuseRef.current.search(query).slice(0, 20);
    setResults(hits.map((h) => h.item));
  }, [query]);

  return (
    <div className="search-panel">
      <input
        type="search"
        className="search-input"
        placeholder={loaded ? "Search book text..." : "Search (transcripts loading...)"}
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
                  onSelect(r.pageNumber);
                  setQuery("");
                  setResults([]);
                }}
              >
                <span className="search-page">{pageByNumber.get(r.pageNumber) ? pageLabel(pageByNumber.get(r.pageNumber)!) : `Page ${r.pageNumber}`}</span>
                <span className="search-snippet">{r.text.slice(0, 80)}...</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loaded && query.trim() && results.length === 0 && (
        <p className="search-empty">No matches found.</p>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import type { BookPage, Person } from "../types";
import searchIndexData from "../data/search/search-index.json";

interface SearchEntry {
  pageNumber: number;
  displayNumber: number;
  originalPrintedPageNumber?: number | null;
  pageId: string;
  sourceFile?: string;
  text: string;
  combinedText: string;
}

interface PageResult {
  kind: "page";
  key: string;
  displayNumber: number;
  originalPrintedPageNumber?: number | null;
  title: string;
  snippet: string;
  score: number;
}

interface PersonResult {
  kind: "person";
  key: string;
  displayNumber: number;
  title: string;
  snippet: string;
  score: number;
}

type SearchResult = PageResult | PersonResult;
type SearchMode = "all" | "pages" | "people";

export function SearchPanel({
  pages,
  onSelect
}: {
  pages: BookPage[];
  onSelect: (pageNumber: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("all");
  const [people, setPeople] = useState<Person[]>([]);
  const index = searchIndexData as unknown as { pages: SearchEntry[] };
  const pageByDisplayNumber = useMemo(
    () => new Map(pages.map((page) => [page.displayNumber, page])),
    [pages]
  );

  useEffect(() => {
    fetch("/data/people.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load people index: ${response.status}`);
        return response.json();
      })
      .then((data: { people: Person[] }) => setPeople(data.people ?? []))
      .catch(() => setPeople([]));
  }, []);

  const pageFuse = useMemo(() => new Fuse(index.pages, {
    keys: ["combinedText", "text"],
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.32,
    minMatchCharLength: 2,
  }), [index.pages]);

  const peopleFuse = useMemo(() => new Fuse(people, {
    keys: ["fullName", "places", "occupations", "churches", "schools"],
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.25,
    minMatchCharLength: 2,
  }), [people]);

  const results = useMemo(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const pageLookup = cleanQuery.match(/^(?:p(?:age)?\.?\s*)?(\d{1,2})$/i);
    if (pageLookup) {
      const pageNumber = Number(pageLookup[1]);
      const directPage = index.pages.find((page) => page.displayNumber === pageNumber);
      if (directPage && mode !== "people") {
        return [toPageResult(directPage, cleanQuery, pageByDisplayNumber, 0)];
      }
    }

    const pageResults = mode === "people"
      ? []
      : pageFuse.search(cleanQuery).slice(0, 20).map((hit) => toPageResult(hit.item, cleanQuery, pageByDisplayNumber, hit.score ?? 1));
    const personResults = mode === "pages"
      ? []
      : peopleFuse.search(cleanQuery).slice(0, 12).flatMap((hit) => toPersonResults(hit.item, cleanQuery, hit.score ?? 1));

    return [...pageResults, ...personResults]
      .sort((a, b) => a.score - b.score || a.displayNumber - b.displayNumber)
      .slice(0, 24);
  }, [index.pages, mode, pageByDisplayNumber, pageFuse, peopleFuse, query]);

  const resultLabel = results.length === 1 ? "1 result" : `${results.length} results`;

  return (
    <div className="search-panel">
      <input
        type="search"
        className="search-input"
        placeholder="Search names, places, text, or page number..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search book text"
        autoFocus
      />
      <div className="search-filters" role="tablist" aria-label="Search filters">
        {(["all", "pages", "people"] as SearchMode[]).map((filter) => (
          <button
            key={filter}
            type="button"
            className={mode === filter ? "active" : ""}
            onClick={() => setMode(filter)}
            role="tab"
            aria-selected={mode === filter}
          >
            {filterLabel(filter)}
          </button>
        ))}
      </div>
      {results.length > 0 && (
        <>
        <p className="search-count">{resultLabel}</p>
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.key}>
              <button
                className="search-result-item"
                onClick={() => {
                  onSelect(r.displayNumber);
                  setQuery("");
                }}
              >
                <span className="search-result-heading">
                  <span className="search-page">{r.title}</span>
                  <span className="search-kind">{r.kind === "person" ? "Person" : "Page text"}</span>
                </span>
                <span className="search-snippet">{highlightText(r.snippet, query)}</span>
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
      {query.trim() && results.length === 0 && (
        <p className="search-empty">No matches found.</p>
      )}
    </div>
  );
}

function filterLabel(filter: SearchMode) {
  if (filter === "pages") return "Pages";
  if (filter === "people") return "People";
  return "All";
}

function toPageResult(
  entry: SearchEntry,
  query: string,
  pageByDisplayNumber: Map<number, BookPage>,
  score: number
): PageResult {
  const page = pageByDisplayNumber.get(entry.displayNumber);
  const printedNumber = entry.originalPrintedPageNumber ?? page?.originalPrintedPageNumber ?? null;
  const title = printedNumber && printedNumber !== entry.displayNumber
    ? `Page ${entry.displayNumber} (printed ${printedNumber})`
    : `Page ${entry.displayNumber}`;

  return {
    kind: "page",
    key: `page-${entry.pageId}`,
    displayNumber: entry.displayNumber,
    originalPrintedPageNumber: printedNumber,
    title,
    snippet: snippetAround(entry.text || entry.combinedText, query),
    score,
  };
}

function toPersonResults(person: Person, query: string, score: number): PersonResult[] {
  const pageReferences = person.pageReferences.length > 0 ? person.pageReferences : [1];
  const detailParts = [
    person.places.length ? person.places.join(", ") : "",
    person.occupations.length ? person.occupations.join(", ") : "",
  ].filter(Boolean);
  const detail = detailParts.length ? detailParts.join(" | ") : `Referenced on page ${pageReferences.join(", ")}`;

  return pageReferences.slice(0, 3).map((displayNumber) => ({
    kind: "person",
    key: `person-${person.id}-${displayNumber}`,
    displayNumber,
    title: `${person.fullName} - Page ${displayNumber}`,
    snippet: snippetAround(`${person.fullName}. ${detail}`, query),
    score,
  }));
}

function snippetAround(text: string, query: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 140) return normalized;

  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 1);
  const lowerText = normalized.toLowerCase();
  const matchIndex = terms.reduce((best, term) => {
    const found = lowerText.indexOf(term);
    return found >= 0 && (best < 0 || found < best) ? found : best;
  }, -1);
  const start = Math.max(0, (matchIndex < 0 ? 0 : matchIndex) - 55);
  const end = Math.min(normalized.length, start + 140);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalized.length ? "..." : "";

  return `${prefix}${normalized.slice(start, end).trim()}${suffix}`;
}

function highlightText(text: string, query: string) {
  const terms = query.trim().split(/\s+/).filter((term) => term.length > 1);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "ig");
  return text.split(pattern).map((part, index) => (
    terms.some((term) => part.toLowerCase() === term.toLowerCase())
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : part
  ));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

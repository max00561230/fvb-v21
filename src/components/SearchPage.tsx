import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Fuse from "fuse.js";
import { FvbArchiveNavigation, FvbMuseumHeader, FvbPlaque } from "./FvbMuseumComponents";
import type { Person } from "../types";
import searchIndexData from "../data/search/search-index.json";

interface SearchIndexPage {
  pageNumber: number;
  readingPosition: number;
  displayNumber: number;
  originalPrintedPageNumber: number | null;
  pageId: string;
  sourceFile: string;
  title?: string;
  caption?: string;
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
const SEARCHABLE_PERSON_FIELDS = [
  "fullName",
  "firstName",
  "lastName",
  "nicknames",
  "places",
  "churches",
  "schools",
  "militaryService",
  "businesses",
  "cemeteries",
  "occupations",
  "pageReferences",
] as const;

const SEARCHABLE_PAGE_FIELDS = [
  "combinedText",
  "text",
  "caption",
  "title",
  "sourceFile",
] as const;

type SearchCategory =
  | "Page lookup"
  | "Page OCR text"
  | "Page caption"
  | "Person record"
  | "Family name"
  | "First name"
  | "Nickname"
  | "Place"
  | "Church"
  | "School"
  | "Military service"
  | "Business"
  | "Cemetery"
  | "Occupation"
  | "Linked page";

interface GlobalSearchResult {
  id: string;
  title: string;
  snippet: string;
  category: SearchCategory;
  source: string;
  score: number;
  pageReference?: number;
  personId?: string;
  pageReferences?: number[];
  primaryUrl: string;
  primaryAction: string;
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Build Fuse.js indices from pre-built search index
  const ocrFuse = useMemo(() => {
    if (index.pages.length === 0) return null;
    return new Fuse(index.pages, {
      keys: SEARCHABLE_PAGE_FIELDS as unknown as string[],
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
      threshold: 0.35,
      minMatchCharLength: 2,
    });
  }, []);

  const peopleFuse = useMemo(() => {
    if (index.people.length === 0) return null;
    return new Fuse(index.people, {
      keys: SEARCHABLE_PERSON_FIELDS as unknown as string[],
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
      threshold: 0.3,
      minMatchCharLength: 2,
    });
  }, []);

  const results = useMemo(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery || (!ocrFuse && !peopleFuse)) return [];

    const nextResults: GlobalSearchResult[] = [];
    const seen = new Set<string>();

    const addResult = (result: GlobalSearchResult) => {
      if (seen.has(result.id)) return;
      seen.add(result.id);
      nextResults.push(result);
    };

    const pageLookup = parsePageLookup(cleanQuery);
    if (pageLookup !== null) {
      const page = index.pages.find((p) => p.displayNumber === pageLookup);
      if (page) {
        addResult({
          id: `lookup-page-${page.displayNumber}`,
          title: `Page ${page.displayNumber}`,
          snippet: pageSummary(page),
          category: "Page lookup",
          source: pageSourceLabel(page),
          pageReference: page.displayNumber,
          primaryUrl: readerUrl(page.displayNumber, cleanQuery),
          primaryAction: "Open page",
          score: 2,
        });
      }
    }

    // OCR full-text search
    if (ocrFuse) {
      const ocrHits = ocrFuse.search(cleanQuery).slice(0, 24);
      for (const hit of ocrHits) {
        const item = hit.item;
        const match = hit.matches?.find((m) => typeof m.value === "string" && m.value.trim());
        const matchText = match?.value || item.caption || item.title || item.text || item.combinedText;
        const displayNumber = item.displayNumber ?? item.pageNumber;
        addResult({
          id: `ocr-page-${displayNumber}`,
          title: `Page ${displayNumber}`,
          snippet: extractSnippet(matchText, cleanQuery, 190),
          category: pageMatchCategory(match?.key),
          source: pageSourceLabel(item),
          pageReference: displayNumber,
          primaryUrl: readerUrl(displayNumber, cleanQuery),
          primaryAction: "Open page",
          score: 1 - (hit.score || 0),
        });
      }
    }

    // People search
    if (peopleFuse) {
      const peopleHits = peopleFuse.search(cleanQuery).slice(0, 24);
      for (const hit of peopleHits) {
        const person = hit.item as Person;
        const matchKey = hit.matches?.[0]?.key;
        const matchText = stringifyMatchValue(hit.matches?.[0]?.value) || formatPersonSnippet(person);
        addResult({
          id: `person-${person.id}`,
          title: person.fullName,
          snippet: extractSnippet(matchText, cleanQuery, 190) || escapeHtml(formatPersonSnippet(person)),
          category: personMatchCategory(matchKey),
          source: `People record${matchKey ? `: ${personFieldLabel(matchKey)}` : ""}`,
          personId: person.id,
          pageReferences: person.pageReferences,
          primaryUrl: `/people/${person.id}`,
          primaryAction: "View person",
          score: 1 - (hit.score || 0),
        });
      }
    }

    return nextResults.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }, [query, ocrFuse, peopleFuse]);

  const totalResults = results.length;

  return (
    <div className="search-page fvb-gallery-shell">
      <FvbMuseumHeader />
      <FvbArchiveNavigation />
      <div className="search-page-content">
        <FvbPlaque>RESEARCH DESK</FvbPlaque>
        <h1 className="search-page-title">Global Search</h1>
        <p className="search-page-subtitle">
          Search the preserved Heritage Book now. Photos, videos, audio, documents, and tree records are ready to join
          this search as approved archive data is added.
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
              <li><strong>Family references</strong> — Names and linked page records from the book metadata</li>
              <li><strong>Page Lookup</strong> — Enter a visible page number, such as 89</li>
              <li><strong>Places</strong> — Locations mentioned in the book</li>
              <li><strong>Churches, Schools, Military, Businesses, Cemeteries</strong> — Categorized references</li>
            </ul>
          </div>
        )}

        {totalResults > 0 && (
          <div className="search-results-grouped">
            <p className="search-results-count">{totalResults} results found</p>

            <section className="search-section">
              <h2 className="search-section-title">Matches</h2>
              <ul className="search-section-list">
                {results.map((result) => (
                  <li key={result.id}>
                    <article className="search-result-card">
                      <div className="search-result-header">
                        <span className="search-result-title">{result.title}</span>
                        <span className="search-result-meta">{result.category} · {result.source}</span>
                      </div>
                      <span className="search-result-snippet" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                      <div className="search-result-actions">
                        <Link to={result.primaryUrl} className="search-result-action">
                          {result.primaryAction}
                        </Link>
                        {result.pageReference && (
                          <Link to={readerUrl(result.pageReference, query)} className="search-result-action secondary">
                            Page {result.pageReference}
                          </Link>
                        )}
                        {result.pageReferences?.slice(0, 6).map((pageNumber) => (
                          <Link
                            key={`${result.id}-${pageNumber}`}
                            to={readerUrl(pageNumber, query)}
                            className="search-result-action secondary"
                          >
                            Page {pageNumber}
                          </Link>
                        ))}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function parsePageLookup(query: string): number | null {
  const match = query.match(/^(?:p(?:age)?\.?\s*)?(\d{1,2})$/i);
  if (!match) return null;
  const pageNumber = Number(match[1]);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > index.totalPages) return null;
  return pageNumber;
}

function readerUrl(pageNumber: number, query?: string): string {
  const params = new URLSearchParams({ page: String(pageNumber) });
  if (query?.trim()) params.set("search", query.trim());
  return `/book?${params.toString()}`;
}

function pageSummary(page: SearchIndexPage): string {
  const printed = page.originalPrintedPageNumber ? `Original printed page ${page.originalPrintedPageNumber}` : "No original printed page";
  const source = page.sourceFile ? `Source file ${page.sourceFile}` : page.pageId;
  return escapeHtml(`${printed}. ${source}. ${page.text ? plainSnippet(page.text, 110) : "No OCR text available."}`);
}

function pageSourceLabel(page: SearchIndexPage): string {
  const printed = page.originalPrintedPageNumber ? `original ${page.originalPrintedPageNumber}` : "no printed number";
  return `${page.pageId}, ${printed}`;
}

function pageMatchCategory(key?: string): SearchCategory {
  if (key === "caption" || key === "title" || key === "sourceFile") return "Page caption";
  return "Page OCR text";
}

function personMatchCategory(key?: string): SearchCategory {
  switch (key) {
    case "lastName":
      return "Family name";
    case "firstName":
      return "First name";
    case "nicknames":
      return "Nickname";
    case "places":
      return "Place";
    case "churches":
      return "Church";
    case "schools":
      return "School";
    case "militaryService":
      return "Military service";
    case "businesses":
      return "Business";
    case "cemeteries":
      return "Cemetery";
    case "occupations":
      return "Occupation";
    case "pageReferences":
      return "Linked page";
    default:
      return "Person record";
  }
}

function personFieldLabel(key: string): string {
  switch (key) {
    case "fullName":
      return "full name";
    case "firstName":
      return "first name";
    case "lastName":
      return "family name";
    case "nicknames":
      return "nickname";
    case "pageReferences":
      return "linked pages";
    case "militaryService":
      return "military service";
    default:
      return key;
  }
}

function stringifyMatchValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function extractSnippet(text: string, query: string, maxLen: number): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return escapeHtml(plainSnippet(text, maxLen));

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 80);
  const before = escapeHtml(text.slice(start, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length, end));
  return (start > 0 ? "..." : "") + before + `<mark>${match}</mark>` + after + (end < text.length ? "..." : "");
}

function plainSnippet(text: string, maxLen: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen).trim()}...` : normalized;
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

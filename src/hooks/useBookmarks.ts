import { useEffect, useState } from "react";

const KEY = "fvb-v21-bookmarks";
const VERSION_KEY = "fvb-v21-bookmarks-version";
const CURRENT_VERSION = "reading-order-page-002-to-089";

function migrateReadingPosition(page: number) {
  if (page === 2) return 89;
  if (page >= 3 && page <= 89) return page - 1;
  return page;
}

function normalizeBookmarks(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [...new Set(value
    .filter((page): page is number => Number.isInteger(page))
    .filter((page) => page >= 1 && page <= 91))]
    .sort((a, b) => a - b);
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(KEY);
      const saved = stored ? normalizeBookmarks(JSON.parse(stored)) : [];

      if (localStorage.getItem(VERSION_KEY) !== CURRENT_VERSION) {
        const migrated = normalizeBookmarks(saved.map(migrateReadingPosition));
        localStorage.setItem(KEY, JSON.stringify(migrated));
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        return migrated;
      }

      return saved;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  function toggle(page: number) {
    setBookmarks((current) =>
      current.includes(page)
        ? current.filter((item) => item !== page)
        : [...current, page].sort((a, b) => a - b)
    );
  }

  return {
    bookmarks,
    toggle,
    isBookmarked: (page: number) => bookmarks.includes(page)
  };
}

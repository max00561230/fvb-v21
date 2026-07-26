import { useEffect, useState } from "react";

const KEY = "fvb-v21-bookmarks";
const VERSION_KEY = "fvb-v21-bookmarks-version";
const CURRENT_VERSION = "reading-order-page-002-to-089-page-007-inactive";

function migratePage2Move(page: number) {
  if (page === 2) return 89;
  if (page >= 3 && page <= 89) return page - 1;
  return page;
}

function migrateDuplicateRemoval(page: number) {
  if (page === 6) return 5;
  if (page >= 7 && page <= 87) return page - 1;
  if (page === 91) return 87;
  return page;
}

function normalizeBookmarks(value: unknown, maxPage = 90) {
  if (!Array.isArray(value)) return [];

  return [...new Set(value
    .filter((page): page is number => Number.isInteger(page))
    .filter((page) => page >= 1 && page <= maxPage))]
    .sort((a, b) => a - b);
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(KEY);
      const saved = stored ? normalizeBookmarks(JSON.parse(stored), 91) : [];
      const savedVersion = localStorage.getItem(VERSION_KEY);

      if (savedVersion !== CURRENT_VERSION) {
        const page2Moved = savedVersion === "reading-order-page-002-to-089"
          ? saved
          : saved.map(migratePage2Move);
        const migrated = normalizeBookmarks(page2Moved.map(migrateDuplicateRemoval));
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

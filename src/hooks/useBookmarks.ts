import { useEffect, useState } from "react";

const KEY = "fvb-v21-bookmarks";
const VERSION_KEY = "fvb-v21-bookmarks-version";
const CURRENT_VERSION = "authoritative-reading-order-90";
const MAX_PAGE = 90;

function normalizeBookmarks(value: unknown, maxPage = MAX_PAGE) {
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
      const saved = stored ? normalizeBookmarks(JSON.parse(stored), MAX_PAGE) : [];
      const savedVersion = localStorage.getItem(VERSION_KEY);

      if (savedVersion !== CURRENT_VERSION) {
        localStorage.setItem(KEY, JSON.stringify(saved));
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        return saved;
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

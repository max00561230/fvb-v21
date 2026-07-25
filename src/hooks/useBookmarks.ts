import { useEffect, useState } from "react";

const KEY = "fvb-v21-bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : [];
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
import { useCallback, useEffect, useState } from "react";

function readPage(total: number) {
  const value = Number(
    new URL(window.location.href).searchParams.get("page")
  );

  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(total, Math.floor(value)));
}

export function useBookPage(totalPages: number) {
  const [pageNumber, setState] = useState(() => readPage(totalPages));

  const setPageNumber = useCallback(
    (next: number) => {
      const safe = Math.max(1, Math.min(totalPages, next));
      setState(safe);

      const url = new URL(window.location.href);
      url.searchParams.set("page", String(safe));
      window.history.pushState({}, "", url);
    },
    [totalPages]
  );

  useEffect(() => {
    const handler = () => setState(readPage(totalPages));
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [totalPages]);

  return { pageNumber, setPageNumber };
}
import { useEffect, useState } from "react";
import type { BookPage, PageHotspot, HotspotsManifest } from "../types";
import { ResponsivePageImage } from "./ResponsivePageImage";
import { ZoomPageViewer } from "./ZoomPageViewer";
import { HotspotLayer } from "./HotspotLayer";
import { SearchPanel } from "./SearchPanel";
import { ThumbnailStrip } from "./ThumbnailStrip";
import { Navigation } from "./Navigation";
import { useBookPage } from "../hooks/useBookPage";
import { useBookmarks } from "../hooks/useBookmarks";

export function BookViewer({
  manifest
}: {
  manifest: { pages: BookPage[]; totalPages: number };
}) {
  const { pageNumber, setPageNumber } = useBookPage(manifest.totalPages);
  const { bookmarks, toggle, isBookmarked } = useBookmarks();
  const [zoomMode, setZoomMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [hotspots, setHotspots] = useState<PageHotspot[]>([]);

  const currentPage = manifest.pages.find((p) => p.displayNumber === pageNumber) ?? manifest.pages[0];

  // Load hotspots for current page
  useEffect(() => {
    fetch("/data/hotspots.json")
      .then((r) => r.json())
      .then((data: HotspotsManifest) => {
        const pageHotspots = data.hotspots.filter((h) => h.pageNumber === currentPage.displayNumber);
        setHotspots(pageHotspots);
      })
      .catch(() => setHotspots([]));
  }, [currentPage.displayNumber]);

  // Fullscreen handling
  useEffect(() => {
    if (fullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [fullscreen]);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && pageNumber > 1) {
        setPageNumber(pageNumber - 1);
      } else if (e.key === "ArrowRight" && pageNumber < manifest.totalPages) {
        setPageNumber(pageNumber + 1);
      } else if (e.key === "Home") {
        setPageNumber(1);
      } else if (e.key === "End") {
        setPageNumber(manifest.totalPages);
      } else if (e.key === "f" || e.key === "F") {
        setFullscreen((f) => !f);
      } else if (e.key === "z" || e.key === "Z") {
        setZoomMode((z) => !z);
      } else if (e.key === "t" || e.key === "T") {
        setShowThumbnails((s) => !s);
      } else if (e.key === "b" || e.key === "B") {
        toggle(pageNumber);
      } else if (e.key === "Escape") {
        if (zoomMode) setZoomMode(false);
        else if (showThumbnails) setShowThumbnails(false);
        else if (showSearch) setShowSearch(false);
        else if (showBookmarks) setShowBookmarks(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pageNumber, manifest.totalPages, setPageNumber, toggle, zoomMode, showThumbnails, showSearch, showBookmarks]);

  const containerRef = (node: HTMLDivElement | null) => {
    if (node) {
      // Scroll to top on page change
      node.scrollTop = 0;
    }
  };

  return (
    <div className={`book-viewer ${fullscreen ? "fullscreen" : ""}`}>
      {/* Top toolbar */}
      <header className="book-toolbar" role="toolbar" aria-label="Book controls">
        <button
          className="toolbar-btn"
          onClick={() => setPageNumber(pageNumber - 1)}
          disabled={pageNumber <= 1}
          aria-label="Previous page"
        >
          ‹
        </button>
        <span className="page-indicator">
          Page {pageNumber} of {manifest.totalPages}
        </span>
        <button
          className="toolbar-btn"
          onClick={() => setPageNumber(pageNumber + 1)}
          disabled={pageNumber >= manifest.totalPages}
          aria-label="Next page"
        >
          ›
        </button>

        <div className="toolbar-divider" />

        <button
          className={`toolbar-btn ${zoomMode ? "active" : ""}`}
          onClick={() => setZoomMode((z) => !z)}
          aria-label="Toggle zoom"
          title="Zoom (Z)"
        >
          🔍
        </button>
        <button
          className={`toolbar-btn ${fullscreen ? "active" : ""}`}
          onClick={() => setFullscreen((f) => !f)}
          aria-label="Toggle fullscreen"
          title="Fullscreen (F)"
        >
          ⛶
        </button>
        <button
          className={`toolbar-btn ${showThumbnails ? "active" : ""}`}
          onClick={() => setShowThumbnails((s) => !s)}
          aria-label="Toggle thumbnails"
          title="Thumbnails (T)"
        >
          ▦
        </button>
        <button
          className={`toolbar-btn ${showSearch ? "active" : ""}`}
          onClick={() => setShowSearch((s) => !s)}
          aria-label="Toggle search"
          title="Search"
        >
          🔎
        </button>
        <button
          className={`toolbar-btn ${isBookmarked(pageNumber) ? "active" : ""}`}
          onClick={() => toggle(pageNumber)}
          aria-label="Toggle bookmark"
          title="Bookmark (B)"
        >
          {isBookmarked(pageNumber) ? "★" : "☆"}
        </button>
        <button
          className={`toolbar-btn ${showBookmarks ? "active" : ""}`}
          onClick={() => setShowBookmarks((s) => !s)}
          aria-label="Show bookmarks"
          title="Bookmarks list"
        >
          📑
        </button>
        <div className="toolbar-divider" />
        <Navigation variant="overlay" />
      </header>

      {/* Search panel */}
      {showSearch && (
        <div className="search-overlay">
          <SearchPanel
            pages={manifest.pages}
            onSelect={(p) => {
              setPageNumber(p);
              setShowSearch(false);
            }}
          />
        </div>
      )}

      {/* Bookmarks panel */}
      {showBookmarks && (
        <div className="bookmarks-panel">
          <h3>Bookmarks</h3>
          {bookmarks.length === 0 ? (
            <p className="bookmarks-empty">No bookmarks yet. Press ★ or B to bookmark a page.</p>
          ) : (
            <ul className="bookmarks-list">
              {bookmarks.map((p) => (
                <li key={p}>
                  <button
                    className="bookmark-item"
                    onClick={() => {
                      setPageNumber(p);
                      setShowBookmarks(false);
                    }}
                  >
                    Page {p}
                  </button>
                  <button
                    className="bookmark-remove"
                    onClick={() => toggle(p)}
                    aria-label={`Remove bookmark for page ${p}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Page display area */}
      <main className="book-page-area" ref={containerRef}>
        {zoomMode ? (
          <ZoomPageViewer page={currentPage} />
        ) : (
          <div className="page-container">
            <ResponsivePageImage page={currentPage} priority={pageNumber <= 2} />
            <HotspotLayer hotspots={hotspots} />
          </div>
        )}
      </main>

      {/* Thumbnail strip */}
      {showThumbnails && (
        <ThumbnailStrip
          pages={manifest.pages}
          currentPage={pageNumber}
          onSelect={(p) => {
            setPageNumber(p);
            setShowThumbnails(false);
          }}
        />
      )}

      {/* Bottom nav for mobile */}
      <nav className="bottom-nav" aria-label="Page navigation">
        <button
          className="bottom-nav-btn"
          onClick={() => setPageNumber(pageNumber - 1)}
          disabled={pageNumber <= 1}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>
        <span className="bottom-nav-page">{pageNumber} / {manifest.totalPages}</span>
        <button
          className="bottom-nav-btn"
          onClick={() => setPageNumber(pageNumber + 1)}
          disabled={pageNumber >= manifest.totalPages}
          aria-label="Next page"
        >
          Next ›
        </button>
      </nav>
      <a className="reader-admin-entry" href="/admin">
        Admin Tools
      </a>
    </div>
  );
}

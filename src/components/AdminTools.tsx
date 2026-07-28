import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { BookPage, PagesManifest } from "../types";

const RESTORATION_STORE_KEY = "fvb-phase-1b-photo-restorations";

type RestorationRecordSummary = {
  pageId: string;
  readingPosition: number;
  displayNumber: number;
  sourceFile: string;
  status: string;
  updatedAt: string;
};

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readRestorationRecords(): RestorationRecordSummary[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESTORATION_STORE_KEY) || "");
    return Object.values(parsed?.records ?? {}) as RestorationRecordSummary[];
  } catch {
    return [];
  }
}

export function AdminTools() {
  const [manifest, setManifest] = useState<PagesManifest | null>(null);
  const [records, setRecords] = useState<RestorationRecordSummary[]>(() => readRestorationRecords());

  useEffect(() => {
    fetch("/data/pages.json")
      .then((response) => response.json())
      .then((data: PagesManifest) => setManifest(data))
      .catch(() => setManifest(null));
  }, []);

  useEffect(() => {
    const refresh = () => setRecords(readRestorationRecords());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const pageById = useMemo(() => new Map((manifest?.pages ?? []).map((page: BookPage) => [page.pageId, page])), [manifest]);
  const approvedCount = records.filter((record) => record.status === "approved").length;
  const draftCount = records.filter((record) => record.status !== "approved" && record.status !== "published").length;

  const exportPackage = () => {
    const freshRecords = readRestorationRecords();
    downloadJson(
      {
        schemaVersion: "fvb-v22-restoration-admin-package-v1",
        exportedAt: new Date().toISOString(),
        authoritativeProject: "fvb-v21",
        localOnly: true,
        privacyNote: "Recovered photos and draft data are exported from browser localStorage. No database or remote upload is used.",
        manifestCheckpoints: {
          totalVisiblePages: manifest?.totalPages ?? 90,
          visiblePage89: pageById.get("page-002") ?? null,
        },
        records: freshRecords,
      },
      "fvb-v22-restoration-admin-package.json",
    );
  };

  return (
    <main className="admin-tools-page">
      <section className="admin-tools-hero">
        <p className="admin-eyebrow">FVB v22</p>
        <h1>Admin Tools</h1>
        <p>
          Private browser-local tools for reviewing and exporting photo restoration work. `fvb-v21` is the
          authoritative repo and build for reader, search, OCR, thumbnails, page selector, and restoration page order.
        </p>
      </section>

      <section className="admin-tools-grid" aria-label="Admin tools">
        <Link className="admin-tool-card" to="/admin/photo-restoration">
          <span>Photo Restoration</span>
          <strong>Open workspace</strong>
          <p>Select a page, upload locally, drag, resize, rotate, crop, preview, save, approve, and export.</p>
        </Link>

        <div className="admin-tool-card">
          <span>Restoration History/Drafts</span>
          <strong>{records.length} local record{records.length === 1 ? "" : "s"}</strong>
          <p>{draftCount} draft/review record{draftCount === 1 ? "" : "s"} and {approvedCount} approved export-ready record{approvedCount === 1 ? "" : "s"} in this browser.</p>
        </div>

        <button className="admin-tool-card admin-tool-button" type="button" onClick={exportPackage}>
          <span>Export Restoration Package</span>
          <strong>Download local package</strong>
          <p>Exports current browser-local restoration records for offline processing without modifying source scans.</p>
        </button>
      </section>

      <section className="admin-drafts-panel">
        <h2>Recent Drafts</h2>
        {records.length === 0 ? (
          <p>No local restoration drafts in this browser yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Visible page</th>
                <th>Page ID</th>
                <th>Source</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {records
                .slice()
                .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
                .slice(0, 12)
                .map((record) => {
                  const page = pageById.get(record.pageId);
                  return (
                    <tr key={record.pageId}>
                      <td>{page?.displayNumber ?? record.displayNumber}</td>
                      <td>{record.pageId}</td>
                      <td>{page?.sourceFile ?? record.sourceFile}</td>
                      <td>{record.status}</td>
                      <td>{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : ""}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

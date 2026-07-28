import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { BookPage, PagesManifest } from "../types";

let fabricModule: any = null;
let jszipModule: any = null;

async function loadFabric() {
  if (!fabricModule) fabricModule = await import("fabric");
  return fabricModule;
}

async function loadJsZip() {
  if (!jszipModule) jszipModule = await import("jszip");
  return jszipModule;
}

const STORAGE_KEY = "fvb-phase-1b-photo-restorations";
const AUTOSAVE_MS = 500;
const RESTORATION_STATUSES = [
  "unreviewed",
  "region-marked",
  "photo-added",
  "draft",
  "ready-for-review",
  "approved",
  "rejected",
  "published",
] as const;

type RestorationStatus = (typeof RESTORATION_STATUSES)[number];
type ViewMode = "restored" | "original" | "side-by-side" | "overlay";
type SidebarTab = "tools" | "help";
type ImageAsset = {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  addedAt: string;
};
type RectCoords = { x: number; y: number; width: number; height: number };
type PlacementCoords = {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};
type CropSettings = {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};
type Revision = {
  revision: number;
  status: RestorationStatus;
  createdAt: string;
  locked: boolean;
  snapshot: RestorationRecord;
};
type RestorationRecord = {
  schemaVersion: "phase-1b-local-v1";
  pageId: string;
  readingPosition: number;
  displayNumber: number;
  sourceFile: string;
  originalDimensions: { width: number; height: number };
  notes: string;
  createdAt: string;
  status: RestorationStatus;
  revision: number;
  publishedRevision: number | null;
  updatedAt: string;
  region: RectCoords | null;
  placement: PlacementCoords | null;
  crop: CropSettings;
  recoveredPhoto: ImageAsset | null;
  revisions: Revision[];
};
type ProjectStore = {
  schemaVersion: "phase-1b-local-store-v1";
  updatedAt: string;
  records: Record<string, RestorationRecord>;
};

function emptyStore(): ProjectStore {
  return { schemaVersion: "phase-1b-local-store-v1", updatedAt: new Date().toISOString(), records: {} };
}

function normalizeRect(rect: RectCoords, page: BookPage) {
  return {
    x: rect.x / page.width,
    y: rect.y / page.height,
    width: rect.width / page.width,
    height: rect.height / page.height,
  };
}

function normalizePlacement(placement: PlacementCoords, page: BookPage) {
  return {
    x: placement.x / page.width,
    y: placement.y / page.height,
    width: placement.width / page.width,
    height: placement.height / page.height,
    scaleX: placement.scaleX,
    scaleY: placement.scaleY,
    rotation: placement.rotation,
  };
}

function makeRecord(page: BookPage, previous?: RestorationRecord): RestorationRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: "phase-1b-local-v1",
    pageId: page.pageId,
    readingPosition: page.readingPosition,
    displayNumber: page.displayNumber,
    sourceFile: page.sourceFile,
    originalDimensions: { width: page.width, height: page.height },
    notes: previous?.notes ?? "",
    createdAt: previous?.createdAt ?? now,
    status: previous?.status ?? "unreviewed",
    revision: previous?.revision ?? 1,
    publishedRevision: previous?.publishedRevision ?? null,
    updatedAt: previous?.updatedAt ?? now,
    region: previous?.region ?? null,
    placement: previous?.placement ?? null,
    crop: previous?.crop ?? { enabled: false, x: 0, y: 0, width: 0, height: 0 },
    recoveredPhoto: previous?.recoveredPhoto ?? null,
    revisions: previous?.revisions ?? [],
  };
}

function readStore(): ProjectStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
    if (parsed?.schemaVersion === "phase-1b-local-store-v1") return parsed;
  } catch {}
  return emptyStore();
}

async function loadImage(src: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
  });
  return image;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string, type = "application/json") {
  downloadBlob(new Blob([text], { type }), filename);
}

function recordForExport(record: RestorationRecord, page: BookPage) {
  return {
    ...record,
    readingPosition: page.readingPosition,
    displayNumber: page.displayNumber,
    sourceFile: page.sourceFile,
    originalDimensions: { width: page.width, height: page.height },
    regionNormalized: record.region ? normalizeRect(record.region, page) : null,
    placementNormalized: record.placement ? normalizePlacement(record.placement, page) : null,
  };
}

async function renderFullResolutionPreview(page: BookPage, record: RestorationRecord) {
  const canvas = document.createElement("canvas");
  canvas.width = page.width;
  canvas.height = page.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create export canvas");

  const original = await loadImage(page.masterSrc);
  ctx.drawImage(original, 0, 0, page.width, page.height);

  if (record.recoveredPhoto && record.placement) {
    const photo = await loadImage(record.recoveredPhoto.dataUrl);
    const p = record.placement;
    ctx.save();
    if (record.crop.enabled) {
      ctx.beginPath();
      ctx.rect(record.crop.x, record.crop.y, record.crop.width, record.crop.height);
      ctx.clip();
    }
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.drawImage(photo, -p.width / 2, -p.height / 2, p.width, p.height);
    ctx.restore();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Unable to render PNG"))), "image/png");
  });
}

export function PhotoRestoration() {
  const [manifest, setManifest] = useState<PagesManifest | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [records, setRecords] = useState<Record<string, RestorationRecord>>({});
  const [record, setRecord] = useState<RestorationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("restored");
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  const [zoom, setZoom] = useState(1);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("tools");
  const [undoStack, setUndoStack] = useState<RestorationRecord[]>([]);
  const [redoStack, setRedoStack] = useState<RestorationRecord[]>([]);
  const [dirty, setDirty] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const scaleRef = useRef(1);
  const autosaveRef = useRef<number | null>(null);

  const pages = manifest?.pages ?? [];
  const selectedPage = useMemo(
    () => pages.find((page) => page.pageId === selectedPageId) ?? pages[0] ?? null,
    [pages, selectedPageId],
  );
  const currentExportRecord = record && selectedPage ? recordForExport(record, selectedPage) : null;
  const savedRecordList = useMemo(
    () =>
      Object.values(records)
        .slice()
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    [records],
  );

  useEffect(() => {
    Promise.all([fetch("/data/pages.json").then((r) => r.json()), fetch("/data/reading-order.json").then((r) => r.json())])
      .then(([runtimeManifest, readingOrder]) => {
        const runtimePages = runtimeManifest.pages ?? [];
        const authorityMatches =
          runtimeManifest.totalPages === 90 &&
          runtimePages.length === 90 &&
          readingOrder.totalPages === 90 &&
          runtimePages.every((page: BookPage, index: number) => page.pageId === readingOrder.pages?.[index]?.pageId);
        if (!authorityMatches) throw new Error("Runtime pages manifest does not match authoritative reading order.");
        const store = readStore();
        setManifest(runtimeManifest);
        setRecords(store.records);
        setSelectedPageId(runtimePages[0]?.pageId ?? "");
        setLoading(false);
      })
      .catch((err) => {
        setNotice(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedPage) return;
    const nextRecord = makeRecord(selectedPage, records[selectedPage.pageId]);
    setRecord(nextRecord);
    setUndoStack([nextRecord]);
    setRedoStack([]);
    setZoom(1);
    setNotice(null);
  }, [records, selectedPage]);

  const persistRecords = useCallback((nextRecords: Record<string, RestorationRecord>) => {
    const store: ProjectStore = {
      schemaVersion: "phase-1b-local-store-v1",
      updatedAt: new Date().toISOString(),
      records: nextRecords,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, []);

  const updateRecord = useCallback(
    (updater: (current: RestorationRecord) => RestorationRecord, saveHistory = true) => {
      setRecord((current) => {
        if (!current) return current;
        const next = { ...updater(current), updatedAt: new Date().toISOString() };
        if (saveHistory) {
          setUndoStack((stack) => [...stack, current].slice(-60));
          setRedoStack([]);
        }
        setDirty(true);
        return next;
      });
    },
    [],
  );

  const saveDraft = useCallback(
    (message = "Draft saved locally in this browser.") => {
      if (!record) return;
      const nextRecords = { ...records, [record.pageId]: record };
      setRecords(nextRecords);
      persistRecords(nextRecords);
      setDirty(false);
      setNotice(message);
    },
    [persistRecords, record, records],
  );

  const deleteDraft = useCallback(() => {
    if (!record) return;
    const nextRecords = { ...records };
    delete nextRecords[record.pageId];
    setRecords(nextRecords);
    persistRecords(nextRecords);
    setRecord((current) => (selectedPage ? makeRecord(selectedPage) : current));
    setDirty(false);
    setNotice(`Deleted local draft for ${record.pageId}.`);
  }, [persistRecords, record, records, selectedPage]);

  useEffect(() => {
    if (!record || !dirty) return;
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      const nextRecords = { ...records, [record.pageId]: record };
      setRecords(nextRecords);
      persistRecords(nextRecords);
      setDirty(false);
      setNotice("Autosaved locally.");
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
  }, [dirty, persistRecords, record, records]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const syncFromCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    const page = selectedPage;
    if (!canvas || !page) return;
    const scale = scaleRef.current || 1;
    const regionObj = canvas.getObjects().find((obj: any) => obj.fvbRole === "region");
    const photoObj = canvas.getObjects().find((obj: any) => obj.fvbRole === "photo");
    updateRecord((current) => {
      const region = regionObj
        ? {
            x: Math.round((regionObj.left || 0) / scale),
            y: Math.round((regionObj.top || 0) / scale),
            width: Math.round((regionObj.getScaledWidth?.() || 0) / scale),
            height: Math.round((regionObj.getScaledHeight?.() || 0) / scale),
          }
        : current.region;
      const placement = photoObj
        ? {
            x: Math.round((photoObj.left || 0) / scale),
            y: Math.round((photoObj.top || 0) / scale),
            width: Math.round((photoObj.getScaledWidth?.() || 0) / scale),
            height: Math.round((photoObj.getScaledHeight?.() || 0) / scale),
            scaleX: Number((photoObj.scaleX || 1).toFixed(6)),
            scaleY: Number((photoObj.scaleY || 1).toFixed(6)),
            rotation: Number((photoObj.angle || 0).toFixed(2)),
          }
        : current.placement;
      const crop = current.crop.enabled && region ? { ...current.crop, ...region } : current.crop;
      const status = photoObj ? "photo-added" : regionObj ? "region-marked" : current.status;
      return { ...current, region, placement, crop, status };
    });
  }, [selectedPage, updateRecord]);

  const drawCanvas = useCallback(async () => {
    if (!selectedPage || !record || !canvasRef.current) return;
    const fabric = await loadFabric();
    if (fabricRef.current) fabricRef.current.dispose();

    const canvasWidth = Math.min(selectedPage.width, 1120);
    const scale = canvasWidth / selectedPage.width;
    scaleRef.current = scale;
    const canvasHeight = Math.round(selectedPage.height * scale);
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      preserveObjectStacking: true,
      backgroundColor: "#151515",
    });
    fabricRef.current = canvas;

    const original = await loadImage(selectedPage.masterSrc);
    const bg = new fabric.Image(original, {
      left: 0,
      top: 0,
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      hasControls: false,
      hasBorders: false,
    });
    canvas.add(bg);

    if (record.region) {
      const rect = new fabric.Rect({
        left: record.region.x * scale,
        top: record.region.y * scale,
        width: record.region.width * scale,
        height: record.region.height * scale,
        fill: "rgba(202,162,75,0.16)",
        stroke: "#CAA24B",
        strokeWidth: 3,
        cornerColor: "#CAA24B",
        cornerSize: 10,
        transparentCorners: false,
        objectCaching: false,
        selectable: record.status !== "published",
        evented: record.status !== "published",
      });
      rect.fvbRole = "region";
      canvas.add(rect);
    }

    if (record.recoveredPhoto && record.placement) {
      const photo = await loadImage(record.recoveredPhoto.dataUrl);
      const img = new fabric.Image(photo, {
        left: record.placement.x * scale,
        top: record.placement.y * scale,
        scaleX: (record.placement.width * scale) / record.recoveredPhoto.originalWidth,
        scaleY: (record.placement.height * scale) / record.recoveredPhoto.originalHeight,
        angle: record.placement.rotation,
        cornerColor: "#CAA24B",
        cornerSize: 12,
        transparentCorners: false,
        borderColor: "#CAA24B",
        lockUniScaling: false,
        selectable: record.status !== "approved" && record.status !== "published",
        evented: record.status !== "approved" && record.status !== "published",
      });
      img.fvbRole = "photo";
      if (record.crop.enabled) {
        img.clipPath = new fabric.Rect({
          left: record.crop.x * scale,
          top: record.crop.y * scale,
          width: record.crop.width * scale,
          height: record.crop.height * scale,
          absolutePositioned: true,
        });
      }
      canvas.add(img);
    }

    canvas.on("object:modified", syncFromCanvas);
    canvas.renderAll();
  }, [record, selectedPage, syncFromCanvas]);

  useEffect(() => {
    drawCanvas();
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [drawCanvas]);

  const selectPage = (pageId: string) => {
    if (dirty && !confirm("You have unsaved changes. Autosave is running, but switch pages anyway?")) return;
    setSelectedPageId(pageId);
  };

  const markRegion = () => {
    if (!selectedPage || !record || record.status === "published") return;
    const width = Math.round(selectedPage.width * 0.28);
    const height = Math.round(selectedPage.height * 0.24);
    updateRecord((current) => ({
      ...current,
      region: current.region ?? {
        x: Math.round(selectedPage.width * 0.12),
        y: Math.round(selectedPage.height * 0.12),
        width,
        height,
      },
      crop: current.crop.enabled
        ? current.crop
        : { enabled: false, x: Math.round(selectedPage.width * 0.12), y: Math.round(selectedPage.height * 0.12), width, height },
      status: current.recoveredPhoto ? "photo-added" : "region-marked",
    }));
  };

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPage) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      const image = await loadImage(dataUrl);
      updateRecord((current) => {
        const region =
          current.region ??
          ({
            x: Math.round(selectedPage.width * 0.12),
            y: Math.round(selectedPage.height * 0.12),
            width: Math.round(selectedPage.width * 0.28),
            height: Math.round(selectedPage.height * 0.24),
          } satisfies RectCoords);
        const fitScale = Math.max(region.width / image.naturalWidth, region.height / image.naturalHeight);
        return {
          ...current,
          region,
          placement: {
            x: region.x,
            y: region.y,
            width: Math.round(image.naturalWidth * fitScale),
            height: Math.round(image.naturalHeight * fitScale),
            scaleX: fitScale,
            scaleY: fitScale,
            rotation: 0,
          },
          crop: { enabled: current.crop.enabled, x: region.x, y: region.y, width: region.width, height: region.height },
          recoveredPhoto: {
            id: `photo-${Date.now()}`,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            dataUrl,
            originalWidth: image.naturalWidth,
            originalHeight: image.naturalHeight,
            addedAt: new Date().toISOString(),
          },
          status: "photo-added",
        };
      });
    };
    reader.readAsDataURL(file);
  };

  const updateStatus = (status: RestorationStatus) => {
    updateRecord((current) => {
      const statusCreatesRevision = ["draft", "ready-for-review", "approved", "rejected"].includes(status);
      if (current.status === "published" && status !== "published") {
        const nextRevision = current.revision + 1;
        return { ...current, revision: nextRevision, publishedRevision: current.revision, status };
      }
      if (statusCreatesRevision && current.status !== status) {
        const next = { ...current, status };
        return {
          ...next,
          revisions: [
            ...current.revisions,
            {
              revision: current.revision,
              status,
              createdAt: new Date().toISOString(),
              locked: false,
              snapshot: next,
            },
          ],
        };
      }
      return { ...current, status };
    });
  };

  const publishRevision = () => {
    updateRecord((current) => {
      if (current.status !== "approved") return current;
      const lockedSnapshot: RestorationRecord = { ...current, status: "published", publishedRevision: current.revision };
      return {
        ...lockedSnapshot,
        revisions: [
          ...current.revisions,
          {
            revision: current.revision,
            status: "published",
            createdAt: new Date().toISOString(),
            locked: true,
            snapshot: lockedSnapshot,
          },
        ],
      };
    });
    setNotice("Published revision locked locally only. No public reader pages were replaced.");
  };

  const undo = () => {
    if (undoStack.length <= 1) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((stack) => [record!, ...stack]);
    setUndoStack((stack) => stack.slice(0, -1));
    setRecord(previous);
    setDirty(true);
  };

  const redo = () => {
    const next = redoStack[0];
    if (!next || !record) return;
    setUndoStack((stack) => [...stack, record]);
    setRedoStack((stack) => stack.slice(1));
    setRecord(next);
    setDirty(true);
  };

  const resetPlacement = () => {
    updateRecord((current) => ({
      ...current,
      placement: null,
      recoveredPhoto: null,
      crop: { enabled: false, x: 0, y: 0, width: 0, height: 0 },
      status: current.region ? "region-marked" : "unreviewed",
    }));
  };

  const fitPhoto = () => {
    if (!record?.region || !record.recoveredPhoto) return;
    const scale = Math.max(record.region.width / record.recoveredPhoto.originalWidth, record.region.height / record.recoveredPhoto.originalHeight);
    updateRecord((current) => ({
      ...current,
      placement: current.recoveredPhoto
        ? {
            x: current.region!.x,
            y: current.region!.y,
            width: Math.round(current.recoveredPhoto.originalWidth * scale),
            height: Math.round(current.recoveredPhoto.originalHeight * scale),
            scaleX: scale,
            scaleY: scale,
            rotation: 0,
          }
        : current.placement,
    }));
  };

  const adjustPhoto = (scaleDelta: number, rotationDelta: number) => {
    const canvas = fabricRef.current;
    const photoObj = canvas?.getObjects().find((obj: any) => obj.fvbRole === "photo");
    if (!canvas || !photoObj || record?.status === "approved" || record?.status === "published") return;
    if (scaleDelta !== 0) {
      photoObj.scaleX = Math.max(0.05, (photoObj.scaleX || 1) + scaleDelta);
      photoObj.scaleY = Math.max(0.05, (photoObj.scaleY || 1) + scaleDelta);
    }
    if (rotationDelta !== 0) {
      photoObj.angle = (photoObj.angle || 0) + rotationDelta;
    }
    photoObj.setCoords();
    canvas.renderAll();
    syncFromCanvas();
  };

  const toggleCrop = () => {
    updateRecord((current) => ({
      ...current,
      crop: current.region
        ? { enabled: !current.crop.enabled, x: current.region.x, y: current.region.y, width: current.region.width, height: current.region.height }
        : current.crop,
    }));
  };

  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const importedRecords = parsed.schemaVersion === "phase-1b-local-store-v1" ? parsed.records : parsed.records ?? {};
        const nextRecords = { ...records, ...importedRecords };
        setRecords(nextRecords);
        persistRecords(nextRecords);
        setNotice("Imported restoration project data into local storage.");
      } catch (err) {
        setNotice(`Import failed: ${err instanceof Error ? err.message : "invalid JSON"}`);
      }
    };
    reader.readAsText(file);
  };

  const exportProject = () => {
    const store: ProjectStore = {
      schemaVersion: "phase-1b-local-store-v1",
      updatedAt: new Date().toISOString(),
      records: record ? { ...records, [record.pageId]: record } : records,
    };
    downloadText(JSON.stringify(store, null, 2), "fvb-phase-1b-restoration-project.json");
  };

  const exportApprovedPackage = async () => {
    if (!selectedPage || !record || record.status !== "approved") return;
    const JSZip = await loadJsZip();
    const zip = new JSZip();
    const exportRecord = recordForExport(record, selectedPage);
    const preview = await renderFullResolutionPreview(selectedPage, record);
    zip.file(`${record.pageId}/restoration.json`, JSON.stringify(exportRecord, null, 2));
    zip.file(`${record.pageId}/flattened-full-resolution-preview.png`, preview);
    if (record.recoveredPhoto) {
      const base64 = record.recoveredPhoto.dataUrl.split(",")[1];
      const extension = record.recoveredPhoto.mimeType.split("/")[1] || "image";
      zip.file(`${record.pageId}/original-recovered-photo.${extension}`, base64, { base64: true });
    }
    zip.file(
      `${record.pageId}/README.txt`,
      [
        "FVB Phase 1B approved restoration export.",
        "The flattened preview is generated client-side by drawing the original page master image to an offscreen canvas at original pixel dimensions, then compositing the recovered photo with saved original-pixel placement, crop, rotation, and scale.",
        "This package does not replace public reader pages or modify original source scans.",
      ].join("\n"),
    );
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `${record.pageId}-approved-restoration-export.zip`);
  };

  if (loading) {
    return (
      <div className="restoration-page">
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
          <p>Loading restoration workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="restoration-page">
      <div className="restoration-content">
        <div className="restoration-header">
          <div>
            <h1 className="restoration-title">Photo Restoration Tool</h1>
            <p className="restoration-subtitle">
              Private local workspace. It consumes the same 90-page authoritative manifest as the reader and only prepares approved export packages.
            </p>
          </div>
          <div className="restoration-badges" aria-label="Manifest checkpoints">
            <span>90 visible pages</span>
            <span>Page 2: page-003</span>
            <span>Page 88: page-090</span>
            <span>Page 89: page-002</span>
            <span>Page 90: page-091</span>
          </div>
        </div>

        {notice && <p className="restoration-notice">{notice}</p>}

        {!selectedPage || !record ? (
          <div className="restoration-page-selector">
            <h2>Workspace unavailable</h2>
            <p className="restoration-help">The generated page manifest could not be loaded.</p>
          </div>
        ) : (
          <div className="restoration-workspace">
            <aside className="restoration-sidebar">
              <section className="restoration-sidebar-section">
                <h3>Page</h3>
                <select className="restoration-input" value={selectedPage.pageId} onChange={(event) => selectPage(event.target.value)}>
                  {pages.map((page) => (
                    <option key={page.pageId} value={page.pageId}>
                      Page {page.displayNumber} · {page.pageId} · {page.sourceFile}
                    </option>
                  ))}
                </select>
                <dl className="restoration-meta">
                  <div><dt>Visible page</dt><dd>{selectedPage.displayNumber}</dd></div>
                  <div><dt>Permanent ID</dt><dd>{selectedPage.pageId}</dd></div>
                  <div><dt>Source file</dt><dd>{selectedPage.sourceFile}</dd></div>
                  <div><dt>Revision</dt><dd>{record.revision}</dd></div>
                </dl>
              </section>

              <div className="restoration-tabs" role="tablist" aria-label="Photo tool sidebar">
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidebarTab === "tools"}
                  className={`restoration-tab ${sidebarTab === "tools" ? "active" : ""}`}
                  onClick={() => setSidebarTab("tools")}
                >
                  Tools
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidebarTab === "help"}
                  className={`restoration-tab ${sidebarTab === "help" ? "active" : ""}`}
                  onClick={() => setSidebarTab("help")}
                >
                  Help
                </button>
              </div>

              {sidebarTab === "tools" ? (
                <>
                  <section className="restoration-sidebar-section">
                    <h3>1. Define Opening</h3>
                    <button className="restoration-btn" onClick={markRegion} disabled={record.status === "published"}>
                      Mark / Reset Region
                    </button>
                    {record.region && (
                      <p className="restoration-help">
                        Original pixels: x {record.region.x}, y {record.region.y}, {record.region.width} x {record.region.height}
                      </p>
                    )}
                  </section>

                  <section className="restoration-sidebar-section">
                    <h3>2. Upload Photo</h3>
                    <input className="restoration-file-input" type="file" accept="image/*" onChange={uploadPhoto} disabled={record.status === "approved" || record.status === "published"} />
                    {record.recoveredPhoto && <p className="restoration-help">{record.recoveredPhoto.fileName}</p>}
                    <div className="restoration-btn-group">
                      <button className="restoration-btn" onClick={fitPhoto} disabled={!record.recoveredPhoto || !record.region || record.status === "approved" || record.status === "published"}>
                        Fit
                      </button>
                      <button className="restoration-btn" onClick={toggleCrop} disabled={!record.recoveredPhoto || !record.region || record.status === "approved" || record.status === "published"}>
                        {record.crop.enabled ? "Disable Crop" : "Crop"}
                      </button>
                      <button className="restoration-btn restoration-btn-danger" onClick={resetPlacement} disabled={record.status === "approved" || record.status === "published"}>
                        Remove Photo
                      </button>
                    </div>
                  </section>

                  <section className="restoration-sidebar-section">
                    <h3>3. Place Photo</h3>
                    <p className="restoration-help">Drag, resize, rotate, or crop only the region/photo objects. The original page is locked.</p>
                    <div className="restoration-btn-group">
                      <button className="restoration-btn" onClick={undo} disabled={undoStack.length <= 1 || record.status === "published"}>Undo</button>
                      <button className="restoration-btn" onClick={redo} disabled={redoStack.length === 0 || record.status === "published"}>Redo</button>
                      <button className="restoration-btn" onClick={() => adjustPhoto(-0.05, 0)} disabled={!record.recoveredPhoto || record.status === "approved" || record.status === "published"}>Resize -</button>
                      <button className="restoration-btn" onClick={() => adjustPhoto(0.05, 0)} disabled={!record.recoveredPhoto || record.status === "approved" || record.status === "published"}>Resize +</button>
                      <button className="restoration-btn" onClick={() => adjustPhoto(0, -5)} disabled={!record.recoveredPhoto || record.status === "approved" || record.status === "published"}>Rotate -</button>
                      <button className="restoration-btn" onClick={() => adjustPhoto(0, 5)} disabled={!record.recoveredPhoto || record.status === "approved" || record.status === "published"}>Rotate +</button>
                      <button className="restoration-btn" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>Zoom +</button>
                      <button className="restoration-btn" onClick={() => setZoom((z) => Math.max(0.35, z - 0.2))}>Zoom -</button>
                    </div>
                    {record.placement && (
                      <p className="restoration-help">
                        x {record.placement.x}, y {record.placement.y}, {record.placement.width} x {record.placement.height}, rotate {record.placement.rotation} deg
                      </p>
                    )}
                  </section>

                  <section className="restoration-sidebar-section">
                    <h3>4. Preview / Review</h3>
                    <select className="restoration-input" value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)}>
                      <option value="restored">Restored preview</option>
                      <option value="original">Original</option>
                      <option value="side-by-side">Side by side</option>
                      <option value="overlay">Overlay</option>
                    </select>
                    {viewMode === "overlay" && (
                      <label className="restoration-control-label">
                        Overlay opacity
                        <input type="range" min="0" max="1" step="0.05" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} />
                      </label>
                    )}
                    <textarea
                      className="restoration-input restoration-textarea"
                      placeholder="Reviewer notes"
                      value={record.notes}
                      onChange={(event) => updateRecord((current) => ({ ...current, notes: event.target.value }))}
                    />
                    <select className="restoration-input" value={record.status} onChange={(event) => updateStatus(event.target.value as RestorationStatus)}>
                      {RESTORATION_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </section>

                  <section className="restoration-sidebar-section">
                    <h3>5. Save / Approve / Export</h3>
                    <div className="restoration-btn-group">
                      <button className="restoration-btn restoration-btn-primary" onClick={() => saveDraft("Draft saved locally.")}>Save Draft</button>
                      <button className="restoration-btn restoration-btn-approve" onClick={() => updateStatus("approved")} disabled={!record.region || !record.recoveredPhoto}>
                        Approve
                      </button>
                      <button className="restoration-btn restoration-btn-export" onClick={exportApprovedPackage} disabled={record.status !== "approved"}>
                        Export Restoration Package
                      </button>
                      <button className="restoration-btn" onClick={exportProject}>Export Project JSON</button>
                      <label className="restoration-btn restoration-import-btn">
                        Import Project
                        <input type="file" accept="application/json" onChange={importProject} />
                      </label>
                      <button className="restoration-btn restoration-btn-secondary" onClick={publishRevision} disabled={record.status !== "approved"}>
                        Lock Published Revision
                      </button>
                      <button
                        className="restoration-btn restoration-btn-danger"
                        onClick={() => {
                          if (confirm(`Delete local draft for ${record.pageId}?`)) deleteDraft();
                        }}
                        disabled={!records[record.pageId]}
                      >
                        Delete Draft
                      </button>
                    </div>
                  </section>

                  <section className="restoration-sidebar-section restoration-history-panel">
                    <h3>Restoration History/Drafts</h3>
                    {savedRecordList.length === 0 ? (
                      <p className="restoration-help">No local drafts saved in this browser yet.</p>
                    ) : (
                      <ul>
                        {savedRecordList.slice(0, 8).map((savedRecord) => (
                          <li key={savedRecord.pageId}>
                            <button type="button" onClick={() => selectPage(savedRecord.pageId)}>
                              Page {savedRecord.displayNumber} · {savedRecord.pageId} · {savedRecord.status}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : (
                <section className="restoration-sidebar-section restoration-help-panel">
                  <h3>Photo Tool Workflow</h3>
                  <ol>
                    <li>Select the visible book page from the authoritative 90-page reading order.</li>
                    <li>Mark the opening where the recovered photo belongs.</li>
                    <li>Upload the recovered photo from this computer. It stays local to this browser.</li>
                    <li>Drag, resize, rotate, and crop until the photo fits the scan opening.</li>
                    <li>Use original, side-by-side, or overlay preview modes to compare the source scan.</li>
                    <li>Save a local draft, approve it when reviewed, then export a restoration package for local processing.</li>
                    <li>Delete drafts that should not be kept. Original source scans are never modified.</li>
                  </ol>

                  <h3>Privacy and Page Order Rules</h3>
                  <ul>
                    <li>Uploads and drafts use browser storage only; there is no Supabase, Vercel upload, or database write.</li>
                    <li>Restoration records attach to permanent pageId, even if visible page position changes later.</li>
                    <li>Visible Page 89 must remain page-002 from page-02.png.</li>
                    <li>Do not guess captions, names, dates, or source details in reviewer notes.</li>
                  </ul>
                </section>
              )}
            </aside>

            <main className={`restoration-canvas-area view-${viewMode}`} aria-label="Photo restoration workspace">
              {viewMode === "side-by-side" && (
                <div className="restoration-original-panel">
                  <img src={selectedPage.sources.desktop} alt={`Original page ${selectedPage.displayNumber}`} />
                </div>
              )}
              <div className="restoration-canvas-shell" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                <canvas ref={canvasRef} className="restoration-canvas" />
                {viewMode === "original" && <img className="restoration-original-overlay" src={selectedPage.sources.desktop} alt="" />}
                {viewMode === "overlay" && <img className="restoration-original-overlay" style={{ opacity: overlayOpacity }} src={selectedPage.sources.desktop} alt="" />}
              </div>
            </main>
          </div>
        )}

        {currentExportRecord && (
          <details className="restoration-json-preview">
            <summary>Current editable restoration JSON</summary>
            <pre>{JSON.stringify(currentExportRecord, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

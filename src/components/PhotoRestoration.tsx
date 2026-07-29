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
  if (!jszipModule) {
    const module = await import("jszip");
    jszipModule = module.default ?? module;
  }
  return jszipModule;
}

const STORAGE_KEY = "fvb-phase-1b-photo-restorations";
const AUTOSAVE_MS = 500;
const RESTORATION_TOOL_VERSION = "v22.1-photo-restoration";
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
  draftId: string;
  pageId: string;
  readingPosition: number;
  displayNumber: number;
  sourceFile: string;
  photoDataReference: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  rotation: number;
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
type PreparedExport = {
  url: string;
  filename: string;
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

function recordWithPlacementFields(record: RestorationRecord, page: BookPage, placement: PlacementCoords | null) {
  const normalized = placement ? normalizePlacement(placement, page) : null;
  return {
    ...record,
    placement,
    x: normalized?.x ?? null,
    y: normalized?.y ?? null,
    width: normalized?.width ?? null,
    height: normalized?.height ?? null,
    rotation: placement?.rotation ?? 0,
  };
}

function makeRecord(page: BookPage, previous?: RestorationRecord): RestorationRecord {
  const now = new Date().toISOString();
  const previousPlacement = previous?.placement ? normalizePlacement(previous.placement, page) : null;
  return {
    schemaVersion: "phase-1b-local-v1",
    draftId: previous?.draftId ?? `draft-${page.pageId}`,
    pageId: page.pageId,
    readingPosition: page.readingPosition,
    displayNumber: page.displayNumber,
    sourceFile: page.sourceFile,
    photoDataReference: previous?.photoDataReference ?? previous?.recoveredPhoto?.id ?? null,
    x: previous?.x ?? previousPlacement?.x ?? null,
    y: previous?.y ?? previousPlacement?.y ?? null,
    width: previous?.width ?? previousPlacement?.width ?? null,
    height: previous?.height ?? previousPlacement?.height ?? null,
    rotation: previous?.rotation ?? previous?.placement?.rotation ?? 0,
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
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function downloadText(text: string, filename: string, type = "application/json") {
  downloadBlob(new Blob([text], { type }), filename);
}

function recordForExport(record: RestorationRecord, page: BookPage) {
  const placementNormalized = record.placement ? normalizePlacement(record.placement, page) : null;
  return {
    ...record,
    restorationToolVersion: RESTORATION_TOOL_VERSION,
    readingPosition: page.readingPosition,
    displayNumber: page.displayNumber,
    sourceFile: page.sourceFile,
    photoDataReference: record.recoveredPhoto?.id ?? record.photoDataReference,
    x: placementNormalized?.x ?? record.x,
    y: placementNormalized?.y ?? record.y,
    width: placementNormalized?.width ?? record.width,
    height: placementNormalized?.height ?? record.height,
    rotation: record.placement?.rotation ?? record.rotation,
    originalDimensions: { width: page.width, height: page.height },
    regionNormalized: record.region ? normalizeRect(record.region, page) : null,
    placementNormalized,
  };
}

async function renderExportPreview(page: BookPage, record: RestorationRecord) {
  const maxPreviewWidth = 1800;
  const previewScale = Math.min(1, maxPreviewWidth / page.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(page.width * previewScale);
  canvas.height = Math.round(page.height * previewScale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create export canvas");

  const original = await loadImage(page.masterSrc);
  ctx.drawImage(original, 0, 0, canvas.width, canvas.height);

  if (record.recoveredPhoto && record.placement) {
    const photo = await loadImage(record.recoveredPhoto.dataUrl);
    const p = record.placement;
    ctx.save();
    if (record.crop.enabled) {
      ctx.beginPath();
      ctx.rect(record.crop.x * previewScale, record.crop.y * previewScale, record.crop.width * previewScale, record.crop.height * previewScale);
      ctx.clip();
    }
    ctx.translate((p.x + p.width / 2) * previewScale, (p.y + p.height / 2) * previewScale);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.drawImage(photo, (-p.width / 2) * previewScale, (-p.height / 2) * previewScale, p.width * previewScale, p.height * previewScale);
    ctx.restore();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Unable to render PNG"))), "image/png");
  });
  return { blob, width: canvas.width, height: canvas.height, scale: previewScale };
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
  const [cropMode, setCropMode] = useState(false);
  const [cropBackup, setCropBackup] = useState<CropSettings | null>(null);
  const [preparedExport, setPreparedExport] = useState<PreparedExport | null>(null);
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
      if (autosaveRef.current) {
        window.clearTimeout(autosaveRef.current);
        autosaveRef.current = null;
      }
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
    return () => {
      if (preparedExport) URL.revokeObjectURL(preparedExport.url);
    };
  }, [preparedExport]);

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
      const placementNormalized = placement ? normalizePlacement(placement, page) : null;
      return {
        ...current,
        region,
        placement,
        crop,
        status,
        photoDataReference: current.recoveredPhoto?.id ?? current.photoDataReference,
        x: placementNormalized?.x ?? null,
        y: placementNormalized?.y ?? null,
        width: placementNormalized?.width ?? null,
        height: placementNormalized?.height ?? null,
        rotation: placement?.rotation ?? 0,
      };
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
        selectable: record.status !== "approved" && record.status !== "published",
        evented: record.status !== "approved" && record.status !== "published",
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
    if (!selectedPage || !record || record.status === "approved" || record.status === "published") return;
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
      const photoId = `photo-${Date.now()}`;
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
        const placement = {
          x: region.x,
          y: region.y,
          width: Math.round(image.naturalWidth * fitScale),
          height: Math.round(image.naturalHeight * fitScale),
          scaleX: fitScale,
          scaleY: fitScale,
          rotation: 0,
        };
        return recordWithPlacementFields({
          ...current,
          region,
          crop: { enabled: current.crop.enabled, x: region.x, y: region.y, width: region.width, height: region.height },
          recoveredPhoto: {
            id: photoId,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            dataUrl,
            originalWidth: image.naturalWidth,
            originalHeight: image.naturalHeight,
            addedAt: new Date().toISOString(),
          },
          photoDataReference: photoId,
          status: "photo-added",
        }, selectedPage, placement);
      });
    };
    reader.readAsDataURL(file);
  };

  const updateStatus = (status: RestorationStatus) => {
    if (!record) return;
    if (autosaveRef.current) {
      window.clearTimeout(autosaveRef.current);
      autosaveRef.current = null;
    }
    const statusCreatesRevision = ["draft", "ready-for-review", "approved", "rejected"].includes(status);
    let next: RestorationRecord;
    if (record.status === "published" && status !== "published") {
      const nextRevision = record.revision + 1;
      next = { ...record, revision: nextRevision, publishedRevision: record.revision, status };
    } else if (statusCreatesRevision && record.status !== status) {
      const snapshot = { ...record, status };
      next = {
        ...snapshot,
        revisions: [
          ...record.revisions,
          {
            revision: record.revision,
            status,
            createdAt: new Date().toISOString(),
            locked: false,
            snapshot,
          },
        ],
      };
    } else {
      next = { ...record, status };
    }
    const persisted = { ...next, updatedAt: new Date().toISOString() };
    const nextRecords = { ...records, [persisted.pageId]: persisted };
    setRecord(persisted);
    setRecords(nextRecords);
    persistRecords(nextRecords);
    setPreparedExport((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setDirty(false);
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
      photoDataReference: null,
      x: null,
      y: null,
      width: null,
      height: null,
      rotation: 0,
      crop: { enabled: false, x: 0, y: 0, width: 0, height: 0 },
      status: current.region ? "region-marked" : "unreviewed",
    }));
  };

  const fitPhoto = () => {
    if (!record?.region || !record.recoveredPhoto || !selectedPage) return;
    const scale = Math.max(record.region.width / record.recoveredPhoto.originalWidth, record.region.height / record.recoveredPhoto.originalHeight);
    updateRecord((current) => ({
      ...recordWithPlacementFields(
        current,
        selectedPage,
        current.recoveredPhoto
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
      ),
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

  const startCrop = () => {
    if (!record?.region || !record.recoveredPhoto || record.status === "approved" || record.status === "published") return;
    setCropBackup(record.crop);
    setCropMode(true);
    updateRecord((current) => ({
      ...current,
      crop: current.region ? { enabled: true, x: current.region.x, y: current.region.y, width: current.region.width, height: current.region.height } : current.crop,
    }));
  };

  const applyCrop = () => {
    syncFromCanvas();
    setCropMode(false);
    setCropBackup(null);
    setNotice("Crop applied to this local draft.");
  };

  const cancelCrop = () => {
    if (cropBackup) {
      updateRecord((current) => ({ ...current, crop: cropBackup }), false);
    }
    setCropMode(false);
    setCropBackup(null);
    setNotice("Crop changes canceled.");
  };

  const clearCrop = () => {
    updateRecord((current) => ({ ...current, crop: { enabled: false, x: 0, y: 0, width: 0, height: 0 } }));
    setCropMode(false);
    setCropBackup(null);
  };

  const approveRestoration = () => {
    if (!record?.region || !record.recoveredPhoto) return;
    if (!confirm("Approve this restoration and lock editing until you choose Return to Draft?")) return;
    updateStatus("approved");
    setNotice("Restoration approved locally. Export the restoration package when ready.");
  };

  const returnToDraft = () => {
    updateStatus("draft");
    setNotice("Returned to draft editing. Original scans remain unchanged.");
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
    try {
      const JSZip = await loadJsZip();
      const exportRecord = recordForExport(record, selectedPage);
      setNotice("Preparing local restoration export package...");
      const zip = new JSZip();
      const preview = await renderExportPreview(selectedPage, record);
      const exportedAt = new Date().toISOString();
    const packageManifest = {
      schemaVersion: "fvb-v22.1-restoration-export-manifest-v1",
      restorationToolVersion: RESTORATION_TOOL_VERSION,
      exportedAt,
      localOnly: true,
      pageId: record.pageId,
      visiblePageNumber: selectedPage.displayNumber,
      readingPosition: selectedPage.readingPosition,
      sourcePageFilename: selectedPage.sourceFile,
      approvalStatus: record.status,
      recoveredPhotoFilename: record.recoveredPhoto?.fileName ?? null,
      exportPreview: {
        file: `${record.pageId}/flattened-restoration-preview.png`,
        width: preview.width,
        height: preview.height,
        scaleFromOriginal: preview.scale,
      },
      files: [
        `${record.pageId}/restoration.json`,
        `${record.pageId}/placement.json`,
        `${record.pageId}/flattened-restoration-preview.png`,
        record.recoveredPhoto ? `${record.pageId}/original-recovered-photo.${record.recoveredPhoto.mimeType.split("/")[1] || "image"}` : null,
        `${record.pageId}/README.txt`,
      ].filter(Boolean),
      originalScanModified: false,
    };
    zip.file(`${record.pageId}/restoration.json`, JSON.stringify(exportRecord, null, 2));
    zip.file(
      `${record.pageId}/placement.json`,
      JSON.stringify(
        {
          pageId: record.pageId,
          visiblePageNumber: selectedPage.displayNumber,
          sourcePageFilename: selectedPage.sourceFile,
          crop: exportRecord.crop,
          rotation: exportRecord.rotation,
          dimensions: {
            x: exportRecord.x,
            y: exportRecord.y,
            width: exportRecord.width,
            height: exportRecord.height,
            unit: "page-relative",
          },
          placementPixels: record.placement,
          placementNormalized: exportRecord.placementNormalized,
          approvalStatus: record.status,
          exportedAt,
          restorationToolVersion: RESTORATION_TOOL_VERSION,
        },
        null,
        2,
      ),
    );
    zip.file("manifest.json", JSON.stringify(packageManifest, null, 2));
    zip.file(`${record.pageId}/flattened-restoration-preview.png`, preview.blob);
    if (record.recoveredPhoto) {
      const base64 = record.recoveredPhoto.dataUrl.split(",")[1];
      const extension = record.recoveredPhoto.mimeType.split("/")[1] || "image";
      zip.file(`${record.pageId}/original-recovered-photo.${extension}`, base64, { base64: true });
    }
    zip.file(
      `${record.pageId}/README.txt`,
      [
        "FVB Phase 1B approved restoration export.",
        `Restoration tool version: ${RESTORATION_TOOL_VERSION}`,
        `Exported at: ${exportedAt}`,
        `Page ID: ${record.pageId}`,
        `Visible page number: ${selectedPage.displayNumber}`,
        `Source page filename: ${selectedPage.sourceFile}`,
        "The flattened preview is generated client-side from the original page master at a bounded preview size. The JSON files keep full original-pixel and normalized placement, crop, rotation, and scale data for final processing.",
        "This package does not replace public reader pages or modify original source scans.",
      ].join("\n"),
    );
    const blob = await zip.generateAsync({ type: "blob" });
    setPreparedExport((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return {
        url: URL.createObjectURL(blob),
        filename: `${record.pageId}-approved-restoration-export.zip`,
      };
    });
      setNotice("Restoration package ready. Use Download Prepared Package to save it locally.");
    } catch (error) {
      setNotice(`Export failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
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
                    <button className="restoration-btn" onClick={markRegion} disabled={record.status === "approved" || record.status === "published"}>
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
                        Reset Photo
                      </button>
                      <button
                        className="restoration-btn"
                        onClick={startCrop}
                        title="Crop limits the recovered photo to the marked opening without changing the original scan."
                        disabled={!record.recoveredPhoto || !record.region || record.status === "approved" || record.status === "published"}
                      >
                        Crop
                      </button>
                      <button className="restoration-btn" onClick={applyCrop} disabled={!cropMode}>
                        Apply Crop
                      </button>
                      <button className="restoration-btn" onClick={cancelCrop} disabled={!cropMode}>
                        Cancel Crop
                      </button>
                      <button className="restoration-btn" onClick={clearCrop} disabled={!record.crop.enabled || record.status === "approved" || record.status === "published"}>
                        Clear Crop
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
                    <select
                      className="restoration-input"
                      value={viewMode}
                      onChange={(event) => setViewMode(event.target.value as ViewMode)}
                      title="Preview compares the local restored composite with the original page scan before approval."
                    >
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
                      <button
                        className="restoration-btn restoration-btn-approve"
                        onClick={approveRestoration}
                        title="Approve locks the local placement until Return to Draft is selected."
                        disabled={!record.region || !record.recoveredPhoto || record.status === "approved"}
                      >
                        Approve
                      </button>
                      {record.status === "approved" && (
                        <button className="restoration-btn" onClick={returnToDraft}>
                          Return to Draft
                        </button>
                      )}
                      <button
                        className="restoration-btn restoration-btn-export"
                        onClick={exportApprovedPackage}
                        title="Export Restoration Package prepares a local ZIP. Download Prepared Package saves it without deploying or altering source scans."
                        disabled={record.status !== "approved"}
                      >
                        Export Restoration Package
                      </button>
                      {preparedExport && record.status === "approved" && (
                        <a className="restoration-btn restoration-btn-export" href={preparedExport.url} download={preparedExport.filename}>
                          Download Prepared Package
                        </a>
                      )}
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
                  <h3>Quick Start</h3>
                  <p className="restoration-help">Open Admin Tools → Unlock PIN → Choose Page → Upload Photo → Drag / Resize / Rotate / Crop → Preview → Save Draft → Approve → Export Restoration Package → Lock Admin.</p>
                  <h3>Select a Page</h3>
                  <p className="restoration-help">Use the Page selector. It lists visible pages 1-90 in authoritative reading order, including Page 89 as page-002 from page-02.png.</p>
                  <h3>Upload a Photo</h3>
                  <p className="restoration-help">Use Upload Photo to add a JPEG, PNG, WebP, or phone photo. The recovered photo stays in browser-local storage.</p>
                  <h3>Move and Resize</h3>
                  <p className="restoration-help">Drag the recovered photo on the canvas, use resize handles, or use Resize - and Resize +. The original scan is locked behind it.</p>
                  <h3>Rotate and Crop</h3>
                  <p className="restoration-help">Use Rotate - / Rotate +, then Crop, Apply Crop, Cancel Crop, or Clear Crop. Crop only affects the restored photo in this draft.</p>
                  <h3>Preview</h3>
                  <p className="restoration-help">Use Preview / Review to switch between Restored preview, Original, Side by side, and Overlay before approval.</p>
                  <h3>Save and Reopen a Draft</h3>
                  <p className="restoration-help">Save Draft writes this page's draft locally. Reopen it from Restoration History/Drafts or by selecting the same page after refresh.</p>
                  <h3>Approve a Restoration</h3>
                  <p className="restoration-help">Approve asks for confirmation, sets the local status to approved, and prevents accidental editing until Return to Draft.</p>
                  <h3>Export the Restoration Package</h3>
                  <p className="restoration-help">Export Restoration Package prepares a ZIP with the recovered photograph, placement JSON, manifest, preview, and README, then Download Prepared Package saves it locally.</p>
                  <h3>Lock Admin</h3>
                  <p className="restoration-help">Lock Admin clears the session unlock and protects Admin Tools and Photo Restoration again.</p>
                  <h3>Where Drafts Are Stored</h3>
                  <p className="restoration-help">Drafts are stored only in this browser's localStorage under fvb-phase-1b-photo-restorations. Each pageId has its own draft.</p>
                  <h3>What Happens After Export</h3>
                  <p className="restoration-help">The export is for offline processing. It does not deploy, publish, upload, or modify original scans.</p>
                  <h3>Troubleshooting</h3>
                  <p className="restoration-help">If a draft is missing, confirm the same browser profile is open. If controls are locked, use Return to Draft. If export is disabled, approve the restoration first.</p>
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

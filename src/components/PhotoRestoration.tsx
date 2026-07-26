import { useEffect, useRef, useState, useCallback } from "react";
import { Navigation } from "./Navigation";
import type { PagesManifest, BookPage, PlacementData } from "../types";

// Lazy load fabric and jszip only when needed
let fabricModule: any = null;
let jszipModule: any = null;

async function loadFabric() {
  if (!fabricModule) {
    fabricModule = await import("fabric");
  }
  return fabricModule;
}

async function loadJsZip() {
  if (!jszipModule) {
    jszipModule = await import("jszip");
  }
  return jszipModule;
}

interface HistoryState {
  fabricState: string;
}

export function PhotoRestoration() {
  const [manifest, setManifest] = useState<PagesManifest | null>(null);
  const [selectedPage, setSelectedPage] = useState<BookPage | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [photoObject, setPhotoObject] = useState<any>(null);
  const [openingRect, setOpeningRect] = useState<any>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [personName, setPersonName] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const [savedPlacements, setSavedPlacements] = useState<PlacementData[]>([]);
  const [status, setStatus] = useState<"editing" | "preview" | "approved">("editing");
  const [loading, setLoading] = useState(true);

  // Load manifest
  useEffect(() => {
    fetch("/data/pages.json")
      .then((r) => r.json())
      .then((data: PagesManifest) => {
        setManifest(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load saved placements from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fvb-restoration-placements");
    if (saved) {
      try {
        setSavedPlacements(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveHistory = useCallback(() => {
    if (!fabricRef.current) return;
    const state = JSON.stringify(fabricRef.current.toJSON());
    setUndoStack((prev) => [...prev, { fabricState: state }].slice(-50));
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0 || !fabricRef.current) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, { fabricState: JSON.stringify(fabricRef.current.toJSON()) }]);
    fabricRef.current.loadFromJSON(prev.fabricState, () => {
      fabricRef.current.renderAll();
    });
    setUndoStack((s) => s.slice(0, -1));
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0 || !fabricRef.current) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((s) => [...s, { fabricState: JSON.stringify(fabricRef.current.toJSON()) }]);
    fabricRef.current.loadFromJSON(next.fabricState, () => {
      fabricRef.current.renderAll();
    });
    setRedoStack((r) => r.slice(0, -1));
  }, [redoStack]);

  // Initialize Fabric canvas when a page is selected
  useEffect(() => {
    if (!selectedPage || !canvasRef.current) return;

    let cancelled = false;

    (async () => {
      const fabric = await loadFabric();

      if (cancelled || !canvasRef.current) return;

      // Get the master image to determine dimensions
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedPage.masterSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      if (cancelled) return;

      const canvasWidth = Math.min(img.naturalWidth, 2000);
      const scale = canvasWidth / img.naturalWidth;
      const canvasHeight = img.naturalHeight * scale;

      // Create fabric canvas
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: "#transparent",
      });

      fabricRef.current = canvas;

      // Add background image (locked)
      const bgImg = new fabric.Image(img, {
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

      canvas.add(bgImg);
      canvas.backgroundColor = "#333";
      canvas.renderAll();

      setFabricCanvas(canvas);

      // Save initial history
      setUndoStack([{ fabricState: JSON.stringify(canvas.toJSON()) }]);
      setRedoStack([]);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPage]);

  const handlePageSelect = (page: BookPage) => {
    setSelectedPage(page);
    setUploadedPhoto(null);
    setPhotoObject(null);
    setOpeningRect(null);
    setStatus("editing");
    setPersonName("");
    setSubmittedBy("");
    setSourceDescription("");
  };

  const handleDrawOpening = async () => {
    if (!fabricRef.current) return;
    saveHistory();

    const fabric = await loadFabric();

    // Draw a semi-transparent rectangle for the opening
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 300,
      height: 400,
      fill: "rgba(0, 0, 0, 0.5)",
      stroke: "#CAA24B",
      strokeWidth: 3,
      cornerColor: "#CAA24B",
      cornerSize: 10,
      transparentCorners: false,
    });

    fabricRef.current.add(rect);
    setOpeningRect(rect);
    fabricRef.current.setActiveObject(rect);
    fabricRef.current.renderAll();
  };

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fabricRef.current) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedPhoto(dataUrl);

      const fabric = await loadFabric();
      const img = new Image();
      img.src = dataUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      saveHistory();

      const photoObj = new fabric.Image(img, {
        left: 150,
        top: 150,
        scaleX: 0.3,
        scaleY: 0.3,
        cornerColor: "#CAA24B",
        cornerSize: 12,
        transparentCorners: false,
        borderColor: "#CAA24B",
      });

      fabricRef.current.add(photoObj);
      setPhotoObject(photoObj);
      fabricRef.current.setActiveObject(photoObj);
      fabricRef.current.renderAll();
    };
    reader.readAsDataURL(file);
  };

  const handleCompare = () => {
    setShowOriginal((prev) => {
      const newShow = !prev;
      if (photoObject) {
        photoObject.visible = !newShow;
        fabricRef.current?.renderAll();
      }
      return newShow;
    });
  };

  const handleSave = () => {
    if (!selectedPage || !fabricRef.current) return;

    const placement: PlacementData = {
      pageId: selectedPage.id,
      sourcePage: `${selectedPage.id}.png`,
      restoredPhoto: uploadedPhoto ? `${selectedPage.id}-person-01.jpg` : "",
      personName: personName || "Unknown",
      opening: openingRect
        ? {
            x: Math.round(openingRect.left || 0),
            y: Math.round(openingRect.top || 0),
            width: Math.round(openingRect.width || 0),
            height: Math.round(openingRect.height || 0),
          }
        : { x: 0, y: 0, width: 0, height: 0 },
      placement: photoObject
        ? {
            offsetX: Math.round((photoObject.left || 0) - (openingRect?.left || 0)),
            offsetY: Math.round((photoObject.top || 0) - (openingRect?.top || 0)),
            scale: Math.round(((photoObject.scaleX || 1) + Number.EPSILON) * 100) / 100,
            rotation: Math.round((photoObject.angle || 0) * 10) / 10,
          }
        : { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 },
      sourceInformation: {
        submittedBy,
        sourceDescription,
        dateRestored: new Date().toISOString().split("T")[0],
      },
      status: "draft",
    };

    const updated = [...savedPlacements.filter((p) => p.pageId !== placement.pageId), placement];
    setSavedPlacements(updated);
    localStorage.setItem("fvb-restoration-placements", JSON.stringify(updated));
    alert("Progress saved to local storage!");
  };

  const handleApprove = () => {
    setStatus("approved");
    if (photoObject) {
      photoObject.set({
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
      });
      fabricRef.current?.renderAll();
    }
    if (openingRect) {
      openingRect.set({
        selectable: false,
        evented: false,
      });
      fabricRef.current?.renderAll();
    }
  };

  const handleRevert = () => {
    if (!confirm("Revert to original? This will remove all edits.")) return;
    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
      setPhotoObject(null);
      setOpeningRect(null);
      setUploadedPhoto(null);
      setStatus("editing");
      // Reinitialize by reselecting the page
      if (selectedPage) {
        const page = selectedPage;
        setSelectedPage(null);
        setTimeout(() => setSelectedPage(page), 100);
      }
    }
  };

  const handleExport = async () => {
    if (!fabricRef.current || !selectedPage) return;

    const JSZip = await loadJsZip();
    const zip = new JSZip();

    // Export full-resolution canvas as PNG
    const dataUrl = fabricRef.current.toDataURL({
      format: "png",
      multiplier: 2,
    });
    const pngData = dataUrl.split(",")[1];
    zip.file(`${selectedPage.id}-restored.png`, pngData, { base64: true });

    // Export placement JSON
    const placement: PlacementData = {
      pageId: selectedPage.id,
      sourcePage: `${selectedPage.id}.png`,
      restoredPhoto: `${selectedPage.id}-person-01.jpg`,
      personName: personName || "Unknown",
      opening: openingRect
        ? {
            x: Math.round(openingRect.left || 0),
            y: Math.round(openingRect.top || 0),
            width: Math.round(openingRect.width || 0),
            height: Math.round(openingRect.height || 0),
          }
        : { x: 0, y: 0, width: 0, height: 0 },
      placement: photoObject
        ? {
            offsetX: Math.round((photoObject.left || 0) - (openingRect?.left || 0)),
            offsetY: Math.round((photoObject.top || 0) - (openingRect?.top || 0)),
            scale: Math.round(((photoObject.scaleX || 1) + Number.EPSILON) * 100) / 100,
            rotation: Math.round((photoObject.angle || 0) * 10) / 10,
          }
        : { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 },
      sourceInformation: {
        submittedBy,
        sourceDescription,
        dateRestored: new Date().toISOString().split("T")[0],
      },
      status: "approved",
    };

    zip.file(`${selectedPage.id}-placement.json`, JSON.stringify(placement, null, 2));

    // Export recovered photo if available
    if (uploadedPhoto) {
      const photoBase64 = uploadedPhoto.split(",")[1];
      if (photoBase64) {
        zip.file(`${selectedPage.id}-person-01.jpg`, photoBase64, { base64: true });
      }
    }

    // Export preview image (lower res)
    const previewUrl = fabricRef.current.toDataURL({
      format: "jpeg",
      quality: 0.8,
      multiplier: 0.5,
    });
    zip.file(`${selectedPage.id}-preview.jpg`, previewUrl.split(",")[1], { base64: true });

    // Export metadata
    const metadata = {
      pageId: selectedPage.id,
      pageNumber: selectedPage.pageNumber,
      exportedAt: new Date().toISOString(),
      exportedBy: "FVB v21.1 Photo Restoration Tool",
      originalImage: selectedPage.masterSrc,
      restorationVersion: "1.0",
    };
    zip.file(`${selectedPage.id}-metadata.json`, JSON.stringify(metadata, null, 2));

    // Generate and download
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPage.id}-restoration.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="restoration-page">
        <Navigation />
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
          <p>Loading restoration tool...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="restoration-page">
      <Navigation />
      <div className="restoration-content">
        <h1 className="restoration-title">Photo Restoration Tool</h1>
        <p className="restoration-subtitle">
          Select a book page, define the opening where a photo is missing, then upload and position a recovered photo.
          Original scans are never modified.
        </p>

        {!selectedPage ? (
          <div className="restoration-page-selector">
            <h2>Select a Page to Restore</h2>
            <div className="restoration-page-grid">
              {manifest?.pages.map((page) => (
                <button
                  key={page.id}
                  className="restoration-page-tile"
                  onClick={() => handlePageSelect(page)}
                >
                  <img
                    src={page.thumbnailSrc}
                    alt={`Page ${page.pageNumber}`}
                    className="restoration-page-thumb"
                  />
                  <span className="restoration-page-label">Page {page.pageNumber}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="restoration-workspace">
            <div className="restoration-sidebar">
              <div className="restoration-sidebar-section">
                <h3>Selected Page</h3>
                <p>Page {selectedPage.pageNumber}</p>
                <button
                  className="restoration-btn restoration-btn-secondary"
                  onClick={() => {
                    setSelectedPage(null);
                    if (fabricRef.current) {
                      fabricRef.current.dispose();
                      fabricRef.current = null;
                    }
                  }}
                >
                  Change Page
                </button>
              </div>

              <div className="restoration-sidebar-section">
                <h3>1. Define Opening</h3>
                <p className="restoration-help">Draw a rectangle where the missing photo belongs.</p>
                <button
                  className="restoration-btn"
                  onClick={handleDrawOpening}
                  disabled={status === "approved"}
                >
                  Draw Opening Box
                </button>
              </div>

              <div className="restoration-sidebar-section">
                <h3>2. Upload Photo</h3>
                <p className="restoration-help">Upload a recovered family photo to place in the opening.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadPhoto}
                  disabled={status === "approved"}
                  className="restoration-file-input"
                />
              </div>

              <div className="restoration-sidebar-section">
                <h3>3. Photo Details</h3>
                <input
                  type="text"
                  className="restoration-input"
                  placeholder="Person's full name"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  disabled={status === "approved"}
                />
                <input
                  type="text"
                  className="restoration-input"
                  placeholder="Submitted by"
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  disabled={status === "approved"}
                />
                <textarea
                  className="restoration-input restoration-textarea"
                  placeholder="Source description (where the photo came from)"
                  value={sourceDescription}
                  onChange={(e) => setSourceDescription(e.target.value)}
                  disabled={status === "approved"}
                />
              </div>

              <div className="restoration-sidebar-section">
                <h3>Controls</h3>
                <div className="restoration-btn-group">
                  <button
                    className="restoration-btn"
                    onClick={undo}
                    disabled={undoStack.length <= 1 || status === "approved"}
                  >
                    ↶ Undo
                  </button>
                  <button
                    className="restoration-btn"
                    onClick={redo}
                    disabled={redoStack.length === 0 || status === "approved"}
                  >
                    ↷ Redo
                  </button>
                  <button
                    className="restoration-btn"
                    onClick={handleCompare}
                    disabled={!photoObject}
                  >
                    {showOriginal ? "Show Restored" : "Compare Original"}
                  </button>
                </div>
              </div>

              <div className="restoration-sidebar-section">
                <h3>Actions</h3>
                <div className="restoration-btn-group">
                  <button
                    className="restoration-btn"
                    onClick={handleSave}
                    disabled={status === "approved"}
                  >
                    💾 Save Progress
                  </button>
                  <button
                    className="restoration-btn restoration-btn-primary"
                    onClick={() => setStatus("preview")}
                    disabled={!photoObject || status === "approved"}
                  >
                    👁 Preview
                  </button>
                  <button
                    className="restoration-btn restoration-btn-approve"
                    onClick={handleApprove}
                    disabled={!photoObject || status === "approved"}
                  >
                    ✓ Approve & Lock
                  </button>
                  <button
                    className="restoration-btn restoration-btn-export"
                    onClick={handleExport}
                    disabled={status !== "approved"}
                  >
                    📦 Export ZIP
                  </button>
                  <button
                    className="restoration-btn restoration-btn-danger"
                    onClick={handleRevert}
                    disabled={status === "approved"}
                  >
                    ↺ Revert to Original
                  </button>
                </div>
              </div>

              {status === "approved" && (
                <div className="restoration-sidebar-section restoration-status-approved">
                  <p>✓ Restoration approved and locked. Export to save the ZIP file.</p>
                </div>
              )}
            </div>

            <div className="restoration-canvas-area">
              <canvas ref={canvasRef} className="restoration-canvas" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
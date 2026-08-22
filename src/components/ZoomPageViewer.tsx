import { useEffect, useMemo, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import type { BookPage } from "../types";

export function ZoomPageViewer({ page }: { page: BookPage }) {
  const target = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const imageSrc = useMemo(
    () => page.masterSrc || page.sources.desktop || page.sources.tablet || page.sources.mobile,
    [page.masterSrc, page.sources.desktop, page.sources.mobile, page.sources.tablet]
  );

  useEffect(() => {
    if (!target.current) return;
    setIsReady(false);

    const viewer = OpenSeadragon({
      element: target.current,
      prefixUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/5.0.1/images/",
      tileSources: {
        type: "image",
        url: imageSrc
      },
      showNavigator: true,
      showNavigationControl: false,
      animationTime: 0.8,
      constrainDuringPan: true,
      visibilityRatio: 0.8,
      minZoomImageRatio: 0.9,
      maxZoomPixelRatio: 5,
      gestureSettingsMouse: {
        clickToZoom: true,
        dblClickToZoom: true,
        scrollToZoom: true
      },
      gestureSettingsTouch: {
        pinchToZoom: true,
        flickEnabled: true,
        clickToZoom: true,
        dblClickToZoom: true
      }
    });

    viewerRef.current = viewer;
    viewer.addOnceHandler("open", () => {
      viewer.viewport.goHome(true);
      setIsReady(true);
    });

    return () => {
      viewerRef.current = null;
      viewer.destroy();
    };
  }, [imageSrc]);

  const zoomBy = (factor: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.viewport.zoomBy(factor);
    viewer.viewport.applyConstraints();
  };

  const resetZoom = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.viewport.goHome();
  };

  return (
    <div className="zoom-viewer-shell">
      <div
        ref={target}
        className="zoom-viewer"
        aria-label={`Zoomable page ${page.displayNumber}`}
      />
      <div className="zoom-controls" aria-label="Zoom controls">
        <button type="button" onClick={() => zoomBy(1.35)} disabled={!isReady} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(0.75)} disabled={!isReady} aria-label="Zoom out">
          -
        </button>
        <button type="button" onClick={resetZoom} disabled={!isReady} aria-label="Reset zoom">
          Reset
        </button>
      </div>
      <div className="zoom-hint">Drag to move. Pinch, scroll, or use + and - to zoom.</div>
    </div>
  );
}

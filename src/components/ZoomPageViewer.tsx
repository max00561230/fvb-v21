import { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";
import type { BookPage } from "../types";
import { pageLabel } from "../lib/pageLabels";

export function ZoomPageViewer({ page }: { page: BookPage }) {
  const target = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!target.current) return;

    const viewer = OpenSeadragon({
      element: target.current,
      prefixUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/5.0.1/images/",
      tileSources: {
        type: "image",
        url: page.masterSrc
      },
      showNavigator: true,
      showNavigationControl: false,
      animationTime: 0.8,
      constrainDuringPan: true,
      visibilityRatio: 0.7,
      minZoomImageRatio: 0.85,
      maxZoomPixelRatio: 3,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        scrollToZoom: true
      },
      gestureSettingsTouch: {
        pinchToZoom: true,
        flickEnabled: true,
        clickToZoom: false,
        dblClickToZoom: true
      }
    });

    return () => viewer.destroy();
  }, [page.masterSrc]);

  return (
    <div
      ref={target}
      className="zoom-viewer"
      aria-label={`Zoomable ${pageLabel(page)}`}
    />
  );
}

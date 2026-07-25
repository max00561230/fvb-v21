import { useState } from "react";
import type { PageHotspot } from "../types";

export function HotspotLayer({
  hotspots,
  onHotspotClick
}: {
  hotspots: PageHotspot[];
  onHotspotClick?: (hotspot: PageHotspot) => void;
}) {
  const [active, setActive] = useState<PageHotspot | null>(null);

  if (!hotspots.length) return null;

  return (
    <>
      <div className="hotspot-layer" aria-hidden={false}>
        {hotspots.map((spot) => (
          <button
            key={spot.id}
            className="hotspot-marker"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: `${spot.width}%`,
              height: `${spot.height}%`
            }}
            onClick={() => {
              setActive(spot);
              onHotspotClick?.(spot);
            }}
            aria-label={spot.label}
            title={spot.label}
          >
            <span className="hotspot-pulse" />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="hotspot-panel"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <div className="hotspot-panel-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="hotspot-close"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              ✕
            </button>
            {active.title && <h3 className="hotspot-title">{active.title}</h3>}
            {active.content && <p className="hotspot-text">{active.content}</p>}
            {active.audioSrc && (
              <audio controls src={active.audioSrc} className="hotspot-audio">
                Your browser does not support audio playback.
              </audio>
            )}
            {active.type === "biography" && active.content && (
              <p className="hotspot-text">{active.content}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
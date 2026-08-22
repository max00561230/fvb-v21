import type { ReactNode } from "react";

export function HeritageBookFrame({ children }: { children: ReactNode }) {
  return (
    <div className="heritage-book-stage">
      <div className="heritage-book-frame">
        <div className="heritage-book-mat">
          <div className="heritage-book-page-shell">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BookViewer } from "./components/BookViewer";
import type { PagesManifest } from "./types";

export default function App() {
  const [manifest, setManifest] = useState<PagesManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/pages.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load pages.json: ${r.status}`);
        return r.json();
      })
      .then((data: PagesManifest) => {
        setManifest(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading Family Heritage Book...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Unable to load book</h2>
        <p>{error}</p>
        <p>Run <code>npm run build:assets</code> to generate page data.</p>
      </div>
    );
  }

  if (!manifest) return null;

  return <BookViewer manifest={manifest} />;
}
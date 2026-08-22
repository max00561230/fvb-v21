import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { AdminGate } from "./components/AdminGate";
import { AdminTools } from "./components/AdminTools";
import "./styles.css";
import "./styles-phase1.css";

const routes = [
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/book",
    element: <App view="book" />,
  },
  {
    path: "/tree",
    lazy: async () => {
      const mod = await import("./components/ArchiveSectionPage");
      return { Component: mod.FamilyTreePage };
    },
  },
  {
    path: "/photos",
    lazy: async () => {
      const mod = await import("./components/ArchiveSectionPage");
      return { Component: mod.PhotoGalleryPage };
    },
  },
  {
    path: "/videos",
    lazy: async () => {
      const mod = await import("./components/ArchiveSectionPage");
      return { Component: mod.FamilyVideosPage };
    },
  },
  {
    path: "/audio",
    lazy: async () => {
      const mod = await import("./components/ArchiveSectionPage");
      return { Component: mod.OralHistoryPage };
    },
  },
  {
    path: "/documents",
    lazy: async () => {
      const mod = await import("./components/ArchiveSectionPage");
      return { Component: mod.HistoricalDocumentsPage };
    },
  },
  {
    path: "/about",
    lazy: async () => {
      const mod = await import("./components/ArchiveSectionPage");
      return { Component: mod.AboutProjectPage };
    },
  },
  {
    path: "/search",
    lazy: async () => {
      const mod = await import("./components/SearchPage");
      return { Component: mod.SearchPage };
    },
  },
  {
    path: "/people",
    lazy: async () => {
      const mod = await import("./components/PeopleDirectory");
      return { Component: mod.PeopleDirectory };
    },
  },
  {
    path: "/people/:personId",
    lazy: async () => {
      const mod = await import("./components/PersonDetail");
      return { Component: mod.PersonDetail };
    },
  },
  {
    path: "/admin",
    element: <AdminGate />,
    children: [
      {
        index: true,
        element: <AdminTools />,
      },
      {
        path: "photo-restoration",
        lazy: async () => {
          const mod = await import("./components/PhotoRestoration");
          return { Component: mod.PhotoRestoration };
        },
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-content">
        <h1>404</h1>
        <p>Page not found</p>
        <a href="/" className="not-found-link">← Back to Digital Family History Center</a>
      </div>
    </div>
  );
}

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

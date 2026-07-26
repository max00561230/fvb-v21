import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./styles-phase1.css";

const restorationEnabled = import.meta.env.VITE_ENABLE_RESTORATION_TOOLS === "true";

const routes = [
  {
    path: "/",
    element: <App />,
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
  ...(restorationEnabled
    ? [
        {
          path: "/admin/photo-restoration",
          lazy: async () => {
            const mod = await import("./components/PhotoRestoration");
            return { Component: mod.PhotoRestoration };
          },
        },
      ]
    : []),
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
        <a href="/" className="not-found-link">← Back to Book</a>
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
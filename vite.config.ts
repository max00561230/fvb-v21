import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["manifest.webmanifest"],
      manifest: {
        name: "Francis Family Heritage Book",
        short_name: "Family Book",
        description: "Digital archive of the Francis Family Heritage Book",
        theme_color: "#6C1727",
        background_color: "#F7F0DF",
        display: "standalone",
        orientation: "portrait",
        start_url: "/?page=1",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,webp,json}"],
        globIgnores: [
          "book-pages/masters/**",
          "book-pages/desktop/**",
          "book-pages/tablet/**"
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /book-pages\/(?:mobile|thumbnails)\//i,
            handler: "CacheFirst",
            options: {
              cacheName: "page-images-small",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /book-pages\/(?:desktop|tablet)\//i,
            handler: "CacheFirst",
            options: {
              cacheName: "page-images-large",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /book-pages\/masters\//i,
            handler: "CacheFirst",
            options: {
              cacheName: "page-masters",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1000
  }
});
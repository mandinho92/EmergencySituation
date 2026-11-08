import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FamilyReady — Preparação familiar para emergências",
    short_name: "FamilyReady",
    description: "Plano familiar de emergência, kits, mochilas de evacuação e contactos — disponível offline.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1e3a5f",
    lang: "pt-PT",
    categories: ["lifestyle", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Plano de comunicação", url: "/app/communication" },
      { name: "Pontos de encontro", url: "/app/meeting-points" },
      { name: "Cenários de emergência", url: "/app/scenarios" },
    ],
  };
}

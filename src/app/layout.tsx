import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { publicEnv } from "@/lib/env";
import { ServiceWorkerRegistration } from "@/modules/offline/sw-registration";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: { default: "FamilyReady — Preparação e gestão de emergências familiares", template: "%s · FamilyReady" },
  description: "Prepare hoje. Proteja a sua família amanhã. Planeie água, alimentação, mochilas de evacuação, pontos de encontro e comunicação de emergência — em família.",
  applicationName: "FamilyReady",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FamilyReady", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className="h-full">
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3500 }} />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

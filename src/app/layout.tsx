import type { Metadata, Viewport } from "next";
import "@fontsource-variable/lexend";
import "@fontsource-variable/literata";
import "katex/dist/katex.min.css";
import "./globals.css";
import { APP_NAME as appName } from "@/lib/appname";

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: "Cours, documents, emploi du temps et assistant IA pour toute l'école.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#183f35",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

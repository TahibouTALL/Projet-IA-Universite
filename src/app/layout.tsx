import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

import { APP_NAME as appName } from "@/lib/appname";

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: "Cours, documents, emploi du temps et assistant IA pour toute l'école.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

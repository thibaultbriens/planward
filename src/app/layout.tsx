// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planward",
  description: "Lightweight open-source project planning with real capacity limits.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BEOKBG",
  description: "BEOKBG hardware distributor web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // lang is set per-locale in app/[locale]/layout.tsx via the Header dict
  // suppressHydrationWarning prevents mismatch warnings if client-side locale differs
  return (
    <html lang="bg" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

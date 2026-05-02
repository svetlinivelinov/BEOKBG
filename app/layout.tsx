import type { Metadata } from "next";
import { headers } from "next/headers";
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
  // Middleware sets x-locale based on the URL; use it to keep <html lang> accurate.
  const locale = headers().get("x-locale") ?? "bg";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}

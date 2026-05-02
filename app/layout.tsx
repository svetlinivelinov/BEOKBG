import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "BEOKBG",
  description: "BEOKBG hardware distributor web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}

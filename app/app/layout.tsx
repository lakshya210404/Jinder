import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jinder — Real-time jobs for CA & US",
  description: "A real-time full-time job aggregator for Canada and the United States.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface font-sans antialiased">{children}</body>
    </html>
  );
}

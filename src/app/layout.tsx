import type { Metadata, Viewport } from "next";
import Script from "next/script";
import AuthProvider from "@/components/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reddit Slideshow",
  description: "Browse Reddit media in a beautiful slideshow",
  other: {
    "google-adsense-account": "ca-pub-3853368383549506",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased overflow-hidden">
        <AuthProvider>{children}</AuthProvider>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3853368383549506"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

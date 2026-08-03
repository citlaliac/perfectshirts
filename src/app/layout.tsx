import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "@fontsource-variable/zalando-sans/wght.css";
import "@fontsource/rock-3d/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "perfect shirts",
  description: "perfect shirts — buy on Etsy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="page-wrap">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}

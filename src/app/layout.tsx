import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "perfect t shirts",
  description:
    "perfect t shirts — a homemade catalog of shirts. Buy each shirt on Etsy.",
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
          <footer className="site-footer">
            <hr className="ugly-hr" />
            <p>
              copyright © {new Date().getFullYear()} perfect t shirts
              {/* <br />
              best viewed with a computer and eyes */}
              <br />
              purchases happen on{" "}
              <a
                href="https://www.etsy.com/shop/fawnandfrog/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Etsy
              </a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}

import { ViewportProbe } from "@/components/ViewportProbe";
import type { Metadata } from "next";
import { Cursor } from "@/components/Cursor";
import { TabVisibility } from "@/components/MotionControl";
import { Nav, Brand } from "@/components/Nav";
import { site } from "@/lib/site";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  icons: { icon: "/icon.svg" },
  title: {
    default: "Asad Atterkhan — ASAD.EXE",
    template: "%s · Asad Atterkhan",
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.title,
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  robots:
    process.env.INDEX_SITE === "true"
      ? { index: true, follow: true }
      : { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        <link
          rel="preload"
          href="/fonts/DepartureMono-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {process.env.NODE_ENV === "development" && <ViewportProbe />}
        <Cursor />
        <TabVisibility />
        <a href="#main" className="skip">
          Skip to content
        </a>
        <div className="wrap">
          <header className="site-header">
            <Brand />
            <Nav />
          </header>
          <main id="main">{children}</main>
          <footer className="site-footer">
            <p>© {new Date().getFullYear()} Asad Atterkhan</p>
            <div className="footer-meta">
              <a href={`mailto:${site.email}`}>Email</a>
              <a href={site.github}>GitHub ↗</a>
              <a href={site.linkedin}>LinkedIn ↗</a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

import type { NextConfig } from "next";
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://apis.google.com ${isDev ? "'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebasestorage.app https://firebasestorage.googleapis.com " +
    (isDev ? "http://127.0.0.1:* ws://127.0.0.1:* http://localhost:*" : ""),
  "frame-src 'self' https://*.firebaseapp.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  isDev ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
].join("; ");
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["firebase-admin"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: isDev ? "SAMEORIGIN" : "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(isDev
            ? []
            : [
                { key: "Strict-Transport-Security", value: "max-age=31536000" },
              ]),
        ],
      },
      {
        source: "/sprites/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/projects", destination: "/workbench", permanent: true },
      {
        source: "/projects/:slug",
        destination: "/workbench/:slug",
        permanent: true,
      },
      { source: "/blog", destination: "/lab", permanent: true },
      { source: "/resume", destination: "/experience", permanent: true },
      {
        source: "/project/1",
        destination: "/workbench/textile-sewing-services",
        permanent: true,
      },
      {
        source: "/project/2",
        destination: "/workbench/personal-website",
        permanent: true,
      },
      {
        source: "/project/3",
        destination: "/workbench/qrover",
        permanent: true,
      },
      {
        source: "/project/4",
        destination: "/workbench/wispi",
        permanent: true,
      },
      { source: "/post/0", destination: "/about", permanent: true },
    ];
  },
};
export default config;

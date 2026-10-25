import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Asad Atterkhan — a personal technical journal";
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#151827",
          color: "#e3e3ef",
          display: "flex",
          height: "100%",
          width: "100%",
          padding: "80px",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "monospace",
        }}
      >
        <div style={{ color: "#accfb8", fontSize: 26 }}>asad@atterkhan ~</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64 }}>Hey, I&apos;m Asad.</div>
          <div style={{ fontSize: 30, color: "#a7abc5" }}>
            Security, software, and the notes along the way.
          </div>
        </div>
        <div style={{ color: "#c3b2ed", fontSize: 25 }}>
          ASAD.EXE · asad.atterkhan.com
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/content";
import { notFound } from "next/navigation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          width: "100%",
          height: "100%",
          background: "#151827",
          color: "#e3e3ef",
          fontFamily: "monospace",
        }}
      >
        <div style={{ color: "#accfb8", fontSize: 28 }}>~/lab</div>
        <div style={{ fontSize: 56 }}>{a.title}</div>
        <div style={{ color: "#c3b2ed", fontSize: 26 }}>
          Asad Atterkhan · The Lab
        </div>
      </div>
    ),
    size,
  );
}

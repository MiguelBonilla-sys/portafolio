import { ImageResponse } from "next/og";
import { PDFDocument } from "pdf-lib";
import { loadDisplayFont } from "../lib/og-font.ts";
import type { Slide } from "./state.ts";

// Carrusel de LinkedIn: láminas 1080×1350 con la identidad del sitio (DESIGN.md), unidas en un PDF.
const W = 1080;
const H = 1350;
const C = { ground: "#0A0B10", ink: "#EDEFF5", ink2: "#9AA3B5", blue: "#3D7BFF", accent: "#2EE6FF" };

function SlideView({ slide, index, total, title }: { slide: Slide; index: number; total: number; title: string }) {
  const cover = index === 0;
  return (
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 88,
        background: C.ground,
        border: `16px solid ${C.ink}`,
        fontFamily: "Display",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", color: C.ink2, fontSize: 30 }}>
        <span>MIGUEL BONILLA</span>
        <span>
          {index + 1}/{total}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <div
          style={{
            fontSize: cover ? 128 : 92,
            lineHeight: 1,
            color: cover ? C.ink : C.blue,
            textTransform: "uppercase",
          }}
        >
          {slide.title}
        </div>
        {slide.body && (
          <div style={{ fontSize: 46, lineHeight: 1.25, color: C.ink, fontFamily: "sans-serif" }}>{slide.body}</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 120, height: 14, background: C.accent }} />
        <span style={{ color: C.ink2, fontSize: 28, fontFamily: "sans-serif" }}>{title}</span>
      </div>
    </div>
  );
}

export async function renderCarousel(slides: Slide[], title: string): Promise<Uint8Array> {
  const font = await loadDisplayFont();
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setAuthor("Miguel Ángel Bonilla Torres");

  for (const [i, slide] of slides.entries()) {
    const png = await new ImageResponse(<SlideView slide={slide} index={i} total={slides.length} title={title} />, {
      width: W,
      height: H,
      fonts: font ? [{ name: "Display", data: font, weight: 900, style: "normal" }] : undefined,
    }).arrayBuffer();
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([W, H]);
    page.drawImage(image, { x: 0, y: 0, width: W, height: H });
  }

  return pdf.save();
}

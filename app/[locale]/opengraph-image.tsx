import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { loadDisplayFont } from "@/lib/og-font";

export const alt = "Miguel Bonilla, Full Stack Engineer: Python, React & AI Systems";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BLUE = "#3D7BFF";
const ACCENT = "#2EE6FF";
const INK = "#EDEFF5";
const GROUND = "#0A0B10";

// Mismo trazo que components/brand/Sigil.tsx
function SigilSvg({ stroke }: { stroke: string }) {
  return (
    <svg width="340" height="340" viewBox="-4 -4 130 130" style={{ position: "absolute", top: 0, left: 0 }}>
      <g fill="none" stroke={stroke} strokeLinecap="square" strokeLinejoin="miter">
        <circle cx="60" cy="60" r="55" strokeWidth="5" />
        <circle cx="60" cy="60" r="44" strokeWidth="2.5" />
        <path d="M60 16L98.11 82L21.89 82Z" strokeWidth="4" />
        <path d="M44 82V58l16 16 16-16v24" strokeWidth="7" />
      </g>
    </svg>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const font = await loadDisplayFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: GROUND,
          border: `12px solid ${INK}`,
          fontFamily: font ? "Big Shoulders" : undefined,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 168, fontWeight: 900, color: INK, lineHeight: 0.9, letterSpacing: -2 }}>MIGUEL</div>
          <div style={{ fontSize: 168, fontWeight: 900, color: INK, lineHeight: 0.9, letterSpacing: -2 }}>BONILLA</div>
          <div style={{ marginTop: 28, fontSize: 64, fontWeight: 900, color: BLUE }}>FULL STACK ENGINEER</div>
          <div style={{ marginTop: 8, fontSize: 40, fontWeight: 900, color: INK }}>PYTHON · REACT · AI SYSTEMS</div>
          <div style={{ marginTop: 28, display: "flex" }}>
            <div style={{ background: ACCENT, color: GROUND, fontSize: 34, fontWeight: 900, padding: "6px 16px" }}>
              {t("ogTag")}
            </div>
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", width: 352, height: 352 }}>
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex" }}>
            <SigilSvg stroke={ACCENT} />
          </div>
          <SigilSvg stroke={BLUE} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Big Shoulders", data: font, weight: 900, style: "normal" }] : undefined,
    }
  );
}

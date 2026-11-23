import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { getProject, getProjects } from "@/lib/content";
import { loadDisplayFont } from "@/lib/og-font";

// Portada por proyecto: mismo lenguaje visual que la del sitio, pero con el nombre del proyecto,
// su estado y su stack. LinkedIn y otras redes toman esta imagen al pegar el enlace del caso de estudio.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Miguel Bonilla: caso de estudio";

const BLUE = "#3D7BFF";
const ACCENT = "#2EE6FF";
const INK = "#EDEFF5";
const MUTED = "#9AA3B8";
const GROUND = "#0A0B10";

// Mismo trazo que components/brand/Sigil.tsx
function SigilSvg({ stroke, px }: { stroke: string; px: number }) {
  return (
    <svg width={px} height={px} viewBox="-4 -4 130 130" style={{ position: "absolute", top: 0, left: 0 }}>
      <g fill="none" stroke={stroke} strokeLinecap="square" strokeLinejoin="miter">
        <circle cx="60" cy="60" r="55" strokeWidth="5" />
        <circle cx="60" cy="60" r="44" strokeWidth="2.5" />
        <path d="M60 16L98.11 82L21.89 82Z" strokeWidth="4" />
        <path d="M44 82V58l16 16 16-16v24" strokeWidth="7" />
      </g>
    </svg>
  );
}

// El título se reduce según su largo para que nunca se corte
function titleSize(title: string): number {
  if (title.length <= 22) return 112;
  if (title.length <= 34) return 92;
  return 74;
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getProjects(locale).map((p) => ({ locale, id: p.id })));
}

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  const project = getProject(locale, id);
  const t = await getTranslations({ locale, namespace: "projects" });
  const font = await loadDisplayFont();
  const title = project?.title ?? "Miguel Bonilla";
  const status = project ? t(`status.${project.status}`) : "";
  const tags = (project?.tags ?? []).slice(0, 4);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: GROUND,
          border: `12px solid ${INK}`,
          fontFamily: font ? "Big Shoulders" : undefined,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 720 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 900, color: ACCENT }}>MIGUEL BONILLA · FULL STACK ENGINEER</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: titleSize(title), fontWeight: 900, color: INK, lineHeight: 0.95, letterSpacing: -1 }}>
            {title}
          </div>
          {status ? (
            <div style={{ display: "flex", marginTop: 28 }}>
              <div style={{ display: "flex", background: ACCENT, color: GROUND, fontSize: 34, fontWeight: 900, padding: "6px 16px" }}>
                {status.toUpperCase()}
              </div>
            </div>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 28 }}>
            {tags.map((tag) => (
              <div key={tag} style={{ display: "flex", fontSize: 36, fontWeight: 900, color: BLUE, marginRight: 28 }}>
                {tag.toUpperCase()}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, fontWeight: 900, color: MUTED }}>MANGEL14.DEV</div>
        </div>
        <div style={{ position: "relative", display: "flex", width: 252, height: 252 }}>
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex" }}>
            <SigilSvg stroke={ACCENT} px={240} />
          </div>
          <SigilSvg stroke={BLUE} px={240} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Big Shoulders", data: font, weight: 900, style: "normal" }] : undefined,
    }
  );
}

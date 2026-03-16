import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Miguel Bonilla — Full Stack Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "#080c10",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid background dots */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, #1e2d3d 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            opacity: 0.4,
          }}
        />

        {/* Glow accent top-left */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #00e5ff, #7fff00)",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0px" }}>
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "1px",
                background: "#00e5ff",
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#00e5ff",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Full Stack Developer
            </span>
          </div>

          {/* Name */}
          <div
            style={{
              fontSize: "92px",
              fontWeight: 800,
              color: "#f0f6fc",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
            }}
          >
            Miguel
          </div>
          <div
            style={{
              fontSize: "92px",
              fontWeight: 800,
              color: "#f0f6fc",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              marginBottom: "32px",
            }}
          >
            Bonilla
          </div>

          {/* Stack tags */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {["Next.js", "WordPress", "Python", "Automatización", "CRM"].map(
              (tag) => (
                <div
                  key={tag}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "14px",
                    color: "#586069",
                    border: "1px solid #1e2d3d",
                    padding: "6px 14px",
                    background: "#0d1117",
                    letterSpacing: "0.05em",
                  }}
                >
                  {tag}
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom-right: terminal handle */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "80px",
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#1e2d3d",
            letterSpacing: "0.1em",
          }}
        >
          ~/mbonilla
        </div>
      </div>
    ),
    { ...size }
  );
}

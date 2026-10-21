import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PKPass } from "passkit-generator";
import { CARD } from "@/lib/card";
import { appleWalletConfig } from "@/lib/wallet";

export const runtime = "nodejs";

const LABELS = {
  es: { name: "NOMBRE", role: "ROL", email: "CORREO", phone: "TELÉFONO", web: "PORTAFOLIO", scan: "Escanea para guardar el contacto" },
  en: { name: "NAME", role: "ROLE", email: "EMAIL", phone: "PHONE", web: "PORTFOLIO", scan: "Scan to save the contact" },
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

/** Pase genérico de Apple Wallet (.pkpass) con el QR que abre la vCard. */
export async function GET(req: Request) {
  const config = appleWalletConfig();
  if (!config) return new Response("Apple Wallet no está configurado", { status: 503 });

  const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "es";
  const l = LABELS[locale];

  // Imágenes generadas con `npm run wallet-assets` (incluidas en la función por next.config.ts)
  const dir = path.join(process.cwd(), "wallet/apple");
  const files: Record<string, Buffer> = {};
  for (const name of await readdir(dir)) files[name] = await readFile(path.join(dir, name));

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    serialNumber: `mangel14-card-${locale}`,
    organizationName: "Mangel14",
    description: `${CARD.fullName}: ${CARD.title}`,
    logoText: "MANGEL14",
    backgroundColor: rgb(CARD.colors.background),
    foregroundColor: rgb(CARD.colors.foreground),
    labelColor: rgb(CARD.colors.label),
    generic: {
      primaryFields: [{ key: "name", label: l.name, value: CARD.fullName }],
      secondaryFields: [{ key: "role", label: l.role, value: CARD.title }],
      auxiliaryFields: [
        { key: "email", label: l.email, value: CARD.email },
        { key: "phone", label: l.phone, value: CARD.phone },
      ],
      backFields: [
        { key: "web", label: l.web, value: CARD.site, dataDetectorTypes: ["PKDataDetectorTypeLink"] },
        { key: "linkedin", label: "LINKEDIN", value: CARD.linkedin, dataDetectorTypes: ["PKDataDetectorTypeLink"] },
        { key: "github", label: "GITHUB", value: CARD.github, dataDetectorTypes: ["PKDataDetectorTypeLink"] },
        { key: "mail", label: l.email, value: CARD.email, dataDetectorTypes: ["PKDataDetectorTypeLink"] },
        { key: "tel", label: l.phone, value: CARD.phone, dataDetectorTypes: ["PKDataDetectorTypePhoneNumber"] },
      ],
    },
  };
  files["pass.json"] = Buffer.from(JSON.stringify(passJson));

  try {
    const pass = new PKPass(files, config.certificates);
    pass.setBarcodes({ message: CARD.vcardUrl, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1", altText: l.scan });
    return new Response(new Uint8Array(pass.getAsBuffer()), {
      headers: {
        "Content-Type": pass.mimeType,
        "Content-Disposition": 'attachment; filename="miguel-bonilla.pkpass"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("apple wallet", e);
    return new Response("No se pudo firmar el pase. Revisa los certificados (docs/setup.md §10).", { status: 500 });
  }
}

import { createSign, randomUUID } from "node:crypto";
import { CARD } from "@/lib/card";
import { SITE_URL } from "@/lib/site";
import { googleWalletConfig } from "@/lib/wallet";

export const runtime = "nodejs";

const LABELS = {
  es: { email: "Correo", phone: "Teléfono", web: "Portafolio", scan: "Escanea para guardar el contacto" },
  en: { email: "Email", phone: "Phone", web: "Portfolio", scan: "Scan to save the contact" },
};

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

/** "Add to Google Wallet": firma un JWT con la clase y el objeto del pase y redirige a Google. */
export async function GET(req: Request) {
  const config = googleWalletConfig();
  if (!config) return new Response("Google Wallet no está configurado", { status: 503 });

  const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "es";
  const l = LABELS[locale];
  const text = (value: string) => ({ defaultValue: { language: locale, value } });
  const classId = `${config.issuerId}.mangel14-contact`;

  const genericObject = {
    id: `${config.issuerId}.card-${randomUUID()}`,
    classId,
    state: "ACTIVE",
    hexBackgroundColor: CARD.colors.background,
    logo: { sourceUri: { uri: `${SITE_URL}/wallet/google-logo.png` }, contentDescription: text("Mangel14") },
    cardTitle: text("Mangel14"),
    header: text(CARD.fullName),
    subheader: text(CARD.title),
    barcode: { type: "QR_CODE", value: CARD.vcardUrl, alternateText: CARD.siteLabel },
    textModulesData: [
      { id: "email", header: l.email, body: CARD.email },
      { id: "phone", header: l.phone, body: CARD.phone },
    ],
    linksModuleData: {
      uris: [
        { id: "web", uri: CARD.site, description: l.web },
        { id: "linkedin", uri: CARD.linkedin, description: "LinkedIn" },
        { id: "github", uri: CARD.github, description: "GitHub" },
      ],
    },
  };

  const claims = {
    iss: config.serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [SITE_URL],
    payload: { genericClasses: [{ id: classId }], genericObjects: [genericObject] },
  };

  try {
    const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify(claims))}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey);
    return Response.redirect(`https://pay.google.com/gp/v/save/${unsigned}.${b64url(signature)}`, 302);
  } catch (e) {
    console.error("google wallet", e);
    return new Response("No se pudo firmar el pase. Revisa la clave de la cuenta de servicio (docs/setup.md §10).", { status: 500 });
  }
}

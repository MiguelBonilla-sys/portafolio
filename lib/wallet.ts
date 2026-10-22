// Credenciales de Google Wallet. Sin ellas la tarjeta funciona igual (vCard + QR)
// y el botón de Wallet no aparece. Apple Wallet se descartó: exige Apple Developer Program (99 USD/año). Guía: docs/setup.md §10.

/** Acepta el PEM tal cual, con "\n" escapados, o en base64 (más cómodo para Vercel). */
function pem(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (v.includes("-----BEGIN")) return v.replace(/\\n/g, "\n");
  return Buffer.from(v, "base64").toString("utf8");
}

export function googleWalletConfig() {
  const e = process.env;
  const privateKey = pem(e.GOOGLE_WALLET_PRIVATE_KEY);
  if (!e.GOOGLE_WALLET_ISSUER_ID || !e.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || !privateKey) return null;
  return { issuerId: e.GOOGLE_WALLET_ISSUER_ID, serviceAccountEmail: e.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL, privateKey };
}

// Credenciales de Apple y Google Wallet. Sin ellas la tarjeta funciona igual (vCard + QR)
// y los botones de Wallet no aparecen. Guía: docs/setup.md §10.

/** Acepta el PEM tal cual, con "\n" escapados, o en base64 (más cómodo para Vercel). */
function pem(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (v.includes("-----BEGIN")) return v.replace(/\\n/g, "\n");
  return Buffer.from(v, "base64").toString("utf8");
}

export function appleWalletConfig() {
  const e = process.env;
  const signerCert = pem(e.APPLE_WALLET_SIGNER_CERT);
  const signerKey = pem(e.APPLE_WALLET_SIGNER_KEY);
  const wwdr = pem(e.APPLE_WALLET_WWDR_CERT);
  if (!e.APPLE_WALLET_PASS_TYPE_ID || !e.APPLE_WALLET_TEAM_ID || !signerCert || !signerKey || !wwdr) return null;
  return {
    passTypeIdentifier: e.APPLE_WALLET_PASS_TYPE_ID,
    teamIdentifier: e.APPLE_WALLET_TEAM_ID,
    certificates: { wwdr, signerCert, signerKey, signerKeyPassphrase: e.APPLE_WALLET_SIGNER_KEY_PASSPHRASE || undefined },
  };
}

export function googleWalletConfig() {
  const e = process.env;
  const privateKey = pem(e.GOOGLE_WALLET_PRIVATE_KEY);
  if (!e.GOOGLE_WALLET_ISSUER_ID || !e.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || !privateKey) return null;
  return { issuerId: e.GOOGLE_WALLET_ISSUER_ID, serviceAccountEmail: e.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL, privateKey };
}

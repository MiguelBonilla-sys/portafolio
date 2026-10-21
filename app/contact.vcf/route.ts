import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildVCard } from "@/lib/card";

// Se genera en el build: el QR de la tarjeta y los pases de Wallet apuntan aquí
export const dynamic = "force-static";

export async function GET() {
  const photo = await readFile(path.join(process.cwd(), "wallet/photo.jpg")).catch(() => undefined);
  return new Response(buildVCard(photo), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'inline; filename="miguel-bonilla.vcf"',
    },
  });
}

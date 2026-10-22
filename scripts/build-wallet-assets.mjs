// Genera las imágenes de la tarjeta de contacto a partir del símbolo y la foto.
// Uso: pnpm wallet-assets (solo hace falta si cambian public/brand/*.svg o public/avatar.png)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const mark = "public/brand/mark.svg"; // símbolo sobre fondo oscuro
const avatar = "public/avatar.png";

await mkdir("public/wallet", { recursive: true });

const png = (src, size, out) =>
  sharp(src, { density: 600 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out);
const photo = (size) => sharp(avatar).resize(size, size, { fit: "cover", position: "top" });

await png(mark, 660, "public/wallet/google-logo.png");
await photo(256).jpeg({ quality: 80 }).toFile("wallet/photo.jpg");
console.log("✓ wallet/photo.jpg, public/wallet/google-logo.png");

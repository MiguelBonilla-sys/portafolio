// Genera las imágenes de la tarjeta de contacto a partir del símbolo y la foto.
// Uso: npm run wallet-assets (solo hace falta si cambian public/brand/*.svg o public/avatar.png)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const mark = "public/brand/mark.svg"; // símbolo sobre fondo oscuro
const symbol = "public/brand/symbol-dark.svg"; // símbolo cian sin fondo
const avatar = "public/avatar.png";

await mkdir("wallet/apple", { recursive: true });
await mkdir("public/wallet", { recursive: true });

const png = (src, size, out) =>
  sharp(src, { density: 600 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out);
const photo = (size) => sharp(avatar).resize(size, size, { fit: "cover", position: "top" });

for (const [scale, suffix] of [[1, ""], [2, "@2x"], [3, "@3x"]]) {
  await png(mark, 29 * scale, `wallet/apple/icon${suffix}.png`);
  await png(symbol, 50 * scale, `wallet/apple/logo${suffix}.png`);
  await photo(90 * scale).png().toFile(`wallet/apple/thumbnail${suffix}.png`);
}
await png(mark, 660, "public/wallet/google-logo.png");
await photo(256).jpeg({ quality: 80 }).toFile("wallet/photo.jpg");
console.log("✓ wallet/apple/*.png, wallet/photo.jpg, public/wallet/google-logo.png");

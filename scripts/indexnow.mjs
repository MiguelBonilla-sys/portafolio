// Avisa a Bing (y a los buscadores de IA que usan su índice) de todas las URLs del sitemap.
// Uso, después de cada deploy: pnpm indexnow (o SITE_URL=https://otro-dominio pnpm indexnow)
const KEY = "3a142bdab1da687057cc12b488c8e24c"; // archivo público: public/3a142bdab1da687057cc12b488c8e24c.txt

const site = (process.env.SITE_URL ?? "https://mangel14.dev").replace(/\/$/, "");
if (!site.startsWith("https://")) {
  console.error("Define SITE_URL con el dominio de producción (https://...)");
  process.exit(1);
}

const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>(.+?)<\/loc>|hreflang="[^"]+" href="([^"]+)"/g)]
  .map((m) => m[1] ?? m[2])
  .filter((u, i, all) => all.indexOf(u) === i);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(site).host, key: KEY, keyLocation: `${site}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} · ${urls.length} URLs`);

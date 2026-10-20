// Avisa a Bing (y a los buscadores de IA que usan su índice) de URLs nuevas o actualizadas.
export async function pingIndexNow(siteUrl: string, key: string, urls: string[]): Promise<number> {
  const site = siteUrl.replace(/\/$/, "");
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList: urls }),
  });
  return res.status;
}

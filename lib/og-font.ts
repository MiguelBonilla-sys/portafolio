// Satori (next/og) necesita TTF/OTF: se pide a Google Fonts. Si falla, se usa la fuente por defecto.
let cached: Promise<ArrayBuffer | null> | null = null;

export function loadDisplayFont(): Promise<ArrayBuffer | null> {
  cached ??= (async () => {
    try {
      const css = await (await fetch("https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@900&display=swap")).text();
      const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      if (!url) return null;
      return await (await fetch(url)).arrayBuffer();
    } catch {
      return null;
    }
  })();
  return cached;
}

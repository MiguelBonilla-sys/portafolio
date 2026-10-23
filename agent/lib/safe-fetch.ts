import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import { UserFacingError } from "./redact.ts";

// Descarga de URLs que manda el autor (o que aparecen en sus documentos) sin abrir la red interna:
// solo http(s) a los puertos 80/443, cada dirección resuelta se valida en el momento de conectar
// (no hay ventana entre "validar" y "conectar" para un DNS rebinding), redirecciones revalidadas,
// tiempo y tamaño acotados, y ningún script se ejecuta: se devuelve el cuerpo como texto.

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, metadatos de nube (169.254.169.254)
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7], // ULA
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) {
    const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return !blocked.check(mapped[1], "ipv4");
    return !blocked.check(address, "ipv6");
  }
  return false;
}

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  /** Tipos aceptados (prefijos de Content-Type) */
  accept?: string[];
  /** Para tests: resolvedor DNS alternativo */
  lookup?: typeof dnsLookup;
}

export interface SafeResponse {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
}

type Lookup = typeof dnsLookup;

/** lookup que rechaza direcciones privadas; Node lo llama justo antes de abrir el socket */
function guardedLookup(base: Lookup): Lookup {
  return ((hostname: string, options: unknown, callback: (...args: unknown[]) => void) => {
    const opts = typeof options === "object" && options ? (options as Record<string, unknown>) : {};
    base(hostname, { ...opts, all: true }, (err: NodeJS.ErrnoException | null, addresses: LookupAddress[] | string) => {
      if (err) return callback(err);
      const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: isIP(addresses) }];
      const safe = list.filter((a) => isPublicAddress(a.address));
      if (safe.length === 0 || safe.length !== list.length) {
        return callback(Object.assign(new Error(`destino no permitido (${hostname})`), { code: "EBLOCKED" }));
      }
      if (opts.all) return callback(null, safe);
      callback(null, safe[0].address, safe[0].family);
    });
  }) as Lookup;
}

function validateUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UserFacingError("Esa URL no es válida.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UserFacingError("Solo puedo leer enlaces http o https.");
  if (url.username || url.password) throw new UserFacingError("No abro URLs con usuario o contraseña incluidos.");
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (port !== 80 && port !== 443) throw new UserFacingError("Solo abro URLs en los puertos 80 y 443.");
  // Un literal IP se valida aquí; los nombres, al conectar
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host)) throw new UserFacingError("Esa URL apunta a una red privada; no la abro.");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new UserFacingError("Esa URL apunta a una red privada; no la abro.");
  return url;
}

function requestOnce(url: URL, opts: Required<Omit<SafeFetchOptions, "lookup">> & { lookup: Lookup }): Promise<SafeResponse & { location?: string }> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: guardedLookup(opts.lookup),
        timeout: opts.timeoutMs,
        headers: {
          "User-Agent": "mangel14-content-engine/1.0 (+https://mangel14.dev)",
          Accept: opts.accept.join(", "),
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          res.resume();
          return resolve({ url: url.toString(), status, contentType: "", body: Buffer.alloc(0), location });
        }
        const contentType = String(res.headers["content-type"] ?? "").toLowerCase();
        if (!opts.accept.some((a) => contentType.startsWith(a))) {
          res.destroy();
          return reject(new UserFacingError(`El enlace devuelve un tipo de contenido que no leo (${contentType.split(";")[0] || "desconocido"}).`));
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > opts.maxBytes) {
          res.destroy();
          return reject(new UserFacingError("La página es demasiado grande para leerla."));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > opts.maxBytes) {
            res.destroy();
            reject(new UserFacingError("La página es demasiado grande para leerla."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ url: url.toString(), status, contentType, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new UserFacingError("El sitio tardó demasiado en responder.")));
    req.on("error", (e: NodeJS.ErrnoException) =>
      reject(e.code === "EBLOCKED" ? new UserFacingError("Esa URL apunta a una red privada; no la abro.") : e)
    );
    req.end();
  });
}

export async function safeFetch(raw: string, options: SafeFetchOptions = {}): Promise<SafeResponse> {
  const opts = {
    maxBytes: options.maxBytes ?? 2_000_000,
    timeoutMs: options.timeoutMs ?? 10_000,
    maxRedirects: options.maxRedirects ?? 3,
    accept: options.accept ?? ["text/html", "text/plain", "text/markdown", "application/xhtml+xml"],
    lookup: options.lookup ?? dnsLookup,
  };
  let url = validateUrl(raw);
  for (let hop = 0; hop <= opts.maxRedirects; hop++) {
    const res = await requestOnce(url, opts);
    if (!res.location) return res;
    url = validateUrl(new URL(res.location, url).toString());
  }
  throw new UserFacingError("El enlace redirige demasiadas veces.");
}

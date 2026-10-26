// LinkedIn: OAuth 2.0 ("Share on LinkedIn" + "Sign In with LinkedIn using OpenID Connect")
// y Posts API. Docs: https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api

import { findOrgs } from "../../lib/orgs.ts";
import { redact } from "./redact.ts";

/**
 * El campo commentary usa el "little text format": ( ) [ ] { } < > @ * _ ~ | \ y # son sintaxis, y LinkedIn
 * corta el post en el primero que no esté escapado (y aun así responde 201). Se escapa todo salvo los
 * hashtags (#palabra). Con `mentions`, la primera mención de cada empresa de lib/orgs.ts se convierte en
 * @[nombre](urn), que enlaza su página y le avisa.
 * Docs: https://learn.microsoft.com/linkedin/marketing/community-management/shares/little-text-format
 */
export function toLittleText(text: string, opts: { mentions?: boolean } = {}): string {
  const escape = (t: string) => t.replace(/[\\|{}@[\]()<>*_~]/g, (c) => `\\${c}`).replace(/#(?![\p{L}\p{N}])/gu, "\\#");
  if (!opts.mentions) return escape(text);
  let out = "";
  let at = 0;
  for (const h of findOrgs(text)) {
    out += `${escape(text.slice(at, h.start))}@[${escape(h.org.linkedinName)}](${h.org.linkedinUrn})`;
    at = h.end;
  }
  return out + escape(text.slice(at));
}

// openid + profile: identificar al miembro; w_member_social: publicar, comentar y subir imágenes o documentos
// en su nombre. La app no pide permisos de lectura de publicaciones (r_member_social es restringido).
export const LINKEDIN_SCOPES = "openid profile w_member_social";

export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: LINKEDIN_SCOPES,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn accessToken: ${res.status} ${redact((await res.text()).slice(0, 300))}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export async function fetchMemberId(accessToken: string): Promise<string> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`LinkedIn userinfo: ${res.status}`);
  return ((await res.json()) as { sub: string }).sub;
}

export class LinkedInAuthError extends Error {}

export interface LinkedInClient {
  /** media: urn de un documento (carrusel) o de una imagen ya subidos */
  createPost(text: string, opts?: { documentUrn?: string; documentTitle?: string; imageUrn?: string; altText?: string }): Promise<string>;
  comment(postUrn: string, text: string): Promise<void>;
  uploadDocument(pdf: Uint8Array, title: string): Promise<string>;
  uploadImage(png: Uint8Array): Promise<string>;
}

export function createLinkedIn(accessToken: string, memberId: string, version: string): LinkedInClient {
  const author = `urn:li:person:${memberId}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": version,
    "X-Restli-Protocol-Version": "2.0.0",
  };

  async function check(res: Response, what: string) {
    if (res.status === 401) throw new LinkedInAuthError(`LinkedIn ${what}: token vencido o revocado`);
    if (!res.ok) throw new Error(`LinkedIn ${what}: ${res.status} ${redact((await res.text()).slice(0, 300))}`);
  }

  return {
    async createPost(text, opts = {}) {
      const send = (mentions: boolean) => fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          author,
          commentary: toLittleText(text, { mentions }),
          visibility: "PUBLIC",
          distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
          ...(opts.documentUrn
            ? { content: { media: { title: opts.documentTitle ?? "Carrusel", id: opts.documentUrn } } }
            : opts.imageUrn
              ? { content: { media: { id: opts.imageUrn, altText: (opts.altText ?? "").slice(0, 4086) } } }
              : {}),
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false,
        }),
      });
      let res = await send(true);
      // Una mención rechazada (400/422) no debe frenar el post: un 4xx no lo crea, así que se reintenta sin ella
      if ((res.status === 400 || res.status === 422) && findOrgs(text).length) res = await send(false);
      await check(res, "createPost");
      const urn = res.headers.get("x-restli-id");
      if (!urn) throw new Error("LinkedIn createPost: la respuesta no trae x-restli-id");
      return urn;
    },

    async comment(postUrn, text) {
      const res = await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ actor: author, object: postUrn, message: { text } }),
      });
      await check(res, "comment");
    },

    async uploadDocument(pdf, title) {
      const init = await fetch("https://api.linkedin.com/rest/documents?action=initializeUpload", {
        method: "POST",
        headers,
        body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
      });
      await check(init, `uploadDocument(${title})`);
      const { value } = (await init.json()) as { value: { uploadUrl: string; document: string } };
      const put = await fetch(value.uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
      });
      await check(put, "uploadDocument PUT");
      return value.document;
    },

    // Images API: initializeUpload → PUT del binario → urn:li:image:… para usar en createPost
    async uploadImage(png) {
      const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
        method: "POST",
        headers,
        body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
      });
      await check(init, "uploadImage");
      const { value } = (await init.json()) as { value: { uploadUrl: string; image: string } };
      const put = await fetch(value.uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: new Blob([new Uint8Array(png)], { type: "image/png" }),
      });
      await check(put, "uploadImage PUT");
      return value.image;
    },
  };
}

// Empresas con las que trabajo, enlazadas donde se nombran: sitio, CV, JSON-LD, llms.txt, blog y LinkedIn.
// Sin dependencias ni alias: lo importan el sitio (@/lib/orgs) y el agente (../lib/orgs.ts).

export interface Org {
  /** Nombre tal como la empresa se presenta (og:title de su sitio y su página de LinkedIn) */
  name: string;
  url: string;
  linkedin: string;
  /** Nombre de su página de LinkedIn, el que se muestra en una mención */
  linkedinName: string;
  /** Para mencionarla en posts de LinkedIn: @[linkedinName](urn) */
  linkedinUrn: string;
  /**
   * Cómo aparece en un texto libre (artículos y posts). "Coordenadas" sola también es una palabra común
   * ("coordenadas GPS"): sin ".co" solo cuenta con mayúscula y después de una preposición ("trabajo en Coordenadas").
   */
  pattern: RegExp;
}

export const COORDENADAS: Org = {
  name: "Coordenadas.co",
  url: "https://coordenadas.co/",
  linkedin: "https://www.linkedin.com/company/coordenadas-co/",
  linkedinName: "Coordenadas.co",
  linkedinUrn: "urn:li:organization:15161244",
  pattern: /Coordenadas\.co\b|(?<=\b(?:en|para|con|de|at|for|with|in) )Coordenadas\b(?!\.\w)/u,
};

/** Firma contable cliente de Coordenadas.co; su plataforma (app.bikans.com) es el proyecto Bikans */
export const BIKANS: Org = {
  name: "Bikans",
  url: "https://bikans.com/",
  linkedin: "https://www.linkedin.com/company/bikansasesores/",
  linkedinName: "Bikans Asesores",
  linkedinUrn: "urn:li:organization:101577063",
  // Con mayúscula: "app.bikans.com" es el dominio de la plataforma, no la empresa
  pattern: /\bBikans\b(?!\.\w)/u,
};

export const ORGS: Org[] = [COORDENADAS, BIKANS];

/**
 * rel para enlaces a empresas: sin noreferrer, para que la empresa vea en su analítica que la visita
 * vino de este sitio. Es un enlace editorial (no pagado), así que no lleva nofollow ni sponsored.
 */
export const ORG_LINK_REL = "noopener";

export interface OrgHit {
  start: number;
  end: number;
  org: Org;
}

/** La primera aparición de cada empresa en el texto, en orden y sin solaparse */
export function findOrgs(text: string): OrgHit[] {
  const hits: OrgHit[] = [];
  for (const org of ORGS) {
    const m = org.pattern.exec(text);
    if (m) hits.push({ start: m.index, end: m.index + m[0].length, org });
  }
  hits.sort((a, b) => a.start - b.start);
  return hits.filter((h, i) => i === 0 || h.start >= hits[i - 1].end);
}

/** "trabajo en Coordenadas.co" → "trabajo en Coordenadas.co (https://coordenadas.co/)", una vez por empresa */
export function withOrgUrls(text: string): string {
  let out = text;
  for (const org of ORGS) {
    const m = org.pattern.exec(out);
    if (m && !out.includes(org.url)) out = `${out.slice(0, m.index + m[0].length)} (${org.url})${out.slice(m.index + m[0].length)}`;
  }
  return out;
}

/**
 * Markdown: enlaza la primera mención de cada empresa que no esté ya enlazada, fuera del código,
 * de los enlaces y de los encabezados. El resto de las menciones queda como texto.
 */
export function linkOrgsMarkdown(markdown: string): string {
  let out = markdown;
  for (const org of ORGS) {
    if (out.includes(`](${org.url})`)) continue;
    // Código, enlaces e imágenes, y encabezados: se dejan intactos
    const parts = out.split(/(```[\s\S]*?```|`[^`\n]+`|!?\[[^\]]*\]\([^)]*\)|^#{1,6} .*$)/gm);
    let done = false;
    out = parts
      .map((part, i) => {
        if (done || i % 2 === 1) return part;
        const m = org.pattern.exec(part);
        if (!m) return part;
        done = true;
        return `${part.slice(0, m.index)}[${m[0]}](${org.url})${part.slice(m.index + m[0].length)}`;
      })
      .join("");
  }
  return out;
}

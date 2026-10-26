import { findOrgs, ORG_LINK_REL, type Org } from "@/lib/orgs";

/** Texto en el que la primera mención de cada empresa (lib/orgs.ts) enlaza a su sitio */
export default function OrgText({ text }: { text: string }) {
  const hits = findOrgs(text);
  if (!hits.length) return <>{text}</>;
  const segments: { text: string; org?: Org }[] = hits.flatMap((h, i) => [
    { text: text.slice(i === 0 ? 0 : hits[i - 1].end, h.start) },
    { text: text.slice(h.start, h.end), org: h.org },
  ]);
  segments.push({ text: text.slice(hits[hits.length - 1].end) });
  return (
    <>
      {segments.map((s, i) =>
        s.org ? (
          <a key={i} href={s.org.url} target="_blank" rel={ORG_LINK_REL}>
            {s.text}
          </a>
        ) : (
          s.text
        )
      )}
    </>
  );
}

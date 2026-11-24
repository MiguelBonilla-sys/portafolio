import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { blogMdxOptions } from "@/agent/lib/mdx";
import type { Locale } from "@/i18n/routing";
import { ORG_LINK_REL, ORGS } from "@/lib/orgs";
import { renderWidget } from "./widgets";
import styles from "./Prose.module.css";

function widgetId(children: ReactNode): string | null {
  const code = isValidElement(children) ? (children as ReactElement<{ className?: string; children?: ReactNode }>) : null;
  if (code?.props.className !== "language-widget") return null;
  return typeof code.props.children === "string" ? code.props.children.trim() : "";
}

const baseComponents = {
  // Alt y título siempre: el agente bloquea una imagen sin alt; el título, si falta, repite el alt
  img: ({ alt = "", title, ...props }: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} title={title || alt} loading="lazy" decoding="async" {...props} />
  ),
  a: ({ href = "", ...props }: ComponentProps<"a">) =>
    href.startsWith("http") ? (
      // A las empresas con las que trabajo se les deja ver de dónde viene la visita (sin noreferrer)
      <a href={href} target="_blank" rel={ORGS.some((o) => href.startsWith(o.url)) ? ORG_LINK_REL : "noopener noreferrer"} {...props} />
    ) : (
      <a href={href} {...props} />
    ),
  table: (props: ComponentProps<"table">) => (
    <div style={{ overflowX: "auto" }}>
      <table {...props} />
    </div>
  ),
};

export default function Prose({ source, locale }: { source: string; locale: Locale }) {
  // Un bloque ```widget con un id de la lista cerrada dibuja el explicador; cualquier otro id no dibuja nada
  const components = {
    ...baseComponents,
    pre: (props: ComponentProps<"pre">) => {
      const id = widgetId(props.children);
      return id === null ? <pre {...props} /> : renderWidget(id, locale);
    },
  };
  return (
    <div className={styles.prose}>
      <MDXRemote source={source} options={{ mdxOptions: blogMdxOptions }} components={components} />
    </div>
  );
}

import type { ComponentProps } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ORG_LINK_REL, ORGS } from "@/lib/orgs";
import styles from "./Prose.module.css";

const components = {
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

export default function Prose({ source }: { source: string }) {
  return (
    <div className={styles.prose}>
      <MDXRemote source={source} components={components} />
    </div>
  );
}

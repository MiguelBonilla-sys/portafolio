import type { ComponentProps } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import styles from "./Prose.module.css";

const components = {
  a: ({ href = "", ...props }: ComponentProps<"a">) =>
    href.startsWith("http") ? (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
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

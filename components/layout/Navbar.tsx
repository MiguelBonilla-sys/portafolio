"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import Sigil from "@/components/brand/Sigil";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type messagesEs from "@/messages/es.json";
import styles from "./Navbar.module.css";

const sections = [
  { id: "sobreMi", key: "about" },
  { id: "habilidades", key: "stack" },
  { id: "formacion", key: "path" },
  { id: "proyectos", key: "projects" },
] as const;

// Los textos llegan del servidor ya resueltos: así el cliente no carga el formateador de next-intl
type NavMessages = (typeof messagesEs)["nav"];

export default function Navbar({ messages }: { messages: NavMessages }) {
  const t = (key: keyof NavMessages) => messages[key];
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isHome = pathname === "/";
  const isBlog = pathname.startsWith("/blog");
  const otherLocale = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  // Marca la sección visible (solo en la página de inicio)
  useEffect(() => {
    if (!isHome) return;
    const targets = [...sections.map((s) => s.id), "contacto"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    targets.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);
  const current = (id: string) => (isHome && active === id ? "location" : undefined);

  return (
    <header className={styles.bar}>
      <nav className={`shell ${styles.inner}`} aria-label={t("label")}>
        <Link href="/" className={`brand-link ${styles.brand}`} onClick={close}>
          <span className={styles.mark}>
            <Sigil variant="mark" />
          </span>
          <span className={styles.name}>Miguel Bonilla</span>
        </Link>

        <ul id="menu-principal" className={`${styles.links} ${open ? styles.open : ""}`}>
          {sections.map((s) => (
            <li key={s.id}>
              <Link
                href={{ pathname: "/", hash: s.id }}
                className={styles.link}
                aria-current={current(s.id)}
                onClick={close}
              >
                {t(s.key)}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/blog" className={styles.link} aria-current={isBlog ? "page" : undefined} onClick={close}>
              {t("blog")}
            </Link>
          </li>
          <li>
            <Link href="/cv" className={styles.link} aria-current={pathname === "/cv" ? "page" : undefined} onClick={close}>
              {t("cv")}
            </Link>
          </li>
          <li>
            <Link
              href={{ pathname: "/", hash: "contacto" }}
              className={styles.link}
              aria-current={current("contacto")}
              onClick={close}
            >
              {t("contact")}
            </Link>
          </li>
        </ul>

        <div className={styles.actions}>
          <Link
            // @ts-expect-error -- la ruta actual y sus params vienen del router; son válidos en ambos idiomas
            href={{ pathname, params }}
            locale={otherLocale}
            className={styles.lang}
            aria-label={t("switchLangLabel")}
            hrefLang={otherLocale}
          >
            {t("switchLang")}
          </Link>
          <ThemeToggle label={t("theme")} />
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={open}
            aria-controls="menu-principal"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? t("close") : t("menu")}
          </button>
        </div>
      </nav>
    </header>
  );
}

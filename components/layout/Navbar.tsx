"use client";

import { useEffect, useState } from "react";
import Sigil from "@/components/brand/Sigil";
import ThemeToggle from "@/components/ui/ThemeToggle";
import styles from "./Navbar.module.css";

const navLinks = [
  { id: "sobreMi", label: "Sobre mí" },
  { id: "habilidades", label: "Stack" },
  { id: "formacion", label: "Trayectoria" },
  { id: "proyectos", label: "Proyectos" },
  { id: "contacto", label: "Contacto" },
];

export default function Navbar() {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Marca la sección visible para el estado activo del menú
  useEffect(() => {
    const sections = navLinks
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={styles.bar}>
      <nav className={`shell ${styles.inner}`} aria-label="Principal">
        <a href="#home" className={`brand-link ${styles.brand}`} onClick={() => setOpen(false)}>
          <span className={styles.mark}>
            <Sigil variant="mark" />
          </span>
          <span className={styles.name}>Miguel Bonilla</span>
        </a>

        <ul id="menu-principal" className={`${styles.links} ${open ? styles.open : ""}`}>
          {navLinks.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className={styles.link}
                aria-current={active === link.id ? "location" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <ThemeToggle />
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={open}
            aria-controls="menu-principal"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Cerrar" : "Menú"}
          </button>
        </div>
      </nav>
    </header>
  );
}

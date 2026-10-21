"use client";

import { THEME_KEY, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle({ label }: { label: string }) {
  const toggle = () => {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Sin almacenamiento (modo privado): el cambio vale solo para esta visita
    }
  };

  // Los dos íconos se renderizan siempre; el CSS muestra el del tema activo
  return (
    <button type="button" onClick={toggle} className={styles.toggle} aria-label={label}>
      <span className={styles.sun}>
        <SunIcon />
      </span>
      <span className={styles.moon}>
        <MoonIcon />
      </span>
    </button>
  );
}

"use client";

import { useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { MoonIcon, SunIcon } from "./icons";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("dark", { getInitialValueInEffect: true });

  // Los dos íconos se renderizan siempre; el CSS muestra el que corresponde al tema activo,
  // así el servidor y el cliente pintan lo mismo.
  return (
    <button
      type="button"
      onClick={() => setColorScheme(computed === "dark" ? "light" : "dark")}
      className={styles.toggle}
      aria-label="Cambiar entre tema claro y oscuro"
    >
      <span className={styles.sun}>
        <SunIcon />
      </span>
      <span className={styles.moon}>
        <MoonIcon />
      </span>
    </button>
  );
}

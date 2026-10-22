"use client";

import { useLayoutEffect } from "react";
import { THEME_KEY, THEME_SCRIPT } from "@/lib/theme";

// El <script> aplica el tema guardado antes de pintar en la carga inicial.
// Al cambiar de idioma el layout raíz se vuelve a montar en el cliente: React reaplica
// data-theme="dark" y un <script> creado en el cliente nunca se ejecuta, así que el efecto
// restaura el tema. En el cliente se marca como text/plain para que React no avise.
export default function ThemeScript() {
  useLayoutEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    } catch {
      // Sin almacenamiento (modo privado): queda el tema por defecto
    }
  }, []);

  return (
    <script
      type={typeof window === "undefined" ? undefined : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}

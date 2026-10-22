"use client";

import { useEffect } from "react";

// gtag.js (~180 KiB) corre dos tareas largas en el hilo principal. Con lazyOnload caían justo
// después del load, dentro de la ventana de TBT de Lighthouse (escritorio 100 -> 91). Ahora carga
// en la primera interacción, o a los 8 s para quien solo lee; Vercel Web Analytics cuenta todas las visitas.
const INTERACTIONS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
const FALLBACK_MS = 8000;

export default function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    // No cargar en desarrollo ni si no hay ID configurado
    if (!measurementId || process.env.NODE_ENV === "development") return;
    // Al cambiar de idioma el layout se vuelve a montar: no cargar gtag dos veces
    if ("dataLayer" in window) return;

    const load = () => {
      cleanup();
      const init = document.createElement("script");
      init.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${measurementId}', { page_path: window.location.pathname });
      `;
      const lib = document.createElement("script");
      lib.async = true;
      lib.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.append(init, lib);
    };
    const timer = window.setTimeout(load, FALLBACK_MS);
    const cleanup = () => {
      window.clearTimeout(timer);
      INTERACTIONS.forEach((e) => window.removeEventListener(e, load));
    };
    INTERACTIONS.forEach((e) => window.addEventListener(e, load, { once: true, passive: true }));
    return cleanup;
  }, [measurementId]);

  return null;
}

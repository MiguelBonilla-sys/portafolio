import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import styles from "./[locale]/not-found.module.css";
import "./globals.css";

// 404 para rutas fuera de un idioma (p. ej. /foo.png): el layout raíz vive en [locale]
// y no puede mostrar su not-found cuando el segmento no es un idioma válido.
export const metadata: Metadata = {
  title: "404 | Miguel Bonilla",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang={routing.defaultLocale} data-theme="dark">
      <body>
        <main className={`shell ${styles.wrap}`}>
          <p className={`data ${styles.code}`}>404</p>
          <h1 className={styles.title}>Página no encontrada</h1>
          <p className={styles.body}>Esta ruta no existe o se movió. / This route doesn&apos;t exist or has moved.</p>
          <a href={`/${routing.defaultLocale}`} className="btn btn-primary">
            Ir al inicio
          </a>
        </main>
      </body>
    </html>
  );
}

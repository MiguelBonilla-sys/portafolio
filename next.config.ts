import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Un solo dominio canónico: los demás hosts redirigen con 301 conservando la ruta.
// Las previews de Vercel tienen otros hosts y no se tocan.
const SECONDARY_HOSTS = ["www.mangel14.dev", "portafolio.mangel14.dev", "portafolio-inky-rho.vercel.app"];

const nextConfig: NextConfig = {
  // app/global-not-found.tsx: 404 para rutas fuera de [locale] (sin esto daban 500)
  // inlineCss: el CSS va en <style> dentro del HTML en vez de <link>, sin solicitudes que bloqueen el render
  experimental: { globalNotFound: true, inlineCss: true },
  async redirects() {
    return SECONDARY_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://mangel14.dev/:path*",
      permanent: true,
    }));
  },
  images: {
    localPatterns: [
      {
        pathname: "/avatar.png",
        search: "?v=20260315",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);

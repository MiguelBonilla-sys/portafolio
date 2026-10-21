import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/cv": "/cv",
    "/tarjeta": {
      es: "/tarjeta",
      en: "/card",
    },
    "/proyectos/[id]": {
      es: "/proyectos/[id]",
      en: "/projects/[id]",
    },
  },
});

export type Locale = (typeof routing.locales)[number];

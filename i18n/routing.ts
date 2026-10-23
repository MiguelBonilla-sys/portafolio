import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/blog/categoria/[category]": {
      es: "/blog/categoria/[category]",
      en: "/blog/category/[category]",
    },
    "/cv": "/cv",
    "/privacidad": {
      es: "/privacidad",
      en: "/privacy",
    },
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

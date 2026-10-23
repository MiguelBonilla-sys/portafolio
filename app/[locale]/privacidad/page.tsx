import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import Prose from "@/components/blog/Prose";
import type { Locale } from "@/i18n/routing";
import { EMAIL } from "@/lib/content";
import { alternatesFor, socialFor } from "@/lib/site";
import styles from "./privacy.module.css";

// LinkedIn exige esta URL al crear la app del Content Engine. Describe solo lo que el sitio hace hoy:
// si se agrega un servicio que recoja datos, hay que actualizar el texto y la fecha.
const UPDATED = { es: "21 de octubre de 2026", en: "October 21, 2026" };

const TEXT: Record<Locale, { title: string; description: string; body: string }> = {
  es: {
    title: "Política de privacidad",
    description: "Qué datos recoge mangel14.dev, para qué se usan y cómo pedir que se borren.",
    body: `
Última actualización: ${UPDATED.es}.

mangel14.dev es el portafolio personal de Miguel Bonilla (Bogotá, Colombia), responsable de los datos que se describen aquí. Contacto: [${EMAIL}](mailto:${EMAIL}).

## Qué datos se recogen

- **Analítica.** Google Analytics 4 registra las páginas visitadas, el país aproximado, el dispositivo y el navegador, con cookies de Google. Lo uso para saber qué se lee.
- **Vercel Web Analytics.** Cuenta visitas y páginas vistas con datos anónimos (página, referente, país, dispositivo y navegador). No usa cookies: identifica la visita con un hash de la petición.
- **Formulario de contacto.** El nombre, el correo y el mensaje que escribas se envían por Web3Forms a mi correo. Los uso solo para responderte.
- **Registros del servidor.** Vercel, donde está alojado el sitio, guarda registros técnicos (dirección IP, fecha y ruta) para operar y proteger el servicio.

La tarjeta de contacto, la vCard y los pases de Apple Wallet y Google Wallet no recogen datos de quien los descarga.

## Aplicación de LinkedIn

El sitio usa una aplicación de LinkedIn de uso personal: solo yo la autorizo, para publicar en mi propio perfil los artículos de este blog. Con los permisos \`openid\`, \`profile\` y \`w_member_social\` obtiene mi identificador de miembro y publica en mi nombre. El token de acceso se guarda cifrado (AES-256-GCM) y vence a los 60 días.

La aplicación no lee, guarda ni publica datos de otros miembros de LinkedIn ni de los visitantes de este sitio.

## Con quién se comparten

Solo con los proveedores mencionados (Google, Web3Forms, Vercel y LinkedIn), que procesan los datos para prestar su servicio. No vendo ni cedo datos a terceros.

## Tus derechos

Según la Ley 1581 de 2012 de Colombia, puedes conocer, actualizar, rectificar o pedir que se borren tus datos escribiendo a [${EMAIL}](mailto:${EMAIL}). Para que Google Analytics no registre tus visitas, bloquea las cookies de terceros o instala el [complemento de inhabilitación de Google](https://tools.google.com/dlpage/gaoptout).

## Cambios

Si esta política cambia, se actualiza la fecha de arriba.
`,
  },
  en: {
    title: "Privacy policy",
    description: "What data mangel14.dev collects, what it is used for and how to ask for it to be deleted.",
    body: `
Last updated: ${UPDATED.en}.

mangel14.dev is the personal portfolio of Miguel Bonilla (Bogotá, Colombia), who is responsible for the data described here. Contact: [${EMAIL}](mailto:${EMAIL}).

## What data is collected

- **Analytics.** Google Analytics 4 records the pages visited, approximate country, device and browser, using Google cookies. I use it to see what gets read.
- **Vercel Web Analytics.** Counts visits and page views with anonymized data (page, referrer, country, device and browser). It does not use cookies: it identifies the visit with a hash of the request.
- **Contact form.** The name, email and message you write are sent through Web3Forms to my inbox. I use them only to reply to you.
- **Server logs.** Vercel, which hosts the site, keeps technical logs (IP address, date and path) to run and protect the service.

The contact card, the vCard and the Apple Wallet and Google Wallet passes do not collect data from whoever downloads them.

## LinkedIn application

The site uses a LinkedIn application for personal use: only I authorize it, to publish this blog's articles on my own profile. With the \`openid\`, \`profile\` and \`w_member_social\` permissions it reads my member ID and posts on my behalf. The access token is stored encrypted (AES-256-GCM) and expires after 60 days.

The application does not read, store or publish data from other LinkedIn members or from visitors to this site.

## Who it is shared with

Only with the providers listed above (Google, Web3Forms, Vercel and LinkedIn), which process the data to provide their service. I do not sell or hand over data to third parties.

## Your rights

Under Colombian Law 1581 of 2012, you can access, update, correct or ask for the deletion of your data by writing to [${EMAIL}](mailto:${EMAIL}). To keep Google Analytics from recording your visits, block third-party cookies or install [Google's opt-out add-on](https://tools.google.com/dlpage/gaoptout).

## Changes

If this policy changes, the date above is updated.
`,
  },
};

export async function generateMetadata({ params }: PageProps<"/[locale]/privacidad">): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  return {
    title: TEXT[locale].title,
    description: TEXT[locale].description,
    alternates: alternatesFor(locale, "/privacidad"),
    ...socialFor(locale, "/privacidad", { title: TEXT[locale].title, description: TEXT[locale].description }),
  };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacidad">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);

  return (
    <article className={`shell ${styles.wrap}`}>
      <h1 className={styles.title}>{TEXT[locale].title}</h1>
      <Prose source={TEXT[locale].body} />
    </article>
  );
}

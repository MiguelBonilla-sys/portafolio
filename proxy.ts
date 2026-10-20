import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Todo menos API, internos de Next y archivos con extensión (íconos, imágenes, llms.txt, feeds)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};

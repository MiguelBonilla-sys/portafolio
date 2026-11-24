// Pasos del explicador "blast-radius": qué alcanza quien entra al panel de despliegue según los privilegios
// que el panel tenga. Los textos solo afirman lo que dicen las fuentes del artículo (OWASP: el socket del
// daemon es root y darle acceso equivale a root en el host; rootless reduce el impacto, no lo elimina).
export type Locale = "es" | "en";

export type RadiusStep = {
  id: "setup" | "breach" | "power" | "reach" | "result";
  caption: string;
  panel: "ok" | "breached";
  /** Con qué derechos actúa el atacante desde el panel */
  power: "none" | "root" | "limited";
  /** Qué queda al alcance: nada, todo el servidor o solo lo que permiten unas acciones fijas */
  reach: "none" | "all" | "limited";
};

export const COPY = {
  en: {
    legend: "How the privileges of a deploy panel change what a break-in reaches",
    cover: "One break-in, how far?",
    server: "Server",
    panel: "Panel",
    apps: ["App A", "App B", "App C"],
    users: ["user a", "user b", "user c"],
    root: "root",
    limited: "limited",
    switchLabel: "One user per project",
    on: "On",
    off: "Off",
    back: "Back",
    next: "Next",
    restart: "Restart",
    stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
    note: "Illustration of the idea. Rootless lowers the damage; it does not remove kernel risk. QuadShip's design is one user per project; its MVP still runs a root agent on the same host.",
    captions: {
      setup: "Three apps share one server, run through one panel.",
      breach: "An attacker gets into the deploy panel.",
      rootPower: "The panel runs with root rights, so the attacker does too.",
      limitedPower: "The panel can only ask for a fixed list of actions.",
      rootReach: "Every app, every secret and the host are now reachable.",
      limitedReach: "Each app runs as its own user, so its files stay separate.",
      rootResult: "One break-in, the whole server.",
      limitedResult: "The damage is limited, not zero.",
    },
  },
  es: {
    legend: "Cómo los privilegios de un panel de despliegue cambian lo que alcanza una intrusión",
    cover: "Una intrusión, ¿hasta dónde?",
    server: "Servidor",
    panel: "Panel",
    apps: ["App A", "App B", "App C"],
    users: ["usuario a", "usuario b", "usuario c"],
    root: "root",
    limited: "limitado",
    switchLabel: "Un usuario por proyecto",
    on: "Activo",
    off: "Apagado",
    back: "Atrás",
    next: "Siguiente",
    restart: "Reiniciar",
    stepOf: (n: number, total: number) => `Paso ${n} de ${total}`,
    note: "Ilustración de la idea. Rootless reduce el daño, pero no elimina el riesgo del kernel. El diseño de QuadShip es un usuario por proyecto; su MVP todavía corre un agente root en el mismo host.",
    captions: {
      setup: "Tres apps comparten un servidor, gestionadas por un panel.",
      breach: "Un atacante entra al panel de despliegue.",
      rootPower: "El panel corre con derechos de root, y el atacante también.",
      limitedPower: "El panel solo puede pedir una lista fija de acciones.",
      rootReach: "Cada app, cada secreto y el servidor quedan al alcance.",
      limitedReach: "Cada app corre con su propio usuario: sus archivos quedan aparte.",
      rootResult: "Una intrusión, el servidor entero.",
      limitedResult: "El daño es limitado, no cero.",
    },
  },
} as const;

export const STEP_COUNT = 5;

/** Los 5 pasos, según el panel tenga root (apagado) o privilegios limitados con un usuario por proyecto (activo) */
export function blastRadiusSteps(locale: Locale, limited: boolean): RadiusStep[] {
  const c = COPY[locale].captions;
  return [
    { id: "setup", caption: c.setup, panel: "ok", power: "none", reach: "none" },
    { id: "breach", caption: c.breach, panel: "breached", power: "none", reach: "none" },
    limited
      ? { id: "power", caption: c.limitedPower, panel: "breached", power: "limited", reach: "none" }
      : { id: "power", caption: c.rootPower, panel: "breached", power: "root", reach: "none" },
    limited
      ? { id: "reach", caption: c.limitedReach, panel: "breached", power: "limited", reach: "limited" }
      : { id: "reach", caption: c.rootReach, panel: "breached", power: "root", reach: "all" },
    limited
      ? { id: "result", caption: c.limitedResult, panel: "breached", power: "limited", reach: "limited" }
      : { id: "result", caption: c.rootResult, panel: "breached", power: "root", reach: "all" },
  ];
}

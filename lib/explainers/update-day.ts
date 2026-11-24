// Pasos de "update-day": actualizar el panel con las apps acopladas o desacopladas de él.
// Base documental: Docker Docs, "Live restore": por defecto, cuando el daemon se detiene apaga los
// contenedores en ejecución; live restore los mantiene vivos, solo en versiones de parche.
import { UI, type Locale } from "./common.ts";

export type UpdateStep = {
  id: "setup" | "update" | "stop" | "visitors" | "result";
  caption: string;
  panel: "running" | "updating";
  apps: "serving" | "down";
  visitors: "ok" | "errors";
  /** Al final, cuánto estuvieron caídas las apps (solo si dependían del panel) */
  downtime: boolean;
};

export const STEP_COUNT = 5;

export const COPY = {
  en: {
    ...UI.en,
    legend: "How tying apps to the panel changes what an update stops",
    cover: "Update day: what stops?",
    switchLabel: "Apps independent of the panel",
    panel: "Panel",
    apps: ["App A", "App B", "App C"],
    visitors: "Visitors",
    updating: "updating",
    downtime: "downtime",
    note: "Illustration of the idea. Docker documents this as live restore: it keeps containers running during daemon updates, for patch releases only. QuadShip's supervision by systemd is a design, not tested on a real host.",
    captions: {
      setup: "A panel manages three running apps.",
      update: "You start an update of the panel.",
      stopOff: "The panel's daemon stops, and the apps stop with it.",
      stopOn: "The panel restarts; the system keeps supervising the apps.",
      visitorsOff: "Visitors get errors until everything starts again.",
      visitorsOn: "Visitors keep being served while the panel updates.",
      resultOff: "The panel is updated, but the apps were down meanwhile.",
      resultOn: "The panel is updated and the apps never stopped.",
    },
  },
  es: {
    ...UI.es,
    legend: "Cómo cambia lo que detiene una actualización si las apps dependen del panel",
    cover: "Día de actualizar: ¿qué se detiene?",
    switchLabel: "Apps independientes del panel",
    panel: "Panel",
    apps: ["App A", "App B", "App C"],
    visitors: "Visitantes",
    updating: "actualizando",
    downtime: "tiempo caído",
    note: "Ilustración de la idea. Docker lo documenta como live restore: mantiene los contenedores en ejecución durante las actualizaciones del daemon, solo en versiones de parche. La supervisión con systemd de QuadShip es un diseño, sin prueba en un host real.",
    captions: {
      setup: "Un panel gestiona tres apps en ejecución.",
      update: "Empiezas a actualizar el panel.",
      stopOff: "El daemon del panel se detiene y las apps con él.",
      stopOn: "El panel se reinicia; el sistema sigue supervisando las apps.",
      visitorsOff: "Los visitantes ven errores hasta que todo arranca de nuevo.",
      visitorsOn: "Los visitantes siguen recibiendo respuesta mientras el panel se actualiza.",
      resultOff: "El panel queda actualizado, pero las apps estuvieron caídas.",
      resultOn: "El panel queda actualizado y las apps nunca se detuvieron.",
    },
  },
} as const;

export function updateDaySteps(locale: Locale, independent: boolean): UpdateStep[] {
  const c = COPY[locale].captions;
  return [
    { id: "setup", caption: c.setup, panel: "running", apps: "serving", visitors: "ok", downtime: false },
    { id: "update", caption: c.update, panel: "updating", apps: "serving", visitors: "ok", downtime: false },
    independent
      ? { id: "stop", caption: c.stopOn, panel: "updating", apps: "serving", visitors: "ok", downtime: false }
      : { id: "stop", caption: c.stopOff, panel: "updating", apps: "down", visitors: "ok", downtime: false },
    independent
      ? { id: "visitors", caption: c.visitorsOn, panel: "updating", apps: "serving", visitors: "ok", downtime: false }
      : { id: "visitors", caption: c.visitorsOff, panel: "updating", apps: "down", visitors: "errors", downtime: false },
    independent
      ? { id: "result", caption: c.resultOn, panel: "running", apps: "serving", visitors: "ok", downtime: false }
      : { id: "result", caption: c.resultOff, panel: "running", apps: "serving", visitors: "ok", downtime: true },
  ];
}

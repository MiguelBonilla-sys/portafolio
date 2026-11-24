// Pasos de "restore-check": una marca verde prueba que el archivo se movió, no que se restaura.
// Cifra de la nota: Spiceworks, Voice of IT 2026 (41% prueba las restauraciones rara vez o nunca).
import { UI, type Locale } from "./common.ts";

/** ok: marca verde y bien · silent: marca verde pero roto por dentro · failed: la restauración falla · flagged: una prueba lo detectó · tested: bien y probado */
export type CardState = "ok" | "silent" | "failed" | "flagged" | "tested";

export type RestoreStep = {
  id: "setup" | "silent" | "need" | "restore" | "result";
  caption: string;
  /** Las 5 copias, día 1 a día 5 */
  cards: CardState[];
  /** Día desde el que se restaura (1 a 5), o null mientras no se restaura */
  restoreFrom: number | null;
  /** Días de datos que se pierden */
  lostDays: number;
};

export const STEP_COUNT = 5;

export const COPY = {
  en: {
    ...UI.en,
    legend: "How testing restores changes what you find out about a backup",
    cover: "Does your backup restore?",
    switchLabel: "Test restores",
    day: (n: number) => `Day ${n}`,
    restore: "restore",
    lost: "lost",
    tested: "tested",
    note: "Illustration of the idea. In Spiceworks' 2026 survey, 41% of IT professionals test restores rarely, ad hoc, only when needed, or never. QuadShip's backup checks are a design, not released yet.",
    captions: {
      setup: "Five nightly backups, each with a green checkmark.",
      silentOff: "From day 3 something breaks silently. Checkmarks stay green.",
      silentOn: "A test restore flags day 3. The problem gets fixed.",
      need: "On day 5 you need to restore.",
      restoreOff: "The latest copies fail one by one.",
      restoreOn: "The latest copy was tested. It restores cleanly.",
      resultOff: "You go back to day 2 and lose three days.",
      resultOn: "You restore day 5. Nothing is lost.",
    },
  },
  es: {
    ...UI.es,
    legend: "Cómo cambia lo que sabes de un backup si pruebas la restauración",
    cover: "¿Tu backup se restaura?",
    switchLabel: "Probar restauraciones",
    day: (n: number) => `Día ${n}`,
    restore: "restaurar",
    lost: "perdido",
    tested: "probado",
    note: "Ilustración de la idea. En la encuesta de Spiceworks de 2026, el 41% de los profesionales de TI prueba las restauraciones rara vez, de forma ocasional, solo cuando las necesita, o nunca. Las verificaciones de backup de QuadShip son un diseño, aún sin publicar.",
    captions: {
      setup: "Cinco backups nocturnos, cada uno con su marca verde.",
      silentOff: "Desde el día 3 algo falla en silencio. Las marcas siguen verdes.",
      silentOn: "Una restauración de prueba marca el día 3. Se corrige.",
      need: "El día 5 necesitas restaurar.",
      restoreOff: "Las copias más recientes fallan una por una.",
      restoreOn: "La última copia ya se probó. Se restaura bien.",
      resultOff: "Vuelves al día 2 y pierdes tres días.",
      resultOn: "Restauras el día 5. No se pierde nada.",
    },
  },
} as const;

export function restoreCheckSteps(locale: Locale, tested: boolean): RestoreStep[] {
  const c = COPY[locale].captions;
  const fresh: CardState[] = ["ok", "ok", "ok", "ok", "ok"];
  return [
    { id: "setup", caption: c.setup, cards: fresh, restoreFrom: null, lostDays: 0 },
    tested
      ? { id: "silent", caption: c.silentOn, cards: ["tested", "tested", "flagged", "tested", "tested"], restoreFrom: null, lostDays: 0 }
      : { id: "silent", caption: c.silentOff, cards: ["ok", "ok", "silent", "silent", "silent"], restoreFrom: null, lostDays: 0 },
    tested
      ? { id: "need", caption: c.need, cards: ["tested", "tested", "flagged", "tested", "tested"], restoreFrom: 5, lostDays: 0 }
      : { id: "need", caption: c.need, cards: ["ok", "ok", "silent", "silent", "silent"], restoreFrom: 5, lostDays: 0 },
    tested
      ? { id: "restore", caption: c.restoreOn, cards: ["tested", "tested", "flagged", "tested", "tested"], restoreFrom: 5, lostDays: 0 }
      : { id: "restore", caption: c.restoreOff, cards: ["ok", "ok", "failed", "failed", "failed"], restoreFrom: 5, lostDays: 0 },
    tested
      ? { id: "result", caption: c.resultOn, cards: ["tested", "tested", "flagged", "tested", "tested"], restoreFrom: 5, lostDays: 0 }
      : { id: "result", caption: c.resultOff, cards: ["ok", "ok", "failed", "failed", "failed"], restoreFrom: 2, lostDays: 3 },
  ];
}

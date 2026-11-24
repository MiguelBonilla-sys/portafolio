// Pasos de "secret-rotation": cuánto vive una clave filtrada con y sin rotación.
// Cifra de la nota: GitGuardian, State of Secrets Sprawl 2026 (de los secretos válidos detectados en 2022,
// el 64% seguía activo cuatro años después).
import { UI, type Locale } from "./common.ts";

export type RotationStep = {
  id: "setup" | "leak" | "action" | "time" | "result";
  caption: string;
  /** Posición del marcador en la línea de tiempo (0 a 4) */
  time: number;
  leaked: boolean;
  rotated: boolean;
  /** Estado de la copia filtrada al final: sigue valiendo o se rechaza */
  leakedCopy: "none" | "valid" | "refused";
};

export const STEP_COUNT = 5;

export const COPY = {
  en: {
    ...UI.en,
    legend: "How rotation changes the life of a leaked secret",
    cover: "A leaked key lives on",
    switchLabel: "Rotation",
    keyLane: "Key in use",
    leakLane: "Leaked copy",
    newKey: "new key",
    valid: "valid",
    refused: "refused",
    axis: ["Day 1", "Year 1", "Year 2", "Year 3", "Year 4"],
    note: "Illustration of the idea. In GitGuardian's 2026 data, 64% of valid 2022 secrets were still active four years later. QuadShip stores secrets encrypted today; rotation is a design, not released yet.",
    captions: {
      setup: "An app uses a key to reach its database.",
      leak: "The key leaks, for example into a repository.",
      rotateOff: "Nobody rotates it: changing a key feels risky.",
      rotateOn: "A rotation issues a new key and retires the old one.",
      time: "Years pass and the app keeps running.",
      resultOff: "Four years later, the leaked key still works.",
      resultOn: "Four years later, the leaked key is refused.",
    },
  },
  es: {
    ...UI.es,
    legend: "Cómo cambia la rotación la vida de un secreto filtrado",
    cover: "Una clave filtrada sigue viva",
    switchLabel: "Rotación",
    keyLane: "Clave en uso",
    leakLane: "Copia filtrada",
    newKey: "clave nueva",
    valid: "válida",
    refused: "rechazada",
    axis: ["Día 1", "Año 1", "Año 2", "Año 3", "Año 4"],
    note: "Ilustración de la idea. En los datos de GitGuardian de 2026, el 64% de los secretos válidos de 2022 seguía activo cuatro años después. QuadShip guarda hoy los secretos cifrados; la rotación es un diseño, aún sin publicar.",
    captions: {
      setup: "Una app usa una clave para llegar a su base de datos.",
      leak: "La clave se filtra, por ejemplo a un repositorio.",
      rotateOff: "Nadie la rota: cambiar una clave parece riesgoso.",
      rotateOn: "Una rotación emite una clave nueva y retira la vieja.",
      time: "Pasan los años y la app sigue funcionando.",
      resultOff: "Cuatro años después, la clave filtrada sigue funcionando.",
      resultOn: "Cuatro años después, la clave filtrada es rechazada.",
    },
  },
} as const;

export function secretRotationSteps(locale: Locale, rotate: boolean): RotationStep[] {
  const c = COPY[locale].captions;
  return [
    { id: "setup", caption: c.setup, time: 0, leaked: false, rotated: false, leakedCopy: "none" },
    { id: "leak", caption: c.leak, time: 1, leaked: true, rotated: false, leakedCopy: "none" },
    { id: "action", caption: rotate ? c.rotateOn : c.rotateOff, time: 2, leaked: true, rotated: rotate, leakedCopy: "none" },
    { id: "time", caption: c.time, time: 3, leaked: true, rotated: rotate, leakedCopy: "none" },
    { id: "result", caption: rotate ? c.resultOn : c.resultOff, time: 4, leaked: true, rotated: rotate, leakedCopy: rotate ? "refused" : "valid" },
  ];
}

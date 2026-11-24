// Textos de interfaz que comparten los explicadores
export type Locale = "es" | "en";

export const UI = {
  en: { back: "Back", next: "Next", restart: "Restart", on: "On", off: "Off", stepOf: (n: number, total: number) => `Step ${n} of ${total}` },
  es: { back: "Atrás", next: "Siguiente", restart: "Reiniciar", on: "Activo", off: "Apagado", stepOf: (n: number, total: number) => `Paso ${n} de ${total}` },
} as const;

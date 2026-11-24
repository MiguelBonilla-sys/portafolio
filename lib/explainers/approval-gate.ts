// Pasos del explicador "approval-gate". Una sola fuente de verdad: el componente del sitio los anima
// y la escena del carrusel de LinkedIn puede dibujar uno por lámina, así que nunca se contradicen.
export type Locale = "es" | "en";
export type Decision = "approved" | "denied" | null;

export type GateStep = {
  id: "task" | "token" | "command" | "gate" | "result";
  caption: string;
  /** Dónde está el comando: en el agente, camino a la compuerta, esperando en ella, en producción o devuelto */
  packet: "hidden" | "agent" | "gate" | "production" | "agent-back";
  token: boolean;
  /** Producción y su copia: intactas o borradas */
  data: "intact" | "deleted";
};

export const COPY = {
  en: {
    legend: "How an approval gate changes what an agent can do",
    cover: "Who approves the delete?",
    agent: "Agent",
    gate: "Approval",
    production: "Production",
    backup: "Backup",
    token: "token",
    switchLabel: "Human approval",
    on: "On",
    off: "Off",
    back: "Back",
    next: "Next",
    restart: "Restart",
    approve: "Approve",
    deny: "Deny",
    stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
    waiting: "Choose Approve or Deny to continue.",
    note: "Illustration of the idea. QuadShip's approval queue is a design, not released yet.",
    captions: {
      task: "An agent gets a small task.",
      token: "It finds a token that can do far more than needed.",
      command: "It sends a command that deletes a volume.",
      gateOff: "No gate: the command runs at once.",
      gateOn: "Gate on: the command waits for a person.",
      deleted: "Production and its backup are gone.",
      denied: "Denied: nothing ran, and the attempt is recorded.",
      approved: "Approved by a person: it runs, and the decision is recorded.",
    },
  },
  es: {
    legend: "Cómo cambia lo que puede hacer un agente con una compuerta de aprobación",
    cover: "¿Quién aprueba el borrado?",
    agent: "Agente",
    gate: "Aprobación",
    production: "Producción",
    backup: "Copia",
    token: "token",
    switchLabel: "Aprobación humana",
    on: "Activa",
    off: "Apagada",
    back: "Atrás",
    next: "Siguiente",
    restart: "Reiniciar",
    approve: "Aprobar",
    deny: "Rechazar",
    stepOf: (n: number, total: number) => `Paso ${n} de ${total}`,
    waiting: "Elige Aprobar o Rechazar para continuar.",
    note: "Ilustración de la idea. La cola de aprobación de QuadShip es un diseño, aún sin publicar.",
    captions: {
      task: "Un agente recibe una tarea pequeña.",
      token: "Encuentra un token que puede hacer mucho más de lo necesario.",
      command: "Envía un comando que borra un volumen.",
      gateOff: "Sin compuerta: el comando se ejecuta de inmediato.",
      gateOn: "Con compuerta: el comando espera a una persona.",
      deleted: "Producción y su copia de seguridad desaparecen.",
      denied: "Rechazado: no se ejecutó nada y queda registrado.",
      approved: "Aprobado por una persona: se ejecuta y queda registrado.",
    },
  },
} as const;

export const STEP_COUNT = 5;

/** Los 5 pasos según la compuerta y la decisión de la persona (solo cuenta con la compuerta activa) */
export function approvalGateSteps(locale: Locale, gate: boolean, decision: Decision): GateStep[] {
  const c = COPY[locale].captions;
  const last: Pick<GateStep, "caption" | "packet" | "data"> = !gate
    ? { caption: c.deleted, packet: "production", data: "deleted" }
    : decision === "approved"
      ? { caption: c.approved, packet: "production", data: "deleted" }
      : { caption: c.denied, packet: "agent-back", data: "intact" };
  return [
    { id: "task", caption: c.task, packet: "hidden", token: false, data: "intact" },
    { id: "token", caption: c.token, packet: "hidden", token: true, data: "intact" },
    { id: "command", caption: c.command, packet: "agent", token: true, data: "intact" },
    gate
      ? { id: "gate", caption: c.gateOn, packet: "gate", token: true, data: "intact" }
      : { id: "gate", caption: c.gateOff, packet: "production", token: true, data: "intact" },
    { id: "result", token: true, ...last },
  ];
}

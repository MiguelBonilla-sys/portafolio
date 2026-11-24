import type { ReactElement } from "react";
import type { Locale } from "@/i18n/routing";
import ApprovalGate from "./ApprovalGate";
import BlastRadius from "./BlastRadius";
import RestoreCheck from "./RestoreCheck";
import SecretRotation from "./SecretRotation";
import UpdateDay from "./UpdateDay";
import { isWidgetId, type WidgetId } from "./ids";

const WIDGETS: Record<WidgetId, (props: { locale: Locale }) => ReactElement> = {
  "approval-gate": ApprovalGate,
  "blast-radius": BlastRadius,
  "secret-rotation": SecretRotation,
  "restore-check": RestoreCheck,
  "update-day": UpdateDay,
};

/** Un id desconocido no dibuja nada: el modelo nunca escribe código, solo nombra un explicador de la lista. */
export function renderWidget(id: string, locale: Locale): ReactElement | null {
  if (!isWidgetId(id)) return null;
  const Widget = WIDGETS[id];
  return <Widget locale={locale} />;
}

/** Lista cerrada de explicadores interactivos. El texto de un artículo solo puede pedir uno de estos ids. */
export const WIDGET_IDS = ["approval-gate", "blast-radius", "secret-rotation", "restore-check", "update-day"] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export const isWidgetId = (id: string): id is WidgetId => (WIDGET_IDS as readonly string[]).includes(id);

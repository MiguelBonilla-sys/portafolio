// Fechas para datos estructurados. Google pide fecha y hora ISO 8601 con zona horaria
// (Search Console marca "2026-10-22" como "valor de fecha y hora no válido").

// Última vez que cambió el perfil (data/, messages/): actualízala al editar esos archivos.
// No se calcula en el build: cambiaría en cada deploy aunque el perfil sea el mismo.
export const PROFILE_UPDATED = "2026-10-30";

// Bogotá no tiene horario de verano: siempre UTC−5
const BOGOTA_OFFSET = "-05:00";

/** "2026-10-23" → "2026-10-23T00:00:00-05:00"; una fecha y hora completa se deja igual */
export function toDateTime(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T00:00:00${BOGOTA_OFFSET}`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(date)) return date;
  throw new Error(`Fecha inválida para datos estructurados: ${date}`);
}

/**
 * Tasas IPC anuales para indexación de arriendos.
 * Actualizar cada año cuando el DANE publique el IPC oficial.
 * Formato: { año: tasa_porcentual }
 * Ejemplo: { 2026: 5.50 } significa IPC del 5.50% para 2026.
 */
const IPC_RATES = {
  2024: 9.28,
  2025: 5.10,
  // 2026: pendiente — agregar cuando el DANE publique el dato oficial
}

export default IPC_RATES

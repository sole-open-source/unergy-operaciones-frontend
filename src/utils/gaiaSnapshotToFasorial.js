/* =========================================================================
   gaiaSnapshotToFasorial.js — Adaptador de datos
   -------------------------------------------------------------------------
   El módulo fasorial.js espera un payload de medidor con estos campos:
     vp1..3, cp1..3        → voltaje [V] y corriente [A] por fase
     app1..3               → potencia activa por fase [kW]
     irpp1..3, erpp1..3    → potencia reactiva importada / exportada por fase
     timestamp             → época unix [s]
     meter                 → identificador del medidor

   Pero el backend de la plataforma (GET /generacion-solar/monitoring/{id})
   devuelve un `gaia_snapshot` con nombres NORMALIZADOS distintos:
     vp1..3, cp1..3        → iguales
     ap1..3                → potencia activa por fase (¡cruda de Gaia, puede
                             venir en W o en kW según el medidor!)
     rp1..3                → potencia reactiva NETA por fase (un solo valor
                             con signo, no separada en importada/exportada)
     pf1..3, pf_avg        → factor de potencia
     last_time             → fecha ISO de la última lectura

   Este adaptador hace la traducción SIN tocar la lógica de cálculo del
   módulo. Decisiones:
     • Unidades de potencia activa: se replica la misma heurística del backend
       (si |ap| > 5000 los valores están en W → se dividen entre 1000 para
       pasarlos a kW). Sin esto, un medidor que reporte en W daría PF=1 siempre
       y el diagrama nunca detectaría un CT cruzado.
     • Reactiva: como solo tenemos el valor NETO (rp), derivamos la dirección
       del signo — rp ≥ 0 se interpreta como reactiva importada (la corriente
       atrasa), rp < 0 como exportada (adelanta). El diagrama solo usa esto
       para dibujar la corriente adelantada/atrasada; la ALERTA de cableado
       depende de la magnitud del desfase (acos(P/S)), no del signo, así que
       la detección de CTs cruzados funciona igual.
   ========================================================================= */

const CAMPOS_REQUERIDOS = ['vp1', 'vp2', 'vp3', 'cp1', 'cp2', 'cp3'];

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Valida que el snapshot tenga lo mínimo para calcular el fasorial y
 * calcula la antigüedad de la lectura.
 * @returns {{ ok: boolean, error?: string, faltantes?: string[], edadMin?: number|null }}
 */
export function validarSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { ok: false, error: 'El proyecto no tiene lectura de medidor disponible (sin snapshot de Gaia).' };
  }

  const faltantes = CAMPOS_REQUERIDOS.filter(
    (k) => snapshot[k] == null || Number.isNaN(Number(snapshot[k]))
  );
  // También exigimos potencia activa en al menos una fase
  const tieneActiva = ['ap1', 'ap2', 'ap3'].some((k) => snapshot[k] != null);
  if (faltantes.length) {
    return {
      ok: false,
      faltantes,
      error: `El medidor no reporta ${faltantes.join(', ')}; no se puede calcular el fasorial.`,
    };
  }
  if (!tieneActiva) {
    return {
      ok: false,
      faltantes: ['ap1/ap2/ap3'],
      error: 'El medidor no reporta potencia activa (ap1/ap2/ap3); no se puede calcular el fasorial.',
    };
  }

  return { ok: true, edadMin: edadLecturaMin(snapshot) };
}

/** Antigüedad de la lectura en minutos (o null si no hay last_time). */
export function edadLecturaMin(snapshot) {
  const t = parseLastTime(snapshot);
  if (t == null) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

/** last_time (ISO) → epoch ms, o null. */
function parseLastTime(snapshot) {
  const raw = snapshot?.last_time;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Traduce un gaia_snapshot al payload que espera renderFasorial().
 * @param {object} snapshot  gaia_snapshot del backend
 * @param {object} [info]    { meter, nombre } para el pie/título del diagrama
 * @returns {object} datos en el formato del módulo fasorial
 */
export function gaiaSnapshotToFasorial(snapshot, info = {}) {
  const s = snapshot || {};

  // ── Normalización de unidades de potencia activa (kW) ──────────────────
  // Misma regla que usa el backend: si algún |ap| supera 5000, los valores
  // están en W y se dividen entre 1000.
  const apVals = ['ap1', 'ap2', 'ap3'].map((k) => Math.abs(n(s[k])));
  const maxAp = Math.max(...apVals, 0);
  const apDivisor = maxAp > 5000 ? 1000 : 1;

  const datos = {
    // Voltaje y corriente (mismos nombres)
    vp1: n(s.vp1), vp2: n(s.vp2), vp3: n(s.vp3),
    cp1: n(s.cp1), cp2: n(s.cp2), cp3: n(s.cp3),
    // Potencia activa por fase → kW
    app1: n(s.ap1) / apDivisor,
    app2: n(s.ap2) / apDivisor,
    app3: n(s.ap3) / apDivisor,
    // Fecha
    timestamp: unixSecondsFrom(s),
    // Identificador de medidor (no hay serial expuesto: usamos node/nombre)
    meter: info.meter != null ? info.meter : (info.nombre || ''),
  };

  // ── Reactiva: derivar importada/exportada del signo del valor neto ─────
  for (let f = 1; f <= 3; f++) {
    const rp = n(s['rp' + f]);
    if (rp >= 0) {
      datos['irpp' + f] = Math.abs(rp);  // importa reactivo → atrasa
      datos['erpp' + f] = 0;
    } else {
      datos['irpp' + f] = 0;
      datos['erpp' + f] = Math.abs(rp);  // exporta reactivo → adelanta
    }
  }

  return datos;
}

function unixSecondsFrom(snapshot) {
  const ms = parseLastTime(snapshot);
  return ms == null ? null : Math.round(ms / 1000);
}

export default gaiaSnapshotToFasorial;

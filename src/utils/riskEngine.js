// ──────────────────────────────────────────────────────────────────────────
// riskEngine.js — Motor de "Riesgo Vivo".
//
// Cruza las GARANTÍAS (lo que respalda al proyecto ante XM) contra la
// EXPOSICIÓN del período (lo que el proyecto le debe al mercado) y produce el
// ratio de cobertura + las alertas de déficit. Módulo PURO: sin red, sin DOM,
// sin framework. La vista trae los datos y pinta; aquí solo se calcula.
//
// Insumos reales (no hay endpoints nuevos):
//   garantías  → GET /garantias            → { items: [...] }
//   exposición → GET /liquidaciones/resumen-panel?periodo=YYYY-MM → { proyectos: [...] }
//
// Convención de cobertura: cobertura = saldo efectivo / exposición XM.
//   >100 %  SALUDABLE   — la garantía cubre la deuda con el mercado.
//   80–100% ADVERTENCIA — cubre, pero sin colchón.
//   <80 %   CRÍTICO     — déficit de cobertura.
//
// OJO — no confundir con el campo `porcentaje_cobertura` que ya existe en la
// garantía: ese lo digita el usuario (cobertura declarada del contrato) y allí
// >100 % significa SOBREVENDIDO (malo). El ratio de este motor es calculado
// contra la liquidación real y allí >100 % es BUENO. Son métricas distintas.
// ──────────────────────────────────────────────────────────────────────────
import { calculateExposure, diasHastaVencimiento } from './financialCalculations'

/** Umbrales del ratio de cobertura (%). */
export const UMBRAL_CRITICO = 80
export const UMBRAL_SALUDABLE = 100

/** Ventana de anticipación para avisar un vencimiento (días). */
export const DIAS_VENCIMIENTO_PROXIMO = 30

export const NIVEL = {
  CRITICO: 'CRITICO',
  ADVERTENCIA: 'ADVERTENCIA',
  SALUDABLE: 'SALUDABLE',
}

export const TIPO_ALERTA = {
  COBERTURA: 'COBERTURA',
  VENCIMIENTO_PROXIMO: 'VENCIMIENTO_PROXIMO',
}

// Estados en los que la garantía EFECTIVAMENTE respalda obligaciones ante XM.
// `liberada` ya se devolvió, `vencida` no respalda y `en_proceso` aún no se
// constituye → ninguna aporta saldo.
const ESTADOS_QUE_RESPALDAN = new Set(['vigente', 'en_renovacion'])

const _num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/**
 * Saldo efectivo de UNA garantía: lo que realmente respalda hoy.
 *
 * Es `valor_cop` cuando la garantía está vigente y no ha vencido; 0 en cualquier
 * otro caso. NO se le restan los movimientos: el backend ya los aplica sobre
 * `valor_cop` (cada movimiento trae su `saldo_posterior_cop`), así que restarlos
 * otra vez los contaría doble y subestimaría la cobertura.
 *
 * @returns {number} COP (≥ 0).
 */
export function saldoEfectivoGarantia(garantia, hoy = new Date()) {
  if (!garantia) return 0
  if (!ESTADOS_QUE_RESPALDAN.has(garantia.estado)) return 0
  const dias = diasHastaVencimiento(garantia.fecha_vencimiento, hoy)
  if (dias != null && dias < 0) return 0   // venció, aunque el estado no se haya actualizado
  const valor = _num(garantia.valor_cop)
  return valor > 0 ? valor : 0
}

/** Nivel de riesgo a partir del ratio de cobertura (%). `null` → sin exposición. */
export function nivelPorCobertura(coberturaPct) {
  if (coberturaPct == null) return NIVEL.SALUDABLE      // sin deuda con XM → sin riesgo
  if (coberturaPct < UMBRAL_CRITICO) return NIVEL.CRITICO
  if (coberturaPct <= UMBRAL_SALUDABLE) return NIVEL.ADVERTENCIA
  return NIVEL.SALUDABLE
}

/**
 * Agrupa las garantías por proyecto y acumula su saldo efectivo.
 * Un proyecto puede tener varias garantías (póliza + cuenta custodia…): suman.
 * Las que no tienen `proyecto_id` se ignoran (no se pueden cruzar).
 * @returns {Map<number, object>}
 */
export function agruparGarantiasPorProyecto(garantias, hoy = new Date()) {
  const porProyecto = new Map()
  for (const g of (garantias || [])) {
    const pid = g?.proyecto_id
    if (pid == null) continue
    if (!porProyecto.has(pid)) {
      porProyecto.set(pid, {
        proyecto_id: pid,
        proyecto_nombre: g.proyecto_nombre || null,
        saldo_efectivo_cop: 0,
        valor_total_cop: 0,
        garantias: [],
        proximo_vencimiento: null,      // fecha de la garantía activa que vence primero
        dias_para_vencimiento: null,
      })
    }
    const acc = porProyecto.get(pid)
    acc.proyecto_nombre = acc.proyecto_nombre || g.proyecto_nombre || null
    acc.garantias.push(g)
    acc.valor_total_cop += _num(g.valor_cop)

    const saldo = saldoEfectivoGarantia(g, hoy)
    acc.saldo_efectivo_cop += saldo

    // El vencimiento relevante es el de las garantías que aún respaldan: es la
    // primera que, al vencer, abre un hueco de cobertura.
    if (saldo > 0) {
      const dias = diasHastaVencimiento(g.fecha_vencimiento, hoy)
      if (dias != null && (acc.dias_para_vencimiento == null || dias < acc.dias_para_vencimiento)) {
        acc.dias_para_vencimiento = dias
        acc.proximo_vencimiento = g.fecha_vencimiento
      }
    }
  }
  return porProyecto
}

/**
 * Motor principal: cruza garantías × liquidaciones y devuelve el riesgo por
 * proyecto, las alertas y los totales de la cartera.
 *
 * @param {object}   input
 * @param {object[]} input.garantias  Items de GET /garantias.
 * @param {object[]} input.paneles    Filas de proyecto de GET /liquidaciones/resumen-panel.
 * @param {Date}     [input.hoy]      Fecha de referencia (inyectable para pruebas).
 * @returns {{proyectos: object[], alertas: object[], totales: object}}
 */
export function calculateRisk({ garantias = [], paneles = [], hoy = new Date() } = {}) {
  const porProyecto = agruparGarantiasPorProyecto(garantias, hoy)
  const proyectos = []

  // 1) Un registro por proyecto CON exposición en el período.
  for (const panel of (paneles || [])) {
    const pid = panel?.proyecto_id
    if (pid == null) continue
    const g = porProyecto.get(pid)
    porProyecto.delete(pid)   // marcado como ya procesado

    const exposicion = calculateExposure(panel)
    const saldo = g?.saldo_efectivo_cop || 0
    proyectos.push(construirRiesgo({
      proyecto_id: pid,
      proyecto_nombre: panel.proyecto || g?.proyecto_nombre || null,
      saldo,
      exposicion,
      grupo: g,
      panel,
    }))
  }

  // 2) Proyectos con garantía pero SIN panel en el período: no hay exposición
  //    que cubrir, pero su vencimiento sí debe seguir avisando.
  for (const g of porProyecto.values()) {
    proyectos.push(construirRiesgo({
      proyecto_id: g.proyecto_id,
      proyecto_nombre: g.proyecto_nombre,
      saldo: g.saldo_efectivo_cop,
      exposicion: 0,
      grupo: g,
      panel: null,
    }))
  }

  const alertas = construirAlertas(proyectos)

  const total_garantizado_cop = proyectos.reduce((s, p) => s + p.saldo_efectivo_cop, 0)
  const total_expuesto_cop = proyectos.reduce((s, p) => s + p.exposicion_cop, 0)

  return {
    proyectos: proyectos.sort(ordenarPorSeveridad),
    alertas,
    totales: {
      total_garantizado_cop,
      total_expuesto_cop,
      // Cobertura global de la cartera. Sin exposición → null (no es 0 %: no hay
      // deuda que cubrir, y pintar 0 % haría ver toda la cartera en crítico).
      cobertura_global_pct: total_expuesto_cop > 0
        ? (total_garantizado_cop / total_expuesto_cop) * 100
        : null,
      criticos: proyectos.filter(p => p.nivel === NIVEL.CRITICO).length,
      advertencias: proyectos.filter(p => p.nivel === NIVEL.ADVERTENCIA).length,
      saludables: proyectos.filter(p => p.nivel === NIVEL.SALUDABLE).length,
      por_vencer: proyectos.filter(p => p.vencimiento_proximo).length,
      sin_garantia: proyectos.filter(p => p.sin_garantia).length,
    },
  }
}

function construirRiesgo({ proyecto_id, proyecto_nombre, saldo, exposicion, grupo, panel }) {
  // Sin exposición no hay ratio: dividir por 0 daría Infinity. `null` = "n/a".
  const cobertura = exposicion > 0 ? (saldo / exposicion) * 100 : null
  const dias = grupo?.dias_para_vencimiento ?? null

  return {
    proyecto_id,
    proyecto_nombre: proyecto_nombre || `Proyecto #${proyecto_id}`,
    saldo_efectivo_cop: saldo,
    valor_garantias_cop: grupo?.valor_total_cop || 0,
    exposicion_cop: exposicion,
    cobertura_pct: cobertura,
    deficit_cop: cobertura != null && saldo < exposicion ? exposicion - saldo : 0,
    nivel: nivelPorCobertura(cobertura),
    sin_garantia: !grupo || grupo.saldo_efectivo_cop <= 0,
    fecha_vencimiento: grupo?.proximo_vencimiento || null,
    dias_para_vencimiento: dias,
    vencimiento_proximo: dias != null && dias >= 0 && dias <= DIAS_VENCIMIENTO_PROXIMO,
    garantias: grupo?.garantias || [],
    panel: panel || null,
    liquidacion_id: panel?.liquidacion_id ?? null,
  }
}

function construirAlertas(proyectos) {
  const alertas = []
  for (const p of proyectos) {
    if (p.nivel === NIVEL.CRITICO || p.nivel === NIVEL.ADVERTENCIA) {
      alertas.push({
        tipo: TIPO_ALERTA.COBERTURA,
        nivel: p.nivel,
        proyecto_id: p.proyecto_id,
        proyecto_nombre: p.proyecto_nombre,
        cobertura_pct: p.cobertura_pct,
        deficit_cop: p.deficit_cop,
        mensaje: p.sin_garantia
          ? 'Exposición ante XM sin garantía que la respalde'
          : `Cobertura ${(p.cobertura_pct ?? 0).toFixed(0)} % de la exposición ante XM`,
      })
    }
    if (p.vencimiento_proximo) {
      alertas.push({
        tipo: TIPO_ALERTA.VENCIMIENTO_PROXIMO,
        nivel: p.nivel,
        proyecto_id: p.proyecto_id,
        proyecto_nombre: p.proyecto_nombre,
        dias_para_vencimiento: p.dias_para_vencimiento,
        fecha_vencimiento: p.fecha_vencimiento,
        mensaje: `La garantía vence en ${p.dias_para_vencimiento} día(s)`,
      })
    }
  }
  return alertas.sort(ordenarPorSeveridad)
}

// Crítico primero; a igual nivel, el déficit más grande / el vencimiento más cercano.
const PESO_NIVEL = { [NIVEL.CRITICO]: 0, [NIVEL.ADVERTENCIA]: 1, [NIVEL.SALUDABLE]: 2 }
function ordenarPorSeveridad(a, b) {
  const d = (PESO_NIVEL[a.nivel] ?? 3) - (PESO_NIVEL[b.nivel] ?? 3)
  if (d !== 0) return d
  return (b.deficit_cop || 0) - (a.deficit_cop || 0)
}

/** Solo lo que exige acción inmediata: crítico o a punto de vencer (para /alertas). */
export function alertasAccionables(alertas) {
  return (alertas || []).filter(
    a => a.nivel === NIVEL.CRITICO || a.tipo === TIPO_ALERTA.VENCIMIENTO_PROXIMO
  )
}

/** Severidad de PrimeVue Tag para un nivel de riesgo. */
export function nivelSeverity(nivel) {
  return { CRITICO: 'danger', ADVERTENCIA: 'warn', SALUDABLE: 'success' }[nivel] || 'secondary'
}

/** Color hex por nivel (barras / badges). */
export const NIVEL_COLOR = {
  CRITICO: '#D64455',
  ADVERTENCIA: '#CA8A04',
  SALUDABLE: '#10B981',
}

export const NIVEL_LABEL = {
  CRITICO: 'Crítico',
  ADVERTENCIA: 'Advertencia',
  SALUDABLE: 'Saludable',
}

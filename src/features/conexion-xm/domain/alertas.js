// Generadores de alertas (vigencia 60/30/15d, equipos frontera 90d, medidor OR 15dh,
// etapa estancada, calibracion). Funciones puras; el dedupeKey evita duplicados.

import { Estado, TipoAlerta } from './enums'

const MS_DIA = 86_400_000

export function diasCalendario(a, b) {
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((db - da) / MS_DIA)
}

function esFinDeSemana(d) {
  const dow = d.getUTCDay()
  return dow === 0 || dow === 6
}

export function diasHabilesEntre(desde, hasta) {
  if (hasta <= desde) return 0
  let cuenta = 0
  const cur = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate()))
  const fin = new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), hasta.getUTCDate()))
  while (cur < fin) {
    cur.setUTCDate(cur.getUTCDate() + 1)
    if (!esFinDeSemana(cur)) cuenta++
  }
  return cuenta
}

const UMBRALES_VIGENCIA = [60, 30, 15]

export function alertasVigencia(p, hoy) {
  if (!p.vigenciaConexion) return []
  const restantes = diasCalendario(hoy, p.vigenciaConexion)
  const out = []
  if (restantes < 0) {
    out.push({ tipo: TipoAlerta.VENCIMIENTO_VIGENCIA, fechaDisparo: hoy, mensaje: `La vigencia de conexión de "${p.nombreComercial}" está VENCIDA hace ${Math.abs(restantes)} días. Requiere prórroga o nueva solicitud.`, dedupeKey: `${p.id}:VENCIMIENTO_VIGENCIA:VENCIDO` })
    return out
  }
  for (const umbral of UMBRALES_VIGENCIA) {
    if (restantes <= umbral) {
      out.push({ tipo: TipoAlerta.VENCIMIENTO_VIGENCIA, fechaDisparo: hoy, mensaje: `Vigencia de conexión de "${p.nombreComercial}" vence en ${restantes} días (umbral ${umbral}d). Gestionar prórroga (avisar 1 mes antes).`, dedupeKey: `${p.id}:VENCIMIENTO_VIGENCIA:${umbral}` })
    }
  }
  return out
}

export function alertasEquiposFrontera(p, hoy) {
  if (!p.fechaConexionEstimada || p.equiposSolicitados) return []
  const restantes = diasCalendario(hoy, p.fechaConexionEstimada)
  if (restantes >= 90) return []
  return [{ tipo: TipoAlerta.EQUIPOS_FRONTERA_90D, fechaDisparo: hoy, mensaje: `Faltan ${restantes} días para la conexión estimada de "${p.nombreComercial}" y no se han solicitado los equipos de frontera a Solenium (regla: >= 3 meses antes).`, dedupeKey: `${p.id}:EQUIPOS_FRONTERA_90D` }]
}

export function alertasMedidorOr(p, hoy) {
  if (!p.exporta || !p.comercializadorEsOr || !p.fechaVisitaProtecciones) return []
  const medidor = (p.equipos || []).find((e) => e.tipo === 'MEDIDOR_PRINCIPAL' || e.tipo === 'MEDIDOR_RESPALDO')
  if (medidor?.fechaEnvioOr) return []
  const habiles = diasHabilesEntre(hoy, p.fechaVisitaProtecciones)
  if (habiles > 15) return []
  return [{ tipo: TipoAlerta.MEDIDOR_OR_15DH, fechaDisparo: hoy, mensaje: `Faltan ${habiles} días hábiles para la visita de protecciones de "${p.nombreComercial}" y el medidor + equipo de comunicación no se ha enviado al OR (regla: 15 días hábiles antes).`, dedupeKey: `${p.id}:MEDIDOR_OR_15DH` }]
}

const ESTADOS_ESTANCAMIENTO_10DH = new Set([Estado.SOLICITUD_ENVIADA_OR, Estado.SOLICITUD_ENVIADA_XM])

export function alertasEtapaEstancada(p, hoy) {
  const out = []
  for (const et of p.etapas || []) {
    const habiles = diasHabilesEntre(et.fechaEstado, hoy)
    if (ESTADOS_ESTANCAMIENTO_10DH.has(et.estadoActual) && habiles > 10) {
      out.push({ tipo: TipoAlerta.ETAPA_ESTANCADA, fechaDisparo: hoy, mensaje: `"${p.nombreComercial}" lleva ${habiles} días hábiles en ${et.estadoActual} (${et.etapa}) sin avanzar. Reenviar/escalar.`, dedupeKey: `${p.id}:ETAPA_ESTANCADA:${et.etapa}` })
    }
    if (et.estadoActual === Estado.ESPERANDO_VISITA_PROTECCIONES && !p.fechaVisitaProtecciones && habiles > 10) {
      out.push({ tipo: TipoAlerta.ETAPA_ESTANCADA, fechaDisparo: hoy, mensaje: `"${p.nombreComercial}" lleva ${habiles} días hábiles esperando la visita de protecciones sin agenda. Coordinar con Solenium/OR.`, dedupeKey: `${p.id}:ETAPA_ESTANCADA:${et.etapa}` })
    }
  }
  return out
}

const UMBRAL_CALIBRACION_DIAS = 30

export function alertasCalibracion(p, hoy) {
  const out = []
  for (const eq of p.equipos || []) {
    if (!eq.fechaVencimientoCalibracion) continue
    const restantes = diasCalendario(hoy, eq.fechaVencimientoCalibracion)
    if (restantes > UMBRAL_CALIBRACION_DIAS) continue
    const disc = `${eq.tipo}:${eq.serial ?? 's/n'}`
    const estado = restantes < 0 ? `VENCIDA hace ${Math.abs(restantes)} días` : `vence en ${restantes} días`
    out.push({ tipo: TipoAlerta.CALIBRACION_POR_VENCER, fechaDisparo: hoy, mensaje: `Calibración del equipo ${disc} de "${p.nombreComercial}" ${estado} (medidores <= 12m, TC/TP <= 6m).`, dedupeKey: `${p.id}:CALIBRACION_POR_VENCER:${disc}` })
  }
  return out
}

export function generarAlertas(p, hoy) {
  return [
    ...alertasVigencia(p, hoy),
    ...alertasEquiposFrontera(p, hoy),
    ...alertasMedidorOr(p, hoy),
    ...alertasEtapaEstancada(p, hoy),
    ...alertasCalibracion(p, hoy),
  ]
}

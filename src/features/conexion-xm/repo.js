// Repositorio del seguimiento de conexion XM. Hoy computa el resumen en el navegador
// con el nucleo de dominio (avance, maquina de estados, validaciones, alertas) sobre
// los datos de `data.js`. Para conmutar al backend real cuando exista el endpoint:
//   import api from '@/api/client'
//   export async function listarProyectosResumen() {
//     const { data } = await api.get('/xm-conexion/proyectos/resumen'); return data.proyectos
//   }
// El resto de la app (la vista) no cambia: consume la misma forma de objeto.

import { Estado, Etapa, ETAPAS_ACTUALES, ETIQUETAS_ETAPA, HITOS, HITOS_POR_KEY } from './domain/enums'
import { avancePorEtapa, calcularAvancePct, siguienteHitoPendiente, sumaPesos } from './domain/avance'
import { getEtapaDef, responsableDeEstado } from './domain/stateMachine'
import { generarAlertas } from './domain/alertas'
import { validar93 } from './domain/validaciones93'
import { proyectosDemo } from './data'

function construirResumen(p) {
  const completados = new Set(p.hitosCompletados || [])
  const hitosAvance = HITOS.map((h) => ({ hito: h.key, pesoPct: h.pesoDefault, completado: completados.has(h.key) }))
  const porEtapaAvance = avancePorEtapa(hitosAvance)
  const etapaRows = new Map((p.etapas || []).map((e) => [e.etapa, e]))

  const porEtapa = ETAPAS_ACTUALES.map((etapa) => {
    const row = etapaRows.get(etapa)
    const estadoActual = row?.estadoActual ?? getEtapaDef(etapa).inicial
    const av = porEtapaAvance.find((x) => x.etapa === etapa)
    return {
      etapa,
      etiqueta: ETIQUETAS_ETAPA[etapa],
      estadoActual,
      bloqueada: estadoActual === Estado.BLOQUEADO || Boolean(row?.bloqueada),
      causaBloqueo: row?.causaBloqueo ?? null,
      responsableActual: row?.responsableActual ?? responsableDeEstado(etapa, estadoActual),
      ganadoPct: av.ganadoPct,
      totalPct: av.totalPct,
      completos: av.completos,
      totalHitos: av.totalHitos,
    }
  })

  const sigHito = siguienteHitoPendiente(hitosAvance)
  let siguientePaso = null
  if (sigHito) {
    const meta = HITOS_POR_KEY[sigHito]
    const row = etapaRows.get(meta.etapa)
    const estadoActual = row?.estadoActual ?? getEtapaDef(meta.etapa).inicial
    const proximos = getEtapaDef(meta.etapa).transiciones[estadoActual] ?? []
    const responsable =
      row?.responsableActual ??
      responsableDeEstado(meta.etapa, estadoActual) ??
      (proximos[0] ? responsableDeEstado(meta.etapa, proximos[0]) : null)
    siguientePaso = {
      hito: sigHito,
      codigo: meta.codigo,
      descripcion: meta.descripcion,
      etapa: meta.etapa,
      etiquetaEtapa: ETIQUETAS_ETAPA[meta.etapa],
      responsable,
    }
  }

  const bloqueos = porEtapa
    .filter((e) => e.bloqueada || e.estadoActual === Estado.VENCIDO)
    .map((e) => ({
      etapa: e.etapa,
      etiqueta: e.etiqueta,
      motivo: e.estadoActual === Estado.VENCIDO ? 'Vigencia vencida' : e.causaBloqueo ?? 'Bloqueada',
    }))

  const equiposSolicitados =
    (etapaRows.get(Etapa.ETAPA_6_FRONTERA)?.estadoActual ?? Estado.NO_INICIADO) !== Estado.NO_INICIADO

  const snapshot = {
    id: p.id,
    nombreComercial: p.nombreComercial,
    fechaConexionEstimada: p.fechaConexionEstimada,
    vigenciaConexion: p.vigenciaConexion,
    equiposSolicitados,
    exporta: p.exporta,
    comercializadorEsOr: p.comercializadorEsOr,
    fechaVisitaProtecciones: p.fechaVisitaProtecciones,
    etapas: p.etapas || [],
    equipos: p.equipos || [],
  }
  const alertas = generarAlertas(snapshot, new Date())

  const hitos = HITOS.map((h) => ({
    hito: h.key,
    codigo: h.codigo,
    descripcion: h.descripcion,
    etapa: h.etapa,
    pesoPct: h.pesoDefault,
    completado: completados.has(h.key),
  }))

  return {
    id: p.id,
    nombreComercial: p.nombreComercial,
    tipoProyecto: p.tipoProyecto,
    tecnologia: p.tecnologia,
    or: p.or,
    representante: p.representante,
    departamento: p.departamento,
    municipio: p.municipio,
    avancePct: calcularAvancePct(hitosAvance),
    totalPct: sumaPesos(hitosAvance),
    porEtapa,
    hitos,
    siguientePaso,
    bloqueos,
    alertasPendientes: alertas.map((a) => ({ tipo: a.tipo, mensaje: a.mensaje, fechaDisparo: a.fechaDisparo })),
    validacion93: validar93(p.variables93 || {}),
  }
}

export function listarProyectosResumen() {
  return proyectosDemo().map(construirResumen)
}

export function obtenerResumenProyecto(id) {
  const p = proyectosDemo().find((x) => x.id === Number(id))
  return p ? construirResumen(p) : null
}

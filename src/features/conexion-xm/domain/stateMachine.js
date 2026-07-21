// Maquina de estados por etapa: transiciones permitidas y que hito completa cada
// estado. Portado (sin cambios de logica) desde el nucleo probado del feature MDC.

import { Estado, Etapa, Hito, Responsable } from './enums'

const E = Estado
const R = Responsable

export const ETAPA_DEFS = {
  [Etapa.ETAPA_1_CREG174_AMBITO]: {
    etapa: Etapa.ETAPA_1_CREG174_AMBITO,
    inicial: E.NO_INICIADO,
    transiciones: {
      [E.NO_INICIADO]: [E.SOLICITUD_RADICADA],
      [E.SOLICITUD_RADICADA]: [E.CREG174_APROBADA, E.VENCIDO],
      [E.CREG174_APROBADA]: [E.AMBITO_EMITIDO, E.SOLICITUD_RADICADA, E.PRORROGA_SOLICITADA, E.VENCIDO],
      [E.AMBITO_EMITIDO]: [E.PRORROGA_SOLICITADA, E.SOLICITUD_RADICADA, E.VENCIDO],
      [E.PRORROGA_SOLICITADA]: [E.PRORROGADO, E.VENCIDO],
      [E.PRORROGADO]: [E.AMBITO_EMITIDO, E.PRORROGA_SOLICITADA, E.VENCIDO],
      [E.VENCIDO]: [E.SOLICITUD_RADICADA, E.PRORROGA_SOLICITADA],
    },
    hitosAlEntrar: { [E.CREG174_APROBADA]: [Hito.H_1A], [E.AMBITO_EMITIDO]: [Hito.H_1B] },
    responsablePorEstado: { [E.SOLICITUD_RADICADA]: R.PROMOTOR, [E.CREG174_APROBADA]: R.OR, [E.AMBITO_EMITIDO]: R.OR },
    soportaVencimiento: true,
  },
  [Etapa.ETAPA_2_CARTAS_9_1_9_7]: {
    etapa: Etapa.ETAPA_2_CARTAS_9_1_9_7,
    inicial: E.NO_INICIADO,
    transiciones: {
      [E.NO_INICIADO]: [E.CARTAS_EN_PREPARACION],
      [E.CARTAS_EN_PREPARACION]: [E.SOLICITUD_ENVIADA_OR],
      [E.SOLICITUD_ENVIADA_OR]: [E.EN_FIRMA_OR, E.OBSERVACIONES_OR],
      [E.EN_FIRMA_OR]: [E.CARTAS_FIRMADAS, E.OBSERVACIONES_OR],
      [E.OBSERVACIONES_OR]: [E.CARTAS_EN_PREPARACION],
      [E.CARTAS_FIRMADAS]: [],
    },
    hitosAlEntrar: { [E.SOLICITUD_ENVIADA_OR]: [Hito.H_2A], [E.CARTAS_FIRMADAS]: [Hito.H_2B] },
    responsablePorEstado: { [E.CARTAS_EN_PREPARACION]: R.PROMOTOR, [E.SOLICITUD_ENVIADA_OR]: R.OR, [E.EN_FIRMA_OR]: R.OR, [E.CARTAS_FIRMADAS]: R.OR },
  },
  [Etapa.ETAPA_3_MDC]: {
    etapa: Etapa.ETAPA_3_MDC,
    inicial: E.NO_INICIADO,
    transiciones: {
      [E.NO_INICIADO]: [E.SOLICITUD_ENVIADA_XM],
      [E.SOLICITUD_ENVIADA_XM]: [E.EN_CREACION_XM],
      [E.EN_CREACION_XM]: [E.APLICATIVO_CREADO],
      [E.APLICATIVO_CREADO]: [],
    },
    hitosAlEntrar: { [E.SOLICITUD_ENVIADA_XM]: [Hito.H_3A], [E.APLICATIVO_CREADO]: [Hito.H_3B] },
    responsablePorEstado: { [E.SOLICITUD_ENVIADA_XM]: R.XM, [E.EN_CREACION_XM]: R.XM, [E.APLICATIVO_CREADO]: R.XM },
  },
  [Etapa.ETAPA_4_MONTAJE_9_2]: {
    etapa: Etapa.ETAPA_4_MONTAJE_9_2,
    inicial: E.NO_INICIADO,
    transiciones: {
      [E.NO_INICIADO]: [E.CARTAS_MONTADAS_MDC],
      [E.CARTAS_MONTADAS_MDC]: [E.CARTA_9_2_ENVIADA],
      [E.CARTA_9_2_ENVIADA]: [E.CARTA_9_2_ACEPTADA, E.OBSERVACIONES_XM],
      [E.OBSERVACIONES_XM]: [E.CARTAS_MONTADAS_MDC, E.CARTA_9_2_ENVIADA],
      [E.CARTA_9_2_ACEPTADA]: [],
    },
    hitosAlEntrar: { [E.CARTA_9_2_ACEPTADA]: [Hito.H_4] },
    responsablePorEstado: { [E.CARTAS_MONTADAS_MDC]: R.PROMOTOR, [E.CARTA_9_2_ENVIADA]: R.PROMOTOR, [E.OBSERVACIONES_XM]: R.XM, [E.CARTA_9_2_ACEPTADA]: R.XM },
  },
  [Etapa.ETAPA_5_REQ_9_3]: {
    etapa: Etapa.ETAPA_5_REQ_9_3,
    inicial: E.NO_INICIADO,
    transiciones: {
      [E.NO_INICIADO]: [E.RECOPILANDO_INSUMOS],
      [E.RECOPILANDO_INSUMOS]: [E.EN_DILIGENCIAMIENTO],
      [E.EN_DILIGENCIAMIENTO]: [E.MONTADO_MDC],
      [E.MONTADO_MDC]: [E.ACEPTADO_XM, E.OBSERVACIONES_XM],
      [E.OBSERVACIONES_XM]: [E.EN_DILIGENCIAMIENTO],
      [E.ACEPTADO_XM]: [],
    },
    hitosAlEntrar: { [E.ACEPTADO_XM]: [Hito.H_5] },
    responsablePorEstado: { [E.RECOPILANDO_INSUMOS]: R.PROMOTOR, [E.EN_DILIGENCIAMIENTO]: R.PROMOTOR, [E.MONTADO_MDC]: R.PROMOTOR, [E.OBSERVACIONES_XM]: R.XM, [E.ACEPTADO_XM]: R.XM },
  },
  [Etapa.ETAPA_6_FRONTERA]: {
    etapa: Etapa.ETAPA_6_FRONTERA,
    inicial: E.NO_INICIADO,
    transiciones: {
      [E.NO_INICIADO]: [E.EQUIPOS_SOLICITADOS],
      [E.EQUIPOS_SOLICITADOS]: [E.EQUIPOS_EN_LABORATORIO_QUOIA, E.BLOQUEADO],
      [E.EQUIPOS_EN_LABORATORIO_QUOIA]: [E.EQUIPOS_PARAMETRIZADOS, E.BLOQUEADO],
      [E.EQUIPOS_PARAMETRIZADOS]: [E.DOCUMENTACION_EN_RECOPILACION, E.BLOQUEADO],
      [E.DOCUMENTACION_EN_RECOPILACION]: [E.DOCUMENTACION_COMPLETA, E.BLOQUEADO],
      [E.DOCUMENTACION_COMPLETA]: [],
      [E.BLOQUEADO]: [E.EQUIPOS_SOLICITADOS, E.EQUIPOS_EN_LABORATORIO_QUOIA, E.EQUIPOS_PARAMETRIZADOS, E.DOCUMENTACION_EN_RECOPILACION],
    },
    hitosAlEntrar: { [E.EQUIPOS_SOLICITADOS]: [Hito.H_6A], [E.DOCUMENTACION_COMPLETA]: [Hito.H_6B] },
    responsablePorEstado: { [E.EQUIPOS_SOLICITADOS]: R.SOLENIUM, [E.EQUIPOS_EN_LABORATORIO_QUOIA]: R.QUOIA, [E.EQUIPOS_PARAMETRIZADOS]: R.QUOIA, [E.DOCUMENTACION_EN_RECOPILACION]: R.PROMOTOR, [E.DOCUMENTACION_COMPLETA]: R.PROMOTOR },
    soportaBloqueo: true,
  },
  [Etapa.ETAPA_7_REGISTRO_ASIC]: {
    etapa: Etapa.ETAPA_7_REGISTRO_ASIC,
    inicial: E.NO_INICIADO,
    transiciones: {
      [E.NO_INICIADO]: [E.EN_VERIFICACION_TERCERO],
      [E.EN_VERIFICACION_TERCERO]: [E.INSCRITA_ASIC],
      [E.INSCRITA_ASIC]: [E.CGM_ASIGNADO],
      [E.CGM_ASIGNADO]: [E.CODIGO_FRT_ASIGNADO],
      [E.CODIGO_FRT_ASIGNADO]: [E.FRONTERA_EN_OPERACION],
      [E.FRONTERA_EN_OPERACION]: [],
    },
    hitosAlEntrar: { [E.CODIGO_FRT_ASIGNADO]: [Hito.H_7] },
    responsablePorEstado: { [E.EN_VERIFICACION_TERCERO]: R.PROMOTOR, [E.INSCRITA_ASIC]: R.ASIC, [E.CGM_ASIGNADO]: R.ASIC, [E.CODIGO_FRT_ASIGNADO]: R.ASIC },
  },
  [Etapa.ETAPA_8_REQ_9_4]: {
    etapa: Etapa.ETAPA_8_REQ_9_4,
    inicial: E.NO_INICIADO,
    transiciones: {
      [E.NO_INICIADO]: [E.ESPERANDO_VISITA_PROTECCIONES],
      [E.ESPERANDO_VISITA_PROTECCIONES]: [E.VALORES_RECIBIDOS],
      [E.VALORES_RECIBIDOS]: [E.CARTA_SOLICITADA_OR],
      [E.CARTA_SOLICITADA_OR]: [E.FIRMADA_OR],
      [E.FIRMADA_OR]: [E.MONTADA_MDC],
      [E.MONTADA_MDC]: [E.APROBADA_XM, E.OBSERVACIONES_XM],
      [E.OBSERVACIONES_XM]: [E.MONTADA_MDC],
      [E.APROBADA_XM]: [],
    },
    hitosAlEntrar: { [E.CARTA_SOLICITADA_OR]: [Hito.H_8A], [E.FIRMADA_OR]: [Hito.H_8B], [E.APROBADA_XM]: [Hito.H_8C] },
    responsablePorEstado: { [E.ESPERANDO_VISITA_PROTECCIONES]: R.SOLENIUM, [E.VALORES_RECIBIDOS]: R.SOLENIUM, [E.CARTA_SOLICITADA_OR]: R.OR, [E.FIRMADA_OR]: R.OR, [E.MONTADA_MDC]: R.PROMOTOR, [E.OBSERVACIONES_XM]: R.XM, [E.APROBADA_XM]: R.XM },
  },
  // Futuras (sin hitos)
  [Etapa.CONSTRUCCION]: { etapa: Etapa.CONSTRUCCION, inicial: E.NO_INICIADO, transiciones: { [E.NO_INICIADO]: [E.EN_OBRA], [E.EN_OBRA]: [E.TERMINADA], [E.TERMINADA]: [] }, hitosAlEntrar: {} },
  [Etapa.INTERVENTORIA_PROTECCIONES]: { etapa: Etapa.INTERVENTORIA_PROTECCIONES, inicial: E.NO_INICIADO, transiciones: { [E.NO_INICIADO]: [E.EN_REVISION], [E.EN_REVISION]: [E.NO_CONFORMIDADES, E.CERRADA], [E.NO_CONFORMIDADES]: [E.EN_REVISION], [E.CERRADA]: [] }, hitosAlEntrar: {} },
  [Etapa.ENERGIZACION]: { etapa: Etapa.ENERGIZACION, inicial: E.NO_INICIADO, transiciones: { [E.NO_INICIADO]: [E.SOLICITADA], [E.SOLICITADA]: [E.APROBADA], [E.APROBADA]: [] }, hitosAlEntrar: {} },
  [Etapa.CARTA_9_5]: { etapa: Etapa.CARTA_9_5, inicial: E.NO_INICIADO, transiciones: { [E.NO_INICIADO]: [E.SOLICITADA], [E.SOLICITADA]: [E.FIRMADA_OR], [E.FIRMADA_OR]: [] }, hitosAlEntrar: {} },
  [Etapa.REQUISITO_9_6]: { etapa: Etapa.REQUISITO_9_6, inicial: E.NO_INICIADO, transiciones: { [E.NO_INICIADO]: [E.ENVIADO], [E.ENVIADO]: [E.CONFIRMADO], [E.CONFIRMADO]: [] }, hitosAlEntrar: {} },
  [Etapa.PRUEBAS_GENERACION]: { etapa: Etapa.PRUEBAS_GENERACION, inicial: E.NO_INICIADO, transiciones: { [E.NO_INICIADO]: [E.EN_PRUEBAS], [E.EN_PRUEBAS]: [E.CERRADO], [E.CERRADO]: [] }, hitosAlEntrar: {} },
  [Etapa.CARTA_9_9]: { etapa: Etapa.CARTA_9_9, inicial: E.NO_INICIADO, transiciones: { [E.NO_INICIADO]: [E.SOLICITADA], [E.SOLICITADA]: [E.FIRMADA_OR], [E.FIRMADA_OR]: [E.CERRADO], [E.CERRADO]: [] }, hitosAlEntrar: {} },
}

export function getEtapaDef(etapa) {
  const def = ETAPA_DEFS[etapa]
  if (!def) throw new Error(`Etapa desconocida: ${etapa}`)
  return def
}

export function transicionesPermitidas(etapa, estado) {
  return getEtapaDef(etapa).transiciones[estado] ?? []
}

export function esTransicionValida(etapa, de, a) {
  return transicionesPermitidas(etapa, de).includes(a)
}

export function hitosCompletadosAlEntrar(etapa, estado) {
  return getEtapaDef(etapa).hitosAlEntrar[estado] ?? []
}

export function responsableDeEstado(etapa, estado) {
  return getEtapaDef(etapa).responsablePorEstado?.[estado] ?? null
}

export function esEstadoFinal(etapa, estado) {
  return transicionesPermitidas(etapa, estado).length === 0
}

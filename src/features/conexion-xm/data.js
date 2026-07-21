// Datos de EJEMPLO (ficticios) del seguimiento de conexion XM: un proyecto al 100% y
// otro al 40% + alertas. Nombres y codigos deliberadamente ficticios para NO colisionar
// ni duplicar proyectos reales de la plataforma. Autónomo en el navegador; cuando el
// backend exponga /api/v1 para este proceso, `repo.js` se conmuta a la API real y estos
// datos de ejemplo se descartan.

import { Estado, Etapa } from './domain/enums'

function diasDesdeHoy(n) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d
}

// Estado actual de cada etapa por proyecto (fechaEstado: hace ~20 días, no dispara estancamiento).
function etapasEn(estados) {
  const fecha = diasDesdeHoy(-20)
  return Object.entries(estados).map(([etapa, estadoActual]) => ({ etapa, estadoActual, fechaEstado: fecha }))
}

export function proyectosDemo() {
  return [
    {
      id: 1,
      nombreComercial: 'DEMO · Proyecto Ejemplo Norte (GD solar)',
      promotor: 'Unergy',
      tipoProyecto: 'GD',
      tecnologia: 'SOLAR',
      or: 'Afinia (CaribeMar de la Costa S.A.S E.S.P.)',
      representante: 'UNERGY ENERGIA DIGITAL S.A.S E.S.P.',
      departamento: 'Cesar',
      municipio: 'Valledupar',
      fechaConexionEstimada: diasDesdeHoy(15),
      vigenciaConexion: diasDesdeHoy(120),
      exporta: true,
      comercializadorEsOr: true,
      fechaVisitaProtecciones: diasDesdeHoy(-30),
      // Completo: los 14 hitos 1a-8c
      hitosCompletados: ['H_1A', 'H_1B', 'H_2A', 'H_2B', 'H_3A', 'H_3B', 'H_4', 'H_5', 'H_6A', 'H_6B', 'H_7', 'H_8A', 'H_8B', 'H_8C'],
      etapas: etapasEn({
        [Etapa.ETAPA_1_CREG174_AMBITO]: Estado.AMBITO_EMITIDO,
        [Etapa.ETAPA_2_CARTAS_9_1_9_7]: Estado.CARTAS_FIRMADAS,
        [Etapa.ETAPA_3_MDC]: Estado.APLICATIVO_CREADO,
        [Etapa.ETAPA_4_MONTAJE_9_2]: Estado.CARTA_9_2_ACEPTADA,
        [Etapa.ETAPA_5_REQ_9_3]: Estado.ACEPTADO_XM,
        [Etapa.ETAPA_6_FRONTERA]: Estado.DOCUMENTACION_COMPLETA,
        [Etapa.ETAPA_7_REGISTRO_ASIC]: Estado.FRONTERA_EN_OPERACION,
        [Etapa.ETAPA_8_REQ_9_4]: Estado.APROBADA_XM,
      }),
      equipos: [
        { tipo: 'MEDIDOR_PRINCIPAL', serial: 'MED-0040-P', fechaEnvioOr: diasDesdeHoy(-45), fechaVencimientoCalibracion: diasDesdeHoy(300) },
        { tipo: 'TC', serial: 'TC-0040', fechaVencimientoCalibracion: diasDesdeHoy(150) },
      ],
      variables93: {
        iccSubtransPicoKap: 0.4243, iccSubtrans3fKa: 0.3, iccSubtrans2fKa: 0.2598,
        iccSubtrans1fKa: 0.2, iccEstadoEstableKa: 0.2,
        voltajeMaxKv: 0.88, voltajeNominalKv: 0.8, voltajeMinKv: 0.72,
      },
    },
    {
      id: 2,
      nombreComercial: 'DEMO · Proyecto Ejemplo Sur (GD solar)',
      promotor: 'Unergy',
      tipoProyecto: 'GD',
      tecnologia: 'SOLAR',
      or: 'Afinia (CaribeMar de la Costa S.A.S E.S.P.)',
      representante: 'UNERGY ENERGIA DIGITAL S.A.S E.S.P.',
      departamento: 'Cesar',
      municipio: 'Valledupar',
      fechaConexionEstimada: diasDesdeHoy(45), // < 90 días => alerta equipos
      vigenciaConexion: diasDesdeHoy(25), // <= 30 días => alerta vigencia
      exporta: true,
      comercializadorEsOr: true,
      fechaVisitaProtecciones: null,
      // 40%: 1a,1b,2a,2b,3a,3b (carta 9.2 enviada pero NO aceptada => hito 4 incompleto)
      hitosCompletados: ['H_1A', 'H_1B', 'H_2A', 'H_2B', 'H_3A', 'H_3B'],
      etapas: etapasEn({
        [Etapa.ETAPA_1_CREG174_AMBITO]: Estado.AMBITO_EMITIDO,
        [Etapa.ETAPA_2_CARTAS_9_1_9_7]: Estado.CARTAS_FIRMADAS,
        [Etapa.ETAPA_3_MDC]: Estado.APLICATIVO_CREADO,
        [Etapa.ETAPA_4_MONTAJE_9_2]: Estado.CARTA_9_2_ENVIADA,
        [Etapa.ETAPA_5_REQ_9_3]: Estado.NO_INICIADO,
        [Etapa.ETAPA_6_FRONTERA]: Estado.NO_INICIADO, // equipos NO solicitados
        [Etapa.ETAPA_7_REGISTRO_ASIC]: Estado.NO_INICIADO,
        [Etapa.ETAPA_8_REQ_9_4]: Estado.NO_INICIADO,
      }),
      equipos: [
        { tipo: 'TP', serial: 'TP-0055', fechaVencimientoCalibracion: diasDesdeHoy(10) }, // <= 30 días
      ],
      variables93: {
        voltajeNominalKv: 0.8, // datos incompletos => varias reglas PENDIENTE
      },
    },
  ]
}

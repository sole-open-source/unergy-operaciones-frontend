// Validaciones automaticas pre-montaje del requisito 9.3:
//   Icc_pk > Icc_3F > Icc_2F >= Icc_1F ; Icc_EE ≈ In_eq ; V_max > V_nom > V_min.
// Un valor ausente NO es error: se marca PENDIENTE (nunca inventar datos). Funciones puras.

const RAIZ2 = Math.SQRT2
const K_2F = 0.866
const TOL_REL = 0.05

function tiene(n) {
  return typeof n === 'number' && Number.isFinite(n)
}
function aproxIgual(a, b, tolRel = TOL_REL) {
  const escala = Math.max(Math.abs(a), Math.abs(b), 1e-9)
  return Math.abs(a - b) / escala <= tolRel
}
function fmt(n) {
  return n.toFixed(4)
}

export function validar93(e) {
  const r = []
  const { iccSubtransPicoKap: pk, iccSubtrans3fKa: i3, iccSubtrans2fKa: i2, iccSubtrans1fKa: i1 } = e

  if (tiene(pk) && tiene(i3)) {
    r.push(pk > i3
      ? { regla: 'Icc_pk > Icc_3F', severidad: 'OK', mensaje: `${fmt(pk)} > ${fmt(i3)} kA` }
      : { regla: 'Icc_pk > Icc_3F', severidad: 'ERROR', mensaje: `Se esperaba Icc_pk (${fmt(pk)}) > Icc_3F (${fmt(i3)})` })
  } else {
    r.push({ regla: 'Icc_pk > Icc_3F', severidad: 'PENDIENTE', mensaje: 'Falta Icc_pk y/o Icc_3F' })
  }

  if (tiene(i3) && tiene(i2)) {
    r.push(i3 > i2
      ? { regla: 'Icc_3F > Icc_2F', severidad: 'OK', mensaje: `${fmt(i3)} > ${fmt(i2)} kA` }
      : { regla: 'Icc_3F > Icc_2F', severidad: 'ERROR', mensaje: `Se esperaba Icc_3F (${fmt(i3)}) > Icc_2F (${fmt(i2)})` })
  } else {
    r.push({ regla: 'Icc_3F > Icc_2F', severidad: 'PENDIENTE', mensaje: 'Falta Icc_3F y/o Icc_2F' })
  }

  if (tiene(i2) && tiene(i1)) {
    r.push(i2 >= i1
      ? { regla: 'Icc_2F >= Icc_1F', severidad: 'OK', mensaje: `${fmt(i2)} >= ${fmt(i1)} kA` }
      : { regla: 'Icc_2F >= Icc_1F', severidad: 'ERROR', mensaje: `Se esperaba Icc_2F (${fmt(i2)}) >= Icc_1F (${fmt(i1)})` })
  } else {
    r.push({ regla: 'Icc_2F >= Icc_1F', severidad: 'PENDIENTE', mensaje: 'Falta Icc_2F y/o Icc_1F' })
  }

  if (tiene(e.iccEstadoEstableKa) && tiene(e.inEqKa)) {
    r.push(aproxIgual(e.iccEstadoEstableKa, e.inEqKa)
      ? { regla: 'Icc_EE ≈ In_eq', severidad: 'OK', mensaje: `${fmt(e.iccEstadoEstableKa)} ≈ ${fmt(e.inEqKa)} kA` }
      : { regla: 'Icc_EE ≈ In_eq', severidad: 'ERROR', mensaje: `Icc_EE (${fmt(e.iccEstadoEstableKa)}) debería ser ≈ In_eq (${fmt(e.inEqKa)})` })
  } else {
    r.push({ regla: 'Icc_EE ≈ In_eq', severidad: 'PENDIENTE', mensaje: 'Falta Icc_EE y/o In_eq (aportar In del datasheet)' })
  }

  const { voltajeMaxKv: vmax, voltajeNominalKv: vnom, voltajeMinKv: vmin } = e
  if (tiene(vmax) && tiene(vnom) && tiene(vmin)) {
    r.push(vmax > vnom && vnom > vmin
      ? { regla: 'V_max > V_nom > V_min', severidad: 'OK', mensaje: `${vmax} > ${vnom} > ${vmin} kV` }
      : { regla: 'V_max > V_nom > V_min', severidad: 'ERROR', mensaje: `Orden inválido: max=${vmax}, nom=${vnom}, min=${vmin} kV` })
  } else {
    r.push({ regla: 'V_max > V_nom > V_min', severidad: 'PENDIENTE', mensaje: 'Faltan uno o más voltajes (max/nom/min)' })
  }

  if (tiene(pk) && tiene(i3)) {
    r.push(aproxIgual(pk, RAIZ2 * i3)
      ? { regla: 'Icc_pk ≈ √2·Icc_3F', severidad: 'OK', mensaje: `${fmt(pk)} ≈ ${fmt(RAIZ2 * i3)} kA` }
      : { regla: 'Icc_pk ≈ √2·Icc_3F', severidad: 'ADVERTENCIA', mensaje: `Icc_pk=${fmt(pk)} vs √2·Icc_3F=${fmt(RAIZ2 * i3)} (revisar)` })
  }
  if (tiene(i2) && tiene(i3)) {
    r.push(aproxIgual(i2, K_2F * i3)
      ? { regla: 'Icc_2F ≈ 0.866·Icc_3F', severidad: 'OK', mensaje: `${fmt(i2)} ≈ ${fmt(K_2F * i3)} kA` }
      : { regla: 'Icc_2F ≈ 0.866·Icc_3F', severidad: 'ADVERTENCIA', mensaje: `Icc_2F=${fmt(i2)} vs 0.866·Icc_3F=${fmt(K_2F * i3)} (revisar)` })
  }

  return { valido: !r.some((x) => x.severidad === 'ERROR'), resultados: r }
}

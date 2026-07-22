/**
 * Prueba de parseCOP (parseo del "Valor a Facturar" editado inline).
 * Ejecutar:  node src/utils/parseCOP.test.mjs
 *
 * No hay runner (vitest/jest) en el repo: se evalúa el código fuente del módulo
 * (quitando los `export`, que node no interpreta en .js bajo package CommonJS).
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'parseCOP.js'), 'utf8')
src = src.replace(/export const /g, 'const ').replace(/export function /g, 'function ')
const { parseCOP } = new Function(src + '\nreturn { parseCOP };')()

let ok = true
const eq = (got, exp, msg) => {
  const pass = got === exp
  console.log((pass ? '✅' : '❌') + ` ${msg} → ${JSON.stringify(got)} (esperado ${JSON.stringify(exp)})`)
  if (!pass) ok = false
}

// Casos que ya funcionaban (no deben romperse)
eq(parseCOP('1500000'), 1500000, 'entero plano')
eq(parseCOP('$1.500.000'), 1500000, 'moneda con puntos de miles')
eq(parseCOP('1.200'), 1200, 'puntos = miles (colombiano)')
eq(parseCOP('$0'), 0, 'cero')

// Bug #7a: coma decimal colombiana NO debe multiplicar por 100
eq(parseCOP('1.500.000,50'), 1500001, 'coma decimal: redondea a COP entero (no x100)')
eq(parseCOP('1200,00'), 1200, 'coma decimal ,00')
eq(parseCOP('1200,50'), 1201, 'coma decimal redondea hacia arriba')

// Bug #7b: preservar el signo negativo
eq(parseCOP('-500000'), -500000, 'negativo simple')
eq(parseCOP('-1.500.000,50'), -1500001, 'negativo con miles y decimal')

// Sanidad
eq(parseCOP(''), null, 'vacío → null')
eq(parseCOP(null), null, 'null → null')
eq(parseCOP('abc'), null, 'no numérico → null')

console.log(ok ? '\nTODOS OK' : '\nHAY FALLOS')
process.exit(ok ? 0 : 1)

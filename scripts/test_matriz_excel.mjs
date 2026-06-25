import { construirMatrizAOA } from '../src/views/MEM/cumplimientoMatrizExcel.js'

const data = { year: 2026, contratos: [{
  id: 1, nombre_interno: 'C1', comprador_nombre: 'Comp', n_plantas: 2,
  estado_cumplimiento: 'no_cumple', requiere_bolsa: true, total_anual_mwh: 24, total_min_anual_mwh: 12, bolsa_anual_mwh: 3,
  meses: Array.from({length:12},(_,i)=>({ month:i+1, valor_mwh:2, min_mwh:1, estado:'ok' })),
  proyectos: [
    { id:10, nombre:'A', pct_despacho_rep:0.5, meses:Array.from({length:12},(_,i)=>({month:i+1,valor_mwh:1})) },
    { id:11, nombre:'B', pct_despacho_rep:0.5, meses:Array.from({length:12},(_,i)=>({month:i+1,valor_mwh:1})) },
  ],
}]}

let pass=0, fail=0
const ok=(n,c)=>{ if(c){pass++;console.log('  ✓ '+n)} else {fail++;console.log('  ✗ '+n)} }

const { aoa, rowLevels, formulaCells } = construirMatrizAOA(data, 2026)

// La fila de contrato debe tener fórmulas =SUM de las 2 filas de proyecto en cada mes
const contratoFormula = formulaCells.find(f => f.kind === 'contrato_mes')
ok('fórmula de mes de contrato es SUM', /^SUM\(/.test(contratoFormula.f))
// Outline: filas de proyecto en nivel 1
ok('proyectos en outline level 1', rowLevels.some(l => l === 1))
// Total general usa SUM de filas de contrato
ok('total general SUM', formulaCells.some(f => f.kind === 'total_mes' && /^SUM\(/.test(f.f)))
// Total anual de contrato = SUM(Ene:Dic) de su propia fila
ok('total anual contrato SUM', formulaCells.some(f => f.kind === 'contrato_total'))

// Additional: verify formula row references are 1-based and correct
// Contract is at row index 3 (0-based), Excel row = 4
// Projects are at row indices 4 and 5 (0-based), Excel rows 5 and 6
const contractMesFormula = formulaCells.find(f => f.kind === 'contrato_mes')
ok('contrato_mes fórmula referencia filas correctas (proyectos)', /B5:B6/.test(contractMesFormula.f) || /SUM\(B5:B6\)/.test(contractMesFormula.f))

// Total row should reference the contract row (row index 3 → Excel row 4)
const totalMesFormula = formulaCells.find(f => f.kind === 'total_mes')
ok('total_mes fórmula referencia fila de contrato (Excel row 4)', /B4/.test(totalMesFormula.f))

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0)

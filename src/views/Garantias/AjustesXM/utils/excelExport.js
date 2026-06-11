import * as XLSX from 'xlsx'

export function exportTablaExcel(rows, filename = 'tabla.xlsx') {
  if (!rows || !rows.length) return
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, filename)
}

export function exportHistorialExcel(historial, filename = 'historial_garantias.xlsx') {
  if (!historial || !historial.length) return
  const rows = historial.map((r) => ({
    Fecha: r.fecha,
    Tipo: r.tipo,
    'PB ($)': r.pb,
    'Total UNGC': r.totalUNGC,
    'Total UNGG': r.totalUNGG,
    'Total Consignar': r.totalConsignar,
    'Disponible Custodia': r.disponibleCustodia,
    Congelado: r.congelado,
    Saldo: r.saldo,
    'Ajuste TXR': r.totalAjusteTXR,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Historial')
  XLSX.writeFile(wb, filename)
}

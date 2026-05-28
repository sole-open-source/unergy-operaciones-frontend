/**
 * rptStyles.js
 * CSS compartido para los informes operacionales (rpt-* / fmo-*).
 * Usado por:
 *  - EnvioMensualPanel → iframe preview + editor overlay + ventana de impresión
 *  - InformesMensualesPanel → ventana de impresión
 */

export const RPT_CSS = `
*  { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Sora', system-ui, sans-serif;
  color: #2C2039;
}

/* ── Página ── */
.rpt-page {
  background: #fff;
  padding: 30px 36px;
  border-radius: 8px;
  box-shadow: 0 2px 14px rgba(0,0,0,.08);
  margin-bottom: 24px;
  color: #2C2039;
}
.rpt-page-sep { height: 22px; }

/* ── Header degradado ── */
.rpt-header {
  background: linear-gradient(135deg, #2C2039 0%, #3d2b52 70%, #4a2d6e 100%);
  border-radius: 8px;
  padding: 18px 22px 16px;
  color: #FDFAF7;
  margin: -30px -36px 22px;
}
.rpt-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 14px;
}
@media (max-width: 600px) { .rpt-meta-grid { grid-template-columns: repeat(2, 1fr); } }
.rpt-meta-item {
  background: rgba(255,255,255,.06);
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.12);
}
.rpt-meta-lbl {
  font-size: 9px;
  color: rgba(253,250,247,.55);
  font-weight: 700;
  letter-spacing: .6px;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.rpt-meta-val { font-size: 12px; color: #FDFAF7; font-weight: 700; }

/* ── Secciones ── */
.rpt-section { margin-bottom: 26px; }
.rpt-section-title, .fmo-section-title {
  font-size: 13px;
  font-weight: 800;
  color: #6B35C0;
  letter-spacing: .3px;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid #ECE7F2;
}

/* ── KPIs ── */
.rpt-kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.rpt-kpi-row > .rpt-kpi:only-child { grid-column: span 3; }
.rpt-kpi {
  background: #F7F4FD;
  border: 1px solid #ECE7F2;
  border-radius: 9px;
  padding: 12px 14px;
  text-align: center;
}
.rpt-kpi-ico { font-size: 18px; margin-bottom: 4px; }
.rpt-kpi-lbl {
  font-size: 9px;
  color: #888;
  font-weight: 700;
  letter-spacing: .6px;
  text-transform: uppercase;
}
.rpt-kpi-val { font-size: 16px; font-weight: 800; color: #1A1025; margin-top: 4px; }

/* ── Tablas ── */
.rpt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: #fff;
  border: 1px solid #ECE7F2;
  border-radius: 6px;
  overflow: hidden;
}
.rpt-table thead tr { background: #F7F4FD; }
.rpt-table thead th {
  padding: 7px 9px;
  text-align: left;
  font-size: 9px;
  font-weight: 800;
  color: #6B5A8A;
  letter-spacing: .5px;
  text-transform: uppercase;
  border-bottom: 1px solid #E5E2EC;
}
.rpt-table tbody td {
  padding: 7px 9px;
  border-bottom: 1px solid #F3F0F9;
  color: #2C2039;
}
.rpt-total-row { background: #FAF8FE; font-weight: 800; border-top: 2px solid #6B35C0; }
.rpt-total-row td { font-weight: 800; }

/* ── Gráficas ── */
.rpt-chart-card {
  background: #FCFAFE;
  border: 1px solid #ECE7F2;
  border-radius: 9px;
  padding: 12px 14px;
}
.rpt-chart-box { position: relative; height: 200px; width: 100%; }
.rpt-chart-box-tall { height: auto; min-height: 220px; }
.rpt-chart-empty {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A89EC0;
  font-size: 11px;
}

/* ── Observaciones ── */
.rpt-obs-title {
  font-size: 9px;
  color: #A89EC0;
  font-weight: 700;
  letter-spacing: .7px;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.rpt-edit-hint {
  font-size: 9px;
  color: #915BD8;
  font-weight: 700;
  margin-left: 6px;
  cursor: pointer;
}
.rpt-obs-text, .rpt-obs-editable {
  min-height: 80px;
  outline: none;
  border-left: 3px solid #4ADE80;
  padding: 13px 15px;
  border-radius: 8px;
  background: #F0FFF4;
  font-size: 12px;
  color: #3D2D5C;
  line-height: 1.8;
  font-family: 'Sora', system-ui, sans-serif;
}
.rpt-obs-editable:focus {
  background: #FFFBF0;
  border-left-color: #6B35C0;
  box-shadow: 0 0 0 2px rgba(145,91,216,.15);
}

/* ── Status box ── */
.rpt-status-box {
  background: #F7F4FD;
  border: 1px solid #ECE7F2;
  border-radius: 9px;
  padding: 14px 16px;
}
.rpt-status-row { font-size: 11px; color: #4B3A6E; margin-bottom: 5px; line-height: 1.5; }

/* ── Footer ── */
.rpt-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid #ECE7F2;
  font-size: 10px;
  color: #888;
}

/* ── FMO ── */
.fmo-multa-box {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 9px;
  padding: 12px 14px;
  margin-top: 10px;
}
.fmo-ok-box {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 9px;
  padding: 12px 14px;
  margin-top: 10px;
}
.fmo-inv-table, .fmo-mant-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: #fff;
  border: 1px solid #ECE7F2;
  border-radius: 6px;
  overflow: hidden;
}
.fmo-inv-table thead, .fmo-mant-table thead { background: #F7F4FD; }
.fmo-inv-table thead th, .fmo-mant-table thead th {
  padding: 7px 9px;
  text-align: left;
  font-size: 9px;
  font-weight: 800;
  color: #6B5A8A;
  letter-spacing: .5px;
  text-transform: uppercase;
  border-bottom: 1px solid #E5E2EC;
}
.fmo-inv-table tbody td, .fmo-mant-table tbody td {
  padding: 6px 9px;
  border-bottom: 1px solid #F3F0F9;
}
.fmo-status-ok  { color: #2D8A4E; font-weight: 700; }
.fmo-status-err { color: #CC0000; font-weight: 700; }
.fmo-sla-ok  { color: #2D8A4E; font-weight: 800; text-align: center; }
.fmo-sla-err { color: #CC0000; font-weight: 800; text-align: center; }

/* ── Impresión ── */
/*
  6mm top/bottom + 8mm left/right = mínimo seguro en impresoras modernas.
  Área de contenido resultante: (210-16)mm × (297-12)mm = 194mm × 285mm ≈ 733px × 1078px.
  NO reducir más de 6mm o las impresoras de borde pueden cortar.
*/
@page { margin: 6mm 8mm; size: A4 portrait; }
@media print {
  body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .rpt-page {
    box-shadow: none !important;
    border-radius: 0 !important;
    /* Ocupa el 100% del área de contenido sin margen entre páginas */
    margin: 0 !important;
    padding: 0 10px !important;   /* padding lateral mínimo para que el header no se pegue al borde */
    page-break-after: always;
    break-after: page;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .rpt-page:last-child { page-break-after: avoid; break-after: avoid; }
  /* El header negativo necesita ajustarse al nuevo padding de la página */
  .rpt-header { margin: 0 -10px 18px !important; border-radius: 0 !important; }
  .rpt-page-sep { display: none !important; }
  .rpt-edit-hint { display: none !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`

/**
 * Construye el documento HTML completo para mostrar (o editar) un informe.
 *
 * Modos:
 *  - bgGray=true, editable=false  → previsualización en el panel detalle (fondo gris plataforma)
 *  - bgGray=false, editable=false → ventana de impresión/PDF (fondo blanco, sin padding)
 *  - editable=true                → editor pantalla completa:
 *      • Fondo gris oscuro tipo Acrobat (#525659)
 *      • Cada .rpt-page se muestra a exactamente 733px (= A4 194mm @ 96dpi con 8mm márgenes)
 *      • Centrado y con sombra de página → el usuario ve en pantalla lo que entregará en PDF
 *
 * A4 @ 96 DPI = 793.7px ≈ 794px.  Con @page margin 8mm cada lado (16mm total):
 *   ancho área contenido = (210 - 16) mm × 3.7795 px/mm ≈ 733 px
 */
export function buildReportHtmlDoc(html, opts = {}) {
  const {
    title    = 'Informe Operacional',
    bgGray   = true,
    editable = false,
  } = opts

  // ── CSS extra según el modo ──────────────────────────────────────────
  let modeCSS = ''

  if (editable) {
    // Modo editor: simula visor PDF con páginas A4 centradas
    modeCSS = `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #525659 !important;
        min-height: 100vh;
        cursor: text;
      }
      /* Wrapper centrador que simula el fondo gris del visor */
      body {
        padding: 28px 0 40px !important;
      }
      /* Cada página se muestra a exactamente el ancho de contenido A4 */
      .rpt-page {
        width: 733px !important;
        max-width: 733px !important;
        min-width: 733px !important;
        margin: 0 auto 24px auto !important;
        box-shadow: 0 4px 24px rgba(0,0,0,.55) !important;
        box-sizing: border-box !important;
      }
      .rpt-page-sep { height: 0 !important; }
      [contenteditable]:focus { outline: 2px solid rgba(145,91,216,.6); outline-offset: -2px; }
    `
  } else if (bgGray) {
    // Modo previsualización (panel detalle): fondo gris plataforma, sin restricción de ancho
    modeCSS = `
      body { margin: 0; padding: 18px; background: #ECE9F2; }
    `
  } else {
    // Modo impresión: sin padding, sin fondo
    modeCSS = `
      body { margin: 0; padding: 0; background: #fff; }
    `
  }

  const bodyAttrs = editable ? ' contenteditable="true"' : ''

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${RPT_CSS}
/* ── modo ── */
${modeCSS}
</style>
</head>
<body${bodyAttrs}>${html}</body>
</html>`
}

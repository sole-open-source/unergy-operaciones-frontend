/* =========================================================================
   FASORIAL.JS — Diagrama fasorial con ángulos REALES para medidores trifásicos
   -------------------------------------------------------------------------
   Calcula el ángulo de cada corriente a partir de los datos del medidor
   (vp, cp, app, irpp, erpp) en lugar de asumir PF = 1, y dibuja el diagrama
   en SVG con diagnóstico automático de errores de cableado de CTs.

   Uso:
     renderFasorial(document.getElementById('miDiv'), datosMedidor, {
       titulo: 'MGS JOROPO PRINCIPAL',
       marca: 'Unergy'
     });

   Sin dependencias. Vanilla JS. Un solo archivo.
   ========================================================================= */

(function (global) {
  'use strict';

  /* ---------- 1. CÁLCULO DE FASORES ---------- */

  // Ángulos de referencia de los voltajes (convención del diagrama original)
  var VANG = { 1: 90, 2: 330, 3: 210 };

  // Umbral de desfase (grados) para marcar alerta de cableado
  var UMBRAL_ALERTA = 15;

  // Potencia aparente mínima por fase (kVA) para que el ángulo sea confiable
  // (de noche o con generación mínima el ángulo no significa nada)
  var S_MINIMA_KVA = 2;

  function calcularFasores(d, opciones) {
    opciones = opciones || {};
    var vang = opciones.angulosVoltaje || VANG;
    var umbral = opciones.umbralAlerta != null ? opciones.umbralAlerta : UMBRAL_ALERTA;
    var sMin = opciones.sMinima != null ? opciones.sMinima : S_MINIMA_KVA;

    var fases = [];
    for (var f = 1; f <= 3; f++) {
      var v = num(d['vp' + f]);
      var i = num(d['cp' + f]);
      var p = Math.abs(num(d['app' + f]));          // kW (negativa al exportar)
      var s = (v * i) / 1000;                        // kVA
      var valido = s >= sMin;

      var pf = 1, theta = 0;
      if (valido && s > 0) {
        pf = Math.min(p / s, 1);
        theta = Math.acos(pf) * 180 / Math.PI;       // magnitud del desfase
        var qImp = num(d['irpp' + f]);               // importa reactivo -> atrasa
        var qExp = num(d['erpp' + f]);               // exporta reactivo -> adelanta
        if (qImp > qExp) theta = -theta;
        // Verificación cruzada: Q calculado vs Q reportado
        var qCalc = Math.sqrt(Math.max(s * s - p * p, 0));
        var qRep = Math.max(qImp, qExp);
        var qCoherente = qRep === 0 || Math.abs(qCalc - qRep) / Math.max(qCalc, qRep, 1) < 0.25;
      }

      fases.push({
        fase: f,
        v: v,
        i: i,
        p: p,
        s: round(s, 2),
        pfReal: round(pf, 3),
        desfase: round(theta, 1),
        vAng: vang[f],
        iAng: norm360(vang[f] + theta),
        valido: valido,
        qCoherente: valido ? (qCoherente !== false) : true,
        alerta: valido && Math.abs(theta) > umbral
      });
    }
    return fases;
  }

  /* ---------- 2. DIAGNÓSTICO AUTOMÁTICO ---------- */

  function diagnosticar(fases) {
    var conAlerta = fases.filter(function (x) { return x.alerta; });
    var sinDatos = fases.filter(function (x) { return !x.valido; });

    if (sinDatos.length === 3) {
      return { nivel: 'info', texto: 'Generación insuficiente para evaluar ángulos (medidor en vacío o de noche).' };
    }
    if (conAlerta.length === 0) {
      return { nivel: 'ok', texto: 'Conexión correcta: las tres corrientes alineadas con sus voltajes (PF ≈ 1).' };
    }

    // Firmas típicas de error de cableado según |desfase|
    var hints = conAlerta.map(function (x) {
      var a = Math.abs(x.desfase);
      var firma;
      if (a > 165) firma = 'polaridad de CT invertida';
      else if (a > 100 && a < 140) firma = 'CT de otra fase (intercambio)';
      else if (a > 45 && a < 75) firma = 'CT de otra fase + polaridad invertida';
      else firma = 'desfase anómalo';
      return 'L' + x.fase + ': ' + x.desfase + '° (' + firma + ', PF real ' + x.pfReal + ')';
    });

    return {
      nivel: 'alerta',
      texto: 'POSIBLE ERROR DE CABLEADO DE CTs — ' + hints.join(' · ') +
             '. La potencia registrada en esas fases está subestimada. Verificar bornera contra el diagrama de conexión del medidor.'
    };
  }

  /* ---------- 3. RENDER SVG ---------- */

  var COLORES = {
    1: { v: '#ef5350', i: '#f8a19e', nombre: 'R' },
    2: { v: '#2fbf71', i: '#95e0b8', nombre: 'S' },
    3: { v: '#4d8fe0', i: '#a3c6f0', nombre: 'T' }
  };

  function renderFasorial(container, datos, opciones) {
    opciones = opciones || {};
    var fases = calcularFasores(datos, opciones);
    var diag = diagnosticar(fases);

    var W = 720, H = 780, cx = W / 2, cy = 360;
    var rV = 250;                                  // radio de los fasores de voltaje
    var maxV = Math.max.apply(null, fases.map(function (x) { return x.v; })) || 1;
    var maxI = Math.max.apply(null, fases.map(function (x) { return x.i; })) || 1;

    var s = [];
    s.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
           'style="width:100%;max-width:760px;display:block;background:#0b0f1a;border-radius:12px;' +
           'font-family:Segoe UI,Roboto,Arial,sans-serif">');
    s.push('<defs><marker id="fzArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" ' +
           'markerHeight="6" orient="auto-start-reverse">' +
           '<path d="M1 1L9 5L1 9Z" fill="context-stroke"/></marker></defs>');

    // Título
    s.push(txt(cx, 40, esc(opciones.titulo || ('Medidor ' + (datos.meter || ''))), {
      size: 24, weight: 700, fill: '#f5f7fa', anchor: 'middle'
    }));
    s.push(txt(cx, 66, 'Diagrama fasorial — ángulos reales calculados de P, S y Q', {
      size: 13, fill: '#7d90ad', anchor: 'middle'
    }));

    // Rejilla polar
    [0.33, 0.66, 1].forEach(function (k) {
      s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (rV * k) +
             '" fill="none" stroke="#26314a" stroke-width="1" stroke-dasharray="3 5"/>');
    });
    for (var g = 0; g < 360; g += 30) {
      var pE = polar(cx, cy, rV, g);
      s.push('<line x1="' + cx + '" y1="' + cy + '" x2="' + pE.x + '" y2="' + pE.y +
             '" stroke="#1b2338" stroke-width="1"/>');
      var pL = polar(cx, cy, rV + 18, g);
      s.push(txt(pL.x, pL.y + 4, g + '°', { size: 10, fill: '#4a5a75', anchor: 'middle' }));
    }

    // Fasores: primero voltajes (sólidos), luego corrientes (punteados)
    fases.forEach(function (fx) {
      var c = COLORES[fx.fase];
      var lv = rV * (fx.v / maxV);
      var pv = polar(cx, cy, lv, fx.vAng);
      s.push('<line x1="' + cx + '" y1="' + cy + '" x2="' + pv.x + '" y2="' + pv.y +
             '" stroke="' + c.v + '" stroke-width="3.5" marker-end="url(#fzArr)"/>');
      var pl = polar(cx, cy, lv + 44, fx.vAng);
      s.push(caja(pl.x, pl.y,
        'V' + fx.fase + ' (' + c.nombre + ') · ' + fmt(fx.v) + ' V · ' + fx.vAng + '°',
        c.v));
    });

    fases.forEach(function (fx) {
      if (!fx.valido) return;
      var c = COLORES[fx.fase];
      var li = rV * 0.62 * (fx.i / maxI);
      var pi = polar(cx, cy, li, fx.iAng);
      s.push('<line x1="' + cx + '" y1="' + cy + '" x2="' + pi.x + '" y2="' + pi.y +
             '" stroke="' + c.i + '" stroke-width="2.5" stroke-dasharray="7 5" ' +
             'marker-end="url(#fzArr)"' + (fx.alerta ?
             '><animate attributeName="opacity" values="1;.35;1" dur="1.4s" repeatCount="indefinite"/></line>'
             : '/>'));
      var pli = polar(cx, cy, li + 40, fx.iAng);
      s.push(caja(pli.x, pli.y,
        'I' + fx.fase + ' · ' + fmt(fx.i) + ' A · ' + Math.round(fx.iAng) + '°' +
        (fx.alerta ? ' ⚠' : ''),
        fx.alerta ? '#f0a63a' : c.i));
    });

    // Tabla resumen por fase
    var ty = 660;
    s.push(txt(60, ty - 14, 'Fase', hdr())); s.push(txt(150, ty - 14, 'PF real', hdr()));
    s.push(txt(250, ty - 14, 'Desfase', hdr())); s.push(txt(360, ty - 14, 'P (kW)', hdr()));
    s.push(txt(460, ty - 14, 'S (kVA)', hdr())); s.push(txt(560, ty - 14, 'Estado', hdr()));
    fases.forEach(function (fx, idx) {
      var y = ty + 22 * idx + 8;
      var col = fx.alerta ? '#f0a63a' : '#c9d5e6';
      s.push(txt(60, y, 'L' + fx.fase, { size: 13, fill: COLORES[fx.fase].v, weight: 600 }));
      s.push(txt(150, y, fx.valido ? fx.pfReal.toFixed(3) : '—', { size: 13, fill: col }));
      s.push(txt(250, y, fx.valido ? fx.desfase + '°' : '—', { size: 13, fill: col }));
      s.push(txt(360, y, fmt(fx.p), { size: 13, fill: col }));
      s.push(txt(460, y, fmt(fx.s), { size: 13, fill: col }));
      s.push(txt(560, y, fx.valido ? (fx.alerta ? 'REVISAR' : 'OK') : 'sin carga',
        { size: 13, fill: fx.alerta ? '#f0a63a' : '#3fce8a', weight: 600 }));
    });

    // Banner de diagnóstico
    var bc = diag.nivel === 'alerta' ? '#3a2a12' : diag.nivel === 'ok' ? '#12301f' : '#1b2338';
    var bt = diag.nivel === 'alerta' ? '#f0a63a' : diag.nivel === 'ok' ? '#3fce8a' : '#7d90ad';
    s.push('<rect x="40" y="' + (ty + 78) + '" width="' + (W - 80) +
           '" height="46" rx="8" fill="' + bc + '" stroke="' + bt + '" stroke-width="1"/>');
    s.push(wrapText(diag.texto, cx, ty + 96, W - 120, 12, bt));

    // Pie
    var fecha = datos.timestamp ? new Date(datos.timestamp * 1000).toLocaleString() : '';
    s.push(txt(cx, H - 14, (datos.meter ? 'Medidor ' + esc(String(datos.meter)) + ' · ' : '') +
           esc(fecha) + (opciones.marca ? ' · ' + esc(opciones.marca) : ''),
           { size: 11, fill: '#4a5a75', anchor: 'middle' }));

    s.push('</svg>');
    container.innerHTML = s.join('');
    return { fases: fases, diagnostico: diag };
  }

  /* ---------- helpers ---------- */
  function num(x) { var n = Number(x); return isFinite(n) ? n : 0; }
  function round(x, d) { var k = Math.pow(10, d); return Math.round(x * k) / k; }
  function norm360(a) { return ((a % 360) + 360) % 360; }
  function fmt(x) { return Number(x).toLocaleString('es-CO', { maximumFractionDigits: 2 }); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function polar(cx, cy, r, deg) {
    var rad = deg * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }
  function txt(x, y, t, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 12) +
           '" fill="' + (o.fill || '#c9d5e6') + '"' +
           (o.weight ? ' font-weight="' + o.weight + '"' : '') +
           (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') + '>' + t + '</text>';
  }
  function hdr() { return { size: 11, fill: '#7d90ad', weight: 600 }; }
  function caja(x, y, texto, color) {
    var w = texto.length * 6.6 + 18, h = 22;
    var bx = Math.max(8, Math.min(712 - w, x - w / 2));
    var by = Math.max(84, Math.min(600, y - h / 2));
    return '<g><rect x="' + bx + '" y="' + by + '" width="' + w + '" height="' + h +
           '" rx="5" fill="#0b0f1a" stroke="' + color + '" stroke-width="1" opacity="0.95"/>' +
           txt(bx + w / 2, by + 15, esc(texto), { size: 11, fill: color, anchor: 'middle', weight: 600 }) + '</g>';
  }
  function wrapText(texto, cx, y, maxW, size, fill) {
    var porLinea = Math.floor(maxW / (size * 0.56));
    var palabras = texto.split(' '), lineas = [], l = '';
    palabras.forEach(function (p) {
      if ((l + ' ' + p).trim().length > porLinea) { lineas.push(l.trim()); l = p; }
      else l += ' ' + p;
    });
    if (l.trim()) lineas.push(l.trim());
    return lineas.slice(0, 2).map(function (ln, i) {
      return txt(cx, y + i * 16, esc(ln), { size: size, fill: fill, anchor: 'middle', weight: 600 });
    }).join('');
  }

  /* ---------- export ---------- */
  global.renderFasorial = renderFasorial;
  global.calcularFasores = calcularFasores;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderFasorial: renderFasorial, calcularFasores: calcularFasores };
  }
})(typeof window !== 'undefined' ? window : this);

/* ---------- export ESM (añadido para integración Vue/Vite) ----------
   El IIFE de arriba asigna las funciones al objeto global (window en el
   navegador). Aquí solo las re-exportamos como módulo ES para poder
   importarlas con `import { renderFasorial } from '@/utils/fasorial'`.
   No se modifica ninguna lógica de cálculo. */
var _g = typeof window !== 'undefined' ? window : globalThis;
export const renderFasorial = _g.renderFasorial;
export const calcularFasores = _g.calcularFasores;
export default { renderFasorial: _g.renderFasorial, calcularFasores: _g.calcularFasores };

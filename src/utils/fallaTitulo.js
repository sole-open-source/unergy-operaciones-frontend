// Título y categoría de una falla, derivados de la CLASIFICACIÓN ESTRUCTURADA
// reportada (equipo / evento / detalle del elemento), con respaldo al tipo legacy
// para fallas viejas sin clasificación. Evita que el tipo_id legacy muestre títulos
// que contradicen lo reportado (p.ej. "Fusible de string quemado" en una falla de red).

const COLOR_CAT = {
  red: '#F59E0B',
  frontera: '#0EA5E9',
  inversores: '#915BD8',
  eventos_adversos: '#EF4444',
}

// Título específico: el equipo/evento/detalle reportado.
export function tituloFalla(f) {
  if (!f) return 'Sin tipo'
  const c = f.clasificacion
  if (c && typeof c === 'object') {
    // Inversores: lista de inversores afectados + tipos de falla
    if (Array.isArray(c.inversores) && c.inversores.length) {
      const nombres = c.inversores
        .map(i => i.nombre || (i.proyecto_inversor_id ? `Inversor ${i.proyecto_inversor_id}` : 'Inversor'))
        .join(', ')
      const tipos = [...new Set(c.inversores.flatMap(i => i.tipos_etiquetas || []))].join(', ')
      return tipos ? `${nombres} — ${tipos}` : nombres
    }
    // Red / Frontera / Eventos adversos: el equipo o evento reportado (+ detalle libre)
    if (c.subtipo_etiqueta) {
      return c.detalle ? `${c.subtipo_etiqueta}: ${c.detalle}` : c.subtipo_etiqueta
    }
    if (c.categoria_etiqueta) return c.categoria_etiqueta
  }
  // Respaldo para fallas legacy sin clasificación estructurada
  return f.tipo?.etiqueta || f.tipo_libre || f.descripcion || 'Sin tipo'
}

// Categoría (para el punto/tag de color): prioriza la estructura sobre el tipo legacy.
export function categoriaFalla(f) {
  const c = f?.clasificacion
  if (c && typeof c === 'object' && c.categoria) {
    return {
      etiqueta: c.categoria_etiqueta || c.categoria,
      color: COLOR_CAT[c.categoria] || f?.tipo?.categoria?.color_hex || '#915BD8',
    }
  }
  return {
    etiqueta: f?.tipo?.categoria?.etiqueta || '',
    color: f?.tipo?.categoria?.color_hex || '#915BD8',
  }
}

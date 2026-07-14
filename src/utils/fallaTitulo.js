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

// Ícono por sistema (coincide con ESTRUCTURA_FALLAS del backend).
const ICONO_CAT = {
  red: 'pi pi-bolt',
  frontera: 'pi pi-gauge',
  inversores: 'pi pi-server',
  eventos_adversos: 'pi pi-exclamation-triangle',
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

// Modelo de presentación de la clasificación estructurada, agnóstico al estilo:
// lo consumen la vista de detalle web y el sheet móvil. Devuelve null para fallas
// legacy sin clasificación (esas caen al tipo/tipo_libre en el encabezado).
export function clasificacionDetalle(f) {
  const c = f?.clasificacion
  if (!c || typeof c !== 'object' || !c.categoria) return null
  const cat = c.categoria
  const inversores = Array.isArray(c.inversores)
    ? c.inversores.map((i) => ({
        nombre: i.nombre || (i.proyecto_inversor_id ? `Inversor ${i.proyecto_inversor_id}` : 'Inversor'),
        potenciaKw: i.potencia_kw ?? null,
        // Preferir etiquetas resueltas; respaldo a códigos crudos.
        tipos: (Array.isArray(i.tipos_etiquetas) && i.tipos_etiquetas.length)
          ? i.tipos_etiquetas
          : (Array.isArray(i.tipos) ? i.tipos : []),
      }))
    : []
  // Capa "tipo de falla": conjunto único de tipos across inversores, y si todos
  // los inversores comparten el mismo set (para no repetir chips por inversor).
  const inversorTipos = [...new Set(inversores.flatMap((i) => i.tipos))]
  const _key = (arr) => [...arr].sort().join('|')
  const tiposUniformes = inversores.length > 0 &&
    inversores.every((i) => _key(i.tipos) === _key(inversores[0].tipos))
  return {
    categoria: cat,
    categoriaEtiqueta: c.categoria_etiqueta || cat,
    categoriaColor: COLOR_CAT[cat] || f?.tipo?.categoria?.color_hex || '#915BD8',
    icono: ICONO_CAT[cat] || 'pi pi-tag',
    subtitulo: c.subtipo_etiqueta || '',
    detalle: c.detalle || null,
    pendienteReclasificar: !!f?.pendiente_reclasificar,
    frontera: cat === 'frontera'
      ? { afectaMedicion: !!c.afecta_medicion, perdidaComunicacion: !!c.perdida_comunicacion }
      : null,
    inversores,
    inversorTipos,     // capa aparte: tipos de falla de inversor (conjunto único)
    tiposUniformes,    // true si todos los inversores comparten los mismos tipos
  }
}

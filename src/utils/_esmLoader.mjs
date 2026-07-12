// Helper de PRUEBAS (no es un módulo de la app).
//
// El repo no tiene runner (vitest/jest) y los .js usan sintaxis ESM que node
// nativo trata como CommonJS. Los tests existentes leen el fuente, quitan los
// `export` y lo corren con `new Function`. Este helper generaliza eso para los
// módulos nuevos que además tienen `import`: quita las líneas `import`, quita
// los `export`, y permite INYECTAR las dependencias (zod, sanitizer, xlsx, …)
// como argumentos de la función. Así se prueba la lógica real con dependencias
// controladas, sin depender del DOM (DOMPurify se omite fuera del navegador).
import fs from 'fs'

export function loadModule(absPath, injections = {}) {
  let src = fs.readFileSync(absPath, 'utf8')

  // Nombres exportados (para el `return { ... }`).
  const names = new Set()
  for (const m of src.matchAll(/export\s+(?:const|function)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1])
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const id = part.trim().split(/\s+as\s+/).pop().trim()
      if (id) names.add(id)
    }
  }

  // Quita imports y re-exports; desnuda los `export`.
  src = src
    .replace(/^\s*import[^\n]*\n/gm, '')
    .replace(/^\s*export\s*\{[^}]*\}[^\n]*\n/gm, '')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+function\s+/g, 'function ')

  const injNames = Object.keys(injections)
  const body = `${src}\nreturn { ${[...names].join(', ')} };`
  const fn = new Function(...injNames, body)
  return fn(...injNames.map((n) => injections[n]))
}

// Hook de resolución para que Node entienda el alias de Vite `@/` → `src/`.
// Permite importar módulos como `@/constants/liquidaciones` en los tests
// (node:test) igual que lo hace la app bajo Vite. Sin esto, Node no resuelve
// el especificador y `liquidaciones.js` no se puede cargar para medir cobertura.
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
import { existsSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = resolvePath(here, '..', 'src')

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@' || specifier.startsWith('@/')) {
    let target = resolvePath(srcDir, specifier.replace(/^@\/?/, ''))
    // Resolver extensión como lo hace Vite: probar .js / index.js si falta.
    if (!/\.[a-z]+$/i.test(target)) {
      if (existsSync(`${target}.js`)) target = `${target}.js`
      else if (existsSync(resolvePath(target, 'index.js'))) target = resolvePath(target, 'index.js')
    }
    return nextResolve(pathToFileURL(target).href, context)
  }
  return nextResolve(specifier, context)
}

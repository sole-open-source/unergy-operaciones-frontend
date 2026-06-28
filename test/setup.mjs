// Registra el hook de alias `@/` antes de cargar los módulos de prueba.
// Se inyecta con `node --import ./test/setup.mjs`.
import { register } from 'node:module'

register('./alias-hooks.mjs', import.meta.url)

import { reactive, computed, watch } from 'vue'

/**
 * Reglas de validación reutilizables. Cada regla es una fábrica que devuelve
 * `(value, form) => true | string`, donde el string es el mensaje de error.
 */
export const rules = {
  required: (msg = 'Este campo es obligatorio') => (v) => {
    const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
    return empty ? msg : true
  },
  email: (msg = 'Correo inválido') => (v) =>
    !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? true : msg,
  pattern: (re, msg = 'Formato inválido') => (v) =>
    !v || re.test(String(v)) ? true : msg,
  minLength: (n, msg) => (v) =>
    !v || String(v).length >= n ? true : (msg || `Mínimo ${n} caracteres`),
  maxLength: (n, msg) => (v) =>
    !v || String(v).length <= n ? true : (msg || `Máximo ${n} caracteres`),
  min: (n, msg) => (v) =>
    v === null || v === undefined || v === '' || Number(v) >= n ? true : (msg || `Mínimo ${n}`),
  max: (n, msg) => (v) =>
    v === null || v === undefined || v === '' || Number(v) <= n ? true : (msg || `Máximo ${n}`),
}

/**
 * useFormValidation — envuelve un objeto de formulario reactivo y un esquema de
 * reglas por campo. Integra fácilmente con PrimeVue (`v-model` + `:invalid`).
 *
 * @param {Object} initial Estado inicial del formulario.
 * @param {Object} schema  { campo: [regla, regla, ...] }.
 * @param {Object} [options]
 * @param {boolean} [options.validateOnChange=true] Revalida campos ya "tocados" al cambiar.
 */
export function useFormValidation(initial = {}, schema = {}, options = {}) {
  const { validateOnChange = true } = options

  const form = reactive({ ...initial })
  const errors = reactive({})
  const touched = reactive({})

  function runField(field) {
    const fieldRules = schema[field]
    if (!fieldRules || !fieldRules.length) {
      errors[field] = null
      return true
    }
    for (const rule of fieldRules) {
      const res = rule(form[field], form)
      if (res !== true) {
        errors[field] = res
        return false
      }
    }
    errors[field] = null
    return true
  }

  function validateField(field) {
    touched[field] = true
    return runField(field)
  }

  function validate() {
    let ok = true
    for (const field of Object.keys(schema)) {
      touched[field] = true
      if (!runField(field)) ok = false
    }
    return ok
  }

  const isValid = computed(() =>
    Object.keys(schema).every((f) =>
      (schema[f] || []).every((rule) => rule(form[f], form) === true)
    )
  )

  function resetForm(next = initial) {
    Object.keys(form).forEach((k) => { delete form[k] })
    Object.assign(form, next)
    Object.keys(errors).forEach((k) => { errors[k] = null })
    Object.keys(touched).forEach((k) => { touched[k] = false })
  }

  function setForm(next = {}) {
    Object.assign(form, next)
  }

  /** Devuelve un handler para `@submit`: valida y llama a onValid(form) sólo si pasa. */
  function handleSubmit(onValid, onInvalid) {
    return (...args) => {
      if (validate()) return onValid(form, ...args)
      if (onInvalid) onInvalid(errors)
      return undefined
    }
  }

  if (validateOnChange) {
    watch(
      form,
      () => {
        for (const field of Object.keys(schema)) {
          if (touched[field]) runField(field)
        }
      },
      { deep: true }
    )
  }

  return { form, errors, touched, isValid, validateField, validate, resetForm, setForm, handleSubmit }
}

export default useFormValidation

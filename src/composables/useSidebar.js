import { ref } from 'vue'

const mobileOpen = ref(false)

export function useSidebar() {
  function toggle() {
    mobileOpen.value = !mobileOpen.value
  }
  return { mobileOpen, toggle }
}

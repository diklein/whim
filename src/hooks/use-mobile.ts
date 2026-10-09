import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const query = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

function subscribe(cb: () => void) {
  const mql = query()
  mql.addEventListener("change", cb)
  return () => mql.removeEventListener("change", cb)
}

/** True under 768px. Reads the media query directly, so there is no state to sync in an effect. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => query().matches, () => false)
}

import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom'

/** Keep `?nav=` in sync with the active workspace page so every view is URL-addressable. */
export function syncWorkspaceNavParam(
  setSearchParams: SetURLSearchParams,
  navId: string,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    if (current.get('nav') === navId) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', navId)
    return next
  }, options)
}

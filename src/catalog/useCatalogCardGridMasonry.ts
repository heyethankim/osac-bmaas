import { useLayoutEffect, type RefObject } from 'react'

/** Must match `grid-auto-rows` on `.catalog-card-grid--masonry-polyfill`. */
export const CATALOG_CARD_GRID_MASONRY_ROW_PX = 4

function supportsNativeCssMasonry(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('grid-template-rows', 'masonry')
}

/**
 * Packs variable-height cards into a CSS Grid so later items fill the shortest
 * column (no row gaps). Uses native `grid-template-rows: masonry` when available;
 * otherwise applies a row-span polyfill for Chromium/WebKit.
 */
export function useCatalogCardGridMasonry(
  gridRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** Change when the child set changes (filter, search, create). */
  layoutKey: string | number,
) {
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!enabled || !grid) {
      return
    }

    if (supportsNativeCssMasonry()) {
      grid.classList.remove('catalog-card-grid--masonry-polyfill')
      return
    }

    grid.classList.add('catalog-card-grid--masonry-polyfill')

    let frame = 0

    const pack = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const styles = getComputedStyle(grid)
        const gap = Number.parseFloat(styles.rowGap || styles.gap) || 0
        const items = Array.from(grid.children) as HTMLElement[]
        const rowUnit = CATALOG_CARD_GRID_MASONRY_ROW_PX

        // Expand each item so height reflects content, then assign row spans.
        for (const item of items) {
          item.style.gridRowEnd = 'span 512'
        }

        for (const item of items) {
          const height = item.getBoundingClientRect().height
          const span = Math.max(1, Math.ceil((height + gap) / (rowUnit + gap)))
          item.style.gridRowEnd = `span ${span}`
        }
      })
    }

    pack()

    const resizeObserver = new ResizeObserver(pack)
    resizeObserver.observe(grid)

    const observeChildren = () => {
      for (const child of Array.from(grid.children)) {
        resizeObserver.observe(child)
      }
    }
    observeChildren()

    const mutationObserver = new MutationObserver(() => {
      observeChildren()
      pack()
    })
    mutationObserver.observe(grid, { childList: true })

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      grid.classList.remove('catalog-card-grid--masonry-polyfill')
      for (const item of Array.from(grid.children) as HTMLElement[]) {
        item.style.gridRowEnd = ''
      }
    }
  }, [enabled, gridRef, layoutKey])
}

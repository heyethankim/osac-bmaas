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
 *
 * When `rowPx` is 1 and the grid uses `row-gap: 0`, vertical gutters are created
 * as empty 1px tracks so they match `column-gap` exactly.
 */
export function useCatalogCardGridMasonry(
  gridRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** Change when the child set changes (filter, search, create). */
  layoutKey: string | number,
  /** Polyfill row track height in px. Use 1 with `row-gap: 0` for equal gutters. */
  rowPx: number = CATALOG_CARD_GRID_MASONRY_ROW_PX,
) {
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!enabled || !grid) {
      return
    }

    if (supportsNativeCssMasonry()) {
      grid.classList.remove('catalog-card-grid--masonry-polyfill')
      for (const item of Array.from(grid.children) as HTMLElement[]) {
        item.style.gridRowEnd = ''
      }
      return
    }

    grid.classList.add('catalog-card-grid--masonry-polyfill')

    let frame = 0

    const pack = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const styles = getComputedStyle(grid)
        const rowGap = Number.parseFloat(styles.rowGap) || 0
        const columnGap =
          Number.parseFloat(styles.columnGap) || Number.parseFloat(styles.gap) || 0
        const items = Array.from(grid.children) as HTMLElement[]
        const rowUnit = Math.max(1, rowPx)
        // Prefer column-gap when row-gap is 0 (equal-gutter polyfill mode).
        const gutter = rowGap > 0 ? rowGap : columnGap

        // Measure content height without a tall span (avoids stretch skew).
        for (const item of items) {
          item.style.gridRowEnd = 'span 1'
        }

        for (const item of items) {
          const height = item.getBoundingClientRect().height
          let span: number
          if (rowGap === 0 && rowUnit === 1) {
            // Empty 1px tracks below the card equal the horizontal gutter.
            span = Math.max(1, Math.ceil(height) + Math.round(gutter))
          } else {
            span = Math.max(1, Math.ceil((height + gutter) / (rowUnit + gutter)))
          }
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
  }, [enabled, gridRef, layoutKey, rowPx])
}

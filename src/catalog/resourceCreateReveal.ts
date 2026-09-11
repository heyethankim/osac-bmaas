import { useCallback, useEffect, useRef, useState } from 'react'

/** Intentional create latency before revealing a new resource card or row. */
export const RESOURCE_CREATE_REVEAL_MS = 1600

export function orderItemsForDisplay<T extends { id: string }>(
  items: readonly T[],
  displayOrderRef: { current: string[] | null },
  sortAddedItems: (added: T[]) => T[] = (added) => added,
): T[] {
  const byId = new Map(items.map((item) => [item.id, item] as const))
  const currentIds = new Set(byId.keys())

  if (!displayOrderRef.current) {
    displayOrderRef.current = sortAddedItems([...items]).map((item) => item.id)
  } else {
    const retained = displayOrderRef.current.filter((id) => currentIds.has(id))
    const retainedSet = new Set(retained)
    const added = sortAddedItems(items.filter((item) => !retainedSet.has(item.id))).map(
      (item) => item.id,
    )
    displayOrderRef.current = [...added, ...retained]
  }

  return displayOrderRef.current
    .map((id) => byId.get(id))
    .filter((item): item is T => Boolean(item))
}

export function sortItemsByCreatedAtDesc<T extends { id: string; createdAt: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export function useResourceCreateReveal(delayMs = RESOURCE_CREATE_REVEAL_MS) {
  const [creatingItemId, setCreatingItemId] = useState<string | null>(null)
  const [creatingCardHeightPx, setCreatingCardHeightPx] = useState<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const cardGridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const beginCreateReveal = useCallback(
    (itemId: string) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }

      setCreatingCardHeightPx(null)
      setCreatingItemId(itemId)
      timeoutRef.current = window.setTimeout(() => {
        setCreatingItemId((current) => (current === itemId ? null : current))
        setCreatingCardHeightPx(null)
        timeoutRef.current = null
      }, delayMs)
    },
    [delayMs],
  )

  const measureCreatingCardHeight = useCallback(
    (enabled: boolean, creatingCardClassName: string) => {
      if (!enabled || !creatingItemId) {
        setCreatingCardHeightPx(null)
        return
      }

      const grid = cardGridRef.current
      if (!grid) {
        return
      }

      const sampleCard = Array.from(
        grid.querySelectorAll<HTMLElement>('.catalog-card-grid > *'),
      ).find((card) => !card.classList.contains(creatingCardClassName))

      if (sampleCard) {
        setCreatingCardHeightPx(sampleCard.getBoundingClientRect().height)
      }
    },
    [creatingItemId],
  )

  return {
    creatingItemId,
    creatingCardHeightPx,
    cardGridRef,
    beginCreateReveal,
    measureCreatingCardHeight,
  }
}

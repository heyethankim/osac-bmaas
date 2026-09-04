export function replaceInventoryItemById<T extends { id: string }>(
  items: readonly T[],
  updated: T,
): T[] {
  let found = false
  const next = items.map((item) => {
    if (item.id === updated.id) {
      found = true
      return updated
    }
    return item
  })
  return found ? next : [...items]
}

export function removeInventoryItemById<T extends { id: string }>(
  items: readonly T[],
  id: string,
): T[] {
  return items.filter((item) => item.id !== id)
}

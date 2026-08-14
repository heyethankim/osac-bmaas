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

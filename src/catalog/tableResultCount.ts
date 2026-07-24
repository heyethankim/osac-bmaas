/** Shared list-view result count copy, e.g. "11 virtual machines". */

export function formatCatalogTableResultCount(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`
}

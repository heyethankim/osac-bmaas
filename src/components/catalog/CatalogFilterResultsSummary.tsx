import { Button, Content } from '@patternfly/react-core'
import { buildFilterDescription, formatFilteredResultCount } from '../../catalog/catalogFilterSummary'

type CatalogFilterResultsSummaryProps = {
  filteredCount: number
  totalCount: number
  singular: string
  plural?: string
  filterParts: string[]
  onClearFilters?: () => void
  className?: string
  /** Always show "X of Y" even when the filtered count matches the total. */
  forceOfFormat?: boolean
}

export function CatalogFilterResultsSummary({
  filteredCount,
  totalCount,
  singular,
  plural,
  filterParts,
  onClearFilters,
  className,
  forceOfFormat = false,
}: CatalogFilterResultsSummaryProps) {
  const hasActiveFilters = filterParts.length > 0
  const countLabel = formatFilteredResultCount(
    filteredCount,
    totalCount,
    singular,
    plural,
    forceOfFormat || hasActiveFilters,
  )
  const description = buildFilterDescription(filterParts)

  return (
    <Content
      component="p"
      className={['catalog-filter-results', className].filter(Boolean).join(' ')}
    >
      <span className="catalog-filter-results__count-value">{countLabel}</span>
      {description ? (
        <>
          <span className="catalog-filter-results__separator" aria-hidden>
            {' '}
            ·{' '}
          </span>
          <span className="catalog-filter-results__description">{description}</span>
        </>
      ) : null}
      {hasActiveFilters && onClearFilters ? (
        <>
          {' '}
          <Button
            variant="link"
            isInline
            className="catalog-filter-results__clear"
            onClick={onClearFilters}
          >
            Clear all filters
          </Button>
        </>
      ) : null}
    </Content>
  )
}

import { Button, EmptyState, EmptyStateBody, Title } from '@patternfly/react-core'

type CatalogFilterEmptyStateProps = {
  title: string
  description: string
  onClearFilters?: () => void
  className?: string
}

export function CatalogFilterEmptyState({
  title,
  description,
  onClearFilters,
  className,
}: CatalogFilterEmptyStateProps) {
  return (
    <EmptyState className={['catalog-filter-empty', className].filter(Boolean).join(' ')}>
      <Title headingLevel="h2" size="lg">
        {title}
      </Title>
      <EmptyStateBody className="catalog-filter-empty__body">
        {description}
        {onClearFilters ? (
          <>
            {' '}
            <Button variant="link" isInline onClick={onClearFilters}>
              Clear all filters
            </Button>
          </>
        ) : null}
      </EmptyStateBody>
    </EmptyState>
  )
}

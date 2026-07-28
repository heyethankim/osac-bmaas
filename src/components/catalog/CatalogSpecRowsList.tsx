import type { CatalogSpecRow } from '../../catalog/catalogSpecs'

type CatalogSpecRowsListProps = {
  rows: CatalogSpecRow[]
  className?: string
  rowClassName?: string
  labelClassName?: string
  valueClassName?: string
}

export function CatalogSpecRowsList({
  rows,
  className,
  rowClassName = 'provider-admin-catalog-items__spec-row',
  labelClassName = 'provider-admin-catalog-items__spec-label',
  valueClassName = 'provider-admin-catalog-items__spec-value',
}: CatalogSpecRowsListProps) {
  return (
    <dl className={className}>
      {rows.map((row) => (
        <div key={row.label} className={rowClassName}>
          <dt className={labelClassName}>{row.label}</dt>
          <dd className={valueClassName}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

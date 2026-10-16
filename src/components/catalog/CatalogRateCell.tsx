import { Content } from '@patternfly/react-core'
import {
  formatCatalogPriceRangeLine,
  resolveCatalogItemPriceRange,
  type CatalogItemPriceRangeInput,
} from '../../billing/catalogPriceRange'
import type { RateCard } from '../../providerSetup/templateDemo'

type CatalogRateCellProps = {
  rateCard: RateCard
  /** When provided, shows a lowest–highest range if launch config can change price. */
  item?: CatalogItemPriceRangeInput
  className?: string
}

/** List-view rate cell: point rate or "$A–$B/hr · $C–$D/mo" with "per instance". */
export function CatalogRateCell({ rateCard, item, className }: CatalogRateCellProps) {
  const range = item ? resolveCatalogItemPriceRange(item) : null
  const line =
    range?.isRange
      ? formatCatalogPriceRangeLine(range)
      : `$${rateCard.hourlyRate.toFixed(2)}/hr · $${rateCard.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo`

  return (
    <Content
      component="p"
      className={['catalog-rate-cell', className].filter(Boolean).join(' ')}
    >
      <span className="catalog-rate-cell__line">{line}</span>
      <span className="catalog-rate-cell__unit">per instance</span>
    </Content>
  )
}

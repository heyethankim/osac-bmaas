import { Content } from '@patternfly/react-core'
import type { RateCard } from '../../providerSetup/templateDemo'

type CatalogRateCellProps = {
  rateCard: RateCard
  className?: string
}

/** List-view rate cell: "$X.XX/hr · $Y/mo" with "per instance" on a second line. */
export function CatalogRateCell({ rateCard, className }: CatalogRateCellProps) {
  const hourly = rateCard.hourlyRate.toFixed(2)
  const monthly = rateCard.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <Content
      component="p"
      className={['catalog-rate-cell', className].filter(Boolean).join(' ')}
    >
      <span className="catalog-rate-cell__line">
        ${hourly}/hr · ${monthly}/mo
      </span>
      <span className="catalog-rate-cell__unit">per instance</span>
    </Content>
  )
}

import type { RateCard } from '../../providerSetup/templateDemo'
import {
  formatCatalogItemRateSummary,
  resolveCatalogItemPriceRange,
  type CatalogItemPriceRangeInput,
} from '../../billing/catalogPriceRange'
import {
  canPublishCatalogItemToTenants,
  getCatalogItemM360Pricing,
  type CatalogItemPricingInput,
} from '../../billing/m360'
import { M360RateStatusLabel } from './M360RateStatusLabel'

type CatalogItemRateDisplayProps = {
  item: CatalogItemPricingInput & CatalogItemPriceRangeInput & { rateCard: RateCard }
}

export function CatalogItemRateDisplay({ item }: CatalogItemRateDisplayProps) {
  const pricing = getCatalogItemM360Pricing(item)
  const range = resolveCatalogItemPriceRange(item)

  if (canPublishCatalogItemToTenants(item)) {
    if (range?.isRange) {
      return <>{formatCatalogItemRateSummary(item)}</>
    }

    if (pricing.summary) {
      return <>{pricing.summary}</>
    }

    return <>{formatCatalogItemRateSummary(item)}</>
  }

  return (
    <M360RateStatusLabel
      item={item}
      pricing={pricing}
      hideWhenConfigured={false}
      showM360AccountLink
    />
  )
}

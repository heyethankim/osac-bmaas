import { formatRateCardSummary } from '../../providerSetup/templateDemo'
import type { RateCard } from '../../providerSetup/templateDemo'
import {
  canPublishCatalogItemToTenants,
  getCatalogItemM360Pricing,
  type CatalogItemPricingInput,
} from '../../billing/m360'
import { M360RateStatusLabel } from './M360RateStatusLabel'

type CatalogItemRateDisplayProps = {
  item: CatalogItemPricingInput & { rateCard: RateCard }
}

export function CatalogItemRateDisplay({ item }: CatalogItemRateDisplayProps) {
  const pricing = getCatalogItemM360Pricing(item)

  if (canPublishCatalogItemToTenants(item)) {
    if (pricing.summary) {
      return <>{pricing.summary}</>
    }

    if (pricing.rateCard) {
      return <>{formatRateCardSummary(pricing.rateCard)}</>
    }

    return <>{formatRateCardSummary(item.rateCard)}</>
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

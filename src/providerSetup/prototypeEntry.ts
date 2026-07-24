import type { ProviderAdminNavId } from '../providerAdmin/constants'
import { DEFAULT_PROVIDER_SERVICE_SELECTION } from './constants'
import {
  getProviderCatalogDraft,
  getProviderCatalogItems,
  addProviderCatalogItem,
  setProviderActiveNav,
  setProviderSelectedServices,
  setProviderSetupComplete,
  type ProviderCatalogDraft,
} from './storage'
import { DEFAULT_BLUEPRINT_FORM, DEFAULT_CATALOG_ITEM_DISPLAY_NAME, DEFAULT_RATE_CARD, generateCatalogItemId } from './templateDemo'
import { DEFAULT_CATALOG_NETWORK_POLICY } from '../providerAdmin/catalogNetworkPolicy'

function createDefaultCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: generateCatalogItemId(),
    templateRefId: 'bm_dell_r750',
    templateName: DEFAULT_BLUEPRINT_FORM.templateName,
    displayName: DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
    description: DEFAULT_BLUEPRINT_FORM.description,
    scope: 'global-public',
    rateCard: DEFAULT_RATE_CARD,
    serviceId: 'baremetal',
    networkPolicy: DEFAULT_CATALOG_NETWORK_POLICY,
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

/** Seeds post-setup Provider Admin state so landing-page prototype links can open finished screens. */
export function ensureProviderPostSetupPrototype(
  navId: ProviderAdminNavId = 'catalog',
): ProviderCatalogDraft {
  setProviderSelectedServices(DEFAULT_PROVIDER_SERVICE_SELECTION)
  setProviderSetupComplete()

  let items = getProviderCatalogItems()
  if (items.length === 0) {
    const draft = createDefaultCatalogDraft()
    addProviderCatalogItem(draft)
    items = getProviderCatalogItems()
  }

  setProviderActiveNav(navId)
  return items[0] ?? getProviderCatalogDraft()!
}

export function isProviderAdminNavId(value: string | null): value is ProviderAdminNavId {
  return (
    value === 'overview' ||
    value === 'catalog' ||
    value === 'infrastructure-data-centers' ||
    value === 'infrastructure-hardware-inventory' ||
    value === 'infrastructure-compute-images' ||
    value === 'infrastructure-bmaas-templates' ||
    value === 'infrastructure-external-ip-pools' ||
    value === 'networking-virtual-networks' ||
    value === 'networking-subnets' ||
    value === 'networking-security-groups' ||
    value === 'administration-organizations' ||
    value === 'administration-quotas' ||
    value === 'administration-rbac' ||
    value === 'billing-metering' ||
    value === 'system'
  )
}

import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import {
  CATALOG_SERVICE_LABELS,
  resolveRateCard,
  type CatalogServiceId,
  type RateCard,
} from '../providerSetup/templateDemo'
import { resolveTenantCatalogView } from '../tenantAdmin/catalog'

export type TenantUserCatalogCard = {
  serviceId: CatalogServiceId
  service: string
  status: string
  displayName: string
  categoryLabel: string
  hardwareProfile: string
  cpu: string
  ram: string
  gpu: string
  osImage: string
  footerNote: string
  catalogItemId: string
  templateRefId: string
  templateName: string
  rateCard: RateCard
}

export const TENANT_USER_CATALOG_SPECS = {
  categoryLabel: 'Compute · Standard',
  hardwareProfile: 'Dell PowerEdge R750',
  cpu: 'Intel Xeon Gold 6338 × 2',
  ram: '512 GB DDR4',
  gpu: 'CPU-only',
  osImage: 'RHEL 9.4',
  footerNote: 'Hardware pre-configured · Admin-managed',
} as const

export const TENANT_USER_CATALOG_FALLBACK: TenantUserCatalogCard = {
  serviceId: 'baremetal',
  service: CATALOG_SERVICE_LABELS.baremetal,
  status: 'Live',
  displayName: 'Bare Metal - GPU Training Server',
  ...TENANT_USER_CATALOG_SPECS,
  catalogItemId: 'cat_L3RID02N',
  templateRefId: 'bm_2R6X47GO',
  templateName: 'compute-standard-r750',
  rateCard: {
    hourlyRate: 4.25,
    monthlyRate: 2850,
    currency: 'USD',
    billingUnit: 'per-instance',
  },
}

export function getTenantUserCatalogCardFromDraft(
  catalog: ProviderCatalogDraft,
): TenantUserCatalogCard {
  const rateCard = resolveRateCard(catalog)
  const serviceId = catalog.serviceId ?? 'baremetal'

  return {
    serviceId,
    service: CATALOG_SERVICE_LABELS[serviceId],
    status: 'Live',
    displayName: catalog.displayName,
    ...TENANT_USER_CATALOG_SPECS,
    catalogItemId: catalog.catalogItemId,
    templateRefId: catalog.templateRefId,
    templateName: catalog.templateName,
    rateCard,
  }
}

export function getTenantUserCatalogCard(
  organization: RegisteredOrganization | null,
  catalogDraft: ProviderCatalogDraft | null,
): TenantUserCatalogCard {
  if (!organization) {
    return catalogDraft
      ? getTenantUserCatalogCardFromDraft(catalogDraft)
      : TENANT_USER_CATALOG_FALLBACK
  }

  const catalogView = resolveTenantCatalogView(organization, catalogDraft)
  if (!catalogView) {
    return catalogDraft
      ? getTenantUserCatalogCardFromDraft(catalogDraft)
      : TENANT_USER_CATALOG_FALLBACK
  }

  const rateCard = resolveRateCard(catalogView)
  const serviceId = catalogDraft?.serviceId ?? 'baremetal'

  return {
    serviceId,
    service: CATALOG_SERVICE_LABELS[serviceId],
    status: 'Live',
    displayName: catalogView.displayName,
    ...TENANT_USER_CATALOG_SPECS,
    catalogItemId: catalogView.catalogItemId,
    templateRefId: catalogView.templateRefId,
    templateName: catalogView.templateName,
    rateCard,
  }
}

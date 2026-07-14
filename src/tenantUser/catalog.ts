import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import {
  resolveRateCard,
  type RateCard,
} from '../providerSetup/templateDemo'
import { resolveTenantCatalogView } from '../tenantAdmin/catalog'

export type TenantUserCatalogCard = {
  service: string
  status: string
  displayName: string
  categoryLabel: string
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
  categoryLabel: 'GPU Accelerated',
  cpu: 'AMD EPYC 7763 × 2',
  ram: '1 TB DDR4',
  gpu: 'NVIDIA A100 80 GB × 4',
  osImage: 'RHEL 9.4',
  footerNote: 'Hardware pre-configured · Admin-managed',
} as const

export const TENANT_USER_CATALOG_FALLBACK: TenantUserCatalogCard = {
  service: 'BMaaS',
  status: 'Live',
  displayName: 'Compute Node · Dell PowerEdge R750 3x · 512 GB DDR4-3200',
  ...TENANT_USER_CATALOG_SPECS,
  catalogItemId: 'cat_L3RID02N',
  templateRefId: 'bm_2R6X47GO',
  templateName: 'gpu-a100-training-standard',
  rateCard: {
    hourlyRate: 4.25,
    monthlyRate: 2850,
    currency: 'USD',
    billingUnit: 'per-instance',
  },
}

export function getTenantUserCatalogCard(
  organization: RegisteredOrganization | null,
  catalogDraft: ProviderCatalogDraft | null,
): TenantUserCatalogCard {
  if (!organization) {
    return TENANT_USER_CATALOG_FALLBACK
  }

  const catalogView = resolveTenantCatalogView(organization, catalogDraft)
  if (!catalogView) {
    return TENANT_USER_CATALOG_FALLBACK
  }

  const rateCard = resolveRateCard(catalogView)

  return {
    service: 'BMaaS',
    status: 'Live',
    displayName: catalogView.displayName,
    ...TENANT_USER_CATALOG_SPECS,
    catalogItemId: catalogView.catalogItemId,
    templateRefId: catalogView.templateRefId,
    templateName: catalogView.templateName,
    rateCard,
  }
}

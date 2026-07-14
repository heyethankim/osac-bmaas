import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import { getProviderSavedTemplate } from '../providerSetup/storage'
import { DEFAULT_RATE_CARD, getCatalogDisplayName, type RateCard, type PublishCatalogScope } from '../providerSetup/templateDemo'

export const DEFAULT_TENANT_CATALOG_DISPLAY_NAME = getCatalogDisplayName('dell-r750')

export type TenantCatalogView = {
  catalogItemId: string
  displayName: string
  templateRefId: string
  templateName: string
  rateCard: RateCard
  scope: PublishCatalogScope
  createdAt: string | null
}

function isCatalogLinkedToOrganization(
  organization: RegisteredOrganization,
  catalog: ProviderCatalogDraft,
): boolean {
  if (!organization.catalogItemId && !organization.catalogDisplayName) {
    return true
  }

  return (
    organization.catalogItemId === catalog.catalogItemId ||
    organization.catalogDisplayName === catalog.displayName
  )
}

export function resolveTenantCatalogView(
  organization: RegisteredOrganization,
  catalogDraft: ProviderCatalogDraft | null,
): TenantCatalogView | null {
  if (catalogDraft && isCatalogLinkedToOrganization(organization, catalogDraft)) {
    return {
      catalogItemId: catalogDraft.catalogItemId,
      displayName: catalogDraft.displayName,
      templateRefId: catalogDraft.templateRefId,
      templateName: catalogDraft.templateName,
      rateCard: catalogDraft.rateCard,
      scope: catalogDraft.scope,
      createdAt: catalogDraft.createdAt,
    }
  }

  if (organization.catalogItemId || organization.catalogDisplayName) {
    const savedTemplate = getProviderSavedTemplate()

    return {
      catalogItemId: organization.catalogItemId ?? '—',
      displayName: DEFAULT_TENANT_CATALOG_DISPLAY_NAME,
      templateRefId: savedTemplate?.templateRefId ?? '—',
      templateName: savedTemplate?.templateName ?? '—',
      rateCard: savedTemplate?.rateCard ?? DEFAULT_RATE_CARD,
      scope: 'global-public',
      createdAt: null,
    }
  }

  return null
}

export function getTenantCatalogAccessLabel(
  organization: RegisteredOrganization,
  catalogDraft: ProviderCatalogDraft | null,
): string {
  return (
    resolveTenantCatalogView(organization, catalogDraft)?.displayName ??
    catalogDraft?.displayName ??
    DEFAULT_TENANT_CATALOG_DISPLAY_NAME
  )
}

export function formatTenantCatalogCreatedAt(iso: string | null): string {
  if (!iso) {
    return '—'
  }

  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

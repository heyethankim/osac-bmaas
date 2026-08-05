import type { CatalogSpecRow } from '../catalog/catalogSpecs'
import { resolveCatalogOsImage, resolveCatalogSpecRows } from '../catalog/catalogSpecs'
import type { CatalogFieldPolicy } from '../catalog/catalogPublishConfig'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import {
  getCatalogItemStatus,
  getProviderCatalogItems,
} from '../providerSetup/storage'
import {
  BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
  ensureProviderCatalogDemoItems,
  sortByDemoCatalogOrder,
} from '../providerSetup/prototypeEntry'
import {
  CATALOG_SERVICE_LABELS,
  resolveRateCard,
  type CatalogServiceId,
  type RateCard,
} from '../providerSetup/templateDemo'

export type TenantUserCatalogCard = {
  serviceId: CatalogServiceId
  service: string
  status: string
  displayName: string
  description?: string
  categoryLabel: string
  hardwareProfile: string
  /** Service-aware configuration rows for cards and drawers. */
  specRows: CatalogSpecRow[]
  cpu: string
  ram: string
  gpu: string
  osImage: string
  footerNote: string
  catalogItemId: string
  templateRefId: string
  templateName: string
  instanceTypeLabel?: string
  diskImageId?: string
  diskImageLabel?: string
  fieldPolicies?: CatalogFieldPolicy[]
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

const CLUSTER_FOOTER_NOTE = 'Cluster profile pre-configured · Admin-managed'
const VM_FOOTER_NOTE = 'Instance profile pre-configured · Admin-managed'

function getFooterNote(serviceId: CatalogServiceId): string {
  if (serviceId === 'cluster') {
    return CLUSTER_FOOTER_NOTE
  }
  if (serviceId === 'virtual-machine') {
    return VM_FOOTER_NOTE
  }
  return TENANT_USER_CATALOG_SPECS.footerNote
}

function getHardwareProfileLabel(
  serviceId: CatalogServiceId,
  specRows: CatalogSpecRow[],
): string {
  if (serviceId === 'cluster') {
    return (
      specRows.find((row) => row.label === 'Cluster version' || row.label === 'Platform')?.value ??
      'OpenShift cluster'
    )
  }
  if (serviceId === 'virtual-machine') {
    return specRows.find((row) => row.label === 'Instance type')?.value ?? 'Standard VM'
  }

  return TENANT_USER_CATALOG_SPECS.hardwareProfile
}

export const TENANT_USER_CATALOG_FALLBACK: TenantUserCatalogCard = {
  serviceId: 'baremetal',
  service: CATALOG_SERVICE_LABELS.baremetal,
  status: 'Live',
  displayName: 'bare-metal-gpu-training-server',
  categoryLabel: TENANT_USER_CATALOG_SPECS.categoryLabel,
  hardwareProfile: TENANT_USER_CATALOG_SPECS.hardwareProfile,
  specRows: [
    { label: 'CPU', value: TENANT_USER_CATALOG_SPECS.cpu },
    { label: 'RAM', value: TENANT_USER_CATALOG_SPECS.ram },
    { label: 'GPU', value: TENANT_USER_CATALOG_SPECS.gpu },
    { label: 'OS image', value: TENANT_USER_CATALOG_SPECS.osImage },
  ],
  cpu: TENANT_USER_CATALOG_SPECS.cpu,
  ram: TENANT_USER_CATALOG_SPECS.ram,
  gpu: TENANT_USER_CATALOG_SPECS.gpu,
  osImage: TENANT_USER_CATALOG_SPECS.osImage,
  footerNote: TENANT_USER_CATALOG_SPECS.footerNote,
  catalogItemId: 'cat-bm-gpu-training',
  templateRefId: 'bm-dell-r750',
  templateName: 'gpu-a100-training-standard',
  rateCard: {
    hourlyRate: 4.25,
    monthlyRate: 2850,
    currency: 'USD',
    billingUnit: 'per-instance',
  },
}

function isCatalogVisibleToTenantUser(
  item: ProviderCatalogDraft,
  organization: RegisteredOrganization | null,
): boolean {
  if (getCatalogItemStatus(item) === 'unpublished') {
    return false
  }

  if (item.scope === 'global-public') {
    return true
  }

  if (!organization) {
    return false
  }

  if (
    item.catalogItemId === BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID &&
    organization.slug === 'northstar'
  ) {
    return true
  }

  return (
    (item.enterpriseTenantIds?.length
      ? item.enterpriseTenantIds
      : item.enterpriseTenantId
        ? [item.enterpriseTenantId]
        : []
    ).some(
      (tenantId) =>
        tenantId === organization.tenantId || tenantId === organization.id,
    ) || organization.catalogItemId === item.catalogItemId
  )
}

export function getTenantUserCatalogCardFromDraft(
  catalog: ProviderCatalogDraft,
): TenantUserCatalogCard {
  const rateCard = resolveRateCard(catalog)
  const serviceId = catalog.serviceId ?? 'baremetal'
  const specRows = resolveCatalogSpecRows(catalog)

  return {
    serviceId,
    service: CATALOG_SERVICE_LABELS[serviceId],
    status: 'Live',
    displayName: catalog.displayName,
    description: catalog.description,
    categoryLabel: specRows.map((row) => row.value).join(' · '),
    hardwareProfile: getHardwareProfileLabel(serviceId, specRows),
    specRows,
    cpu: specRows[0]?.value ?? '—',
    ram: specRows[1]?.value ?? '—',
    gpu: specRows[2]?.value ?? '—',
    osImage: resolveCatalogOsImage(catalog),
    footerNote: getFooterNote(serviceId),
    catalogItemId: catalog.catalogItemId,
    templateRefId: catalog.templateRefId,
    templateName: catalog.templateName,
    instanceTypeLabel: catalog.instanceTypeLabel,
    diskImageId: catalog.diskImageId,
    diskImageLabel: catalog.diskImageLabel,
    fieldPolicies: catalog.fieldPolicies,
    rateCard,
  }
}

/** All live offerings visible to the tenant user (Bare Metal + Cluster, etc.). */
export function getTenantUserCatalogCards(
  organization: RegisteredOrganization | null,
  catalogDraft: ProviderCatalogDraft | null,
  options?: { preferCatalogDraft?: boolean },
): TenantUserCatalogCard[] {
  ensureProviderCatalogDemoItems()

  const providerItems = getProviderCatalogItems().filter((item) =>
    isCatalogVisibleToTenantUser(item, organization),
  )

  if (providerItems.length > 0) {
    const cards = sortByDemoCatalogOrder(providerItems).map((item) =>
      getTenantUserCatalogCardFromDraft(item),
    )

    if (options?.preferCatalogDraft && catalogDraft) {
      const preferredId = catalogDraft.catalogItemId
      if (!cards.some((card) => card.catalogItemId === preferredId)) {
        return [getTenantUserCatalogCardFromDraft(catalogDraft), ...cards]
      }
    }

    return cards
  }

  if (catalogDraft) {
    return [getTenantUserCatalogCardFromDraft(catalogDraft)]
  }

  return [TENANT_USER_CATALOG_FALLBACK]
}

/** @deprecated Prefer getTenantUserCatalogCards for multi-item catalogs. */
export function getTenantUserCatalogCard(
  organization: RegisteredOrganization | null,
  catalogDraft: ProviderCatalogDraft | null,
): TenantUserCatalogCard {
  const cards = getTenantUserCatalogCards(organization, catalogDraft)
  return (
    cards.find((card) => card.serviceId === 'baremetal') ??
    cards[0] ??
    TENANT_USER_CATALOG_FALLBACK
  )
}

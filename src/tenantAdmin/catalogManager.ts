import type { CatalogFieldPolicy } from '../catalog/catalogPublishConfig'
import type { CatalogServiceId, PublishCatalogScope } from '../providerSetup/templateDemo'
import { CATALOG_SERVICE_LABELS } from '../providerSetup/templateDemo'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import {
  getCatalogItemNetworkPolicy,
  getCatalogItemStatus,
  getProviderCatalogItems,
} from '../providerSetup/storage'
import type { CatalogNetworkPolicy } from '../providerAdmin/catalogNetworkPolicy'
import { DEFAULT_CATALOG_NETWORK_POLICY } from '../providerAdmin/catalogNetworkPolicy'
import {
  type CatalogSpecRow,
  resolveCatalogOsImage,
  resolveCatalogSpecRows,
} from '../catalog/catalogSpecs'
import {
  BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
  ensureProviderCatalogDemoItems,
  sortByDemoCatalogOrder,
} from '../providerSetup/prototypeEntry'
import {
  applyTenantNetworkOverrides,
  getTenantNetworkOverrides,
} from './networking'

export type TenantCatalogGovernanceItem = {
  id: string
  serviceId: CatalogServiceId
  service: string
  status: string
  displayName: string
  description?: string
  templateRefId: string
  templateName: string
  instanceTypeLabel?: string
  diskImageLabel?: string
  fieldPolicies?: CatalogFieldPolicy[]
  /** Card/table configuration rows (service-aware). */
  specRows: CatalogSpecRow[]
  /** Legacy hardware fields kept for search/summary helpers. */
  categoryLabel: string
  cpu: string
  ram: string
  gpu: string
  osImage: string
  restricted: boolean
  approved: boolean
  scope: PublishCatalogScope
}

export type TenantCatalogGovernanceItemWithNetworking = TenantCatalogGovernanceItem & {
  catalogItemId?: string
  networkPolicy: CatalogNetworkPolicy
}

export const TENANT_CATALOG_MANAGER_DEMO = {
  title: 'Catalog',
  lede: "Filter the provider's global catalog down to safe, approved offerings.",
  accessLabel: 'Access',
  accessDetailNote:
    'Available to all organization members by default. Assign projects or teams if you want to restrict who can launch this item.',
  accessDefaultLabel: 'All members',
  accessViewDetailsLabel: 'Details',
  addProjectsLinkLabel: 'Set up projects & teams',
  manageProjectsLinkLabel: 'Manage projects & teams',
  drawerAccessLede:
    'Review provider-configured networking and access for this offering.',
  networkingLabel: 'Networking',
  networkingNotConfiguredSummary: 'Not configured',
  networkingViewDetailsLabel: 'Details',
  networkingNotConfiguredTableLabel: 'Not configured',
  networkingSectionLede:
    'Switch a field on to lock it for tenant users. Provider-locked fields cannot be changed.',
} as const

export function getTenantCatalogProjectsLinkLabel(projectCount: number): string {
  return projectCount > 0
    ? TENANT_CATALOG_MANAGER_DEMO.manageProjectsLinkLabel
    : TENANT_CATALOG_MANAGER_DEMO.addProjectsLinkLabel
}

function isCatalogVisibleToTenant(
  item: ProviderCatalogDraft,
  organization: RegisteredOrganization,
): boolean {
  if (getCatalogItemStatus(item) === 'unpublished') {
    return false
  }

  if (item.scope === 'global-public') {
    return true
  }

  // VIP Dense GPU Node is curated for North Summit Bank tenant admin/user.
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

function mapProviderCatalogToGovernanceItem(
  draft: ProviderCatalogDraft,
  organization: RegisteredOrganization,
): TenantCatalogGovernanceItemWithNetworking {
  const serviceId = draft.serviceId ?? 'baremetal'
  const specRows = resolveCatalogSpecRows(draft)
  const networkPolicy = applyTenantNetworkOverrides(
    getCatalogItemNetworkPolicy(draft),
    getTenantNetworkOverrides(organization.slug, draft.catalogItemId),
  )

  return {
    id: draft.catalogItemId,
    catalogItemId: draft.catalogItemId,
    serviceId,
    service: CATALOG_SERVICE_LABELS[serviceId],
    status: getCatalogItemStatus(draft) === 'unpublished' ? 'Unpublished' : 'Live',
    displayName: draft.displayName,
    description: draft.description,
    templateRefId: draft.templateRefId,
    templateName: draft.templateName,
    instanceTypeLabel: draft.instanceTypeLabel,
    diskImageLabel: draft.diskImageLabel,
    fieldPolicies: draft.fieldPolicies,
    specRows,
    categoryLabel: specRows.map((row) => row.value).join(' · '),
    cpu: specRows[0]?.value ?? '—',
    ram: specRows[1]?.value ?? '—',
    gpu: specRows[2]?.value ?? '—',
    osImage: resolveCatalogOsImage(draft),
    restricted: draft.scope === 'vip-enterprise',
    approved: true,
    scope: draft.scope,
    networkPolicy,
  }
}

/** Fallback demo row when provider catalog has not been seeded yet. */
export const TENANT_CATALOG_GOVERNANCE_ITEMS: TenantCatalogGovernanceItem[] = [
  {
    id: 'cat-bm-gpu-training',
    serviceId: 'baremetal',
    service: 'Bare Metal',
    status: 'Live',
    displayName: 'bare-metal-gpu-training-server',
    description: undefined,
    templateRefId: 'bm-dell-r750',
    templateName: 'gpu-a100-training-standard',
    specRows: [
      { label: 'CPU', value: 'Intel Xeon Gold 6338 × 2' },
      { label: 'RAM', value: '512 GB DDR4-3200' },
      { label: 'GPU', value: 'CPU-only' },
      { label: 'OS image', value: 'Red Hat Enterprise Linux 9.4' },
    ],
    categoryLabel: 'Compute · Standard',
    cpu: 'Intel Xeon Gold 6338 × 2',
    ram: '512 GB DDR4-3200',
    gpu: 'CPU-only',
    osImage: 'Red Hat Enterprise Linux 9.4',
    restricted: false,
    approved: true,
    scope: 'global-public',
  },
]

export function getTenantCatalogGovernanceItems(
  organization: RegisteredOrganization,
  _catalogDraft: ProviderCatalogDraft | null,
): TenantCatalogGovernanceItemWithNetworking[] {
  ensureProviderCatalogDemoItems()

  const visibleItems = getProviderCatalogItems().filter((item) =>
    isCatalogVisibleToTenant(item, organization),
  )

  if (visibleItems.length > 0) {
    return sortByDemoCatalogOrder(visibleItems).map((item) =>
      mapProviderCatalogToGovernanceItem(item, organization),
    )
  }

  return TENANT_CATALOG_GOVERNANCE_ITEMS.map((item) => ({
    ...item,
    catalogItemId: item.id,
    networkPolicy: applyTenantNetworkOverrides(
      DEFAULT_CATALOG_NETWORK_POLICY,
      getTenantNetworkOverrides(organization.slug, item.id),
    ),
  }))
}

export function getTenantCatalogGovernanceSpecSummary(item: TenantCatalogGovernanceItem): string {
  if (item.specRows.length > 0) {
    return item.specRows.map((row) => row.value).join(' · ')
  }

  return [item.cpu, item.ram, item.gpu, item.osImage].join(' · ')
}

export function getTenantCatalogItemDetailSpecRows(
  item: TenantCatalogGovernanceItem,
): CatalogSpecRow[] {
  return resolveCatalogSpecRows(
    {
      serviceId: item.serviceId,
      templateRefId: item.templateRefId,
      templateName: item.templateName,
      instanceTypeLabel: item.instanceTypeLabel,
      diskImageLabel: item.diskImageLabel,
    },
    { includeDetails: true },
  )
}

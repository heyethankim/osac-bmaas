import type { CatalogFieldPolicy } from '../catalog/catalogPublishConfig'
import { formatBaremetalInstanceTypeLabel } from '../catalog/catalogPublishConfig'
import type { CatalogServiceId, PublishCatalogScope, RateCard } from '../providerSetup/templateDemo'
import { CATALOG_SERVICE_LABELS, DEFAULT_RATE_CARD, resolveRateCard } from '../providerSetup/templateDemo'
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
  getCatalogSpecRowValue,
  resolveCatalogOsImage,
  resolveBaremetalCatalogCardSpecRows,
  resolveCatalogSpecRows,
} from '../catalog/catalogSpecs'
import {
  CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
  LEGACY_CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
} from '../catalog/catalogSpecs'
import {
  BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
  BARE_METAL_GPU_CATALOG_ITEM_ID,
  LEGACY_BARE_METAL_GPU_CATALOG_ITEM_ID,
  ensureProviderCatalogDemoItems,
  sortByDemoCatalogOrder,
} from '../providerSetup/prototypeEntry'
import type { TenantCatalogItem } from './catalogItems'
import {
  applyTenantNetworkOverrides,
  getTenantNetworkOverrides,
} from './networking'
import { ensureTenantDemoCatalogItems } from './storage'

export type TenantCatalogGovernanceItem = {
  id: string
  serviceId: CatalogServiceId
  service: string
  status: string
  displayName: string
  description?: string
  templateRefId: string
  templateName: string
  instanceTypeId?: string
  instanceTypeLabel?: string
  diskImageLabel?: string
  diskImageId?: string
  clusterVersionMode?: 'locked' | 'editable'
  hardwareOsMode?: 'locked' | 'editable'
  nodeSetId?: string
  nodeSetLabel?: string
  hostTypeId?: string
  hostTypeLabel?: string
  clusterNodeTopologyMode?: 'locked' | 'editable'
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
  rateCard: RateCard
  createdAt: string
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
    'Available to all tenant members by default. Assign projects if you want to restrict who can launch this item.',
  accessDefaultLabel: 'All members',
  accessViewDetailsLabel: 'Details',
  addProjectsLinkLabel: 'Set up projects',
  manageProjectsLinkLabel: 'Manage projects',
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

/** Inherited provider offerings shown on the tenant admin catalog demo (2 cards). */
const TENANT_ADMIN_DEMO_PROVIDER_CATALOG_ITEM_IDS = new Set([
  BARE_METAL_GPU_CATALOG_ITEM_ID,
  CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
  LEGACY_BARE_METAL_GPU_CATALOG_ITEM_ID,
  LEGACY_CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
])

function isTenantAdminDemoProviderCatalogItem(catalogItemId: string): boolean {
  return TENANT_ADMIN_DEMO_PROVIDER_CATALOG_ITEM_IDS.has(catalogItemId)
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
    (organization.slug === 'northsummit' || organization.slug === 'northstar')
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
  const specRows =
    serviceId === 'baremetal'
      ? resolveBaremetalCatalogCardSpecRows(draft)
      : resolveCatalogSpecRows(draft)
  const networkPolicy = applyTenantNetworkOverrides(
    getCatalogItemNetworkPolicy(draft),
    getTenantNetworkOverrides(organization.slug, draft.catalogItemId),
    organization.slug,
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
    instanceTypeId: draft.instanceTypeId,
    instanceTypeLabel: draft.instanceTypeLabel,
    diskImageLabel: draft.diskImageLabel,
    diskImageId: draft.diskImageId,
    clusterVersionMode: draft.clusterVersionMode,
    hardwareOsMode: draft.hardwareOsMode,
    nodeSetId: draft.nodeSetId,
    nodeSetLabel: draft.nodeSetLabel,
    hostTypeId: draft.hostTypeId,
    hostTypeLabel: draft.hostTypeLabel,
    clusterNodeTopologyMode: draft.clusterNodeTopologyMode,
    fieldPolicies: draft.fieldPolicies,
    specRows,
    categoryLabel: specRows.map((row) => row.value).join(' · '),
    cpu: getCatalogSpecRowValue(specRows, 'CPU'),
    ram: getCatalogSpecRowValue(specRows, 'RAM'),
    gpu: getCatalogSpecRowValue(specRows, 'GPU'),
    osImage: resolveCatalogOsImage(draft),
    restricted: draft.scope === 'vip-enterprise',
    approved: true,
    scope: draft.scope,
    rateCard: resolveRateCard(draft),
    createdAt: draft.createdAt,
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
    instanceTypeId: 'large',
    instanceTypeLabel: formatBaremetalInstanceTypeLabel('large'),
    specRows: [
      { label: 'CPU', value: '64 vCPU' },
      { label: 'RAM', value: '512 GB' },
      { label: 'GPU', value: 'NVIDIA A100 80 GB' },
      { label: 'OS image', value: 'RHEL 9.4' },
    ],
    categoryLabel: 'Compute · Standard',
    cpu: '64 vCPU',
    ram: '512 GB',
    gpu: 'NVIDIA A100 80 GB',
    osImage: 'RHEL 9.4',
    restricted: false,
    approved: true,
    scope: 'global-public',
    rateCard: DEFAULT_RATE_CARD,
    createdAt: new Date().toISOString(),
  },
]

function mapCustomTenantCatalogItemToGovernance(
  item: TenantCatalogItem,
  organization: RegisteredOrganization,
): TenantCatalogGovernanceItemWithNetworking {
  const status = item.status ?? 'Live'

  if (item.catalogConfig) {
    const draftLike: ProviderCatalogDraft = {
      catalogItemId: item.id,
      templateRefId: item.catalogConfig.templateRefId,
      templateName: item.catalogConfig.templateName,
      displayName: item.displayName,
      description: item.description,
      scope: 'vip-enterprise',
      createdAt: item.createdAt,
      rateCard: item.rateCard,
      serviceId: item.catalogConfig.serviceId,
      networkPolicy: item.catalogConfig.networkPolicy,
      instanceTypeId: item.catalogConfig.instanceTypeId,
      instanceTypeLabel: item.catalogConfig.instanceTypeLabel,
      diskImageId: item.catalogConfig.diskImageId,
      diskImageLabel: item.catalogConfig.diskImageLabel,
      clusterVersionMode: item.catalogConfig.clusterVersionMode,
      hardwareOsMode: item.catalogConfig.hardwareOsMode,
      nodeSetId: item.catalogConfig.nodeSetId,
      nodeSetLabel: item.catalogConfig.nodeSetLabel,
      hostTypeId: item.catalogConfig.hostTypeId,
      hostTypeLabel: item.catalogConfig.hostTypeLabel,
      clusterNodeTopologyMode: item.catalogConfig.clusterNodeTopologyMode,
      fieldPolicies: item.catalogConfig.fieldPolicies,
    }
    const base = mapProviderCatalogToGovernanceItem(draftLike, organization)
    return {
      ...base,
      id: item.id,
      catalogItemId: item.id,
      displayName: item.displayName,
      description: item.description,
      status,
      scope: 'vip-enterprise',
      restricted: true,
      approved: status === 'Live',
      rateCard: item.rateCard,
      createdAt: item.createdAt,
    }
  }

  const sourceDraft = item.sourceCatalogItemId
    ? getProviderCatalogItems().find((draft) => draft.catalogItemId === item.sourceCatalogItemId)
    : null

  if (sourceDraft) {
    const base = mapProviderCatalogToGovernanceItem(sourceDraft, organization)
    return {
      ...base,
      id: item.id,
      catalogItemId: sourceDraft.catalogItemId,
      displayName: item.displayName,
      description: item.description,
      status,
      scope: 'vip-enterprise',
      restricted: true,
      approved: status === 'Live',
      rateCard: item.rateCard,
      createdAt: item.createdAt,
      networkPolicy: applyTenantNetworkOverrides(
        getCatalogItemNetworkPolicy(sourceDraft),
        getTenantNetworkOverrides(organization.slug, item.id),
        organization.slug,
      ),
    }
  }

  const fallback = TENANT_CATALOG_GOVERNANCE_ITEMS[0]!
  return {
    ...fallback,
    id: item.id,
    catalogItemId: undefined,
    displayName: item.displayName,
    description: item.description,
    status,
    scope: 'vip-enterprise',
    restricted: true,
    approved: status === 'Live',
    rateCard: item.rateCard,
    createdAt: item.createdAt,
    networkPolicy: applyTenantNetworkOverrides(
      DEFAULT_CATALOG_NETWORK_POLICY,
      getTenantNetworkOverrides(organization.slug, item.id),
      organization.slug,
    ),
  }
}

export function getTenantCatalogGovernanceItems(
  organization: RegisteredOrganization,
  _catalogDraft: ProviderCatalogDraft | null,
): TenantCatalogGovernanceItemWithNetworking[] {
  ensureProviderCatalogDemoItems()

  const visibleItems = getProviderCatalogItems().filter(
    (item) =>
      isCatalogVisibleToTenant(item, organization) &&
      isTenantAdminDemoProviderCatalogItem(item.catalogItemId),
  )

  const providerItems =
    visibleItems.length > 0
      ? sortByDemoCatalogOrder(visibleItems).map((item) =>
          mapProviderCatalogToGovernanceItem(item, organization),
        )
      : TENANT_CATALOG_GOVERNANCE_ITEMS.map((item) => ({
          ...item,
          catalogItemId: item.id,
          networkPolicy: applyTenantNetworkOverrides(
            DEFAULT_CATALOG_NETWORK_POLICY,
            getTenantNetworkOverrides(organization.slug, item.id),
            organization.slug,
          ),
        }))

  const customItems = ensureTenantDemoCatalogItems(organization.slug).map((item) =>
    mapCustomTenantCatalogItemToGovernance(item, organization),
  )

  return [...providerItems, ...customItems]
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
      instanceTypeId: item.instanceTypeId,
      instanceTypeLabel: item.instanceTypeLabel,
      diskImageLabel: item.diskImageLabel,
      diskImageId: item.diskImageId,
      clusterVersionMode: item.clusterVersionMode,
      hardwareOsMode: item.hardwareOsMode,
      nodeSetId: item.nodeSetId,
      nodeSetLabel: item.nodeSetLabel,
      hostTypeId: item.hostTypeId,
      hostTypeLabel: item.hostTypeLabel,
      clusterNodeTopologyMode: item.clusterNodeTopologyMode,
    },
    { includeDetails: true },
  )
}

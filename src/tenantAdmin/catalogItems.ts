import type { PublishedTemplatePayload, RateCard } from '../providerSetup/templateDemo'
import {
  DEFAULT_BLUEPRINT_FORM,
  DEFAULT_RATE_CARD,
  PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAME,
  parseRateCardFromForm,
} from '../providerSetup/templateDemo'
import { formatBaremetalInstanceTypeLabel } from '../catalog/catalogPublishConfig'
import { DEFAULT_CATALOG_NETWORK_POLICY } from '../providerAdmin/catalogNetworkPolicy'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import { TENANT_CATALOG_GOVERNANCE_ITEMS } from './catalogManager'
import type { TenantProjectCatalogItem } from './projects'

export const DEMO_TENANT_CATALOG_GENERAL_PURPOSE_ID = 'tenant-catalog_general-purpose'

export type TenantCatalogItemSource = 'custom'

export type TenantCatalogItemStatus = 'Live' | 'Unpublished'

export type TenantCatalogItemConfig = Omit<
  PublishedTemplatePayload,
  | 'displayName'
  | 'description'
  | 'scope'
  | 'status'
  | 'rateCard'
  | 'enterpriseTenantId'
  | 'enterpriseTenantIds'
  | 'vipOrganizationId'
  | 'vipOrganizationIds'
>

export type TenantCatalogItem = {
  id: string
  displayName: string
  description?: string
  source: TenantCatalogItemSource
  sourceCatalogItemId: string | null
  rateCard: RateCard
  status: TenantCatalogItemStatus
  createdAt: string
  catalogConfig?: TenantCatalogItemConfig
}

export function isTenantScopedCatalogItemId(id: string): boolean {
  return id.startsWith('tenant-catalog_')
}

export type AttachableCatalogOption = {
  id: string
  displayName: string
  sourceLabel: string
  rateCard: RateCard
}

export function generateTenantCatalogItemId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `tenant-catalog_${suffix}`
}

export function createDemoTenantCatalogGeneralPurposeItem(): TenantCatalogItem {
  return {
    id: DEMO_TENANT_CATALOG_GENERAL_PURPOSE_ID,
    displayName: PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAME,
    source: 'custom',
    sourceCatalogItemId: null,
    rateCard: parseRateCardFromForm(DEFAULT_BLUEPRINT_FORM) ?? DEFAULT_RATE_CARD,
    status: 'Live',
    createdAt: '2026-08-01T12:00:00.000Z',
    catalogConfig: {
      serviceId: 'baremetal',
      templateRefId: 'bm-dell-r750',
      templateName: DEFAULT_BLUEPRINT_FORM.templateName,
      instanceTypeId: 'small',
      instanceTypeLabel:
        formatBaremetalInstanceTypeLabel('small') ??
        'Small (16 vCPU · 128 GB · NVIDIA A100 40 GB)',
      diskImageId: 'rhel-10',
      diskImageLabel: 'RHEL 10',
      hardwareOsMode: 'editable',
      osImageMode: 'editable',
      fieldPolicies: [],
      networkPolicy: {
        ...DEFAULT_CATALOG_NETWORK_POLICY,
        virtualNetwork: { ...DEFAULT_CATALOG_NETWORK_POLICY.virtualNetwork },
        subnet: { ...DEFAULT_CATALOG_NETWORK_POLICY.subnet },
        securityGroup: { ...DEFAULT_CATALOG_NETWORK_POLICY.securityGroup },
        externalIpPool: { ...DEFAULT_CATALOG_NETWORK_POLICY.externalIpPool },
      },
    },
  }
}

/** Map a tenant-scoped catalog item into the launch/card draft shape. */
export function toProviderCatalogDraftFromTenantCatalogItem(
  item: TenantCatalogItem,
): ProviderCatalogDraft | null {
  if (!item.catalogConfig) {
    return null
  }

  const config = item.catalogConfig
  return {
    catalogItemId: item.id,
    templateRefId: config.templateRefId,
    templateName: config.templateName,
    displayName: item.displayName,
    description: item.description,
    scope: 'vip-enterprise',
    createdAt: item.createdAt,
    rateCard: item.rateCard,
    serviceId: config.serviceId,
    networkPolicy: config.networkPolicy,
    instanceTypeId: config.instanceTypeId,
    instanceTypeLabel: config.instanceTypeLabel,
    diskImageId: config.diskImageId,
    diskImageLabel: config.diskImageLabel,
    clusterVersionMode: config.clusterVersionMode,
    hardwareOsMode: config.hardwareOsMode,
    osImageMode: config.osImageMode,
    nodeSetId: config.nodeSetId,
    nodeSetLabel: config.nodeSetLabel,
    hostTypeId: config.hostTypeId,
    hostTypeLabel: config.hostTypeLabel,
    clusterNodeTopologyMode: config.clusterNodeTopologyMode,
    fieldPolicies: config.fieldPolicies,
    status: item.status === 'Unpublished' ? 'unpublished' : 'live',
  }
}

function catalogFieldsFromPublishedPayload(payload: PublishedTemplatePayload): {
  displayName: string
  description: string | undefined
  rateCard: TenantCatalogItem['rateCard']
  status: TenantCatalogItemStatus
  catalogConfig: TenantCatalogItemConfig
} {
  const {
    displayName,
    description,
    scope: _scope,
    status,
    enterpriseTenantId: _enterpriseTenantId,
    enterpriseTenantIds: _enterpriseTenantIds,
    vipOrganizationId: _vipOrganizationId,
    vipOrganizationIds: _vipOrganizationIds,
    rateCard,
    ...catalogConfig
  } = payload

  return {
    displayName: displayName.trim(),
    description: description.trim() || undefined,
    rateCard,
    status: status === 'unpublished' ? 'Unpublished' : 'Live',
    catalogConfig,
  }
}

export function createTenantCatalogItemFromPayload(
  payload: PublishedTemplatePayload,
): TenantCatalogItem {
  const fields = catalogFieldsFromPublishedPayload(payload)

  return {
    id: generateTenantCatalogItemId(),
    ...fields,
    source: 'custom',
    sourceCatalogItemId: null,
    createdAt: new Date().toISOString(),
  }
}

/** Apply publish-wizard save payload onto an existing tenant-scoped catalog item. */
export function applyPublishedPayloadToTenantCatalogItem(
  item: TenantCatalogItem,
  payload: PublishedTemplatePayload,
): TenantCatalogItem {
  return {
    ...item,
    ...catalogFieldsFromPublishedPayload(payload),
  }
}

export function createTenantCatalogItem(input: {
  displayName: string
  description?: string
  sourceCatalogItemId: string | null
  rateCard?: RateCard
  status?: TenantCatalogItemStatus
  catalogConfig?: TenantCatalogItemConfig
}): TenantCatalogItem {
  return {
    id: generateTenantCatalogItemId(),
    displayName: input.displayName.trim(),
    description: input.description?.trim() || undefined,
    source: 'custom',
    sourceCatalogItemId: input.sourceCatalogItemId,
    rateCard: input.rateCard ?? DEFAULT_RATE_CARD,
    status: input.status ?? 'Live',
    createdAt: new Date().toISOString(),
    catalogConfig: input.catalogConfig,
  }
}

export function getAttachableCatalogOptions(
  inheritedCatalog: {
    catalogItemId: string
    displayName: string
    rateCard: RateCard
  } | null,
  customItems: TenantCatalogItem[],
): AttachableCatalogOption[] {
  const options: AttachableCatalogOption[] = []

  if (inheritedCatalog) {
    options.push({
      id: inheritedCatalog.catalogItemId,
      displayName: inheritedCatalog.displayName,
      sourceLabel: 'Inherited from provider',
      rateCard: inheritedCatalog.rateCard,
    })
  }

  for (const item of customItems) {
    options.push({
      id: item.id,
      displayName: item.displayName,
      sourceLabel: 'Added by you',
      rateCard: item.rateCard,
    })
  }

  return options
}

export function getProjectCatalogOptions(
  inheritedCatalog: {
    catalogItemId: string
    displayName: string
    rateCard: RateCard
  } | null,
  customItems: TenantCatalogItem[],
): AttachableCatalogOption[] {
  const options: AttachableCatalogOption[] = TENANT_CATALOG_GOVERNANCE_ITEMS.filter(
    (item) => item.approved,
  ).map((item) => ({
    id: item.id,
    displayName: item.displayName,
    sourceLabel: item.categoryLabel,
    rateCard: DEFAULT_RATE_CARD,
  }))

  const seenIds = new Set(options.map((option) => option.id))

  for (const option of getAttachableCatalogOptions(inheritedCatalog, customItems)) {
    if (!seenIds.has(option.id)) {
      options.push(option)
      seenIds.add(option.id)
    }
  }

  return options
}

export function getWizardCatalogOptions(): AttachableCatalogOption[] {
  return TENANT_CATALOG_GOVERNANCE_ITEMS.filter((item) => item.approved).map((item) => ({
    id: item.id,
    displayName: item.displayName,
    sourceLabel: item.categoryLabel,
    rateCard: DEFAULT_RATE_CARD,
  }))
}

export function getTenantCatalogItemLabel(catalogItems: TenantProjectCatalogItem[]): string {
  if (catalogItems.length === 0) {
    return 'Not attached'
  }

  return catalogItems.map((item) => item.displayName).join(', ')
}

export function getProjectsWithAttachedCatalog<T extends { catalogItems: TenantProjectCatalogItem[] }>(
  projects: T[],
): T[] {
  return projects.filter((project) => project.catalogItems.length > 0)
}

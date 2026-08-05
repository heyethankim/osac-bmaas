import {
  catalogNetworkPolicyMatchesLockPattern,
  createAllEditableCatalogNetworkPolicy,
  createCatalogNetworkPolicyForLockPattern,
  type CatalogNetworkLockPattern,
} from '../providerAdmin/catalogNetworkPolicy'
import {
  CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
  CLUSTER_NODE_SETS_DESCRIPTION,
  CLUSTER_NODE_SETS_DISPLAY_NAME,
  CLUSTER_NODE_SETS_RATE_CARD,
  CLUSTER_NODE_SETS_TEMPLATE_NAME,
  CLUSTER_NODE_SETS_TEMPLATE_REF_ID,
  LEGACY_CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
  LEGACY_CLUSTER_NODE_SETS_DISPLAY_NAME,
  LEGACY_CLUSTER_NODE_SETS_TEMPLATE_REF_ID,
  LEGACY_VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
  LEGACY_VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
  LEGACY_VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID,
  VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
  VM_NETWORK_ATTACHMENTS_DESCRIPTION,
  VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
  VM_NETWORK_ATTACHMENTS_RATE_CARD,
  VM_NETWORK_ATTACHMENTS_TEMPLATE_NAME,
  VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID,
} from '../catalog/catalogSpecs'
import {
  DEFAULT_CLUSTER_CATALOG_VERSION_ID,
  formatClusterPlatformLabel,
} from '../catalog/catalogPublishConfig'
import { getDefaultMasterTemplate } from '../providerAdmin/bmaasTemplates'
import {
  addProviderCatalogItem,
  getCatalogItemNetworkPolicy,
  getCatalogItemStatus,
  getProviderCatalogDraft,
  getProviderCatalogItems,
  getProviderRegisteredOrganizations,
  getProviderSelectedServices,
  setProviderActiveNav,
  setProviderCatalogItemStatus,
  setProviderSelectedServices,
  setProviderSetupComplete,
  updateProviderCatalogNetworkPolicy,
  updateProviderRegisteredOrganization,
  upsertProviderSavedTemplate,
  ensureProviderDemoOrganizations,
  patchProviderCatalogItem,
  rewriteProviderCatalogItemIdentity,
  type ProviderCatalogDraft,
} from './storage'
import {
  DEFAULT_BLUEPRINT_FORM,
  DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
  DEFAULT_RATE_CARD,
  DEMO_EXISTING_MASTER_TEMPLATES,
  GPU_BLUEPRINT_FORM,
  LEGACY_DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
  LEGACY_SECOND_CATALOG_ITEM_DISPLAY_NAME,
  LEGACY_SECOND_CATALOG_ITEM_TITLE_CASE_DISPLAY_NAME,
  SECOND_CATALOG_ITEM_DISPLAY_NAME,
  parseRateCardFromForm,
} from './templateDemo'
import { DEFAULT_PROVIDER_SERVICE_SELECTION, type ProviderServiceId } from './constants'
import { DEMO_NORTH_SUMMIT_BANK_TENANT_ID } from '../providerAdmin/organizations'
import type { ProviderAdminNavId } from '../providerAdmin/constants'

/** Stable demo IDs so ensure can re-seed without creating duplicates. */
export const BARE_METAL_GPU_CATALOG_ITEM_ID = 'cat-bm-gpu-training'
export const BARE_METAL_GPU_TEMPLATE_REF_ID = 'bm-dell-r750'
export const LEGACY_BARE_METAL_GPU_CATALOG_ITEM_ID = 'cat_BM_GPU_TRAINING'
export const LEGACY_BARE_METAL_GPU_TEMPLATE_REF_ID = 'bm_dell_r750'

/** Second Bare Metal offering — HPE ProLiant DL380 with A100 GPUs. */
export const BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID = 'cat-bm-dense-gpu'
export const BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID = 'bm-hpe-dl380-a100'
export const LEGACY_BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID = 'cat_BM_AI_INFERENCE'
export const LEGACY_BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID = 'bm_hpe_dl380_a100'

/**
 * Demo storefront order for Provider Admin (Cluster published; Dense GPU unpublished for tenants).
 * Tenant Admin / Tenant User use the same order with unpublished items filtered out.
 */
export const DEMO_CATALOG_ITEM_ORDER = [
  BARE_METAL_GPU_CATALOG_ITEM_ID,
  BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
  CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
  VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
] as const

function demoCatalogItemOrderIndex(catalogItemId: string): number {
  return (DEMO_CATALOG_ITEM_ORDER as readonly string[]).indexOf(catalogItemId)
}

/**
 * Demo storefront order for known offerings. Newly added items (unknown IDs) sort first
 * by createdAt (newest first) so they appear at the top-left of the catalog grid.
 */
export function sortByDemoCatalogOrder<
  T extends { catalogItemId: string; createdAt?: string },
>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftIndex = demoCatalogItemOrderIndex(left.catalogItemId)
    const rightIndex = demoCatalogItemOrderIndex(right.catalogItemId)
    const leftKnown = leftIndex !== -1
    const rightKnown = rightIndex !== -1

    if (!leftKnown && rightKnown) {
      return -1
    }
    if (leftKnown && !rightKnown) {
      return 1
    }
    if (!leftKnown && !rightKnown) {
      return (right.createdAt ?? '').localeCompare(left.createdAt ?? '')
    }

    return leftIndex - rightIndex
  })
}

function createDefaultCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: BARE_METAL_GPU_CATALOG_ITEM_ID,
    templateRefId: BARE_METAL_GPU_TEMPLATE_REF_ID,
    templateName: DEFAULT_BLUEPRINT_FORM.templateName,
    displayName: DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
    description: DEFAULT_BLUEPRINT_FORM.description,
    scope: 'global-public',
    rateCard: DEFAULT_RATE_CARD,
    serviceId: 'baremetal',
    networkPolicy: createCatalogNetworkPolicyForLockPattern(
      'all-locked',
      BARE_METAL_GPU_CATALOG_ITEM_ID,
    ),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

function createBareMetalAiInferenceCatalogDraft(): ProviderCatalogDraft {
  const rateCard = parseRateCardFromForm(GPU_BLUEPRINT_FORM) ?? DEFAULT_RATE_CARD

  return {
    catalogItemId: BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
    templateRefId: BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID,
    templateName: GPU_BLUEPRINT_FORM.templateName,
    displayName: SECOND_CATALOG_ITEM_DISPLAY_NAME,
    description: GPU_BLUEPRINT_FORM.description,
    scope: 'vip-enterprise',
    enterpriseTenantId: DEMO_NORTH_SUMMIT_BANK_TENANT_ID,
    rateCard,
    serviceId: 'baremetal',
    networkPolicy: createAllEditableCatalogNetworkPolicy(),
    status: 'unpublished',
    createdAt: new Date().toISOString(),
  }
}

function createClusterNodeSetsCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
    templateRefId: CLUSTER_NODE_SETS_TEMPLATE_REF_ID,
    templateName: CLUSTER_NODE_SETS_TEMPLATE_NAME,
    displayName: CLUSTER_NODE_SETS_DISPLAY_NAME,
    description: CLUSTER_NODE_SETS_DESCRIPTION,
    scope: 'global-public',
    rateCard: CLUSTER_NODE_SETS_RATE_CARD,
    serviceId: 'cluster',
    instanceTypeId: 'ocp-small',
    instanceTypeLabel: 'OpenShift small',
    diskImageId: DEFAULT_CLUSTER_CATALOG_VERSION_ID,
    diskImageLabel: formatClusterPlatformLabel(DEFAULT_CLUSTER_CATALOG_VERSION_ID),
    networkPolicy: createCatalogNetworkPolicyForLockPattern(
      'vnet-locked',
      CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
    ),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

function createVmNetworkAttachmentsCatalogDraft(): ProviderCatalogDraft {
  return {
    catalogItemId: VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
    templateRefId: VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID,
    templateName: VM_NETWORK_ATTACHMENTS_TEMPLATE_NAME,
    displayName: VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
    description: VM_NETWORK_ATTACHMENTS_DESCRIPTION,
    scope: 'global-public',
    rateCard: VM_NETWORK_ATTACHMENTS_RATE_CARD,
    serviceId: 'virtual-machine',
    networkPolicy: createCatalogNetworkPolicyForLockPattern(
      'all-editable',
      VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
    ),
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

function hasBareMetalGpuCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return items.some(
    (item) =>
      item.catalogItemId === BARE_METAL_GPU_CATALOG_ITEM_ID ||
      item.catalogItemId === LEGACY_BARE_METAL_GPU_CATALOG_ITEM_ID ||
      item.templateRefId === BARE_METAL_GPU_TEMPLATE_REF_ID ||
      item.templateRefId === LEGACY_BARE_METAL_GPU_TEMPLATE_REF_ID ||
      item.displayName === DEFAULT_CATALOG_ITEM_DISPLAY_NAME ||
      item.displayName === LEGACY_DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
  )
}

function findBareMetalAiInferenceCatalogItem(
  items: ProviderCatalogDraft[],
): ProviderCatalogDraft | undefined {
  return items.find(
    (item) =>
      item.catalogItemId === BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID ||
      item.catalogItemId === LEGACY_BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID ||
      item.templateRefId === BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID ||
      item.templateRefId === LEGACY_BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID ||
      item.displayName === SECOND_CATALOG_ITEM_DISPLAY_NAME ||
      item.displayName === LEGACY_SECOND_CATALOG_ITEM_TITLE_CASE_DISPLAY_NAME ||
      item.displayName === LEGACY_SECOND_CATALOG_ITEM_DISPLAY_NAME,
  )
}

function hasBareMetalAiInferenceCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return Boolean(findBareMetalAiInferenceCatalogItem(items))
}

/** Keep stored demo item title, VIP scope, unpublished status, and networking-off in sync. */
function syncBareMetalAiInferenceCatalogItem(): void {
  const items = getProviderCatalogItems()
  const current = findBareMetalAiInferenceCatalogItem(items)
  if (!current) {
    return
  }

  const needsIdentitySync =
    current.catalogItemId !== BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID ||
    current.templateRefId !== BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID ||
    current.displayName !== SECOND_CATALOG_ITEM_DISPLAY_NAME ||
    current.scope !== 'vip-enterprise' ||
    current.enterpriseTenantId !== DEMO_NORTH_SUMMIT_BANK_TENANT_ID

  if (needsIdentitySync) {
    rewriteProviderCatalogItemIdentity(current.catalogItemId, {
      catalogItemId: BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
      templateRefId: BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID,
      displayName: SECOND_CATALOG_ITEM_DISPLAY_NAME,
      description: current.description ?? '',
      scope: 'vip-enterprise',
      enterpriseTenantId: DEMO_NORTH_SUMMIT_BANK_TENANT_ID,
    })
  }

  const synced =
    findBareMetalAiInferenceCatalogItem(getProviderCatalogItems()) ?? current

  if (getCatalogItemStatus(synced) !== 'unpublished') {
    setProviderCatalogItemStatus(synced.catalogItemId, 'unpublished')
  }

  const networkPolicy = getCatalogItemNetworkPolicy(synced)
  if (networkPolicy.enabled) {
    updateProviderCatalogNetworkPolicy(synced.catalogItemId, {
      ...networkPolicy,
      enabled: false,
    })
  }

  // Keep North Summit Bank pointed at this VIP offering so tenant personas resolve it.
  const denseGpu = synced
  const northstar = getProviderRegisteredOrganizations().find(
    (organization) => organization.slug === 'northstar',
  )
  if (
    northstar &&
    (northstar.catalogItemId !== denseGpu.catalogItemId ||
      northstar.catalogDisplayName !== denseGpu.displayName)
  ) {
    updateProviderRegisteredOrganization(northstar.id, {
      catalogItemId: denseGpu.catalogItemId,
      catalogDisplayName: denseGpu.displayName,
    })
  }
}

function syncBareMetalGpuTrainingCatalogItem(): void {
  const current = getProviderCatalogItems().find(
    (item) =>
      item.catalogItemId === BARE_METAL_GPU_CATALOG_ITEM_ID ||
      item.catalogItemId === LEGACY_BARE_METAL_GPU_CATALOG_ITEM_ID ||
      item.templateRefId === BARE_METAL_GPU_TEMPLATE_REF_ID ||
      item.templateRefId === LEGACY_BARE_METAL_GPU_TEMPLATE_REF_ID ||
      item.displayName === DEFAULT_CATALOG_ITEM_DISPLAY_NAME ||
      item.displayName === LEGACY_DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
  )
  if (!current) {
    return
  }

  const needsIdentitySync =
    current.catalogItemId !== BARE_METAL_GPU_CATALOG_ITEM_ID ||
    current.templateRefId !== BARE_METAL_GPU_TEMPLATE_REF_ID ||
    current.displayName !== DEFAULT_CATALOG_ITEM_DISPLAY_NAME ||
    current.scope !== 'global-public' ||
    Boolean(current.enterpriseTenantId)

  if (needsIdentitySync) {
    rewriteProviderCatalogItemIdentity(current.catalogItemId, {
      catalogItemId: BARE_METAL_GPU_CATALOG_ITEM_ID,
      templateRefId: BARE_METAL_GPU_TEMPLATE_REF_ID,
      displayName: DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
      description: current.description ?? '',
      scope: 'global-public',
      enterpriseTenantId: null,
    })
  }

  const synced =
    getProviderCatalogItems().find(
      (item) => item.catalogItemId === BARE_METAL_GPU_CATALOG_ITEM_ID,
    ) ?? current

  if (getCatalogItemStatus(synced) !== 'live') {
    setProviderCatalogItemStatus(synced.catalogItemId, 'live')
  }
}

/**
 * Demo catalog items default to all networking fields unlocked.
 * Provider admins can lock individual fields from the catalog detail drawer.
 */
const DEMO_CATALOG_NETWORK_LOCK_PATTERNS: ReadonlyArray<{
  catalogItemId: string
  pattern: CatalogNetworkLockPattern
}> = [
  { catalogItemId: BARE_METAL_GPU_CATALOG_ITEM_ID, pattern: 'all-locked' },
  { catalogItemId: BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID, pattern: 'all-editable' },
  { catalogItemId: CLUSTER_NODE_SETS_CATALOG_ITEM_ID, pattern: 'vnet-locked' },
  { catalogItemId: VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID, pattern: 'all-editable' },
]

function applyLockPatternToPolicy(
  current: ReturnType<typeof getCatalogItemNetworkPolicy>,
  pattern: CatalogNetworkLockPattern,
  seed: string,
): ReturnType<typeof getCatalogItemNetworkPolicy> {
  const patterned = createCatalogNetworkPolicyForLockPattern(pattern, seed)
  return {
    enabled: true,
    virtualNetwork: {
      ...current.virtualNetwork,
      locked: patterned.virtualNetwork.locked,
    },
    subnet: {
      ...current.subnet,
      locked: patterned.subnet.locked,
    },
    securityGroup: {
      ...current.securityGroup,
      locked: patterned.securityGroup.locked,
    },
    externalIpPool: current.externalIpPool ?? patterned.externalIpPool,
  }
}

function syncDemoCatalogNetworkLockPatterns(): void {
  const legacyIdByCurrent: Record<string, string> = {
    [BARE_METAL_GPU_CATALOG_ITEM_ID]: LEGACY_BARE_METAL_GPU_CATALOG_ITEM_ID,
    [BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID]: LEGACY_BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
    [CLUSTER_NODE_SETS_CATALOG_ITEM_ID]: LEGACY_CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
    [VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID]: LEGACY_VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
  }

  for (const assignment of DEMO_CATALOG_NETWORK_LOCK_PATTERNS) {
    const current = getProviderCatalogItems().find(
      (item) =>
        item.catalogItemId === assignment.catalogItemId ||
        item.catalogItemId === legacyIdByCurrent[assignment.catalogItemId],
    )
    if (!current) {
      continue
    }

    const networkPolicy = getCatalogItemNetworkPolicy(current)

    if (catalogNetworkPolicyMatchesLockPattern(networkPolicy, assignment.pattern)) {
      continue
    }

    updateProviderCatalogNetworkPolicy(
      current.catalogItemId,
      applyLockPatternToPolicy(networkPolicy, assignment.pattern, assignment.catalogItemId),
    )
  }
}

function hasClusterNodeSetsCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return items.some(
    (item) =>
      item.catalogItemId === CLUSTER_NODE_SETS_CATALOG_ITEM_ID ||
      item.catalogItemId === LEGACY_CLUSTER_NODE_SETS_CATALOG_ITEM_ID ||
      item.templateRefId === CLUSTER_NODE_SETS_TEMPLATE_REF_ID ||
      item.templateRefId === LEGACY_CLUSTER_NODE_SETS_TEMPLATE_REF_ID ||
      item.displayName === CLUSTER_NODE_SETS_DISPLAY_NAME ||
      item.displayName === LEGACY_CLUSTER_NODE_SETS_DISPLAY_NAME,
  )
}

/** Keep the Cluster demo offering published so tenants can launch it. */
function syncClusterNodeSetsCatalogItem(): void {
  const items = getProviderCatalogItems()
  const current = items.find(
    (item) =>
      item.catalogItemId === CLUSTER_NODE_SETS_CATALOG_ITEM_ID ||
      item.catalogItemId === LEGACY_CLUSTER_NODE_SETS_CATALOG_ITEM_ID ||
      item.templateRefId === CLUSTER_NODE_SETS_TEMPLATE_REF_ID ||
      item.templateRefId === LEGACY_CLUSTER_NODE_SETS_TEMPLATE_REF_ID ||
      item.displayName === CLUSTER_NODE_SETS_DISPLAY_NAME ||
      item.displayName === LEGACY_CLUSTER_NODE_SETS_DISPLAY_NAME,
  )
  if (!current) {
    return
  }

  if (
    current.catalogItemId !== CLUSTER_NODE_SETS_CATALOG_ITEM_ID ||
    current.templateRefId !== CLUSTER_NODE_SETS_TEMPLATE_REF_ID ||
    current.displayName !== CLUSTER_NODE_SETS_DISPLAY_NAME
  ) {
    rewriteProviderCatalogItemIdentity(current.catalogItemId, {
      catalogItemId: CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
      templateRefId: CLUSTER_NODE_SETS_TEMPLATE_REF_ID,
      displayName: CLUSTER_NODE_SETS_DISPLAY_NAME,
      description: current.description ?? CLUSTER_NODE_SETS_DESCRIPTION,
    })
  }

  const synced =
    getProviderCatalogItems().find(
      (item) => item.catalogItemId === CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
    ) ?? current

  if (getCatalogItemStatus(synced) !== 'live') {
    setProviderCatalogItemStatus(synced.catalogItemId, 'live')
  }

  const needsVersion =
    synced.diskImageId !== DEFAULT_CLUSTER_CATALOG_VERSION_ID ||
    synced.diskImageLabel !== formatClusterPlatformLabel(DEFAULT_CLUSTER_CATALOG_VERSION_ID) ||
    synced.instanceTypeId !== 'ocp-small' ||
    synced.instanceTypeLabel !== 'OpenShift small'

  if (needsVersion) {
    patchProviderCatalogItem(synced.catalogItemId, {
      instanceTypeId: 'ocp-small',
      instanceTypeLabel: 'OpenShift small',
      diskImageId: DEFAULT_CLUSTER_CATALOG_VERSION_ID,
      diskImageLabel: formatClusterPlatformLabel(DEFAULT_CLUSTER_CATALOG_VERSION_ID),
    })
  }
}

function hasVmNetworkAttachmentsCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return items.some(
    (item) =>
      item.catalogItemId === VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID ||
      item.catalogItemId === LEGACY_VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID ||
      item.templateRefId === VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID ||
      item.templateRefId === LEGACY_VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID ||
      item.displayName === VM_NETWORK_ATTACHMENTS_DISPLAY_NAME ||
      item.displayName === LEGACY_VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
  )
}

function syncVmNetworkAttachmentsCatalogItem(): void {
  const current = getProviderCatalogItems().find(
    (item) =>
      item.catalogItemId === VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID ||
      item.catalogItemId === LEGACY_VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID ||
      item.templateRefId === VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID ||
      item.templateRefId === LEGACY_VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID ||
      item.displayName === VM_NETWORK_ATTACHMENTS_DISPLAY_NAME ||
      item.displayName === LEGACY_VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
  )
  if (!current) {
    return
  }

  if (
    current.catalogItemId !== VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID ||
    current.templateRefId !== VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID ||
    current.displayName !== VM_NETWORK_ATTACHMENTS_DISPLAY_NAME
  ) {
    rewriteProviderCatalogItemIdentity(current.catalogItemId, {
      catalogItemId: VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
      templateRefId: VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID,
      displayName: VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
      description: current.description ?? VM_NETWORK_ATTACHMENTS_DESCRIPTION,
    })
  }
}

function ensureDemoBareMetalTemplates(): void {
  upsertProviderSavedTemplate(getDefaultMasterTemplate())

  const inferenceTemplate =
    DEMO_EXISTING_MASTER_TEMPLATES.find(
      (template) => template.templateRefId === BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID,
    ) ?? {
      templateRefId: BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID,
      templateName: GPU_BLUEPRINT_FORM.templateName,
      description: GPU_BLUEPRINT_FORM.description,
      hardwareProfileId: GPU_BLUEPRINT_FORM.hardwareProfileId,
      osImageId: GPU_BLUEPRINT_FORM.osImage,
      suggestedDisplayName: SECOND_CATALOG_ITEM_DISPLAY_NAME,
      rateCard: parseRateCardFromForm(GPU_BLUEPRINT_FORM)!,
    }

  upsertProviderSavedTemplate({
    ...inferenceTemplate,
    templateRefId: BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID,
  })
}

/** Ensures demo catalog offerings exist for finished Provider Admin screens. */
export function ensureProviderCatalogDemoItems(): ProviderCatalogDraft[] {
  ensureDemoBareMetalTemplates()
  // So VIP enterprise labels can resolve North Summit Bank on catalog cards.
  ensureProviderDemoOrganizations()

  let items = getProviderCatalogItems()

  if (!hasBareMetalGpuCatalogItem(items)) {
    addProviderCatalogItem(createDefaultCatalogDraft())
    items = getProviderCatalogItems()
  }
  syncBareMetalGpuTrainingCatalogItem()
  items = getProviderCatalogItems()

  if (!hasBareMetalAiInferenceCatalogItem(items)) {
    addProviderCatalogItem(createBareMetalAiInferenceCatalogDraft())
    items = getProviderCatalogItems()
  }
  syncBareMetalAiInferenceCatalogItem()
  items = getProviderCatalogItems()

  if (!hasClusterNodeSetsCatalogItem(items)) {
    addProviderCatalogItem(createClusterNodeSetsCatalogDraft())
    items = getProviderCatalogItems()
  } else {
    syncClusterNodeSetsCatalogItem()
    items = getProviderCatalogItems()
  }

  if (!hasVmNetworkAttachmentsCatalogItem(items)) {
    addProviderCatalogItem(createVmNetworkAttachmentsCatalogDraft())
    items = getProviderCatalogItems()
  } else {
    syncVmNetworkAttachmentsCatalogItem()
    items = getProviderCatalogItems()
  }

  syncDemoCatalogNetworkLockPatterns()

  const selectedServices = getProviderSelectedServices()
  const nextServices: ProviderServiceId[] = [
    ...new Set<ProviderServiceId>([
      ...(selectedServices.length > 0 ? selectedServices : DEFAULT_PROVIDER_SERVICE_SELECTION),
      'baremetal',
      'cluster',
      'virtual-machine',
    ]),
  ]
  const servicesChanged =
    nextServices.length !== selectedServices.length ||
    nextServices.some((serviceId) => !selectedServices.includes(serviceId))
  if (servicesChanged) {
    setProviderSelectedServices(nextServices)
  }

  return getProviderCatalogItems()
}

/** Seeds post-setup Provider Admin state so landing-page prototype links can open finished screens. */
export function ensureProviderPostSetupPrototype(
  navId: ProviderAdminNavId = 'catalog',
): ProviderCatalogDraft {
  setProviderSelectedServices(DEFAULT_PROVIDER_SERVICE_SELECTION)
  setProviderSetupComplete()

  const items = ensureProviderCatalogDemoItems()
  ensureProviderDemoOrganizations()

  setProviderActiveNav(navId)
  return items[0] ?? getProviderCatalogDraft()!
}

export function isProviderAdminNavId(value: string | null): value is ProviderAdminNavId {
  return (
    value === 'overview' ||
    value === 'catalog' ||
    value === 'services-baremetal' ||
    value === 'services-clusters' ||
    value === 'services-models' ||
    value === 'services-virtual-machines' ||
    value === 'infrastructure-data-centers' ||
    value === 'infrastructure-hardware-inventory' ||
    value === 'infrastructure-bmaas-templates' ||
    value === 'networking-virtual-networks' ||
    value === 'networking-subnets' ||
    value === 'networking-security-groups' ||
    value === 'networking-external-ip-pools' ||
    value === 'administration-organizations' ||
    value === 'administration-quotas' ||
    value === 'billing-metering' ||
    value === 'system'
  )
}

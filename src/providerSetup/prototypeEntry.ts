import { DEFAULT_CATALOG_NETWORK_POLICY, DISABLED_CATALOG_NETWORK_POLICY } from '../providerAdmin/catalogNetworkPolicy'
import {
  CLUSTER_NODE_SETS_CATALOG_ITEM_ID,
  CLUSTER_NODE_SETS_DESCRIPTION,
  CLUSTER_NODE_SETS_DISPLAY_NAME,
  CLUSTER_NODE_SETS_RATE_CARD,
  CLUSTER_NODE_SETS_TEMPLATE_NAME,
  CLUSTER_NODE_SETS_TEMPLATE_REF_ID,
  VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID,
  VM_NETWORK_ATTACHMENTS_DESCRIPTION,
  VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
  VM_NETWORK_ATTACHMENTS_RATE_CARD,
  VM_NETWORK_ATTACHMENTS_TEMPLATE_NAME,
  VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID,
} from '../catalog/catalogSpecs'
import { getDefaultMasterTemplate } from '../providerAdmin/bmaasTemplates'
import {
  addProviderCatalogItem,
  getCatalogItemNetworkPolicy,
  getProviderCatalogDraft,
  getProviderCatalogItems,
  getProviderSelectedServices,
  setProviderActiveNav,
  setProviderSelectedServices,
  setProviderSetupComplete,
  updateProviderCatalogItem,
  updateProviderCatalogNetworkPolicy,
  upsertProviderSavedTemplate,
  ensureProviderDemoOrganizations,
  type ProviderCatalogDraft,
} from './storage'
import {
  DEFAULT_BLUEPRINT_FORM,
  DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
  DEFAULT_RATE_CARD,
  DEMO_EXISTING_MASTER_TEMPLATES,
  GPU_BLUEPRINT_FORM,
  LEGACY_SECOND_CATALOG_ITEM_DISPLAY_NAME,
  SECOND_CATALOG_ITEM_DISPLAY_NAME,
  parseRateCardFromForm,
} from './templateDemo'
import { DEFAULT_PROVIDER_SERVICE_SELECTION, type ProviderServiceId } from './constants'
import { DEMO_NORTH_SUMMIT_BANK_TENANT_ID } from '../providerAdmin/organizations'
import type { ProviderAdminNavId } from '../providerAdmin/constants'

/** Stable demo IDs so ensure can re-seed without creating duplicates. */
export const BARE_METAL_GPU_CATALOG_ITEM_ID = 'cat_BM_GPU_TRAINING'
export const BARE_METAL_GPU_TEMPLATE_REF_ID = 'bm_dell_r750'

/** Second Bare Metal offering — HPE ProLiant DL380 with A100 GPUs. */
export const BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID = 'cat_BM_AI_INFERENCE'
export const BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID = 'bm_hpe_dl380_a100'

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
    networkPolicy: DEFAULT_CATALOG_NETWORK_POLICY,
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
    networkPolicy: DISABLED_CATALOG_NETWORK_POLICY,
    status: 'live',
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
    networkPolicy: DEFAULT_CATALOG_NETWORK_POLICY,
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
    networkPolicy: DEFAULT_CATALOG_NETWORK_POLICY,
    status: 'live',
    createdAt: new Date().toISOString(),
  }
}

function hasBareMetalGpuCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return items.some(
    (item) =>
      item.catalogItemId === BARE_METAL_GPU_CATALOG_ITEM_ID ||
      item.templateRefId === BARE_METAL_GPU_TEMPLATE_REF_ID ||
      item.displayName === DEFAULT_CATALOG_ITEM_DISPLAY_NAME,
  )
}

function findBareMetalAiInferenceCatalogItem(
  items: ProviderCatalogDraft[],
): ProviderCatalogDraft | undefined {
  return items.find(
    (item) =>
      item.catalogItemId === BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID ||
      item.templateRefId === BARE_METAL_AI_INFERENCE_TEMPLATE_REF_ID ||
      item.displayName === SECOND_CATALOG_ITEM_DISPLAY_NAME ||
      item.displayName === LEGACY_SECOND_CATALOG_ITEM_DISPLAY_NAME,
  )
}

function hasBareMetalAiInferenceCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return Boolean(findBareMetalAiInferenceCatalogItem(items))
}

/** Keep stored demo item title, VIP scope, and networking-off in sync across personas. */
function syncBareMetalAiInferenceCatalogItem(): void {
  const items = getProviderCatalogItems()
  const current = findBareMetalAiInferenceCatalogItem(items)
  if (!current) {
    return
  }

  const needsIdentitySync =
    current.displayName !== SECOND_CATALOG_ITEM_DISPLAY_NAME ||
    current.scope !== 'vip-enterprise' ||
    current.enterpriseTenantId !== DEMO_NORTH_SUMMIT_BANK_TENANT_ID

  if (needsIdentitySync) {
    updateProviderCatalogItem(current.catalogItemId, {
      displayName: SECOND_CATALOG_ITEM_DISPLAY_NAME,
      description: current.description ?? '',
      scope: 'vip-enterprise',
      enterpriseTenantId: DEMO_NORTH_SUMMIT_BANK_TENANT_ID,
    })
  }

  const networkPolicy = getCatalogItemNetworkPolicy(current)
  if (networkPolicy.enabled) {
    updateProviderCatalogNetworkPolicy(current.catalogItemId, {
      ...networkPolicy,
      enabled: false,
    })
  }
}

function hasClusterNodeSetsCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return items.some(
    (item) =>
      item.catalogItemId === CLUSTER_NODE_SETS_CATALOG_ITEM_ID ||
      item.templateRefId === CLUSTER_NODE_SETS_TEMPLATE_REF_ID ||
      item.displayName === CLUSTER_NODE_SETS_DISPLAY_NAME,
  )
}

function hasVmNetworkAttachmentsCatalogItem(items: ProviderCatalogDraft[]): boolean {
  return items.some(
    (item) =>
      item.catalogItemId === VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID ||
      item.templateRefId === VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID ||
      item.displayName === VM_NETWORK_ATTACHMENTS_DISPLAY_NAME,
  )
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

  if (!hasBareMetalAiInferenceCatalogItem(items)) {
    addProviderCatalogItem(createBareMetalAiInferenceCatalogDraft())
    items = getProviderCatalogItems()
  } else {
    syncBareMetalAiInferenceCatalogItem()
    items = getProviderCatalogItems()
  }

  if (!hasClusterNodeSetsCatalogItem(items)) {
    addProviderCatalogItem(createClusterNodeSetsCatalogDraft())
    items = getProviderCatalogItems()
  }

  if (!hasVmNetworkAttachmentsCatalogItem(items)) {
    addProviderCatalogItem(createVmNetworkAttachmentsCatalogDraft())
    items = getProviderCatalogItems()
  }

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
    value === 'billing-metering' ||
    value === 'system'
  )
}

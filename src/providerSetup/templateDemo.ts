import type { CatalogFieldPolicy } from '../catalog/catalogPublishConfig'
import { CATALOG_ITEM_DESCRIPTIONS_BY_SERVICE } from '../catalog/catalogItemDescriptions'
import type { CatalogNetworkPolicy } from '../providerAdmin/catalogNetworkPolicy'

export type { CatalogNetworkPolicy }
export type { CatalogFieldPolicy }

export type HardwareProfileCategory = 'compute' | 'gpu-ai'

export type DiscoveredHardwareProfile = {
  id: string
  hostCount: number
  vendor: string
  model: string
  cpu: string
  memory: string
  gpu: string
  network: string
  category: HardwareProfileCategory
  categoryLabel: string
}

export const DISCOVERED_HARDWARE_PROFILES: DiscoveredHardwareProfile[] = [
  {
    id: 'dell-r750',
    hostCount: 3,
    vendor: 'Dell',
    model: 'PowerEdge R750',
    cpu: 'Intel Xeon Gold 6338 × 2',
    memory: '512 GB DDR4-3200',
    gpu: 'CPU-only',
    network: '2× 25 GbE',
    category: 'compute',
    categoryLabel: 'Compute',
  },
  {
    id: 'hpe-dl380',
    hostCount: 4,
    vendor: 'HPE',
    model: 'ProLiant DL380 Gen10+',
    cpu: 'AMD EPYC 7763 × 2',
    memory: '1 TB DDR4-3200',
    gpu: 'NVIDIA A100 80 GB × 4',
    network: '2× 100 GbE',
    category: 'gpu-ai',
    categoryLabel: 'GPU / AI',
  },
]

export const DISCOVERED_HARDWARE_TOTALS = {
  hostCount: 7,
  vcpus: 704,
  memoryTb: '5.5 TB',
} as const

export const TEMPLATE_NEXT_STEP_BULLETS = [
  'Specs are pre-filled from automated discovery data',
  'Automates OS imaging and SSH key injection via Metal3',
  'Requires hardcoded infrastructure subnet and network defaults',
  'Template remains hidden from tenants until manually published to a catalog',
] as const

export type RateCard = {
  hourlyRate: number
  monthlyRate: number
  currency: string
  billingUnit: 'per-instance'
}

export const DEFAULT_RATE_CARD: RateCard = {
  hourlyRate: 4.25,
  monthlyRate: 2850,
  currency: 'USD',
  billingUnit: 'per-instance',
}

export const BLUEPRINT_DESIGNER_STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'os-image', label: 'OS image' },
  { id: 'network', label: 'Network' },
  { id: 'rate-card', label: 'Rate card' },
  { id: 'review', label: 'Review' },
] as const

export type BlueprintDesignerStepId = (typeof BLUEPRINT_DESIGNER_STEPS)[number]['id']

export type SwitchPortProfile = 'trunk' | 'access'

export type BlueprintFormState = {
  templateName: string
  description: string
  hardwareProfileId: string
  osImage: string
  subnetCidr: string
  vlanId: string
  defaultGateway: string
  mtu: string
  switchPortProfile: SwitchPortProfile
  hourlyRate: string
  monthlyRate: string
  currency: string
}

export const DEFAULT_TEMPLATE_DESCRIPTION =
  'Master template for GPU training fleets. Maps discovered Dell PowerEdge R750 hosts to RHEL 9.4 with VLAN 200 networking and Metal3 provisioning, kept private until published to the Catalog.'

export const DEFAULT_BLUEPRINT_FORM: BlueprintFormState = {
  templateName: 'gpu-a100-training-standard',
  description: DEFAULT_TEMPLATE_DESCRIPTION,
  hardwareProfileId: 'dell-r750',
  osImage: 'rhel-9.4',
  subnetCidr: '10.42.0.0/24',
  vlanId: '200',
  defaultGateway: '10.42.0.1',
  mtu: '9000',
  switchPortProfile: 'trunk',
  hourlyRate: String(DEFAULT_RATE_CARD.hourlyRate),
  monthlyRate: String(DEFAULT_RATE_CARD.monthlyRate),
  currency: DEFAULT_RATE_CARD.currency,
}

export const SECOND_HARDWARE_PROFILE_ID = 'hpe-dl380'

export const GPU_BLUEPRINT_FORM: BlueprintFormState = {
  templateName: 'gpu-a100-hpe-training-standard',
  description:
    'Master template for GPU training fleets. Maps discovered HPE ProLiant DL380 Gen10+ hosts to RHEL 9.4 with VLAN 200 networking and Metal3 provisioning, kept private until published to the Catalog.',
  hardwareProfileId: SECOND_HARDWARE_PROFILE_ID,
  osImage: 'rhel-9.4',
  subnetCidr: '10.42.0.0/24',
  vlanId: '200',
  defaultGateway: '10.42.0.1',
  mtu: '9000',
  switchPortProfile: 'trunk',
  hourlyRate: '8.50',
  monthlyRate: '5200',
  currency: 'USD',
}

export function getBlueprintFormForHardwareProfile(profileId: string): BlueprintFormState {
  if (profileId === SECOND_HARDWARE_PROFILE_ID) {
    return GPU_BLUEPRINT_FORM
  }

  return DEFAULT_BLUEPRINT_FORM
}

export const TEMPLATE_SAVE_VALIDATION_TASKS = [
  'Parsing proto schema · baremetal_instance_template_type.proto',
  'Validating BareMetalHost selector against Metal3 inventory',
  'Checking OS image digest integrity',
  'Verifying network route uniqueness with Balance Operator',
  'Generating system UUID · registering BareMetalInstance CR',
  'Committing to private admin tier',
] as const

export function generateTemplateReferenceId(): string {
  const suffix = Math.random().toString(36).slice(2, 10).toLowerCase()
  return `bm-${suffix}`
}

export function generateCatalogItemId(): string {
  const suffix = Math.random().toString(36).slice(2, 10).toLowerCase()
  return `cat-${suffix}`
}

export function getHardwareProfileLabel(profileId: string): string {
  const profile = DISCOVERED_HARDWARE_PROFILES.find((item) => item.id === profileId)
  if (!profile) return profileId
  return `${profile.hostCount}× ${profile.vendor} ${profile.model}`
}

export function getSwitchPortProfileLabel(profile: SwitchPortProfile): string {
  return profile === 'trunk' ? 'Trunk — Tagged VLAN' : 'Access — Untagged'
}

export function parseRateCardFromForm(form: BlueprintFormState): RateCard | null {
  const hourlyRate = Number.parseFloat(form.hourlyRate)
  const monthlyRate = Number.parseFloat(form.monthlyRate)

  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
    return null
  }

  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) {
    return null
  }

  return {
    hourlyRate,
    monthlyRate,
    currency: form.currency.trim() || DEFAULT_RATE_CARD.currency,
    billingUnit: 'per-instance',
  }
}

export function resolveRateCard(template: { rateCard?: RateCard } | null | undefined): RateCard {
  return template?.rateCard ?? DEFAULT_RATE_CARD
}

export function formatRateCardSummary(rateCard: RateCard): string {
  const hourly = rateCard.hourlyRate.toFixed(2)
  const monthly = rateCard.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return `$${hourly}/hr · $${monthly}/mo per instance`
}

export function formatRateCardHourly(rateCard: RateCard): string {
  return `$${rateCard.hourlyRate.toFixed(2)}/hr`
}

export const DEFAULT_CATALOG_ITEM_DISPLAY_NAME = 'bare-metal-gpu-training-server'
export const SECOND_CATALOG_ITEM_DISPLAY_NAME = 'bare-metal-dense-gpu-node'
/** Previous title for the second Bare Metal demo item — used when migrating stored catalogs. */
export const LEGACY_SECOND_CATALOG_ITEM_DISPLAY_NAME = 'Bare Metal - AI Inference Host'
/** Pre-Kubernetes-convention catalog titles — matched when migrating stored catalogs. */
export const LEGACY_DEFAULT_CATALOG_ITEM_DISPLAY_NAME = 'Bare Metal - GPU Training Server'
export const LEGACY_SECOND_CATALOG_ITEM_TITLE_CASE_DISPLAY_NAME = 'Bare Metal - Dense GPU Node'
/** Prefill for Provider Admin “Create catalog item” Name step (distinct from seeded items). */
export const PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAME = 'bare-metal-general-purpose-server'

/** Service-specific Name step prefills for Create catalog item. */
export const PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAMES = {
  baremetal: PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAME,
  cluster: 'cluster-general-purpose',
  'virtual-machine': 'vm-general-purpose',
  models: 'model-serving-endpoint',
} as const satisfies Record<CatalogServiceId, string>

export function getPublishCatalogSuggestedDisplayName(serviceId: CatalogServiceId): string {
  return PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAMES[serviceId]
}

/** Service-specific Description step prefills for Create catalog item. */
export const PUBLISH_CATALOG_SUGGESTED_DESCRIPTIONS = {
  baremetal: CATALOG_ITEM_DESCRIPTIONS_BY_SERVICE.baremetal,
  cluster: CATALOG_ITEM_DESCRIPTIONS_BY_SERVICE.cluster,
  'virtual-machine': CATALOG_ITEM_DESCRIPTIONS_BY_SERVICE['virtual-machine'],
  models: CATALOG_ITEM_DESCRIPTIONS_BY_SERVICE.models,
} as const satisfies Record<CatalogServiceId, string>

export function getPublishCatalogSuggestedDescription(serviceId: CatalogServiceId): string {
  return PUBLISH_CATALOG_SUGGESTED_DESCRIPTIONS[serviceId]
}

export function getCatalogDisplayName(hardwareProfileId: string): string {
  const profile = DISCOVERED_HARDWARE_PROFILES.find((item) => item.id === hardwareProfileId)
  if (!profile) {
    return DEFAULT_CATALOG_ITEM_DISPLAY_NAME
  }

  if (profile.id === 'hpe-dl380') {
    return SECOND_CATALOG_ITEM_DISPLAY_NAME
  }

  return DEFAULT_CATALOG_ITEM_DISPLAY_NAME
}

export type SavedMasterTemplate = {
  templateRefId: string
  templateName: string
  description: string
  hardwareProfileId: string
  osImageId: string
  suggestedDisplayName: string
  rateCard: RateCard
}

export const DEMO_EXISTING_MASTER_TEMPLATES: SavedMasterTemplate[] = [
  {
    templateRefId: 'bm-hpe-dl380-a100',
    templateName: GPU_BLUEPRINT_FORM.templateName,
    description: GPU_BLUEPRINT_FORM.description,
    hardwareProfileId: GPU_BLUEPRINT_FORM.hardwareProfileId,
    osImageId: GPU_BLUEPRINT_FORM.osImage,
    suggestedDisplayName: SECOND_CATALOG_ITEM_DISPLAY_NAME,
    rateCard: parseRateCardFromForm(GPU_BLUEPRINT_FORM)!,
  },
]

export type CatalogServiceId = 'baremetal' | 'cluster' | 'models' | 'virtual-machine'

export type CatalogServiceOffering = {
  id: CatalogServiceId
  title: string
  shortLabel: string
  description: string
}

export const CATALOG_SERVICE_OFFERINGS: CatalogServiceOffering[] = [
  {
    id: 'baremetal',
    title: 'Bare Metal as a Service',
    shortLabel: 'Bare Metal',
    description:
      'Create catalog items from pre-configured bare metal nodes for tenants to request.',
  },
  {
    id: 'cluster',
    title: 'Cluster as a Service',
    shortLabel: 'Cluster',
    description:
      'Create catalog items from OpenShift cluster profiles for tenants to request.',
  },
  {
    id: 'models',
    title: 'Models as a Service',
    shortLabel: 'MaaS',
    description:
      'Create catalog items from curated AI model endpoints for tenants to request.',
  },
  {
    id: 'virtual-machine',
    title: 'Virtual Machine as a Service',
    shortLabel: 'Virtual Machine',
    description:
      'Create catalog items from virtual machine flavors for tenants to request.',
  },
]

export const CATALOG_SERVICE_LABELS: Record<CatalogServiceId, string> = {
  baremetal: 'Bare Metal',
  cluster: 'Cluster',
  models: 'MaaS',
  'virtual-machine': 'Virtual Machine',
}

export const CATALOG_SERVICE_FILTER_LABELS: Record<CatalogServiceId, string> = {
  baremetal: 'Bare metal',
  cluster: 'Clusters',
  models: 'Models',
  'virtual-machine': 'Virtual machines',
}

export const CATALOG_SERVICE_FILTERS = CATALOG_SERVICE_OFFERINGS.map((offering) => ({
  id: offering.id,
  label: CATALOG_SERVICE_FILTER_LABELS[offering.id],
})) as ReadonlyArray<{ id: CatalogServiceId; label: string }>

export function getCatalogServiceOffering(serviceId: CatalogServiceId): CatalogServiceOffering {
  return (
    CATALOG_SERVICE_OFFERINGS.find((offering) => offering.id === serviceId) ??
    CATALOG_SERVICE_OFFERINGS[0]
  )
}

export const PUBLISH_CATALOG_STEPS = [
  { id: 'service', label: 'Service' },
  { id: 'template', label: 'Template' },
  { id: 'display-name', label: 'Name' },
  { id: 'hardware-os', label: 'Hardware & OS' },
  { id: 'node-topology', label: 'Node topology' },
  { id: 'field-policies', label: 'Lock fields' },
  { id: 'publish-scope', label: 'Visibility' },
  { id: 'review', label: 'Review' },
] as const

export type PublishCatalogStepId = (typeof PUBLISH_CATALOG_STEPS)[number]['id']

export type PublishCatalogScope = 'global-public' | 'vip-enterprise'

/** Demo default for VIP enterprise visibility. */
export const DEFAULT_ENTERPRISE_TENANT_ID = 'tenant-northstar'

export type PublishedTemplatePayload = {
  serviceId: CatalogServiceId
  templateRefId: string
  templateName: string
  displayName: string
  description: string
  scope: PublishCatalogScope
  rateCard: RateCard
  /** Optional; defaults applied at create time when omitted. */
  networkPolicy?: CatalogNetworkPolicy
  /** Optional when scope is VIP enterprise. Omit or leave empty for Restricted — unassigned. */
  enterpriseTenantId?: string
  /** When VIP targets multiple enterprises; first entry mirrors enterpriseTenantId. */
  enterpriseTenantIds?: string[]
  /** When VIP targets a registered org, assign catalog access on create. */
  vipOrganizationId?: string
  /** Assign catalog access to each selected VIP organization on create. */
  vipOrganizationIds?: string[]
  /** Defaults to unpublished. Publish later from the catalog. */
  status?: 'live' | 'unpublished'
  /** Instance type / hardware flavor shown to tenants. */
  instanceTypeId?: string
  instanceTypeLabel?: string
  /** Disk / OS image shown to tenants. */
  diskImageId?: string
  diskImageLabel?: string
  /** Cluster as a Service: locked (default) or editable at provisioning. */
  clusterVersionMode?: 'locked' | 'editable'
  /** Cluster default worker node set id/label. */
  nodeSetId?: string
  nodeSetLabel?: string
  /** Cluster default host type for the node set. */
  hostTypeId?: string
  hostTypeLabel?: string
  /** Cluster node set / host type: locked (default) or editable at provisioning. */
  clusterNodeTopologyMode?: 'locked' | 'editable'
  /** Locked vs exposed field policies for launch. */
  fieldPolicies?: CatalogFieldPolicy[]
}

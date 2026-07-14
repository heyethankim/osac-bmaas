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
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `bm_${suffix}`
}

export function generateCatalogItemId(): string {
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `cat_${suffix}`
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

export function getCatalogDisplayName(hardwareProfileId: string): string {
  const profile = DISCOVERED_HARDWARE_PROFILES.find((item) => item.id === hardwareProfileId)
  if (!profile) {
    return 'Bare metal instance'
  }

  if (profile.id === 'hpe-dl380') {
    return 'GPU Node · NVIDIA A100 4x · 1 TB RAM'
  }

  return `Compute Node · ${profile.vendor} ${profile.model} ${profile.hostCount}x · ${profile.memory}`
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

export const DEMO_EXISTING_MASTER_TEMPLATES: SavedMasterTemplate[] = []

export const PUBLISH_CATALOG_STEPS = [
  { id: 'template', label: 'Template' },
  { id: 'display-name', label: 'Display name' },
  { id: 'publish-scope', label: 'Publish scope' },
] as const

export type PublishCatalogStepId = (typeof PUBLISH_CATALOG_STEPS)[number]['id']

export type PublishCatalogScope = 'global-public' | 'vip-enterprise'

export type PublishedTemplatePayload = {
  templateRefId: string
  templateName: string
  displayName: string
  scope: PublishCatalogScope
  rateCard: RateCard
}

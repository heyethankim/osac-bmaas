import type { CatalogServiceId } from '../providerSetup/templateDemo'
import type { SavedMasterTemplate } from '../providerSetup/templateDemo'
import { DISCOVERED_HARDWARE_PROFILES } from '../providerSetup/templateDemo'

export type CatalogFieldPolicyMode = 'locked' | 'exposed'

export type CatalogFieldPolicyCategory = 'hardware' | 'os' | 'template-param'

export type CatalogFieldPolicy = {
  id: string
  key?: string
  label: string
  category?: CatalogFieldPolicyCategory
  defaultValue: string
  mode: CatalogFieldPolicyMode
}

export type CatalogInstanceTypeOption = {
  id: string
  label: string
  detail: string
  hourlyRate?: string
  accelerator?: string
}

/** Preset card id for a manually defined instance type (Bare metal / VM). */
export const CUSTOM_INSTANCE_TYPE_ID = 'custom'

export type CustomInstanceTypeConfig = {
  vcpus: number
  memoryGb: number
  networkInterfaces: number
  /** Matches `CATALOG_GPU_ACCELERATOR_OPTIONS` id; `none` means no GPU. */
  acceleratorId: string
}

export const DEFAULT_CUSTOM_INSTANCE_TYPE_CONFIG: CustomInstanceTypeConfig = {
  vcpus: 32,
  memoryGb: 256,
  networkInterfaces: 2,
  acceleratorId: 'nvidia-a100-40',
}

/** Lighter Custom defaults when creating a virtual machine catalog item. */
export const DEFAULT_VM_CUSTOM_INSTANCE_TYPE_CONFIG: CustomInstanceTypeConfig = {
  vcpus: 4,
  memoryGb: 16,
  networkInterfaces: 1,
  acceleratorId: 'none',
}

export function getDefaultCustomInstanceTypeConfig(
  serviceId: CatalogServiceId | null,
): CustomInstanceTypeConfig {
  return serviceId === 'virtual-machine'
    ? { ...DEFAULT_VM_CUSTOM_INSTANCE_TYPE_CONFIG }
    : { ...DEFAULT_CUSTOM_INSTANCE_TYPE_CONFIG }
}

export const CATALOG_GPU_ACCELERATOR_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'nvidia-a100-40', label: 'NVIDIA A100 40 GB' },
  { id: 'nvidia-a100-80', label: 'NVIDIA A100 80 GB' },
  { id: 'nvidia-h100-80', label: 'NVIDIA H100 80 GB' },
  { id: 'nvidia-l40s', label: 'NVIDIA L40S 48 GB' },
]

export function isCustomInstanceTypeId(instanceTypeId: string): boolean {
  return instanceTypeId === CUSTOM_INSTANCE_TYPE_ID
}

export function getCustomInstanceTypeAcceleratorLabel(acceleratorId: string): string | undefined {
  if (!acceleratorId || acceleratorId === 'none') {
    return undefined
  }

  return CATALOG_GPU_ACCELERATOR_OPTIONS.find((option) => option.id === acceleratorId)?.label
}

export function formatCustomInstanceTypeDetail(config: CustomInstanceTypeConfig): string {
  const nicLabel =
    config.networkInterfaces === 1 ? '1 NIC' : `${config.networkInterfaces} NICs`
  return [`${config.vcpus} vCPU`, `${config.memoryGb} GB`, nicLabel].join(' · ')
}

export function formatCustomInstanceTypeLabel(config: CustomInstanceTypeConfig): string {
  const detail = formatCustomInstanceTypeDetail(config)
  const accelerator = getCustomInstanceTypeAcceleratorLabel(config.acceleratorId)
  return accelerator ? `Custom (${detail} · ${accelerator})` : `Custom (${detail})`
}

/** Demo rates aligned to Small/Medium/Large presets ($0.06/vCPU + $0.015/GB). */
const CUSTOM_INSTANCE_RATE_PER_VCPU = 0.06
const CUSTOM_INSTANCE_RATE_PER_GB = 0.015
const CUSTOM_INSTANCE_RATE_PER_NIC = 0.02
const CUSTOM_INSTANCE_GPU_RATE: Readonly<Record<string, number>> = {
  none: 0,
  'nvidia-a100-40': 2.8,
  'nvidia-a100-80': 3.6,
  'nvidia-h100-80': 4.5,
  'nvidia-l40s': 1.75,
}

export function calculateCustomInstanceHourlyRate(config: CustomInstanceTypeConfig): number {
  const gpuRate = CUSTOM_INSTANCE_GPU_RATE[config.acceleratorId] ?? 0
  return (
    config.vcpus * CUSTOM_INSTANCE_RATE_PER_VCPU +
    config.memoryGb * CUSTOM_INSTANCE_RATE_PER_GB +
    config.networkInterfaces * CUSTOM_INSTANCE_RATE_PER_NIC +
    gpuRate
  )
}

export function formatCustomInstanceHourlyRate(config: CustomInstanceTypeConfig): string {
  return `$${calculateCustomInstanceHourlyRate(config).toFixed(2)}/hr`
}

export function buildCustomInstanceTypeOption(
  config: CustomInstanceTypeConfig,
): CatalogInstanceTypeOption {
  const accelerator = getCustomInstanceTypeAcceleratorLabel(config.acceleratorId)
  return {
    id: CUSTOM_INSTANCE_TYPE_ID,
    label: 'Custom',
    detail: formatCustomInstanceTypeDetail(config),
    hourlyRate: formatCustomInstanceHourlyRate(config),
    ...(accelerator ? { accelerator } : {}),
  }
}

export function isValidCustomInstanceTypeConfig(config: CustomInstanceTypeConfig): boolean {
  return (
    Number.isFinite(config.vcpus) &&
    config.vcpus >= 1 &&
    Number.isFinite(config.memoryGb) &&
    config.memoryGb >= 1 &&
    Number.isFinite(config.networkInterfaces) &&
    config.networkInterfaces >= 1
  )
}

export type CatalogDiskImageOption = {
  id: string
  label: string
  detail: string
}

/** Support lifecycle shown when choosing a cluster version in the publish wizard. */
export type CatalogClusterVersionLifecycle = 'active' | 'deprecated'

/**
 * Whether tenants can change OpenShift version when provisioning from this catalog item.
 * Defaults to locked when omitted (legacy catalog items).
 */
export type CatalogClusterVersionMode = 'locked' | 'editable'

export function getCatalogClusterVersionModeLabel(mode: CatalogClusterVersionMode): string {
  return mode === 'editable' ? 'Editable' : 'Locked'
}

export function resolveCatalogClusterVersionMode(
  mode: CatalogClusterVersionMode | undefined | null,
): CatalogClusterVersionMode {
  return mode === 'editable' ? 'editable' : 'locked'
}

/**
 * Whether tenants can change default node set / host type when provisioning.
 * Defaults to locked when omitted (legacy catalog items).
 */
export type CatalogClusterNodeTopologyMode = 'locked' | 'editable'

export function getCatalogClusterNodeTopologyModeLabel(
  mode: CatalogClusterNodeTopologyMode,
): string {
  return mode === 'editable' ? 'Editable' : 'Locked'
}

export function resolveCatalogClusterNodeTopologyMode(
  mode: CatalogClusterNodeTopologyMode | undefined | null,
): CatalogClusterNodeTopologyMode {
  return mode === 'editable' ? 'editable' : 'locked'
}

/** Default worker node set advertised on a Cluster catalog item. */
export type CatalogClusterNodeSetOption = {
  id: string
  label: string
  detail: string
}

/** Host type options for the default node set. */
export type CatalogClusterHostTypeOption = {
  id: string
  label: string
  detail: string
}

export const CATALOG_CLUSTER_NODE_SET_OPTIONS: ReadonlyArray<CatalogClusterNodeSetOption> = [
  {
    id: 'fc430-worker',
    label: 'fc430 · worker',
    detail: 'General-purpose workers · size 1–4',
  },
  {
    id: 'fc430-infra',
    label: 'fc430 · infra',
    detail: 'Infrastructure workloads · routers, registry, monitoring',
  },
  {
    id: 'fc430-gpu',
    label: 'fc430 · gpu',
    detail: 'GPU workers · AI training and inference',
  },
]

export const CATALOG_CLUSTER_HOST_TYPE_OPTIONS: ReadonlyArray<CatalogClusterHostTypeOption> = [
  {
    id: 'standard-host',
    label: 'standard-host',
    detail: 'CPU-balanced bare metal for general cluster nodes',
  },
  {
    id: 'gpu-host',
    label: 'gpu-host',
    detail: 'GPU-capable hosts for accelerated workloads',
  },
  {
    id: 'storage-host',
    label: 'storage-host',
    detail: 'High-capacity storage hosts for data-intensive nodes',
  },
]

export const DEFAULT_CLUSTER_NODE_SET_ID = 'fc430-worker'
export const DEFAULT_CLUSTER_HOST_TYPE_ID = 'standard-host'

export function getCatalogClusterNodeSetOptions(): CatalogClusterNodeSetOption[] {
  return [...CATALOG_CLUSTER_NODE_SET_OPTIONS]
}

export function getCatalogClusterHostTypeOptions(): CatalogClusterHostTypeOption[] {
  return [...CATALOG_CLUSTER_HOST_TYPE_OPTIONS]
}

export function getCatalogClusterNodeSetOption(
  idOrLabel: string | undefined | null,
): CatalogClusterNodeSetOption | undefined {
  const needle = idOrLabel?.trim()
  if (!needle) {
    return undefined
  }
  return CATALOG_CLUSTER_NODE_SET_OPTIONS.find(
    (option) =>
      option.id === needle ||
      option.label === needle ||
      option.label.toLowerCase() === needle.toLowerCase(),
  )
}

export function getCatalogClusterHostTypeOption(
  idOrLabel: string | undefined | null,
): CatalogClusterHostTypeOption | undefined {
  const needle = idOrLabel?.trim()
  if (!needle) {
    return undefined
  }
  return CATALOG_CLUSTER_HOST_TYPE_OPTIONS.find(
    (option) =>
      option.id === needle ||
      option.label === needle ||
      option.label.toLowerCase() === needle.toLowerCase(),
  )
}

export function formatClusterNodeSetLabel(idOrLabel: string | undefined | null): string {
  return (
    getCatalogClusterNodeSetOption(idOrLabel)?.label ??
    idOrLabel?.trim() ??
    CATALOG_CLUSTER_NODE_SET_OPTIONS[0].label
  )
}

export function formatClusterHostTypeLabel(idOrLabel: string | undefined | null): string {
  return (
    getCatalogClusterHostTypeOption(idOrLabel)?.label ??
    idOrLabel?.trim() ??
    CATALOG_CLUSTER_HOST_TYPE_OPTIONS[0].label
  )
}

/** OpenShift version advertised on a Cluster as a Service catalog item. */
export type CatalogClusterVersionOption = {
  id: string
  label: string
  detail: string
  releaseImage: string
  lifecycle: CatalogClusterVersionLifecycle
  /** Demo highlights shown when the version card is expanded in the publish wizard. */
  features: readonly string[]
}

export function getCatalogClusterVersionLifecycleMeta(
  lifecycle: CatalogClusterVersionLifecycle,
): { color: 'green' | 'orange'; text: string } {
  switch (lifecycle) {
    case 'active':
      return { color: 'green', text: 'Active' }
    case 'deprecated':
      return { color: 'orange', text: 'Deprecated' }
  }
}

/** Present provisioning templates as the "how", not the hardware SKU. */
export type CatalogProvisioningParameter = {
  name: string
  description: string
}

export type CatalogProvisioningPresentation = {
  title: string
  description: string
  parameters: CatalogProvisioningParameter[]
}

function isGpuProvisioningTemplate(template: SavedMasterTemplate): boolean {
  const hardwareProfile = DISCOVERED_HARDWARE_PROFILES.find(
    (profile) => profile.id === template.hardwareProfileId,
  )
  return (
    hardwareProfile?.category === 'gpu-ai' || /passthrough/i.test(template.templateName)
  )
}

/**
 * Demo templates do not expose extra tenant-facing parameters beyond instance type
 * and disk image. Keep `parameters` empty unless you can defend each knob in a demo.
 */
function getBareMetalProvisioningPresentation(
  isGpu: boolean,
): CatalogProvisioningPresentation {
  if (isGpu) {
    return {
      title: 'gpu-bare-metal-template',
      description:
        'Provisions GPU bare metal hosts using the Metal3 Baremetal Operator, including BMC power control and OS imaging for AI training fleets.',
      parameters: [],
    }
  }

  return {
    title: 'standard-bare-metal-template',
    description:
      'Provisions bare metal hosts using the Metal3 Baremetal Operator, including BMC power control and OS imaging for standard compute workloads.',
    parameters: [],
  }
}

function getVirtualMachineProvisioningPresentation(
  isGpu: boolean,
): CatalogProvisioningPresentation {
  if (isGpu) {
    return {
      title: 'gpu-passthrough-template',
      description:
        'Provisions VMs with dedicated GPU passthrough via VFIO binding on GPU-capable hosts.',
      parameters: [],
    }
  }

  return {
    title: 'standard-vm-template',
    description:
      'Provisions virtual machines using the core Ansible role, including networking, storage, and cloud-init seeding.',
    parameters: [],
  }
}

function getClusterProvisioningPresentation(
  isGpu: boolean,
): CatalogProvisioningPresentation {
  if (isGpu) {
    return {
      title: 'gpu-cluster-template',
      description:
        'Provisions OpenShift clusters with GPU worker pools and installs the GPU operator stack after bootstrap.',
      parameters: [],
    }
  }

  return {
    title: 'standard-cluster-template',
    description:
      'Provisions OpenShift clusters using the Assisted Installer / Hive path, including control-plane bootstrap and worker join.',
    parameters: [],
  }
}

function getModelProvisioningPresentation(
  isGpu: boolean,
): CatalogProvisioningPresentation {
  if (isGpu) {
    return {
      title: 'gpu-model-serving-template',
      description:
        'Deploys model-serving runtimes on GPU-backed capacity, including accelerator scheduling and model artifact pull.',
      parameters: [],
    }
  }

  return {
    title: 'standard-model-serving-template',
    description:
      'Deploys model-serving runtimes on CPU capacity, including runtime image pull, endpoint exposure, and health probes.',
    parameters: [],
  }
}

export function getProvisioningTemplatePresentation(
  template: SavedMasterTemplate,
  serviceId: CatalogServiceId | null = 'virtual-machine',
): CatalogProvisioningPresentation {
  const isGpu = isGpuProvisioningTemplate(template)

  if (serviceId === 'baremetal') {
    return getBareMetalProvisioningPresentation(isGpu)
  }
  if (serviceId === 'cluster') {
    if (template.templateRefId.startsWith('cl-') && template.templateName.trim()) {
      return {
        title: template.templateName,
        description:
          template.description.trim() || getClusterProvisioningPresentation(isGpu).description,
        parameters: [],
      }
    }
    return getClusterProvisioningPresentation(isGpu)
  }
  if (serviceId === 'models') {
    return getModelProvisioningPresentation(isGpu)
  }

  return getVirtualMachineProvisioningPresentation(isGpu)
}

export const CATALOG_INSTANCE_TYPE_OPTIONS: ReadonlyArray<CatalogInstanceTypeOption> = [
  {
    id: 'small',
    label: 'Small',
    detail: '16 vCPU · 128 GB',
    accelerator: 'NVIDIA A100 40 GB',
    hourlyRate: '$5.68/hr',
  },
  {
    id: 'medium',
    label: 'Medium',
    detail: '32 vCPU · 256 GB',
    accelerator: 'NVIDIA A100 40 GB',
    hourlyRate: '$8.56/hr',
  },
  {
    id: 'large',
    label: 'Large',
    detail: '64 vCPU · 512 GB',
    accelerator: 'NVIDIA A100 80 GB',
    hourlyRate: '$15.12/hr',
  },
]

/** CPU/memory-only presets for virtual machine catalog items. */
export const CATALOG_VM_INSTANCE_TYPE_OPTIONS: ReadonlyArray<CatalogInstanceTypeOption> = [
  { id: 'small', label: 'Small', detail: '4 vCPU · 16 GB', hourlyRate: '$0.48/hr' },
  { id: 'medium', label: 'Medium', detail: '8 vCPU · 32 GB', hourlyRate: '$0.96/hr' },
  { id: 'large', label: 'Large', detail: '16 vCPU · 64 GB', hourlyRate: '$1.92/hr' },
]

export const CATALOG_DISK_IMAGE_OPTIONS: ReadonlyArray<CatalogDiskImageOption> = [
  {
    id: 'rhel-10',
    label: 'RHEL 10',
    detail: 'Red Hat Enterprise Linux · x86_64',
  },
  {
    id: 'rhel-9.4',
    label: 'RHEL 9.4',
    detail: 'Red Hat Enterprise Linux · x86_64',
  },
  {
    id: 'ubuntu-22.04',
    label: 'Ubuntu 22.04 LTS',
    detail: 'Ubuntu · x86_64',
  },
  {
    id: 'rocky-9.3',
    label: 'Rocky Linux 9.3',
    detail: 'Rocky Linux · x86_64',
  },
]

export function getCatalogInstanceTypeOptions(
  serviceId: CatalogServiceId | null,
): CatalogInstanceTypeOption[] {
  if (serviceId === 'cluster') {
    return [
      { id: 'ocp-small', label: 'OpenShift small', detail: '3 control plane · 3 workers' },
      { id: 'ocp-medium', label: 'OpenShift medium', detail: '3 control plane · 6 workers' },
      { id: 'ocp-gpu', label: 'OpenShift GPU', detail: '3 control plane · 2 GPU workers' },
    ]
  }

  if (serviceId === 'models') {
    return [
      { id: 'model-small', label: 'Inference small', detail: '2 vCPU · 8 GiB · 1 replica' },
      { id: 'model-medium', label: 'Inference medium', detail: '4 vCPU · 16 GiB · 2 replicas' },
    ]
  }

  const presets =
    serviceId === 'virtual-machine'
      ? CATALOG_VM_INSTANCE_TYPE_OPTIONS
      : CATALOG_INSTANCE_TYPE_OPTIONS

  // Bare metal and models-style presets only — Custom is VM-only.
  if (serviceId === 'virtual-machine') {
    return [
      ...presets,
      {
        id: CUSTOM_INSTANCE_TYPE_ID,
        label: 'Custom',
        detail: 'Set CPUs, memory, NICs, and GPUs',
      },
    ]
  }

  return [...presets]
}

export function getCatalogDiskImageOptions(): CatalogDiskImageOption[] {
  return [...CATALOG_DISK_IMAGE_OPTIONS]
}

export const CATALOG_CLUSTER_VERSION_OPTIONS: ReadonlyArray<CatalogClusterVersionOption> = [
  {
    id: 'ocp-4.21',
    label: 'OpenShift 4.21',
    detail: 'Newest stream · GPU scheduling and Node Sets defaults',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.21.0-multi',
    lifecycle: 'active',
    features: [
      'Latest Node Sets defaults for Cluster as a Service',
      'Enhanced GPU scheduling for AI training fleets',
      'Multi-arch control plane (x86_64 and aarch64)',
      'Newest platform operators and certified catalog',
    ],
  },
  {
    id: 'ocp-4.20',
    label: 'OpenShift 4.20',
    detail: 'Current stable · improved bare-metal installer path',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.20.0-multi',
    lifecycle: 'active',
    features: [
      'Stable Node Sets provisioning path',
      'Improved bare-metal installer hooks',
      'Multi-arch release image',
      'Full operator catalog compatibility',
    ],
  },
  {
    id: 'ocp-4.19',
    label: 'OpenShift 4.19',
    detail: 'Catalog default · validated Node Sets and Machine Config',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.19.0-multi',
    lifecycle: 'active',
    features: [
      'Recommended default for new Cluster as a Service catalogs',
      'Validated Node Sets and Machine Config defaults',
      'Multi-arch release image',
      'Broad operator ecosystem support',
    ],
  },
  {
    id: 'ocp-4.18',
    label: 'OpenShift 4.18',
    detail: 'Long-lived production · mature operators and tenant flows',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.18.0-multi',
    lifecycle: 'active',
    features: [
      'Long-lived active stream for production catalogs',
      'Mature bare-metal and virtualization operators',
      'Multi-arch release image',
      'Compatible with existing tenant launch flows',
    ],
  },
  {
    id: 'ocp-4.17',
    label: 'OpenShift 4.17',
    detail: 'Maintenance only · prefer upgrade to 4.18 or newer',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.17.0-multi',
    lifecycle: 'deprecated',
    features: [
      'Maintenance updates only',
      'Node Sets still supported for existing catalogs',
      'Prefer upgrade path to 4.18 or newer',
      'Multi-arch release image',
    ],
  },
  {
    id: 'ocp-4.16',
    label: 'OpenShift 4.16',
    detail: 'Extended life ending · not recommended for new catalogs',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.16.0-multi',
    lifecycle: 'deprecated',
    features: [
      'Extended life ending soon',
      'Limited new operator certifications',
      'Prefer 4.18 or newer for new catalogs',
      'Multi-arch release image',
    ],
  },
]

export function getCatalogClusterVersionOptions(): CatalogClusterVersionOption[] {
  return [...CATALOG_CLUSTER_VERSION_OPTIONS]
}

/** Newest cluster version in the publish wizard (options are ordered newest-first). */
export function getLatestCatalogClusterVersionId(): string {
  return CATALOG_CLUSTER_VERSION_OPTIONS[0]?.id ?? ''
}

/** Default cluster version for seeded Node Sets demo catalog item. */
export const DEFAULT_CLUSTER_CATALOG_VERSION_ID = 'ocp-4.19'

export function getCatalogClusterVersionOption(
  idOrLabel: string | undefined | null,
): CatalogClusterVersionOption | undefined {
  const needle = idOrLabel?.trim()
  if (!needle) {
    return undefined
  }
  const normalized = needle.replace(/^Red Hat\s+/i, '')
  return CATALOG_CLUSTER_VERSION_OPTIONS.find((option) => {
    const legacyLabel = `Red Hat ${option.label}`
    return (
      option.id === needle ||
      option.label === needle ||
      option.label === normalized ||
      option.label.toLowerCase() === needle.toLowerCase() ||
      option.label.toLowerCase() === normalized.toLowerCase() ||
      legacyLabel === needle ||
      legacyLabel.toLowerCase() === needle.toLowerCase()
    )
  })
}

export function getReleaseImageForClusterVersion(idOrLabel: string | undefined | null): string {
  const needle = idOrLabel?.trim()
  if (!needle) {
    return (
      CATALOG_CLUSTER_VERSION_OPTIONS.find(
        (option) => option.id === DEFAULT_CLUSTER_CATALOG_VERSION_ID,
      )?.releaseImage ?? CATALOG_CLUSTER_VERSION_OPTIONS[0].releaseImage
    )
  }

  const matched = getCatalogClusterVersionOption(needle)
  if (matched) {
    return matched.releaseImage
  }

  // Already a release image reference (legacy launch form defaults).
  if (needle.includes('/') || needle.includes(':')) {
    return needle
  }

  return (
    CATALOG_CLUSTER_VERSION_OPTIONS.find(
      (option) => option.id === DEFAULT_CLUSTER_CATALOG_VERSION_ID,
    )?.releaseImage ?? CATALOG_CLUSTER_VERSION_OPTIONS[0].releaseImage
  )
}

export function formatClusterPlatformLabel(idOrLabel: string | undefined | null): string {
  return (
    getCatalogClusterVersionOption(idOrLabel)?.label ??
    idOrLabel?.trim()?.replace(/^Red Hat\s+/i, '') ??
    'OpenShift'
  )
}

function formatTemplateParamLabel(key: string): string {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function buildDefaultCatalogFieldPolicies(options: {
  provisionerParameters?: CatalogProvisioningParameter[]
}): CatalogFieldPolicy[] {
  return (options.provisionerParameters ?? []).map((parameter) => ({
    id: parameter.name,
    key: parameter.name,
    label: formatTemplateParamLabel(parameter.name),
    category: 'template-param' as const,
    defaultValue: parameter.description,
    mode: 'locked' as const,
  }))
}

export function formatCatalogFieldPolicyMode(mode: CatalogFieldPolicyMode): 'Fixed' | 'Editable' {
  return mode === 'locked' ? 'Fixed' : 'Editable'
}

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

export type CatalogDiskImageOption = {
  id: string
  label: string
  detail: string
}

/** Support lifecycle shown when choosing a cluster version in the publish wizard. */
export type CatalogClusterVersionLifecycle = 'active' | 'deprecated' | 'obsolete'

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
): { color: 'green' | 'orange' | 'grey'; text: string } {
  switch (lifecycle) {
    case 'active':
      return { color: 'green', text: 'Active' }
    case 'deprecated':
      return { color: 'orange', text: 'Deprecated' }
    case 'obsolete':
      return { color: 'grey', text: 'Obsolete' }
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
    return getClusterProvisioningPresentation(isGpu)
  }
  if (serviceId === 'models') {
    return getModelProvisioningPresentation(isGpu)
  }

  return getVirtualMachineProvisioningPresentation(isGpu)
}

export const CATALOG_INSTANCE_TYPE_OPTIONS: ReadonlyArray<CatalogInstanceTypeOption> = [
  { id: 'small', label: 'Small', detail: '4 vCPU · 16 GB', hourlyRate: '$0.48/hr' },
  { id: 'medium', label: 'Medium', detail: '8 vCPU · 32 GB', hourlyRate: '$0.96/hr' },
  { id: 'large', label: 'Large', detail: '16 vCPU · 64 GB', hourlyRate: '$1.92/hr' },
  {
    id: 'gpu-large',
    label: 'GPU Large',
    detail: '8 vCPU · 64 GB',
    accelerator: 'NVIDIA A100 40 GB',
    hourlyRate: '$4.25/hr',
  },
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

  return [...CATALOG_INSTANCE_TYPE_OPTIONS]
}

export function getCatalogDiskImageOptions(): CatalogDiskImageOption[] {
  return [...CATALOG_DISK_IMAGE_OPTIONS]
}

export const CATALOG_CLUSTER_VERSION_OPTIONS: ReadonlyArray<CatalogClusterVersionOption> = [
  {
    id: 'ocp-4.21',
    label: 'Red Hat OpenShift 4.21',
    detail: 'OpenShift Container Platform · multi-arch',
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
    label: 'Red Hat OpenShift 4.20',
    detail: 'OpenShift Container Platform · multi-arch',
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
    label: 'Red Hat OpenShift 4.19',
    detail: 'OpenShift Container Platform · multi-arch',
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
    label: 'Red Hat OpenShift 4.18',
    detail: 'OpenShift Container Platform · multi-arch',
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
    label: 'Red Hat OpenShift 4.17',
    detail: 'OpenShift Container Platform · multi-arch',
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
    label: 'Red Hat OpenShift 4.16',
    detail: 'OpenShift Container Platform · multi-arch',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.16.0-multi',
    lifecycle: 'deprecated',
    features: [
      'Extended life ending soon',
      'Limited new operator certifications',
      'Prefer 4.18 or newer for new catalogs',
      'Multi-arch release image',
    ],
  },
  {
    id: 'ocp-4.15',
    label: 'Red Hat OpenShift 4.15',
    detail: 'OpenShift Container Platform · multi-arch',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.15.0-multi',
    lifecycle: 'obsolete',
    features: [
      'End of standard support',
      'Security fixes only where available',
      'Not recommended for new catalogs',
      'Migrate workloads to an active version',
    ],
  },
  {
    id: 'ocp-4.14',
    label: 'Red Hat OpenShift 4.14',
    detail: 'OpenShift Container Platform · multi-arch',
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.14.0-multi',
    lifecycle: 'obsolete',
    features: [
      'End of life',
      'No new platform features',
      'Not suitable for new production catalogs',
      'Migrate to an active OpenShift version',
    ],
  },
]

export function getCatalogClusterVersionOptions(): CatalogClusterVersionOption[] {
  return [...CATALOG_CLUSTER_VERSION_OPTIONS]
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
  return CATALOG_CLUSTER_VERSION_OPTIONS.find(
    (option) =>
      option.id === needle ||
      option.label === needle ||
      option.label.toLowerCase() === needle.toLowerCase(),
  )
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
    idOrLabel?.trim() ??
    'Red Hat OpenShift'
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

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
      title: 'GPU Bare Metal Template',
      description:
        'Provisions GPU bare metal hosts using the Metal3 Baremetal Operator, including BMC power control and OS imaging for AI training fleets.',
      parameters: [],
    }
  }

  return {
    title: 'Standard Bare Metal Template',
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
      title: 'GPU Passthrough Template',
      description:
        'Provisions VMs with dedicated GPU passthrough via VFIO binding on GPU-capable hosts.',
      parameters: [],
    }
  }

  return {
    title: 'Standard VM Template',
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
      title: 'GPU Cluster Template',
      description:
        'Provisions OpenShift clusters with GPU worker pools and installs the GPU operator stack after bootstrap.',
      parameters: [],
    }
  }

  return {
    title: 'Standard Cluster Template',
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
      title: 'GPU Model Serving Template',
      description:
        'Deploys model-serving runtimes on GPU-backed capacity, including accelerator scheduling and model artifact pull.',
      parameters: [],
    }
  }

  return {
    title: 'Standard Model Serving Template',
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

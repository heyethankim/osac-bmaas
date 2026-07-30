import type { CatalogSpecRow } from '../catalog/catalogSpecs'
import { resolveCatalogSpecRows } from '../catalog/catalogSpecs'
import type { CatalogServiceId } from '../providerSetup/templateDemo'

export type TenantInstanceStatus = 'provisioning' | 'restarting' | 'running' | 'failed'

export type TenantInstanceScopeKind = 'organization' | 'project'

export type TenantInstanceNetworking = {
  enabled: boolean
  virtualNetwork: string
  subnet: string
  securityGroup: string
}

export type TenantInstance = {
  id: string
  name: string
  catalogItemDisplayName: string
  /** Catalog service that produced this instance (drives icon and specs). */
  serviceId?: CatalogServiceId
  hardwareProfile: string
  osImage: string
  /** Combined summary for legacy list views; prefer `networking` in details. */
  networkLabel: string
  networking?: TenantInstanceNetworking
  gpuLabel: string
  /** Service-aware configuration rows captured at launch (Cluster, etc.). */
  specRows?: CatalogSpecRow[]
  /** Scope label: project name when project-scoped, organization name otherwise. */
  projectName: string
  scopeKind: TenantInstanceScopeKind
  status: TenantInstanceStatus
  createdAt: string
  provisionedAt: string | null
}

export function getTenantInstanceServiceId(instance: TenantInstance): CatalogServiceId {
  if (instance.serviceId) {
    return instance.serviceId
  }

  // Legacy instances launched before serviceId was persisted.
  if (/cluster/i.test(instance.catalogItemDisplayName)) {
    return 'cluster'
  }
  if (/\bvm\b|virtual machine/i.test(instance.catalogItemDisplayName)) {
    return 'virtual-machine'
  }

  return 'baremetal'
}

/** Spec rows for cards and drawers; prefers rows captured at launch. */
export function getTenantInstanceSpecRows(instance: TenantInstance): CatalogSpecRow[] {
  if (instance.specRows?.length) {
    return instance.specRows
  }

  const serviceId = getTenantInstanceServiceId(instance)

  if (serviceId === 'cluster' || serviceId === 'virtual-machine') {
    return resolveCatalogSpecRows(
      { serviceId, templateRefId: '', templateName: '' },
      { includeDetails: true },
    )
  }

  return [
    { label: 'Hardware', value: instance.hardwareProfile },
    { label: 'OS image', value: instance.osImage },
    { label: 'GPU', value: instance.gpuLabel },
  ]
}

/** Demo latency before a restarted instance returns to Running. */
export const TENANT_INSTANCE_RESTART_DURATION_MS = 2500

export function generateTenantInstanceId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `instance_${suffix}`
}

export function formatTenantInstanceCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Title-caps hyphenated instance names for display (e.g. bm-server-02 → BM-Server-02). */
export function formatTenantInstanceName(name: string): string {
  const acronyms = new Set(['ocp', 'bm', 'vm'])

  return name
    .split('-')
    .map((part) => {
      if (/^\d+$/.test(part)) {
        return part
      }
      if (part.length <= 2 || acronyms.has(part.toLowerCase())) {
        return part.toUpperCase()
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join('-')
}

export function getTenantInstanceStatusLabel(status: TenantInstanceStatus): string {
  switch (status) {
    case 'running':
      return 'Running'
    case 'provisioning':
      return 'Provisioning'
    case 'restarting':
      return 'Restarting'
    case 'failed':
      return 'Failed'
    default:
      return status
  }
}

export function getTenantInstanceActions(
  instance: TenantInstance,
  onTerminate: (instance: TenantInstance) => void,
  onViewDetails?: (instance: TenantInstance) => void,
  onRestart?: (instanceId: string) => void,
): Array<{
  title: string
  isAriaDisabled?: boolean
  isDanger?: boolean
  onClick: () => void
}> {
  const isRunning = instance.status === 'running'
  const isBusy = instance.status === 'provisioning' || instance.status === 'restarting'

  return [
    {
      title: 'View details',
      onClick: () => {
        onViewDetails?.(instance)
      },
    },
    {
      title: 'Restart instance',
      isAriaDisabled: !isRunning,
      onClick: () => {
        onRestart?.(instance.id)
      },
    },
    {
      title: 'Terminate instance',
      isDanger: true,
      isAriaDisabled: isBusy,
      onClick: () => {
        onTerminate(instance)
      },
    },
  ]
}

export function getTenantInstanceScopeFieldLabel(
  instance: TenantInstance,
): 'Organization' | 'Project' {
  return instance.scopeKind === 'organization' ? 'Organization' : 'Project'
}

/** Stable demo instance IDs so ensure can re-seed without duplicates. */
export const DEMO_TENANT_BARE_METAL_INSTANCE_ID = 'instance_demo_bm_01'
export const DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID = 'instance_demo_vm_01'

export function createDemoTenantBareMetalInstance(organizationName: string): TenantInstance {
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString()

  return {
    id: DEMO_TENANT_BARE_METAL_INSTANCE_ID,
    name: 'BM-Server-01',
    catalogItemDisplayName: 'Bare Metal - GPU Training Server',
    serviceId: 'baremetal',
    hardwareProfile: 'Dell PowerEdge R750',
    osImage: 'RHEL 9.4',
    networkLabel: 'Tenant workload VNet / bm-compute-a · allow-ssh-https',
    networking: {
      enabled: true,
      virtualNetwork: 'Tenant workload VNet',
      subnet: 'bm-compute-a',
      securityGroup: 'allow-ssh-https',
    },
    gpuLabel: 'CPU-only',
    specRows: [
      { label: 'CPU', value: 'Intel Xeon Gold 6338 × 2' },
      { label: 'RAM', value: '512 GB DDR4' },
      { label: 'GPU', value: 'CPU-only' },
      { label: 'OS image', value: 'RHEL 9.4' },
    ],
    projectName: organizationName,
    scopeKind: 'organization',
    status: 'running',
    createdAt,
    provisionedAt: createdAt,
  }
}

export function createDemoTenantVirtualMachineInstance(organizationName: string): TenantInstance {
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()
  const specRows = resolveCatalogSpecRows(
    { serviceId: 'virtual-machine', templateRefId: '', templateName: '' },
    { includeDetails: true },
  )

  return {
    id: DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID,
    name: 'VM-Instance-01',
    catalogItemDisplayName: 'VM with Configurable Network Attachments',
    serviceId: 'virtual-machine',
    hardwareProfile:
      specRows.find((row) => row.label === 'Instance type')?.value ?? 'Standard VM',
    osImage: specRows.find((row) => row.label === 'OS image')?.value ?? 'RHEL 9.4',
    networkLabel: 'Tenant workload VNet / bm-compute-a · allow-ssh-https',
    networking: {
      enabled: true,
      virtualNetwork: 'Tenant workload VNet',
      subnet: 'bm-compute-a',
      securityGroup: 'allow-ssh-https',
    },
    gpuLabel: specRows.find((row) => row.label === 'Size')?.value ?? 'medium',
    specRows,
    projectName: organizationName,
    scopeKind: 'organization',
    status: 'running',
    createdAt,
    provisionedAt: createdAt,
  }
}

/** Normalize legacy instances that only stored a combined networkLabel. */
export function resolveTenantInstanceNetworking(
  instance: TenantInstance,
): TenantInstanceNetworking {
  if (instance.networking) {
    return instance.networking
  }

  if (!instance.networkLabel || instance.networkLabel === 'Networking off') {
    return {
      enabled: false,
      virtualNetwork: '',
      subnet: '',
      securityGroup: '',
    }
  }

  const [placement = '', securityGroup = ''] = instance.networkLabel.split(' · ')
  const [virtualNetwork = '', subnet = ''] = placement.split(' / ')

  return {
    enabled: true,
    virtualNetwork: virtualNetwork.trim(),
    subnet: subnet.trim(),
    securityGroup: securityGroup.trim(),
  }
}

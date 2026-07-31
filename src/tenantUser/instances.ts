import type { CatalogSpecRow } from '../catalog/catalogSpecs'
import { resolveCatalogSpecRows } from '../catalog/catalogSpecs'
import type { CatalogServiceId } from '../providerSetup/templateDemo'

export type TenantInstanceStatus =
  | 'provisioning'
  | 'restarting'
  | 'running'
  | 'stopped'
  | 'failed'

export type TenantInstanceScopeKind = 'organization' | 'project'

export type TenantInstanceCondition = {
  type: string
  status: 'True' | 'False'
  reason: string
  message: string
  lastTransitionTime: string | null
}

export type TenantInstanceNetworking = {
  enabled: boolean
  virtualNetwork: string
  subnet: string
  securityGroup: string
}

export type TenantClusterNodeSet = {
  id: string
  hostType: string
  nodeCount: number
}

export type TenantClusterConfig = {
  releaseImage: string
  podCidr: string
  serviceCidr: string
  nodeSets: TenantClusterNodeSet[]
  catalogShortName?: string
  creator?: string
}

export type TenantVmConfig = {
  instanceType: string
  containerDiskImage: string
  bootDiskSizeGiB: number
  sshPublicKey: string
  internalIp: string
  publicIp: string | null
  publicIpFamily?: 'IPv4' | 'IPv6' | null
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
  /** Cluster launch details for the Services detail drawer. */
  clusterConfig?: TenantClusterConfig
  /** Virtual machine launch and networking details. */
  vmConfig?: TenantVmConfig
  /** SSH public key captured at bare metal launch. */
  sshPublicKey?: string
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
    case 'stopped':
      return 'Stopped'
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
  clusterActions?: {
    onDownloadKubeconfig?: (instance: TenantInstance) => void
    onViewPassword?: (instance: TenantInstance) => void
  },
  powerActions?: {
    onStart?: (instanceId: string) => void
    onStop?: (instanceId: string) => void
  },
  vmActions?: {
    onAttachPublicIp?: (instance: TenantInstance) => void
  },
): Array<{
  title: string
  isAriaDisabled?: boolean
  isDanger?: boolean
  onClick: () => void
}> {
  const serviceId = getTenantInstanceServiceId(instance)
  const isCluster = serviceId === 'cluster'
  const isBareMetal = serviceId === 'baremetal'
  const isVm = serviceId === 'virtual-machine'
  const isRunning = instance.status === 'running'
  const isStopped = instance.status === 'stopped'
  const isBusy = instance.status === 'provisioning' || instance.status === 'restarting'
  const hasPublicIp = Boolean(resolveVmConfig(instance).publicIp)

  if (isCluster) {
    return [
      {
        title: 'View details',
        onClick: () => {
          onViewDetails?.(instance)
        },
      },
      {
        title: 'Download kubeconfig',
        isAriaDisabled: !isRunning,
        onClick: () => {
          clusterActions?.onDownloadKubeconfig?.(instance)
        },
      },
      {
        title: 'View password',
        isAriaDisabled: !isRunning,
        onClick: () => {
          clusterActions?.onViewPassword?.(instance)
        },
      },
      {
        title: 'Delete',
        isDanger: true,
        isAriaDisabled: isBusy,
        onClick: () => {
          onTerminate(instance)
        },
      },
    ]
  }

  if (isBareMetal) {
    return [
      {
        title: 'View details',
        onClick: () => {
          onViewDetails?.(instance)
        },
      },
      {
        title: 'Start',
        isAriaDisabled: !isStopped,
        onClick: () => {
          powerActions?.onStart?.(instance.id)
        },
      },
      {
        title: 'Stop',
        isAriaDisabled: !isRunning,
        onClick: () => {
          powerActions?.onStop?.(instance.id)
        },
      },
      {
        title: 'Restart',
        isAriaDisabled: !isRunning && !isStopped,
        onClick: () => {
          onRestart?.(instance.id)
        },
      },
      {
        title: 'Terminate',
        isDanger: true,
        isAriaDisabled: isBusy,
        onClick: () => {
          onTerminate(instance)
        },
      },
    ]
  }

  if (isVm) {
    return [
      {
        title: 'View details',
        onClick: () => {
          onViewDetails?.(instance)
        },
      },
      {
        title: 'Stop',
        isAriaDisabled: !isRunning,
        onClick: () => {
          powerActions?.onStop?.(instance.id)
        },
      },
      {
        title: 'Restart',
        isAriaDisabled: !isRunning && !isStopped,
        onClick: () => {
          onRestart?.(instance.id)
        },
      },
      {
        title: 'Attach public IP',
        isAriaDisabled: isBusy || hasPublicIp,
        onClick: () => {
          vmActions?.onAttachPublicIp?.(instance)
        },
      },
      {
        title: 'Delete',
        isDanger: true,
        isAriaDisabled: isBusy,
        onClick: () => {
          onTerminate(instance)
        },
      },
    ]
  }

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

const DEFAULT_BARE_METAL_SSH_PUBLIC_KEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBJACfzqANDyWlygNn0FWP7YBZ6XLt+XPGpSw5PyknOW brotman@redhat.com'

export function resolveBareMetalSshPublicKey(instance: TenantInstance): string {
  return instance.sshPublicKey?.trim() || DEFAULT_BARE_METAL_SSH_PUBLIC_KEY
}

export function getBareMetalInstanceConditions(
  instance: TenantInstance,
): TenantInstanceCondition[] {
  const isRunning = instance.status === 'running'
  const isRestarting = instance.status === 'restarting'
  const isFailed = instance.status === 'failed'
  const isStopped = instance.status === 'stopped'
  const isProvisioned =
    isRunning || isRestarting || isStopped || isFailed || Boolean(instance.provisionedAt)
  const transitionTime = instance.provisionedAt ?? instance.createdAt

  return [
    {
      type: 'Provisioned',
      status: isProvisioned ? 'True' : 'False',
      reason: isProvisioned ? 'ProvisionSucceeded' : '—',
      message: isProvisioned ? 'Instance capacity was reserved and imaged.' : '—',
      lastTransitionTime: isProvisioned ? transitionTime : null,
    },
    {
      type: 'Configuration applied',
      status: isProvisioned ? 'True' : 'False',
      reason: isProvisioned ? 'ConfigApplied' : '—',
      message: isProvisioned ? 'SSH key and launch settings were applied.' : '—',
      lastTransitionTime: isProvisioned ? transitionTime : null,
    },
    {
      type: 'Ready',
      status: isRunning ? 'True' : 'False',
      reason: isRunning ? 'InstanceReady' : isStopped ? 'InstanceStopped' : '—',
      message: isRunning
        ? 'Instance is reachable and ready for use.'
        : isStopped
          ? 'Instance is stopped.'
          : '—',
      lastTransitionTime: isRunning || isStopped ? transitionTime : null,
    },
    {
      type: 'Restart in progress',
      status: isRestarting ? 'True' : 'False',
      reason: isRestarting ? 'RestartRequested' : '—',
      message: isRestarting ? 'A restart is currently in progress.' : '—',
      lastTransitionTime: isRestarting ? new Date().toISOString() : null,
    },
    {
      type: 'Restart failed',
      status: 'False',
      reason: '—',
      message: '—',
      lastTransitionTime: null,
    },
    {
      type: 'Restart required',
      status: 'False',
      reason: '—',
      message: '—',
      lastTransitionTime: null,
    },
  ]
}

const DEFAULT_VM_SSH_PUBLIC_KEY = DEFAULT_BARE_METAL_SSH_PUBLIC_KEY

export function resolveVmConfig(instance: TenantInstance): TenantVmConfig {
  if (instance.vmConfig) {
    return instance.vmConfig
  }

  const instanceType =
    instance.specRows?.find((row) => row.label === 'Instance type')?.value ??
    instance.gpuLabel ??
    'small - 1 vCPU, 2 GiB'
  const containerDiskImage =
    instance.specRows?.find((row) => row.label === 'Container disk image')?.value ??
    instance.osImage ??
    'quay.io/containerdisks/fedora:latest'
  const bootDiskLabel = instance.specRows?.find((row) => row.label === 'Boot disk')?.value ?? '120 GiB'
  const bootDiskSizeGiB = Number.parseInt(bootDiskLabel, 10) || 120

  return {
    instanceType,
    containerDiskImage,
    bootDiskSizeGiB,
    sshPublicKey: instance.sshPublicKey?.trim() || DEFAULT_VM_SSH_PUBLIC_KEY,
    internalIp: '10.99.1.11',
    publicIp: null,
    publicIpFamily: null,
  }
}

export function getVmInstanceTypeShortLabel(instanceType: string): string {
  const short = instanceType.split(' - ')[0]?.trim()
  return short || instanceType || 'small'
}

export function getVmInstanceConditions(instance: TenantInstance): TenantInstanceCondition[] {
  const isRunning = instance.status === 'running'
  const isRestarting = instance.status === 'restarting'
  const isFailed = instance.status === 'failed'
  const isStopped = instance.status === 'stopped'
  const isProvisioned =
    isRunning || isRestarting || isStopped || isFailed || Boolean(instance.provisionedAt)
  const transitionTime = instance.provisionedAt ?? instance.createdAt

  return [
    {
      type: 'Configuration applied',
      status: isProvisioned ? 'True' : 'False',
      reason: isProvisioned ? 'AsExpected' : '—',
      message: isProvisioned ? 'Virtual machine configuration was applied.' : '—',
      lastTransitionTime: isProvisioned ? transitionTime : null,
    },
    {
      type: 'Ready',
      status: isRunning ? 'True' : 'False',
      reason: isRunning ? 'AsExpected' : isStopped ? 'InstanceStopped' : '—',
      message: isRunning
        ? 'Virtual machine is ready.'
        : isStopped
          ? 'Virtual machine is stopped.'
          : '—',
      lastTransitionTime: isRunning || isStopped ? transitionTime : null,
    },
    {
      type: 'Restart in progress',
      status: isRestarting ? 'True' : 'False',
      reason: isRestarting ? 'RestartRequested' : '—',
      message: isRestarting ? 'A restart is currently in progress.' : '—',
      lastTransitionTime: isRestarting ? new Date().toISOString() : null,
    },
    {
      type: 'Restart failed',
      status: 'False',
      reason: '—',
      message: '—',
      lastTransitionTime: null,
    },
    {
      type: 'Provisioned',
      status: isProvisioned ? 'True' : 'False',
      reason: isProvisioned ? 'InfrastructureReady' : '—',
      message: isProvisioned ? 'All infrastructure resources provisioned successfully' : '—',
      lastTransitionTime: isProvisioned ? transitionTime : null,
    },
    {
      type: 'Restart required',
      status: 'False',
      reason: isProvisioned ? 'AsExpected' : '—',
      message: '—',
      lastTransitionTime: null,
    },
  ]
}

export function getClusterInstanceConditions(instance: TenantInstance): TenantInstanceCondition[] {
  const isRunning = instance.status === 'running'
  const isRestarting = instance.status === 'restarting'
  const isFailed = instance.status === 'failed'
  const isStopped = instance.status === 'stopped'
  const isProvisioned =
    isRunning || isRestarting || isStopped || isFailed || Boolean(instance.provisionedAt)
  const transitionTime = instance.provisionedAt ?? instance.createdAt

  return [
    {
      type: 'Configuration applied',
      status: isProvisioned ? 'True' : 'False',
      reason: isProvisioned ? 'AsExpected' : '—',
      message: isProvisioned ? 'Cluster configuration was applied.' : '—',
      lastTransitionTime: isProvisioned ? transitionTime : null,
    },
    {
      type: 'Ready',
      status: isRunning ? 'True' : 'False',
      reason: isRunning ? 'AsExpected' : isStopped ? 'ClusterStopped' : '—',
      message: isRunning ? 'Cluster is ready.' : isStopped ? 'Cluster is stopped.' : '—',
      lastTransitionTime: isRunning || isStopped ? transitionTime : null,
    },
    {
      type: 'Restart in progress',
      status: isRestarting ? 'True' : 'False',
      reason: isRestarting ? 'RestartRequested' : '—',
      message: isRestarting ? 'A restart is currently in progress.' : '—',
      lastTransitionTime: isRestarting ? new Date().toISOString() : null,
    },
    {
      type: 'Restart failed',
      status: 'False',
      reason: '—',
      message: '—',
      lastTransitionTime: null,
    },
    {
      type: 'Provisioned',
      status: isProvisioned ? 'True' : 'False',
      reason: isProvisioned ? 'InfrastructureReady' : '—',
      message: isProvisioned ? 'All infrastructure resources provisioned successfully' : '—',
      lastTransitionTime: isProvisioned ? transitionTime : null,
    },
    {
      type: 'Restart required',
      status: 'False',
      reason: isProvisioned ? 'AsExpected' : '—',
      message: '—',
      lastTransitionTime: null,
    },
  ]
}

export function createDemoPublicIp(family: 'IPv4' | 'IPv6', instanceId: string): string {
  const seed = instanceId.replace(/\W/g, '').slice(-2) || '01'
  if (family === 'IPv6') {
    return `2001:db8::${seed}`
  }
  const octet = (Number.parseInt(seed, 36) % 200) + 20
  return `203.0.113.${octet}`
}

/** DNS label used in demo cluster API/console URLs. */
export function getClusterDnsName(instance: TenantInstance): string {
  return instance.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'cluster'
}

export function getClusterApiUrl(instance: TenantInstance): string {
  return `https://api.${getClusterDnsName(instance)}.mock.osac.dev:6443`
}

export function getClusterConsoleUrl(instance: TenantInstance): string {
  return `https://console.${getClusterDnsName(instance)}.mock.osac.dev`
}

export function getClusterWorkerNodeCount(instance: TenantInstance): number {
  const nodeSets = resolveClusterConfig(instance).nodeSets
  return nodeSets.reduce((total, nodeSet) => total + nodeSet.nodeCount, 0)
}

export function resolveClusterConfig(instance: TenantInstance): TenantClusterConfig {
  if (instance.clusterConfig) {
    return instance.clusterConfig
  }

  const nodeSetLabel =
    instance.specRows?.find((row) => row.label === 'Node set')?.value ?? 'Standard Host · 1 node'

  return {
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.21.0-multi',
    podCidr: '10.128.0.0/24',
    serviceCidr: '10.1.0.0/24',
    catalogShortName: 'ocp-small',
    creator: 'Alex Johnson',
    nodeSets: [
      {
        id: 'node-set-1',
        hostType: nodeSetLabel.includes('GPU') ? 'GPU Host' : 'Standard Host',
        nodeCount: 1,
      },
    ],
  }
}

export function getClusterStatusLabel(status: TenantInstanceStatus): string {
  if (status === 'running') {
    return 'Ready'
  }
  return getTenantInstanceStatusLabel(status)
}

export function downloadClusterKubeconfig(instance: TenantInstance): void {
  const dnsName = getClusterDnsName(instance)
  const content = `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: ${getClusterApiUrl(instance)}
  name: ${dnsName}
contexts:
- context:
    cluster: ${dnsName}
    user: ${dnsName}-admin
  name: ${dnsName}
current-context: ${dnsName}
users:
- name: ${dnsName}-admin
  user:
    token: demo-token-${instance.id}
`
  const blob = new Blob([content], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${dnsName}.kubeconfig`
  link.click()
  URL.revokeObjectURL(url)
}

export function getClusterDemoPassword(instance: TenantInstance): string {
  return `kubeadmin-${getClusterDnsName(instance)}`
}

export function getTenantInstanceScopeFieldLabel(
  instance: TenantInstance,
): 'Organization' | 'Project' {
  return instance.scopeKind === 'organization' ? 'Organization' : 'Project'
}

/** Stable demo instance IDs so ensure can re-seed without duplicates. */
export const DEMO_TENANT_BARE_METAL_INSTANCE_ID = 'instance_demo_bm_01'
export const DEMO_TENANT_BARE_METAL_INSTANCE_ID_02 = 'instance_demo_bm_02'
export const DEMO_TENANT_BARE_METAL_INSTANCE_ID_03 = 'instance_demo_bm_03'
export const DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID = 'instance_demo_vm_01'
export const DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_02 = 'instance_demo_vm_02'
export const DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_03 = 'instance_demo_vm_03'
export const DEMO_TENANT_CLUSTER_INSTANCE_ID = 'instance_demo_cluster_01'
export const DEMO_TENANT_CLUSTER_INSTANCE_ID_02 = 'instance_demo_cluster_02'
export const DEMO_TENANT_CLUSTER_INSTANCE_ID_03 = 'instance_demo_cluster_03'

export function getTenantInstanceGpuLabel(instance: TenantInstance): string {
  const fromField = instance.gpuLabel.trim()
  if (fromField) {
    return fromField
  }
  return (
    getTenantInstanceSpecRows(instance).find((row) => row.label === 'GPU')?.value.trim() || '—'
  )
}

export function getClusterPlatformLabel(instance: TenantInstance): string {
  return (
    instance.specRows?.find((row) => row.label === 'Platform')?.value.trim() ||
    instance.osImage.trim() ||
    '—'
  )
}

export function getClusterNodeSetTypeLabel(instance: TenantInstance): string {
  const hostType = resolveClusterConfig(instance).nodeSets[0]?.hostType?.trim()
  if (hostType) {
    return hostType
  }
  const nodeSet =
    instance.specRows?.find((row) => row.label === 'Node set')?.value.trim() ?? ''
  return /\bgpu\b/i.test(nodeSet) ? 'GPU Host' : 'Standard Host'
}

/** Card highlights for Virtual machines — include OS so OS filters are scannable. */
export function getTenantInstanceCardSpecRows(instance: TenantInstance): CatalogSpecRow[] {
  const serviceId = getTenantInstanceServiceId(instance)
  const allSpecRows = getTenantInstanceSpecRows(instance)

  if (serviceId === 'baremetal') {
    return allSpecRows
  }

  if (serviceId === 'virtual-machine') {
    const findRow = (label: string) => allSpecRows.find((row) => row.label === label)
    const instanceType = findRow('Instance type')
    const size = findRow('Size')
    const osImage = {
      label: 'OS image',
      value: instance.osImage.trim() || findRow('OS image')?.value || '—',
    }

    return [instanceType, size, osImage].filter((row): row is CatalogSpecRow => Boolean(row))
  }

  return allSpecRows.slice(0, 3)
}

function createDemoTenantBareMetalInstanceVariant(
  organizationName: string,
  options: {
    id: string
    name: string
    status: TenantInstanceStatus
    osImage: string
    gpuLabel: string
    hardwareProfile: string
    cpu: string
    ram: string
    hoursAgo: number
    catalogItemDisplayName?: string
  },
): TenantInstance {
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * options.hoursAgo).toISOString()

  return {
    id: options.id,
    name: options.name,
    catalogItemDisplayName:
      options.catalogItemDisplayName ?? 'Bare Metal - GPU Training Server',
    serviceId: 'baremetal',
    hardwareProfile: options.hardwareProfile,
    osImage: options.osImage,
    networkLabel: 'Tenant workload VNet / bm-compute-a · allow-ssh-https',
    networking: {
      enabled: true,
      virtualNetwork: 'Tenant workload VNet',
      subnet: 'bm-compute-a',
      securityGroup: 'allow-ssh-https',
    },
    gpuLabel: options.gpuLabel,
    specRows: [
      { label: 'CPU', value: options.cpu },
      { label: 'RAM', value: options.ram },
      { label: 'GPU', value: options.gpuLabel },
      { label: 'OS image', value: options.osImage },
    ],
    sshPublicKey: DEFAULT_BARE_METAL_SSH_PUBLIC_KEY,
    projectName: organizationName,
    scopeKind: 'organization',
    status: options.status,
    createdAt,
    provisionedAt: options.status === 'provisioning' ? null : createdAt,
  }
}

export function createDemoTenantBareMetalInstance(organizationName: string): TenantInstance {
  return createDemoTenantBareMetalInstanceVariant(organizationName, {
    id: DEMO_TENANT_BARE_METAL_INSTANCE_ID,
    name: 'BM-Server-01',
    status: 'running',
    osImage: 'RHEL 9.4',
    gpuLabel: 'CPU-only',
    hardwareProfile: 'Dell PowerEdge R750',
    cpu: 'Intel Xeon Gold 6338 × 2',
    ram: '512 GB DDR4',
    hoursAgo: 26,
  })
}

export function createDemoTenantBareMetalInstance02(organizationName: string): TenantInstance {
  return createDemoTenantBareMetalInstanceVariant(organizationName, {
    id: DEMO_TENANT_BARE_METAL_INSTANCE_ID_02,
    name: 'BM-Server-02',
    status: 'stopped',
    osImage: 'Ubuntu 22.04',
    gpuLabel: 'NVIDIA A100 × 2',
    hardwareProfile: 'Dell PowerEdge XE9680',
    cpu: 'Intel Xeon Platinum 8480+ × 2',
    ram: '1 TB DDR5',
    hoursAgo: 40,
    catalogItemDisplayName: 'Bare Metal - Dense GPU Node',
  })
}

export function createDemoTenantBareMetalInstance03(organizationName: string): TenantInstance {
  return createDemoTenantBareMetalInstanceVariant(organizationName, {
    id: DEMO_TENANT_BARE_METAL_INSTANCE_ID_03,
    name: 'BM-Server-03',
    status: 'running',
    osImage: 'Fedora',
    gpuLabel: 'NVIDIA H100 × 4',
    hardwareProfile: 'Supermicro SYS-821GE-TNHR',
    cpu: 'Intel Xeon Gold 6430 × 2',
    ram: '2 TB DDR5',
    hoursAgo: 12,
    catalogItemDisplayName: 'Bare Metal - Dense GPU Node',
  })
}

function createDemoTenantClusterInstanceVariant(
  organizationName: string,
  options: {
    id: string
    name: string
    status: TenantInstanceStatus
    platform: string
    hostType: 'Standard Host' | 'GPU Host'
    nodeCount: number
    hoursAgo: number
  },
): TenantInstance {
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * options.hoursAgo).toISOString()
  const baseSpecRows = resolveCatalogSpecRows(
    { serviceId: 'cluster', templateRefId: '', templateName: '' },
    { includeDetails: true },
  )
  const nodeSetValue =
    options.hostType === 'GPU Host'
      ? `gpu-workers · ${options.nodeCount} node${options.nodeCount === 1 ? '' : 's'}`
      : `fc430 · worker × ${options.nodeCount}`
  const specRows = baseSpecRows.map((row) => {
    if (row.label === 'Platform') {
      return { ...row, value: options.platform }
    }
    if (row.label === 'Node set') {
      return { ...row, value: nodeSetValue }
    }
    return row
  })

  return {
    id: options.id,
    name: options.name,
    catalogItemDisplayName: 'Cluster - Node Sets Object',
    serviceId: 'cluster',
    hardwareProfile: options.hostType,
    osImage: options.platform,
    networkLabel: 'Pod 10.128.0.0/14 · Service 172.30.0.0/16',
    networking: {
      enabled: true,
      virtualNetwork: 'Tenant workload VNet',
      subnet: 'cluster-compute-a',
      securityGroup: 'allow-cluster-api',
    },
    gpuLabel: options.hostType,
    specRows,
    clusterConfig: {
      releaseImage: `quay.io/openshift-release-dev/ocp-release:${options.platform.includes('4.15') ? '4.15.0' : '4.16.0'}-multi`,
      podCidr: '10.128.0.0/14',
      serviceCidr: '172.30.0.0/16',
      catalogShortName: options.hostType === 'GPU Host' ? 'ocp-gpu' : 'ocp-small',
      creator: 'Alex Johnson',
      nodeSets: [
        {
          id: 'node-set-1',
          hostType: options.hostType,
          nodeCount: options.nodeCount,
        },
      ],
    },
    projectName: organizationName,
    scopeKind: 'organization',
    status: options.status,
    createdAt,
    provisionedAt: options.status === 'provisioning' ? null : createdAt,
  }
}

export function createDemoTenantClusterInstance(organizationName: string): TenantInstance {
  return createDemoTenantClusterInstanceVariant(organizationName, {
    id: DEMO_TENANT_CLUSTER_INSTANCE_ID,
    name: 'ocp-cluster-01',
    status: 'running',
    platform: 'Red Hat OpenShift 4.16',
    hostType: 'Standard Host',
    nodeCount: 3,
    hoursAgo: 18,
  })
}

export function createDemoTenantClusterInstance02(organizationName: string): TenantInstance {
  return createDemoTenantClusterInstanceVariant(organizationName, {
    id: DEMO_TENANT_CLUSTER_INSTANCE_ID_02,
    name: 'ocp-cluster-02',
    status: 'provisioning',
    platform: 'Red Hat OpenShift 4.15',
    hostType: 'GPU Host',
    nodeCount: 2,
    hoursAgo: 1,
  })
}

export function createDemoTenantClusterInstance03(organizationName: string): TenantInstance {
  return createDemoTenantClusterInstanceVariant(organizationName, {
    id: DEMO_TENANT_CLUSTER_INSTANCE_ID_03,
    name: 'ocp-cluster-03',
    status: 'failed',
    platform: 'Red Hat OpenShift 4.16',
    hostType: 'GPU Host',
    nodeCount: 4,
    hoursAgo: 6,
  })
}

function withVmOsImage(specRows: CatalogSpecRow[], osImage: string): CatalogSpecRow[] {
  return specRows.map((row) => (row.label === 'OS image' ? { ...row, value: osImage } : row))
}

function createDemoTenantVirtualMachineInstanceVariant(
  organizationName: string,
  options: {
    id: string
    name: string
    status: TenantInstanceStatus
    osImage: string
    containerDiskImage: string
    instanceType: string
    sizeLabel: string
    internalIp: string
    hoursAgo: number
  },
): TenantInstance {
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * options.hoursAgo).toISOString()
  const baseSpecRows = resolveCatalogSpecRows(
    { serviceId: 'virtual-machine', templateRefId: '', templateName: '' },
    { includeDetails: true },
  )
  const specRows = withVmOsImage(baseSpecRows, options.osImage).map((row) => {
    if (row.label === 'Instance type') {
      return { ...row, value: options.instanceType.split(' - ')[0] ?? options.instanceType }
    }
    if (row.label === 'Size') {
      return { ...row, value: options.sizeLabel }
    }
    return row
  })

  return {
    id: options.id,
    name: options.name,
    catalogItemDisplayName: 'VM with Configurable Network Attachments',
    serviceId: 'virtual-machine',
    hardwareProfile: options.instanceType.split(' - ')[0] ?? 'Standard VM',
    osImage: options.osImage,
    networkLabel: 'Tenant workload VNet / bm-compute-a · allow-ssh-https',
    networking: {
      enabled: true,
      virtualNetwork: 'Tenant workload VNet',
      subnet: 'bm-compute-a',
      securityGroup: 'allow-ssh-https',
    },
    gpuLabel: options.sizeLabel,
    specRows,
    vmConfig: {
      instanceType: options.instanceType,
      containerDiskImage: options.containerDiskImage,
      bootDiskSizeGiB: 120,
      sshPublicKey: DEFAULT_VM_SSH_PUBLIC_KEY,
      internalIp: options.internalIp,
      publicIp: null,
      publicIpFamily: null,
    },
    projectName: organizationName,
    scopeKind: 'organization',
    status: options.status,
    createdAt,
    provisionedAt: options.status === 'provisioning' ? null : createdAt,
  }
}

export function createDemoTenantVirtualMachineInstance(organizationName: string): TenantInstance {
  return createDemoTenantVirtualMachineInstanceVariant(organizationName, {
    id: DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID,
    name: 'VM-Instance-01',
    status: 'running',
    osImage: 'RHEL 9.4',
    containerDiskImage: 'quay.io/containerdisks/rhel:9.4',
    instanceType: 'small - 1 vCPU, 2 GiB',
    sizeLabel: '1 vCPU · 2 GB RAM',
    internalIp: '10.99.1.11',
    hoursAgo: 8,
  })
}

export function createDemoTenantVirtualMachineInstance02(organizationName: string): TenantInstance {
  return createDemoTenantVirtualMachineInstanceVariant(organizationName, {
    id: DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_02,
    name: 'VM-Instance-02',
    status: 'stopped',
    osImage: 'Fedora',
    containerDiskImage: 'quay.io/containerdisks/fedora:latest',
    instanceType: 'medium - 2 vCPU, 4 GiB',
    sizeLabel: '2 vCPU · 4 GB RAM',
    internalIp: '10.99.1.12',
    hoursAgo: 14,
  })
}

export function createDemoTenantVirtualMachineInstance03(organizationName: string): TenantInstance {
  return createDemoTenantVirtualMachineInstanceVariant(organizationName, {
    id: DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_03,
    name: 'VM-Instance-03',
    status: 'running',
    osImage: 'Ubuntu 22.04',
    containerDiskImage: 'quay.io/containerdisks/ubuntu:22.04',
    instanceType: 'large - 4 vCPU, 8 GiB',
    sizeLabel: '4 vCPU · 8 GB RAM',
    internalIp: '10.99.1.13',
    hoursAgo: 3,
  })
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

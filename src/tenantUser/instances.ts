import type { CatalogSpecRow } from '../catalog/catalogSpecs'
import {
  resolveCatalogSpecRows,
  resolveClusterCatalogHighlightRows,
} from '../catalog/catalogSpecs'
import {
  DEFAULT_CLUSTER_NODE_SET_ID,
  formatClusterHostTypeLabel,
  formatClusterNodeSetLabel,
  formatClusterPlatformLabel,
  formatCatalogDiskImageLabel,
  getCatalogClusterNodeSetOption,
  getReleaseImageForClusterVersion,
  resolveBaremetalInstanceTypeHardware,
  resolveBaremetalInstanceTypeHardwareFromSizeLabel,
  normalizeCatalogDiskImageDisplayLabel,
} from '../catalog/catalogPublishConfig'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import { getProviderCatalogItems } from '../providerSetup/storage'
import {
  DEMO_TENANT_PROJECT_ID,
  DEMO_TENANT_PROJECT_ID_02,
  DEMO_TENANT_PROJECT_NAME,
  DEMO_TENANT_PROJECT_NAME_02,
} from '../tenantAdmin/projects'
import { parseVmLaunchInstanceTypeOption } from './launchInstanceWizard'

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
  /** Optional external IP pool selected at launch. */
  externalIpPool?: string
}

export type TenantClusterNodeSetStatus = 'ready' | 'updating' | 'behind' | 'pending'

export type TenantClusterNodeSet = {
  id: string
  /** Friendly pool name shown in the detail list (e.g. workers). */
  name?: string
  hostType: string
  nodeCount: number
  /** Platform version currently running on this node set. */
  version?: string
  status?: TenantClusterNodeSetStatus
}

export type TenantClusterUpgradeStatus = 'up-to-date' | 'upgrade-available' | 'upgrading'

export type TenantClusterConfig = {
  releaseImage: string
  podCidr: string
  serviceCidr: string
  nodeSets: TenantClusterNodeSet[]
  /** Per-node inventory once machines are allocated. */
  nodes?: TenantClusterNodeInventory[]
  catalogShortName?: string
  creator?: string
  /** Desired control-plane version when an upgrade is available or in progress. */
  desiredVersion?: string
  upgradeStatus?: TenantClusterUpgradeStatus
}

/** NIC identity discovered on a specific allocated machine (not the instance type). */
export type TenantNetworkInterfaceInventory = {
  id: string
  name: string
  macAddress: string
  /** Link speed advertised for this interface (e.g. 25 Gbps). */
  speed: string
}

/** Bare metal host inventory available after provision. */
export type TenantMachineInventory = {
  networkInterfaces: TenantNetworkInterfaceInventory[]
}

/** Cluster node host inventory available after provision. */
export type TenantClusterNodeInventory = {
  id: string
  name: string
  nodeSetId: string
  hostType: string
  networkInterfaces: TenantNetworkInterfaceInventory[]
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
  /** Optional free-text description captured at launch. */
  description?: string
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
  /** Bare metal machine inventory (MAC addresses, etc.) after provision. */
  inventory?: TenantMachineInventory
  /** SSH public key captured at launch (bare metal, VM, and cluster). */
  sshPublicKey?: string
  /**
   * Projects this service belongs to (multi-project). Empty = organization-scoped.
   * Prefer this over `projectName` / `scopeKind` for membership checks.
   */
  projectIds: string[]
  /** Scope label: primary project name when project-scoped, organization name otherwise. */
  projectName: string
  scopeKind: TenantInstanceScopeKind
  status: TenantInstanceStatus
  createdAt: string
  provisionedAt: string | null
  /** Provider Services view: workspace slug that owns this instance. */
  ownerTenantSlug?: string
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

export const BARE_METAL_DISK_IMAGE_FILTER_OPTIONS = [
  'RHEL 9.4',
  'Fedora',
  'Ubuntu 22.04',
] as const

export type BareMetalDiskImageFilterOption = (typeof BARE_METAL_DISK_IMAGE_FILTER_OPTIONS)[number]

export function normalizeBareMetalDiskImageFilterLabel(
  label: string,
): BareMetalDiskImageFilterOption | null {
  const trimmed = label.trim()
  if (!trimmed || trimmed === '—' || trimmed === '-') {
    return null
  }

  const display = normalizeCatalogDiskImageDisplayLabel(trimmed)
  if (display === 'RHEL 9.4') {
    return 'RHEL 9.4'
  }
  if (display === 'Fedora' || /^fedora$/i.test(trimmed)) {
    return 'Fedora'
  }
  if (display === 'Ubuntu 22.04 LTS' || display === 'Ubuntu 22.04' || /^ubuntu 22\.04/i.test(trimmed)) {
    return 'Ubuntu 22.04'
  }

  return null
}

/** Spec rows for cards and drawers; prefers rows captured at launch. */
export function getTenantInstanceSpecRows(instance: TenantInstance): CatalogSpecRow[] {
  const serviceId = getTenantInstanceServiceId(instance)

  if (instance.specRows?.length) {
    if (serviceId === 'baremetal') {
      return ensureBaremetalInstanceSpecRows(instance, instance.specRows)
    }
    return instance.specRows
  }

  if (serviceId === 'cluster' || serviceId === 'virtual-machine') {
    return resolveCatalogSpecRows(
      { serviceId, templateRefId: '', templateName: '' },
      { includeDetails: true },
    )
  }

  return buildBareMetalFallbackSpecRows(instance)
}

function buildBareMetalFallbackSpecRows(instance: TenantInstance): CatalogSpecRow[] {
  const diskImage = resolveBareMetalDiskImageValue(instance, [])
  return [
    { label: 'Hardware', value: instance.hardwareProfile },
    ...(diskImage ? [{ label: 'Disk image', value: diskImage }] : []),
    { label: 'GPU', value: instance.gpuLabel },
  ]
}

/** Demo latency before a restarted instance returns to Running. */
export const TENANT_INSTANCE_RESTART_DURATION_MS = 2500

export function generateTenantInstanceId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `instance-${suffix}`
}

export function formatTenantInstanceCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Keep instance names as DNS-1123 labels (lowercase, hyphenated). */
export function formatTenantInstanceName(name: string): string {
  return name.trim().toLowerCase()
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
  bareMetalActions?: {
    onConnectSsh?: (instance: TenantInstance) => void
    onOpenSerialConsole?: (instance: TenantInstance) => void
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
        title: 'Connect via SSH',
        isAriaDisabled: !isRunning,
        onClick: () => {
          bareMetalActions?.onConnectSsh?.(instance)
        },
      },
      {
        title: 'Serial console',
        isAriaDisabled: !isRunning,
        onClick: () => {
          bareMetalActions?.onOpenSerialConsole?.(instance)
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
        title: 'Delete',
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
      title: 'Restart instance',
      isAriaDisabled: !isRunning && !isStopped,
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
    (/containerdisks\//i.test(instance.osImage) || /^quay\.io\//i.test(instance.osImage)
      ? instance.osImage
      : undefined) ??
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

/** Demo VNC/serial console URL for a virtual machine instance. */
export function getVmConsoleUrl(instance: TenantInstance): string {
  return `https://console-vm.${getClusterDnsName(instance)}.mock.osac.dev`
}

/** Demo management IP used for SSH after bare metal provision. */
export function getBareMetalSshHost(instance: TenantInstance): string {
  return createDemoPublicIp('IPv4', instance.id)
}

/** SSH connect command for a provisioned bare metal instance (RHEL cloud-user). */
export function getBareMetalSshCommand(instance: TenantInstance): string {
  return `ssh cloud-user@${getBareMetalSshHost(instance)}`
}

/** Demo BMC serial-over-LAN console URL for a bare metal instance. */
export function getBareMetalSerialConsoleUrl(instance: TenantInstance): string {
  return `https://console-sol.${getClusterDnsName(instance)}.mock.osac.dev`
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
    instance.specRows?.find((row) => row.label === 'Node set')?.value ?? 'standard-host · 1 node'

  return {
    releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.21.0-multi',
    podCidr: '10.128.0.0/24',
    serviceCidr: '10.1.0.0/24',
    catalogShortName: 'ocp-small',
    creator: 'Alex Johnson',
    nodeSets: [
      {
        id: 'node-set-1',
        hostType: nodeSetLabel.includes('gpu') ? 'gpu-host' : 'standard-host',
        nodeCount: 1,
      },
    ],
  }
}

function hashDemoSeed(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return hash
}

/** Deterministic demo MAC from instance/node/NIC identity. */
export function createDemoMacAddress(seed: string, nicIndex: number): string {
  const hash = hashDemoSeed(`${seed}:nic:${nicIndex}`)
  const bytes = [
    0x52,
    0x54,
    0x00,
    (hash >>> 16) & 0xff,
    (hash >>> 8) & 0xff,
    (hash ^ (nicIndex * 17)) & 0xff,
  ]
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(':')
}

export function createDemoNetworkInterfaces(
  seed: string,
  nicCount = 2,
  speed = '25 Gbps',
): TenantNetworkInterfaceInventory[] {
  return Array.from({ length: Math.max(1, nicCount) }, (_, index) => ({
    id: `${seed}-nic-${index + 1}`,
    name: `nic-${index + 1}`,
    macAddress: createDemoMacAddress(seed, index + 1),
    speed,
  }))
}

export function hasProvisionedInventory(instance: TenantInstance): boolean {
  return (
    instance.status === 'running' ||
    instance.status === 'stopped' ||
    instance.status === 'restarting' ||
    instance.status === 'failed' ||
    Boolean(instance.provisionedAt)
  )
}

export function resolveBareMetalInventory(
  instance: TenantInstance,
): TenantMachineInventory | null {
  if (!hasProvisionedInventory(instance)) {
    return null
  }

  if (instance.inventory?.networkInterfaces?.length) {
    return instance.inventory
  }

  return {
    networkInterfaces: createDemoNetworkInterfaces(instance.id, 2),
  }
}

export function buildClusterNodeInventories(
  instanceId: string,
  nodeSets: TenantClusterNodeSet[],
): TenantClusterNodeInventory[] {
  const nodes: TenantClusterNodeInventory[] = []

  nodeSets.forEach((nodeSet, nodeSetIndex) => {
    for (let nodeIndex = 0; nodeIndex < nodeSet.nodeCount; nodeIndex += 1) {
      const nodeNumber = nodes.length + 1
      const nodeId = `${instanceId}-node-${nodeNumber}`
      nodes.push({
        id: nodeId,
        name: `${nodeSet.hostType}-${nodeIndex + 1}`,
        nodeSetId: nodeSet.id || `node-set-${nodeSetIndex + 1}`,
        hostType: nodeSet.hostType,
        networkInterfaces: createDemoNetworkInterfaces(nodeId, 2),
      })
    }
  })

  return nodes
}

export function resolveClusterNodeInventories(
  instance: TenantInstance,
): TenantClusterNodeInventory[] {
  if (!hasProvisionedInventory(instance)) {
    return []
  }

  const clusterConfig = resolveClusterConfig(instance)
  if (clusterConfig.nodes?.length) {
    return clusterConfig.nodes
  }

  return buildClusterNodeInventories(instance.id, clusterConfig.nodeSets)
}

export function getClusterStatusLabel(status: TenantInstanceStatus): string {
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
): 'Tenant' | 'Project' {
  return getTenantInstanceProjectIds(instance).length > 0 ? 'Project' : 'Tenant'
}

/** Normalized owning project id (supports legacy single-project instances). */
export function getTenantInstanceProjectIds(instance: TenantInstance): string[] {
  const [owningProjectId] = resolveStoredTenantInstanceProjectIds(instance)
  return owningProjectId ? [owningProjectId] : []
}

export function instanceBelongsToProject(
  instance: TenantInstance,
  project: { id: string; name: string },
): boolean {
  const projectIds = getTenantInstanceProjectIds(instance)
  if (projectIds.includes(project.id)) {
    return true
  }

  return (
    projectIds.length === 0 &&
    instance.scopeKind === 'project' &&
    instance.projectName === project.name
  )
}

/** Project name for Services card/table; organization-scoped instances have no project. */
export function getTenantInstanceProjectLabel(
  instance: TenantInstance,
  projects: readonly { id: string; name: string }[] = [],
): string {
  const projectIds = getTenantInstanceProjectIds(instance)
  if (projectIds.length === 0) {
    return instance.scopeKind === 'project' && instance.projectName.trim()
      ? instance.projectName
      : '—'
  }

  const names = projectIds.map((projectId) => {
    const fromList = projects.find((project) => project.id === projectId)?.name
    if (fromList) {
      return fromList
    }
    if (projectId === DEMO_TENANT_PROJECT_ID) {
      return DEMO_TENANT_PROJECT_NAME
    }
    if (projectId === DEMO_TENANT_PROJECT_ID_02) {
      return DEMO_TENANT_PROJECT_NAME_02
    }
    return projectId
  })
  return names[0] ?? '—'
}

/**
 * Sync `projectIds` with legacy `projectName` / `scopeKind` fields used across the demo.
 */
export function withInstanceProjectIds(
  instance: TenantInstance,
  projectIds: string[],
  projects: readonly { id: string; name: string }[],
  organizationName: string,
): TenantInstance {
  const uniqueIds = [...new Set(projectIds.filter(Boolean))].slice(0, 1)
  const resolvedNames = uniqueIds
    .map((projectId) => projects.find((project) => project.id === projectId)?.name)
    .filter((name): name is string => Boolean(name))

  if (resolvedNames.length === 0) {
    return {
      ...instance,
      projectIds: [],
      scopeKind: 'organization',
      projectName: organizationName,
    }
  }

  return {
    ...instance,
    projectIds: uniqueIds.filter((projectId) =>
      projects.some((project) => project.id === projectId),
    ),
    scopeKind: 'project',
    projectName: resolvedNames[0]!,
  }
}

/** Stable demo instance IDs so ensure can re-seed without duplicates. */
export const DEMO_TENANT_BARE_METAL_INSTANCE_ID = 'instance-demo-bm-01'
export const DEMO_TENANT_BARE_METAL_INSTANCE_ID_02 = 'instance-demo-bm-02'
export const DEMO_TENANT_BARE_METAL_INSTANCE_ID_03 = 'instance-demo-bm-03'

/** Services detail demo: dense GPU host used in walkthroughs. */
export const DEMO_MULTI_PROJECT_SHOWCASE_INSTANCE_NAME = 'bm-server-06'

export const DEMO_MULTI_PROJECT_SHOWCASE_INSTANCE_IDS = [
  DEMO_TENANT_BARE_METAL_INSTANCE_ID_03,
] as const
export const DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID = 'instance-demo-vm-01'
export const DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_02 = 'instance-demo-vm-02'
export const DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_03 = 'instance-demo-vm-03'
export const DEMO_TENANT_CLUSTER_INSTANCE_ID = 'instance-demo-cluster-01'
export const DEMO_TENANT_CLUSTER_INSTANCE_ID_02 = 'instance-demo-cluster-02'
export const DEMO_TENANT_CLUSTER_INSTANCE_ID_03 = 'instance-demo-cluster-03'
export const DEMO_TENANT_CLUSTER_INSTANCE_ID_04 = 'instance-demo-cluster-04'

/** Cluster demo row that stays Provisioning on Services for walkthroughs. */
export const DEMO_TENANT_CLUSTER_PROVISIONING_INSTANCE_ID = DEMO_TENANT_CLUSTER_INSTANCE_ID_03

export function isStickyDemoProvisioningInstance(instanceId: string): boolean {
  return instanceId === DEMO_TENANT_CLUSTER_PROVISIONING_INSTANCE_ID
}

/** Canonical demo cluster names + conditions for Services cards. */
export const DEMO_TENANT_CLUSTER_STATES: ReadonlyArray<{
  id: string
  name: string
  status: TenantInstanceStatus
}> = [
  { id: DEMO_TENANT_CLUSTER_INSTANCE_ID, name: 'ocp-cluster-01', status: 'running' },
  { id: DEMO_TENANT_CLUSTER_INSTANCE_ID_02, name: 'ocp-cluster-02', status: 'failed' },
  {
    id: DEMO_TENANT_CLUSTER_INSTANCE_ID_03,
    name: 'ocp-cluster-03',
    status: 'provisioning',
  },
  { id: DEMO_TENANT_CLUSTER_INSTANCE_ID_04, name: 'ocp-cluster-04', status: 'running' },
]

/** Demo instances seeded under the default tenant project (`ml-project`). */
export const DEMO_TENANT_PROJECT_INSTANCE_IDS = [
  DEMO_TENANT_BARE_METAL_INSTANCE_ID,
  DEMO_TENANT_BARE_METAL_INSTANCE_ID_02,
  DEMO_TENANT_CLUSTER_INSTANCE_ID,
  DEMO_TENANT_CLUSTER_INSTANCE_ID_02,
  DEMO_TENANT_CLUSTER_INSTANCE_ID_03,
] as const

/** Demo instances seeded under `ml-dev-team` (exclusive owner). */
export const DEMO_TENANT_SECONDARY_PROJECT_INSTANCE_IDS = [
  DEMO_TENANT_BARE_METAL_INSTANCE_ID_03,
  DEMO_TENANT_CLUSTER_INSTANCE_ID_04,
] as const

export function getDemoInstanceProjectIds(instanceId: string): string[] {
  const belongsToSecondary = DEMO_TENANT_SECONDARY_PROJECT_INSTANCE_IDS.includes(
    instanceId as (typeof DEMO_TENANT_SECONDARY_PROJECT_INSTANCE_IDS)[number],
  )
  if (belongsToSecondary) {
    return [DEMO_TENANT_PROJECT_ID_02]
  }

  const belongsToPrimary = DEMO_TENANT_PROJECT_INSTANCE_IDS.includes(
    instanceId as (typeof DEMO_TENANT_PROJECT_INSTANCE_IDS)[number],
  )
  if (belongsToPrimary) {
    return [DEMO_TENANT_PROJECT_ID]
  }

  return []
}

export function isDemoMultiProjectShowcaseInstance(
  instance: Pick<TenantInstance, 'id' | 'name'>,
): boolean {
  return (
    instance.name === DEMO_MULTI_PROJECT_SHOWCASE_INSTANCE_NAME ||
    DEMO_MULTI_PROJECT_SHOWCASE_INSTANCE_IDS.includes(
      instance.id as (typeof DEMO_MULTI_PROJECT_SHOWCASE_INSTANCE_IDS)[number],
    )
  )
}

function resolveStoredTenantInstanceProjectIds(instance: TenantInstance): string[] {
  if (Array.isArray(instance.projectIds)) {
    return [...new Set(instance.projectIds.filter(Boolean))]
  }

  const demoProjectIds = getDemoInstanceProjectIds(instance.id)
  if (demoProjectIds.length > 0) {
    return demoProjectIds
  }

  if (instance.scopeKind === 'project' && instance.projectName === DEMO_TENANT_PROJECT_NAME) {
    return [DEMO_TENANT_PROJECT_ID]
  }

  if (instance.scopeKind === 'project' && instance.projectName === DEMO_TENANT_PROJECT_NAME_02) {
    return [DEMO_TENANT_PROJECT_ID_02]
  }

  return []
}

export function syncDemoMultiProjectShowcaseInstance(instance: TenantInstance): TenantInstance | null {
  if (!isDemoMultiProjectShowcaseInstance(instance)) {
    return null
  }

  const expectedName = DEMO_MULTI_PROJECT_SHOWCASE_INSTANCE_NAME
  const expectedProjectIds = getDemoInstanceProjectIds(DEMO_TENANT_BARE_METAL_INSTANCE_ID_03)
  const currentProjectIds = resolveStoredTenantInstanceProjectIds(instance)
  const hasExpectedMembership =
    expectedProjectIds.length === 1 &&
    currentProjectIds.length === 1 &&
    currentProjectIds[0] === expectedProjectIds[0]

  if (instance.name === expectedName && hasExpectedMembership) {
    return null
  }

  return {
    ...instance,
    name: expectedName,
    projectIds: expectedProjectIds,
    scopeKind: 'project',
    projectName: DEMO_TENANT_PROJECT_NAME_02,
  }
}

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
  const fromSpec =
    instance.specRows?.find(
      (row) => row.label === 'Cluster version' || row.label === 'Platform',
    )?.value.trim() || ''
  if (fromSpec) {
    return formatClusterPlatformLabel(fromSpec)
  }

  const fromOsImage = instance.osImage.trim()
  if (fromOsImage && !fromOsImage.includes('/')) {
    return formatClusterPlatformLabel(fromOsImage)
  }

  const fromRelease = formatClusterPlatformLabel(resolveClusterConfig(instance).releaseImage)
  if (fromRelease) {
    return fromRelease
  }

  return '—'
}

/** Short version token for node-set rows (e.g. "4.16" from "OpenShift 4.16"). */
export function getClusterVersionShortLabel(versionLabel: string): string {
  const match = versionLabel.match(/(\d+\.\d+(?:\.\d+)?)/)
  return match?.[1] ?? (versionLabel.trim() || '—')
}

export function getClusterUpgradeStatus(
  instance: TenantInstance,
): TenantClusterUpgradeStatus {
  const configured = resolveClusterConfig(instance).upgradeStatus
  if (configured) {
    return configured
  }
  return 'up-to-date'
}

export function getClusterDesiredVersionLabel(instance: TenantInstance): string | null {
  const desired = resolveClusterConfig(instance).desiredVersion?.trim()
  return desired || null
}

export function getClusterNodeSetsWithDefaults(instance: TenantInstance): TenantClusterNodeSet[] {
  const clusterVersion = getClusterPlatformLabel(instance)
  const shortVersion = getClusterVersionShortLabel(clusterVersion)
  const isProvisioning = instance.status === 'provisioning'

  return resolveClusterConfig(instance).nodeSets.map((nodeSet, index) => ({
    ...nodeSet,
    name: nodeSet.name?.trim() || (index === 0 ? 'workers' : `node-set-${index + 1}`),
    version: nodeSet.version?.trim() || shortVersion,
    status:
      nodeSet.status ??
      (isProvisioning ? 'pending' : 'ready'),
  }))
}

export function countClusterNodeSetsOffVersion(instance: TenantInstance): number {
  const clusterShort = getClusterVersionShortLabel(getClusterPlatformLabel(instance))
  return getClusterNodeSetsWithDefaults(instance).filter((nodeSet) => {
    const nodeShort = getClusterVersionShortLabel(nodeSet.version ?? '')
    return nodeShort !== clusterShort
  }).length
}

export function getClusterNodeSetTypeLabel(instance: TenantInstance): string {
  const hostType = resolveClusterConfig(instance).nodeSets[0]?.hostType?.trim()
  if (hostType) {
    return hostType
  }
  const nodeSet =
    instance.specRows?.find((row) => row.label === 'Node set')?.value.trim() ?? ''
  return /\bgpu\b/i.test(nodeSet) ? 'gpu-host' : 'standard-host'
}

function isPopulatedSpecRowValue(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed !== '—' && trimmed !== '-'
}

function findCatalogDraftForInstance(instance: TenantInstance) {
  const needle = instance.catalogItemDisplayName.trim().toLowerCase()
  if (!needle) {
    return null
  }

  return (
    getProviderCatalogItems().find(
      (item) =>
        item.displayName.trim().toLowerCase() === needle ||
        item.catalogItemId.trim().toLowerCase() === needle,
    ) ?? null
  )
}

function resolveBareMetalDiskImageValue(
  instance: TenantInstance,
  rows: CatalogSpecRow[],
): string | null {
  const fromRow = rows.find((row) => row.label === 'Disk image' || row.label === 'OS image')?.value
  const catalog = findCatalogDraftForInstance(instance)
  const fromCatalog = catalog
    ? formatCatalogDiskImageLabel(catalog.diskImageId, catalog.diskImageLabel)
    : undefined

  const candidate = [fromRow, instance.osImage, fromCatalog].find((value) =>
    value ? isPopulatedSpecRowValue(value) : false,
  )

  if (!candidate) {
    return null
  }

  return normalizeCatalogDiskImageDisplayLabel(candidate)
}

export function getBareMetalInstanceDiskImageFilterLabel(
  instance: TenantInstance,
): BareMetalDiskImageFilterOption | null {
  const resolved = resolveBareMetalDiskImageValue(instance, instance.specRows ?? [])
  return resolved ? normalizeBareMetalDiskImageFilterLabel(resolved) : null
}

/** Bare metal cards use Disk image; normalize legacy OS image rows from storage. */
function normalizeBareMetalCardSpecRows(rows: CatalogSpecRow[]): CatalogSpecRow[] {
  return rows.map((row) =>
    row.label === 'OS image' ? { ...row, label: 'Disk image' } : row,
  )
}

function ensureBaremetalInstanceSpecRows(
  instance: TenantInstance,
  rows: CatalogSpecRow[],
): CatalogSpecRow[] {
  const normalized = normalizeBareMetalCardSpecRows(rows)
  const catalog = findCatalogDraftForInstance(instance)
  const sizeFromRow = normalized.find((row) => row.label === 'Size')?.value
  const diskImage = resolveBareMetalDiskImageValue(instance, normalized)
  const otherTrailingRows = normalized.filter(
    (row) =>
      !['Size', 'CPU', 'RAM', 'GPU', 'Disk image', 'OS image'].includes(row.label),
  )

  const typeHardware =
    resolveBaremetalInstanceTypeHardware(catalog?.instanceTypeId, catalog?.instanceTypeLabel) ??
    (sizeFromRow
      ? resolveBaremetalInstanceTypeHardwareFromSizeLabel(sizeFromRow)
      : undefined)

  if (!typeHardware) {
    const baseRows = normalized.filter(
      (row) => row.label !== 'Disk image' && row.label !== 'OS image',
    )
    return diskImage ? [...baseRows, { label: 'Disk image', value: diskImage }] : baseRows
  }

  return [
    { label: 'Size', value: typeHardware.sizeLabel },
    { label: 'CPU', value: typeHardware.cpu },
    { label: 'RAM', value: typeHardware.ram },
    { label: 'GPU', value: typeHardware.gpu },
    ...otherTrailingRows,
    ...(diskImage ? [{ label: 'Disk image', value: diskImage }] : []),
  ]
}

/** Card highlights for Virtual machines — include OS so OS filters are scannable. */
export function getTenantInstanceCardSpecRows(instance: TenantInstance): CatalogSpecRow[] {
  const serviceId = getTenantInstanceServiceId(instance)
  const allSpecRows = getTenantInstanceSpecRows(instance)

  if (serviceId === 'baremetal') {
    return allSpecRows.filter((row) => row.label !== 'Size')
  }

  if (serviceId === 'virtual-machine') {
    const findRow = (label: string) => allSpecRows.find((row) => row.label === label)
    const instanceTypeRow = findRow('Instance type')
    const parsedType = parseVmLaunchInstanceTypeOption(
      instance.vmConfig?.instanceType?.trim() || instanceTypeRow?.value || '',
    )
    const instanceType = {
      label: 'Instance type',
      value: parsedType.instanceType || instanceTypeRow?.value || '—',
    }
    const size = findRow('Size') ?? {
      label: 'Size',
      value: parsedType.size || instance.gpuLabel || '—',
    }
    const osFromRow = findRow('OS image')?.value?.trim()
    const osCandidate = instance.osImage.trim() || osFromRow || ''
    const osImage = {
      label: 'OS image',
      value:
        /containerdisks\//i.test(osCandidate) || /^quay\.io\//i.test(osCandidate)
          ? osFromRow && !/containerdisks\//i.test(osFromRow) && !/^quay\.io\//i.test(osFromRow)
            ? osFromRow
            : '—'
          : osCandidate || '—',
    }

    return [instanceType, size, osImage]
  }

  if (serviceId === 'cluster') {
    return getClusterInstanceCardSpecRows(instance)
  }

  return allSpecRows.slice(0, 3)
}

function resolveClusterNodeSetIdFromNodeSet(
  nodeSet: TenantClusterNodeSet | undefined,
): string {
  if (!nodeSet) {
    return DEFAULT_CLUSTER_NODE_SET_ID
  }

  if (nodeSet.hostType === 'gpu-host' || nodeSet.name === 'gpu-workers') {
    return 'fc430-gpu'
  }

  if (nodeSet.name === 'infra' || nodeSet.name === 'infra-workers') {
    return 'fc430-infra'
  }

  return DEFAULT_CLUSTER_NODE_SET_ID
}

function resolveClusterInstanceNodeSetId(instance: TenantInstance): string {
  const fromSpecNodeSet = instance.specRows?.find((row) => row.label === 'Node set')?.value.trim()
  if (fromSpecNodeSet && !/·\s*\d+\s+nodes?/i.test(fromSpecNodeSet)) {
    return getCatalogClusterNodeSetOption(fromSpecNodeSet)?.id ?? fromSpecNodeSet
  }

  return resolveClusterNodeSetIdFromNodeSet(resolveClusterConfig(instance).nodeSets[0])
}

/** Same Cluster version / Node set / Host type rows as cluster catalog cards. */
function getClusterInstanceCardSpecRows(instance: TenantInstance): CatalogSpecRow[] {
  const catalog = findCatalogDraftForInstance(instance)
  const catalogRows =
    catalog?.serviceId === 'cluster' ? resolveClusterCatalogHighlightRows(catalog) : null
  const primaryNodeSet = resolveClusterConfig(instance).nodeSets[0]
  const fromSpecHostType = instance.specRows?.find((row) => row.label === 'Host type')?.value.trim()

  const platform =
    getClusterPlatformLabel(instance) ||
    instance.specRows
      ?.find((row) => row.label === 'Cluster version' || row.label === 'Platform')
      ?.value?.trim() ||
    catalogRows?.find((row) => row.label === 'Cluster version')?.value ||
    '—'

  const nodeSetValue = formatClusterNodeSetLabel(resolveClusterInstanceNodeSetId(instance))
  const hostTypeValue = formatClusterHostTypeLabel(
    fromSpecHostType ||
      primaryNodeSet?.hostType ||
      getClusterNodeSetTypeLabel(instance) ||
      catalogRows?.find((row) => row.label === 'Host type')?.value,
  )

  return [
    {
      label: 'Cluster version',
      value: platform,
    },
    {
      label: 'Node set',
      value: nodeSetValue,
    },
    {
      label: 'Host type',
      value: hostTypeValue,
    },
  ]
}

function resolveDemoInstanceProjectFields(options: {
  id: string
  projectName?: string
  scopeKind?: TenantInstanceScopeKind
  projectIds?: string[]
  organizationName: string
}): Pick<TenantInstance, 'projectIds' | 'projectName' | 'scopeKind'> {
  const demoProjectIds = options.projectIds ?? getDemoInstanceProjectIds(options.id)
  if (demoProjectIds.length > 0) {
    return {
      projectIds: demoProjectIds,
      projectName:
        demoProjectIds[0] === DEMO_TENANT_PROJECT_ID_02
          ? DEMO_TENANT_PROJECT_NAME_02
          : DEMO_TENANT_PROJECT_NAME,
      scopeKind: 'project',
    }
  }

  const scopeKind = options.scopeKind ?? 'organization'
  const projectName = options.projectName ?? options.organizationName
  if (scopeKind === 'project' && projectName === DEMO_TENANT_PROJECT_NAME) {
    return {
      projectIds: [DEMO_TENANT_PROJECT_ID],
      projectName,
      scopeKind,
    }
  }

  return {
    projectIds: [],
    projectName,
    scopeKind,
  }
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
    projectName?: string
    scopeKind?: TenantInstanceScopeKind
  },
): TenantInstance {
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * options.hoursAgo).toISOString()
  const catalogItemDisplayName =
    options.catalogItemDisplayName ?? 'bare-metal-gpu-training-server'
  const catalog = getProviderCatalogItems().find(
    (item) => item.displayName.trim().toLowerCase() === catalogItemDisplayName.trim().toLowerCase(),
  )
  const typeHardware = resolveBaremetalInstanceTypeHardware(
    catalog?.instanceTypeId,
    catalog?.instanceTypeLabel,
  )
  const specRows: CatalogSpecRow[] = typeHardware
    ? [
        { label: 'Size', value: typeHardware.sizeLabel },
        { label: 'CPU', value: typeHardware.cpu },
        { label: 'RAM', value: typeHardware.ram },
        { label: 'GPU', value: typeHardware.gpu },
        { label: 'Disk image', value: options.osImage },
      ]
    : [
        { label: 'CPU', value: options.cpu },
        { label: 'RAM', value: options.ram },
        { label: 'GPU', value: options.gpuLabel },
        { label: 'Disk image', value: options.osImage },
      ]

  return {
    id: options.id,
    name: options.name,
    catalogItemDisplayName,
    serviceId: 'baremetal',
    hardwareProfile: options.hardwareProfile,
    osImage: options.osImage,
    networkLabel: 'tenant-workload / bm-compute-a · allow-ssh-https',
    networking: {
      enabled: true,
      virtualNetwork: 'tenant-workload',
      subnet: 'bm-compute-a',
      securityGroup: 'allow-ssh-https',
    },
    gpuLabel: typeHardware?.gpu ?? options.gpuLabel,
    specRows,
    inventory:
      options.status === 'provisioning'
        ? undefined
        : { networkInterfaces: createDemoNetworkInterfaces(options.id, 2) },
    sshPublicKey: DEFAULT_BARE_METAL_SSH_PUBLIC_KEY,
    ...resolveDemoInstanceProjectFields({
      id: options.id,
      projectName: options.projectName,
      scopeKind: options.scopeKind,
      organizationName,
    }),
    status: options.status,
    createdAt,
    provisionedAt: options.status === 'provisioning' ? null : createdAt,
  }
}

export function createDemoTenantBareMetalInstance(organizationName: string): TenantInstance {
  return createDemoTenantBareMetalInstanceVariant(organizationName, {
    id: DEMO_TENANT_BARE_METAL_INSTANCE_ID,
    name: 'bm-server-01',
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
    name: 'bm-server-02',
    status: 'stopped',
    osImage: 'Ubuntu 22.04',
    gpuLabel: 'NVIDIA A100 × 2',
    hardwareProfile: 'Dell PowerEdge XE9680',
    cpu: 'Intel Xeon Platinum 8480+ × 2',
    ram: '1 TB DDR5',
    hoursAgo: 40,
    catalogItemDisplayName: 'bare-metal-dense-gpu-node',
  })
}

export function createDemoTenantBareMetalInstance03(organizationName: string): TenantInstance {
  return createDemoTenantBareMetalInstanceVariant(organizationName, {
    id: DEMO_TENANT_BARE_METAL_INSTANCE_ID_03,
    name: DEMO_MULTI_PROJECT_SHOWCASE_INSTANCE_NAME,
    status: 'running',
    osImage: 'Fedora',
    gpuLabel: 'NVIDIA H100 × 4',
    hardwareProfile: 'Supermicro SYS-821GE-TNHR',
    cpu: 'Intel Xeon Gold 6430 × 2',
    ram: '2 TB DDR5',
    hoursAgo: 12,
    catalogItemDisplayName: 'bare-metal-dense-gpu-node',
  })
}

function createDemoTenantClusterInstanceVariant(
  organizationName: string,
  options: {
    id: string
    name: string
    status: TenantInstanceStatus
    platform: string
    hostType: 'standard-host' | 'gpu-host'
    nodeCount: number
    hoursAgo: number
    desiredVersion?: string
    upgradeStatus?: TenantClusterUpgradeStatus
    nodeSets?: TenantClusterNodeSet[]
    projectName?: string
    scopeKind?: TenantInstanceScopeKind
  },
): TenantInstance {
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * options.hoursAgo).toISOString()
  const baseSpecRows = resolveCatalogSpecRows(
    { serviceId: 'cluster', templateRefId: '', templateName: '' },
    { includeDetails: true },
  )
  const shortVersion = getClusterVersionShortLabel(options.platform)
  const defaultNodeSets: TenantClusterNodeSet[] = [
    {
      id: 'node-set-1',
      name: options.hostType === 'gpu-host' ? 'gpu-workers' : 'workers',
      hostType: options.hostType,
      nodeCount: options.nodeCount,
      version: shortVersion,
      status: options.status === 'provisioning' ? 'pending' : 'ready',
    },
  ]
  const nodeSets = options.nodeSets ?? defaultNodeSets
  const nodeSetId =
    options.hostType === 'gpu-host'
      ? 'fc430-gpu'
      : nodeSets[0]?.name === 'infra' || nodeSets[0]?.name === 'infra-workers'
        ? 'fc430-infra'
        : 'fc430-worker'
  const nodeSetLabel = formatClusterNodeSetLabel(nodeSetId)
  const hostTypeLabel = formatClusterHostTypeLabel(options.hostType)
  const specRows = baseSpecRows.map((row) => {
    if (row.label === 'Cluster version' || row.label === 'Platform') {
      return {
        label: 'Cluster version',
        value: options.platform,
      }
    }
    if (row.label === 'Node set') {
      return { ...row, value: nodeSetLabel, badge: undefined }
    }
    if (row.label === 'Host type') {
      return { ...row, value: hostTypeLabel, badge: undefined }
    }
    return row
  })

  return {
    id: options.id,
    name: options.name,
    catalogItemDisplayName: 'cluster-node-sets-object',
    serviceId: 'cluster',
    hardwareProfile: options.hostType,
    osImage: options.platform,
    networkLabel: 'Pod 10.128.0.0/14 · Service 172.30.0.0/16',
    networking: {
      enabled: true,
      virtualNetwork: 'tenant-workload',
      subnet: 'cluster-compute-a',
      securityGroup: 'allow-cluster-api',
    },
    gpuLabel: options.hostType,
    specRows,
    sshPublicKey: DEFAULT_BARE_METAL_SSH_PUBLIC_KEY,
    clusterConfig: {
      releaseImage: getReleaseImageForClusterVersion(options.platform),
      podCidr: '10.128.0.0/14',
      serviceCidr: '172.30.0.0/16',
      catalogShortName: options.hostType === 'gpu-host' ? 'ocp-gpu' : 'ocp-small',
      creator: 'Alex Johnson',
      desiredVersion: options.desiredVersion,
      upgradeStatus: options.upgradeStatus,
      nodeSets,
      nodes:
        options.status === 'provisioning'
          ? undefined
          : buildClusterNodeInventories(options.id, nodeSets),
    },
    ...resolveDemoInstanceProjectFields({
      id: options.id,
      projectName: options.projectName,
      scopeKind: options.scopeKind,
      organizationName,
    }),
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
    platform: 'OpenShift 4.19',
    hostType: 'standard-host',
    nodeCount: 3,
    hoursAgo: 18,
    desiredVersion: 'OpenShift 4.20',
    upgradeStatus: 'upgrade-available',
    nodeSets: [
      {
        id: 'node-set-1',
        name: 'workers',
        hostType: 'standard-host',
        nodeCount: 3,
        version: '4.19',
        status: 'ready',
      },
      {
        id: 'node-set-2',
        name: 'gpu-workers',
        hostType: 'gpu-host',
        nodeCount: 2,
        version: '4.18',
        status: 'behind',
      },
    ],
  })
}

export function createDemoTenantClusterInstance02(organizationName: string): TenantInstance {
  return createDemoTenantClusterInstanceVariant(organizationName, {
    id: DEMO_TENANT_CLUSTER_INSTANCE_ID_02,
    name: 'ocp-cluster-02',
    status: 'failed',
    platform: 'OpenShift 4.15',
    hostType: 'gpu-host',
    nodeCount: 2,
    hoursAgo: 6,
  })
}

export function createDemoTenantClusterInstance03(organizationName: string): TenantInstance {
  return createDemoTenantClusterInstanceVariant(organizationName, {
    id: DEMO_TENANT_CLUSTER_PROVISIONING_INSTANCE_ID,
    name: 'ocp-cluster-03',
    status: 'provisioning',
    platform: 'OpenShift 4.16',
    hostType: 'gpu-host',
    nodeCount: 4,
    hoursAgo: 1,
  })
}

export function createDemoTenantClusterInstance04(organizationName: string): TenantInstance {
  return createDemoTenantClusterInstanceVariant(organizationName, {
    id: DEMO_TENANT_CLUSTER_INSTANCE_ID_04,
    name: 'ocp-cluster-04',
    status: 'running',
    platform: 'OpenShift 4.21',
    hostType: 'standard-host',
    nodeCount: 3,
    hoursAgo: 8,
    upgradeStatus: 'up-to-date',
    nodeSets: [
      {
        id: 'node-set-1',
        name: 'infra',
        hostType: 'standard-host',
        nodeCount: 3,
        version: '4.21',
        status: 'ready',
      },
      {
        id: 'node-set-2',
        name: 'compute',
        hostType: 'standard-host',
        nodeCount: 6,
        version: '4.21',
        status: 'ready',
      },
      {
        id: 'node-set-3',
        name: 'gpu-workers',
        hostType: 'gpu-host',
        nodeCount: 2,
        version: '4.21',
        status: 'ready',
      },
    ],
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
    projectName?: string
    scopeKind?: TenantInstanceScopeKind
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
    catalogItemDisplayName: 'vm-configurable-network-attachments',
    serviceId: 'virtual-machine',
    hardwareProfile: options.instanceType.split(' - ')[0] ?? 'Standard VM',
    osImage: options.osImage,
    networkLabel: 'tenant-workload / bm-compute-a · allow-ssh-https',
    networking: {
      enabled: true,
      virtualNetwork: 'tenant-workload',
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
    ...resolveDemoInstanceProjectFields({
      id: options.id,
      projectName: options.projectName,
      scopeKind: options.scopeKind,
      organizationName,
    }),
    status: options.status,
    createdAt,
    provisionedAt: options.status === 'provisioning' ? null : createdAt,
  }
}

export function createDemoTenantVirtualMachineInstance(organizationName: string): TenantInstance {
  return createDemoTenantVirtualMachineInstanceVariant(organizationName, {
    id: DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID,
    name: 'vm-instance-01',
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
    name: 'vm-instance-02',
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
    name: 'vm-instance-03',
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
  if (instance.networking?.enabled) {
    return instance.networking
  }

  if (instance.networking && !instance.networking.enabled) {
    // Legacy "off" catalog policy — treat as unset so the service drawer can pick defaults.
  } else if (instance.networkLabel && instance.networkLabel !== 'Networking off') {
    const [placement = '', securityGroup = ''] = instance.networkLabel.split(' · ')
    const [virtualNetwork = '', subnet = ''] = placement.split(' / ')

    return {
      enabled: true,
      virtualNetwork: virtualNetwork.trim(),
      subnet: subnet.trim(),
      securityGroup: securityGroup.trim(),
    }
  }

  return {
    enabled: true,
    virtualNetwork: '',
    subnet: '',
    securityGroup: '',
  }
}

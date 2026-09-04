import {
  getDefaultLaunchSecretSelections,
} from '../tenant/secrets'
import {
  CLUSTER_LAUNCH_DEMO_PULL_SECRET,
  CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY,
} from './clusterLaunchDemoSecrets'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import {
  getCatalogClusterVersionOption,
  getCatalogDiskImageOptions,
  getCatalogInstanceTypeOptions,
  getLatestCatalogClusterVersionId,
  getReleaseImageForClusterVersion,
} from '../catalog/catalogPublishConfig'
import {
  KUBERNETES_RESOURCE_NAME_HELPER,
  isValidKubernetesResourceName,
} from '../shared/kubernetesResourceName'

export type LaunchInstanceWizardStepId =
  | 'general'
  | 'configure'
  | 'networking'
  | 'review'
  | 'provisioning'

export type ProvisioningBootLogStatus = 'completed' | 'in-progress' | 'pending'

export type ProvisioningBootLogStep = {
  id: string
  label: string
}

/** Legacy / models flow with optional networking. */
export const LAUNCH_INSTANCE_WIZARD_STEPS: ReadonlyArray<{
  id: LaunchInstanceWizardStepId
  label: string
  description: string
}> = [
  {
    id: 'configure',
    label: 'Configure',
    description: '',
  },
  {
    id: 'networking',
    label: 'Networking',
    description: '',
  },
  {
    id: 'review',
    label: 'Review',
    description: '',
  },
  {
    id: 'provisioning',
    label: 'Provisioning',
    description: '',
  },
]

/** Bare metal launch flow: General → Networking → Review → Provisioning. */
export const BAREMETAL_LAUNCH_INSTANCE_WIZARD_STEPS: ReadonlyArray<{
  id: LaunchInstanceWizardStepId
  label: string
  description: string
}> = [
  { id: 'general', label: 'General', description: '' },
  { id: 'networking', label: 'Networking', description: '' },
  { id: 'review', label: 'Review', description: '' },
  { id: 'provisioning', label: 'Provisioning', description: '' },
]

/** Bare metal with editable Hardware & OS: General → Hardware & OS → Networking → Review → Provisioning. */
export const BAREMETAL_HARDWARE_OS_LAUNCH_INSTANCE_WIZARD_STEPS: ReadonlyArray<{
  id: LaunchInstanceWizardStepId
  label: string
  description: string
}> = [
  { id: 'general', label: 'General', description: '' },
  { id: 'configure', label: 'Hardware & OS', description: '' },
  { id: 'networking', label: 'Networking', description: '' },
  { id: 'review', label: 'Review', description: '' },
  { id: 'provisioning', label: 'Provisioning', description: '' },
]

/** Cluster launch flow: General → Configure → Networking → Review → Provisioning. */
export const CLUSTER_LAUNCH_INSTANCE_WIZARD_STEPS: ReadonlyArray<{
  id: LaunchInstanceWizardStepId
  label: string
  description: string
}> = [
  { id: 'general', label: 'General', description: '' },
  { id: 'configure', label: 'Configure', description: '' },
  { id: 'networking', label: 'Networking', description: '' },
  { id: 'review', label: 'Review', description: '' },
  { id: 'provisioning', label: 'Provisioning', description: '' },
]

/** VM launch flow: General → Configure → Networking → Review → Provisioning. */
export const VM_LAUNCH_INSTANCE_WIZARD_STEPS: ReadonlyArray<{
  id: LaunchInstanceWizardStepId
  label: string
  description: string
}> = [
  { id: 'general', label: 'General', description: '' },
  { id: 'configure', label: 'Configure', description: '' },
  { id: 'networking', label: 'Networking', description: '' },
  { id: 'review', label: 'Review', description: '' },
  { id: 'provisioning', label: 'Provisioning', description: '' },
]

export function getLaunchInstanceWizardSteps(options: {
  includeNetworking: boolean
  serviceId?: CatalogServiceId
  bareMetalHardwareOsEditable?: boolean
}) {
  if (options.serviceId === 'cluster') {
    return CLUSTER_LAUNCH_INSTANCE_WIZARD_STEPS
  }

  if (options.serviceId === 'virtual-machine') {
    return VM_LAUNCH_INSTANCE_WIZARD_STEPS
  }

  if (options.serviceId === 'baremetal') {
    return options.bareMetalHardwareOsEditable
      ? BAREMETAL_HARDWARE_OS_LAUNCH_INSTANCE_WIZARD_STEPS
      : BAREMETAL_LAUNCH_INSTANCE_WIZARD_STEPS
  }

  // Models / legacy: always include Networking at service launch.
  return LAUNCH_INSTANCE_WIZARD_STEPS
}

export const LAUNCH_INSTANCE_WIZARD_DEMO = {
  configureTitle: 'Name your instance',
  configureLede:
    'Hardware is pre-configured by your admin. Fill in the fields below to personalize your instance.',
  instanceNamePlaceholder: 'e.g. bm-server-01',
  defaultInstanceName: 'bm-server-01',
  sshPlaceholder: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC...',
  defaultSshPublicKey:
    'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7example+demo+key+northsummitbank+tenant-user@demo',
  preConfiguredTitle: 'Pre-configured by admin',
  hardwareProfile: 'Dell PowerEdge R750',
  osImage: 'RHEL 9.4',
  networkingTitle: 'Networking',
  networkingLede:
    'Choose the virtual network, subnet, security group, and external IP pool for this instance.',
  networkingAdminLede:
    'Choose a virtual network, subnet, security group, and IP pool. Add objects in Networking.',
  networkingAssignedHelper: 'Set by your tenant',
  reviewTitle: 'Review',
  reviewHardware: 'Dell PowerEdge R750',
  reviewGpu: 'NVIDIA A100 80 GB',
  reviewOsImage: 'RHEL 9.4',
  reviewProvisioningNote:
    'Provisioning takes 10–20 minutes — live progress tracks setup in your environment.',
  confirmProvisioningLabel: 'Confirm & start provisioning',
  provisioningKicker: 'Provisioning in progress',
  provisioningTitle: 'Booting your instance',
  provisioningLede:
    'Provisioning is underway. This takes 10–20 minutes in production.',
  provisioningDismissibleNote:
    'Provisioning will continue in the background—check status under Services.',
  bootLogRemaining: '~10 sec remaining',
  launchInstanceLabel: 'Launch instance',
  createProjectConfirmTitle: 'Create a project first',
  createProjectConfirmDescription:
    'Create the project on the Projects page — including nested projects under a parent — then return here to continue launching.',
  createProjectConfirmActionLabel: 'Go to Projects',
  closeWhileProvisioningLabel: 'Close',
  backgroundProvisioningAlertTitle: 'Provisioning continues in the background',
  backgroundProvisioningAlertBody:
    'Your instance stays in Provisioning on Services until setup finishes.',
} as const

export const LAUNCH_INSTANCE_DEFAULT_DESCRIPTIONS: Record<CatalogServiceId, string> = {
  baremetal: 'Development server for the payments team.',
  cluster: 'Staging environment for our application team.',
  'virtual-machine': 'Test machine for QA checks.',
  models: 'Demo deployment for the data science team.',
}

export function getLaunchInstanceDefaultDescription(serviceId: CatalogServiceId): string {
  return LAUNCH_INSTANCE_DEFAULT_DESCRIPTIONS[serviceId]
}

export const CLUSTER_LAUNCH_INSTANCE_DEMO = {
  defaultName: 'ocp-cluster-01',
  nameHelper: KUBERNETES_RESOURCE_NAME_HELPER,
  sshPublicKey: CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY,
  sshHelper:
    'Paste a public SSH key for remote access. Supported types: ssh-rsa, ssh-ed25519, and ecdsa-sha2-nistp256/384/521.',
  pullSecret: CLUSTER_LAUNCH_DEMO_PULL_SECRET,
  releaseImage: 'quay.io/openshift-release-dev/ocp-release:4.21.0-multi',
  hostTypeOptions: ['standard-host', 'gpu-host', 'storage-host'] as const,
  defaultHostType: 'standard-host',
  defaultNodeCount: 1,
  infrastructureNetworkingTitle: 'Infrastructure networking',
  infrastructureNetworkingLede:
    'Attach this cluster to your tenant network objects.',
  infrastructureNetworkingAdminLede:
    'Attach this cluster to tenant network objects. Add objects in Networking.',
  clusterNetworkTitle: 'Cluster network',
  clusterNetworkLede: 'Address ranges used inside the cluster for pods and services.',
  podCidr: '10.128.0.0/24',
  podCidrHelper: 'Use CIDR notation (for example 10.128.0.0/14 or fd01::/48).',
  serviceCidr: '10.1.0.0/24',
  serviceCidrHelper: 'Use CIDR notation (for example 172.30.0.0/16 or fd02::/112).',
  addNodeSetLabel: 'Add node set',
  removeNodeSetLabel: 'Remove',
} as const

export const VM_LAUNCH_INSTANCE_DEMO = {
  nameHelper: CLUSTER_LAUNCH_INSTANCE_DEMO.nameHelper,
  sshPublicKey: CLUSTER_LAUNCH_INSTANCE_DEMO.sshPublicKey,
  sshHelper: CLUSTER_LAUNCH_INSTANCE_DEMO.sshHelper,
  containerDiskImage: 'quay.io/containerdisks/fedora:latest',
  containerDiskImageHelper: 'OCI reference',
  osImageHelper: 'Set by the catalog item.',
  instanceTypeOptions: [
    'small - 1 vCPU, 2 GiB',
    'medium - 2 vCPU, 4 GiB',
    'large - 4 vCPU, 16 GiB',
  ] as const,
  defaultInstanceType: 'small - 1 vCPU, 2 GiB',
  bootDiskSizeGiB: 120,
  bootDiskSizeHelper: 'Size in GiB',
  imageSourceType: 'registry',
  imageSourceTypeHelper: 'Fixed by the catalog item.',
  runStrategyOptions: ['Always', 'RerunOnFailure', 'Manual', 'Halted'] as const,
  defaultRunStrategy: 'Always',
  runStrategyHelper: 'Controls when the virtual machine should be running.',
  cloudInitUserData: `#cloud-config
hostname: demo-vm
`,
  cloudInitHelper: 'Optional cloud-init user data (max 64 KB).',
} as const

/** Split launch option `small - 1 vCPU, 2 GiB` into card-friendly Instance type + Size. */
export function parseVmLaunchInstanceTypeOption(value: string): {
  instanceType: string
  size: string
} {
  const separator = ' - '
  const index = value.indexOf(separator)
  if (index === -1) {
    const trimmed = value.trim()
    return { instanceType: trimmed, size: trimmed }
  }

  return {
    instanceType: value.slice(0, index).trim(),
    size: value
      .slice(index + separator.length)
      .trim()
      .replace(/,\s*/g, ' · '),
  }
}

export const BAREMETAL_LAUNCH_INSTANCE_DEMO = {
  nameHelper: CLUSTER_LAUNCH_INSTANCE_DEMO.nameHelper,
  sshPublicKey: CLUSTER_LAUNCH_INSTANCE_DEMO.sshPublicKey,
  sshHelper: CLUSTER_LAUNCH_INSTANCE_DEMO.sshHelper,
} as const

export const PROVISIONING_BOOT_LOG_STEPS: ProvisioningBootLogStep[] = [
  { id: 'claim-host', label: 'Reserving capacity' },
  { id: 'verify-health', label: 'Checking hardware health' },
  { id: 'apply-vlan', label: 'Configuring network' },
  { id: 'write-image', label: 'Installing operating system' },
  { id: 'cloud-init', label: 'Applying your settings' },
  { id: 'register-cr', label: 'Verifying connectivity' },
]

/** Demo: provisioning completes after this duration (wizard animation + background). */
export const LAUNCH_INSTANCE_PROVISIONING_DURATION_MS = 10_000
/** After landing on Services, keep Provisioning visible for this long before Running. */
export const LAUNCH_INSTANCE_SERVICES_PROVISIONING_MS = 5_000
export const LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS = 500
export const LAUNCH_INSTANCE_BOOT_LOG_STEP_MS = Math.floor(
  (LAUNCH_INSTANCE_PROVISIONING_DURATION_MS - LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS) /
    PROVISIONING_BOOT_LOG_STEPS.length,
)

export type ClusterNodeSetForm = {
  id: string
  /** Catalog node-set kind (e.g. fc430-worker). */
  nodeSetId: string
  hostType: string
  nodeCount: number
}

export type LaunchInstanceWizardForm = {
  instanceName: string
  /** Optional free-text description (same pattern as catalog item creation). */
  description: string
  sshPublicKeySecretId: string
  sshPublicKey: string
  pullSecretId: string
  pullSecret: string
  /** Selected OpenShift version id when provisioning a cluster. */
  clusterVersionId: string
  releaseImage: string
  nodeSets: ClusterNodeSetForm[]
  podCidr: string
  serviceCidr: string
  containerDiskImage: string
  instanceType: string
  /** Bare metal disk image id when Hardware & OS is editable (or the catalog default). */
  diskImageId: string
  bootDiskSizeGiB: number
  imageSourceType: string
  runStrategy: string
  cloudInitUserData: string
  virtualNetworkId: string
  subnetId: string
  securityGroupId: string
  externalIpPoolId: string
}

export const LAUNCH_INSTANCE_NAME_PREFIX_BY_SERVICE: Record<CatalogServiceId, string> = {
  baremetal: 'bm-server',
  cluster: 'ocp-cluster',
  models: 'model-endpoint',
  'virtual-machine': 'vm-instance',
}

/** @deprecated Prefer getLaunchInstanceNamePrefix(serviceId). */
export const LAUNCH_INSTANCE_NAME_PREFIX = LAUNCH_INSTANCE_NAME_PREFIX_BY_SERVICE.baremetal

export function getLaunchInstanceNamePrefix(serviceId: CatalogServiceId): string {
  return LAUNCH_INSTANCE_NAME_PREFIX_BY_SERVICE[serviceId]
}

export function getLaunchInstanceNamePlaceholder(serviceId: CatalogServiceId): string {
  return `e.g. ${getLaunchInstanceNamePrefix(serviceId)}-01`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Next demo name like bm-server-01, ocp-cluster-01, or vm-instance-01 based on service + existing instances. */
export function getNextLaunchInstanceName(
  existingNames: readonly string[],
  serviceId: CatalogServiceId = 'baremetal',
): string {
  const prefix = getLaunchInstanceNamePrefix(serviceId).toLowerCase()
  let highestNumber = 0
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, 'i')

  for (const name of existingNames) {
    const match = name.trim().match(pattern)
    if (!match) {
      continue
    }

    const value = Number.parseInt(match[1], 10)
    if (!Number.isNaN(value)) {
      highestNumber = Math.max(highestNumber, value)
    }
  }

  const nextNumber = String(highestNumber + 1).padStart(2, '0')
  return `${prefix}-${nextNumber}`
}

export function createDefaultClusterNodeSet(
  index = 1,
  hostType: string = CLUSTER_LAUNCH_INSTANCE_DEMO.defaultHostType,
  nodeSetId: string = 'fc430-worker',
): ClusterNodeSetForm {
  return {
    id: `node-set-${index}`,
    nodeSetId,
    hostType,
    nodeCount: CLUSTER_LAUNCH_INSTANCE_DEMO.defaultNodeCount,
  }
}

export const DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM: LaunchInstanceWizardForm = {
  instanceName: LAUNCH_INSTANCE_WIZARD_DEMO.defaultInstanceName,
  description: '',
  sshPublicKeySecretId: '',
  sshPublicKey: LAUNCH_INSTANCE_WIZARD_DEMO.defaultSshPublicKey,
  pullSecretId: '',
  pullSecret: '',
  clusterVersionId: '',
  releaseImage: '',
  nodeSets: [createDefaultClusterNodeSet()],
  podCidr: '',
  serviceCidr: '',
  containerDiskImage: '',
  instanceType: '',
  diskImageId: '',
  bootDiskSizeGiB: VM_LAUNCH_INSTANCE_DEMO.bootDiskSizeGiB,
  imageSourceType: VM_LAUNCH_INSTANCE_DEMO.imageSourceType,
  runStrategy: VM_LAUNCH_INSTANCE_DEMO.defaultRunStrategy,
  cloudInitUserData: '',
  virtualNetworkId: '',
  subnetId: '',
  securityGroupId: '',
  externalIpPoolId: '',
}

export function createLaunchInstanceWizardForm(options: {
  virtualNetworkId: string
  subnetId: string
  securityGroupId: string
  externalIpPoolId: string
  instanceName?: string
  serviceId?: CatalogServiceId
  /** Catalog cluster version id or Platform label; maps to release image. */
  clusterVersion?: string
  /** Catalog default host type for the first node set. */
  hostType?: string
  /** Catalog default node-set kind for the first node set. */
  nodeSetId?: string
  /** Bare metal default instance type id. */
  instanceTypeId?: string
  /** Bare metal default disk image id. */
  diskImageId?: string
  tenantSlug?: string
}): LaunchInstanceWizardForm {
  const serviceId = options.serviceId ?? 'baremetal'
  const isCluster = serviceId === 'cluster'
  const isVm = serviceId === 'virtual-machine'
  const isBaremetal = serviceId === 'baremetal'
  const launchSecrets =
    options.tenantSlug &&
    (isCluster || isVm || isBaremetal)
      ? getDefaultLaunchSecretSelections(options.tenantSlug)
      : null
  const matchedClusterVersion = isCluster
    ? getCatalogClusterVersionOption(options.clusterVersion)
    : undefined
  const clusterVersionId = isCluster
    ? (matchedClusterVersion?.id ?? getLatestCatalogClusterVersionId())
    : ''
  const defaultHostType =
    options.hostType?.trim() || CLUSTER_LAUNCH_INSTANCE_DEMO.defaultHostType
  const defaultNodeSetId = options.nodeSetId?.trim() || 'fc430-worker'

  return {
    ...DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM,
    description: getLaunchInstanceDefaultDescription(serviceId),
    instanceName:
      options.instanceName ??
      (isCluster || isVm || isBaremetal
        ? getNextLaunchInstanceName([], serviceId)
        : DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM.instanceName),
    sshPublicKeySecretId: launchSecrets?.sshPublicKeySecretId ?? '',
    sshPublicKey:
      launchSecrets?.sshPublicKey ??
      (isCluster || isVm || isBaremetal
        ? CLUSTER_LAUNCH_INSTANCE_DEMO.sshPublicKey
        : DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM.sshPublicKey),
    pullSecretId: launchSecrets?.pullSecretId ?? '',
    pullSecret:
      launchSecrets?.pullSecret ??
      (isCluster ? CLUSTER_LAUNCH_INSTANCE_DEMO.pullSecret : ''),
    clusterVersionId,
    releaseImage: isCluster
      ? getReleaseImageForClusterVersion(
          clusterVersionId || options.clusterVersion || CLUSTER_LAUNCH_INSTANCE_DEMO.releaseImage,
        )
      : '',
    nodeSets: [createDefaultClusterNodeSet(1, defaultHostType, defaultNodeSetId)],
    podCidr: isCluster ? CLUSTER_LAUNCH_INSTANCE_DEMO.podCidr : '',
    serviceCidr: isCluster ? CLUSTER_LAUNCH_INSTANCE_DEMO.serviceCidr : '',
    containerDiskImage: isVm ? VM_LAUNCH_INSTANCE_DEMO.containerDiskImage : '',
    instanceType: isVm
      ? VM_LAUNCH_INSTANCE_DEMO.defaultInstanceType
      : isBaremetal
        ? options.instanceTypeId?.trim() ||
          getCatalogInstanceTypeOptions('baremetal')[0]?.id ||
          ''
        : '',
    diskImageId: isBaremetal
      ? options.diskImageId?.trim() || getCatalogDiskImageOptions()[0]?.id || ''
      : '',
    bootDiskSizeGiB: isVm
      ? VM_LAUNCH_INSTANCE_DEMO.bootDiskSizeGiB
      : DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM.bootDiskSizeGiB,
    imageSourceType: isVm
      ? VM_LAUNCH_INSTANCE_DEMO.imageSourceType
      : DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM.imageSourceType,
    runStrategy: isVm
      ? VM_LAUNCH_INSTANCE_DEMO.defaultRunStrategy
      : DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM.runStrategy,
    cloudInitUserData: isVm ? VM_LAUNCH_INSTANCE_DEMO.cloudInitUserData : '',
    virtualNetworkId: options.virtualNetworkId,
    subnetId: options.subnetId,
    securityGroupId: options.securityGroupId,
    externalIpPoolId: options.externalIpPoolId,
  }
}

/** DNS label (RFC 1035): lowercase letter, then lowercase letters/digits/hyphens. */
export function isDnsLabelValid(name: string): boolean {
  return isValidKubernetesResourceName(name)
}

export function isInstanceNameValid(name: string): boolean {
  return isValidKubernetesResourceName(name)
}

export function isClusterGeneralStepValid(form: LaunchInstanceWizardForm): boolean {
  return (
    isDnsLabelValid(form.instanceName) &&
    form.sshPublicKey.trim().length > 0 &&
    form.pullSecret.trim().length > 0
  )
}

export function isClusterConfigureStepValid(form: LaunchInstanceWizardForm): boolean {
  return (
    form.clusterVersionId.trim().length > 0 &&
    form.releaseImage.trim().length > 0 &&
    form.nodeSets.length > 0 &&
    form.nodeSets.every(
      (nodeSet) =>
        nodeSet.nodeSetId.trim().length > 0 &&
        nodeSet.hostType.trim().length > 0 &&
        nodeSet.nodeCount >= 1,
    )
  )
}

export function isClusterNetworkingStepValid(form: LaunchInstanceWizardForm): boolean {
  return (
    form.podCidr.trim().length > 0 &&
    form.serviceCidr.trim().length > 0 &&
    isVmNetworkingStepValid(form)
  )
}

export function isVmGeneralStepValid(form: LaunchInstanceWizardForm): boolean {
  return isDnsLabelValid(form.instanceName) && form.sshPublicKey.trim().length > 0
}

export function isVmConfigureStepValid(form: LaunchInstanceWizardForm): boolean {
  return (
    form.containerDiskImage.trim().length > 0 &&
    form.instanceType.trim().length > 0 &&
    form.bootDiskSizeGiB >= 1 &&
    form.imageSourceType.trim().length > 0 &&
    form.runStrategy.trim().length > 0
  )
}

export function isVmNetworkingStepValid(form: LaunchInstanceWizardForm): boolean {
  return (
    form.virtualNetworkId.trim().length > 0 &&
    form.subnetId.trim().length > 0 &&
    form.securityGroupId.trim().length > 0 &&
    form.externalIpPoolId.trim().length > 0
  )
}

export function isBareMetalGeneralStepValid(form: LaunchInstanceWizardForm): boolean {
  return isDnsLabelValid(form.instanceName) && form.sshPublicKey.trim().length > 0
}

export function isBareMetalHardwareOsStepValid(form: LaunchInstanceWizardForm): boolean {
  return form.instanceType.trim().length > 0 && form.diskImageId.trim().length > 0
}

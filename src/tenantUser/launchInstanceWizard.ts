export type LaunchInstanceWizardStepId = 'configure' | 'review' | 'provisioning'

export type ProvisioningBootLogStatus = 'completed' | 'in-progress' | 'pending'

export type ProvisioningBootLogStep = {
  id: string
  label: string
}

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

export const LAUNCH_INSTANCE_WIZARD_DEMO = {
  configureTitle: 'Name your instance',
  configureLede:
    'Hardware is pre-configured by your admin. Fill in the fields below to personalize your instance.',
  instanceNamePlaceholder: 'e.g. ml-experiment-01',
  defaultInstanceName: 'ml-experiment-01',
  sshPlaceholder: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC...',
  defaultSshPublicKey:
    'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7example+demo+key+northsummitbank+tenant-user@demo',
  preConfiguredTitle: 'Pre-configured by admin',
  hardwareProfile: 'Dell PowerEdge R750',
  osImage: 'RHEL 9.4',
  networkVlan: '200 · Primary Provisioning',
  reviewTitle: 'Review',
  reviewHardware: 'Dell PowerEdge R750',
  reviewGpu: 'CPU-only',
  reviewOsImage: 'RHEL 9.4',
  reviewNetwork: '200 · Primary Provisioning Network',
  reviewProvisioningNote:
    'Provisioning takes 10–20 minutes — live boot log tracks data center progress.',
  confirmProvisioningLabel: 'Confirm & start provisioning',
  provisioningKicker: 'Provisioning in progress',
  provisioningTitle: 'Booting your instance',
  provisioningLede:
    'Physical provisioning is underway. This takes 10–20 minutes in production.',
  provisioningDismissibleNote:
    'Provisioning will continue in the background—check status in My instances.',
  bootLogRemaining: '~11 min remaining',
  launchInstanceLabel: 'Launch instance',
  closeWhileProvisioningLabel: 'Close',
  backgroundProvisioningAlertTitle: 'Provisioning continues in the background',
  backgroundProvisioningAlertBody:
    'Your instance stays in Provisioning on My instances until bare metal setup finishes.',
} as const

export const LAUNCH_INSTANCE_BOOT_LOG_STEP_MS = 850
export const LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS = 900

export const PROVISIONING_BOOT_LOG_STEPS: ProvisioningBootLogStep[] = [
  { id: 'claim-host', label: 'Claiming BareMetalHost from Metal3 inventory' },
  { id: 'verify-health', label: 'Verifying hardware health via IPMI / BMC' },
  { id: 'apply-vlan', label: 'Applying VLAN profile and network policy' },
  { id: 'boot-order', label: 'Configuring boot order — setting PXE as primary' },
  {
    id: 'network-boot',
    label: 'Initiating network boot — fetching OS image (RHEL 9.4 · 9.2 GB)',
  },
  { id: 'write-image', label: 'Writing OS image to NVMe drives (ETA ~8 min)' },
  { id: 'post-installer', label: 'Waiting for host to POST and enter OS installer' },
  { id: 'first-boot', label: 'First-boot OS initialization and kernel setup' },
  { id: 'acceptance-tests', label: 'Running hardware acceptance tests' },
  {
    id: 'cloud-init',
    label: 'Applying cloud-init — SSH keys, hostname, network config',
  },
  {
    id: 'register-cr',
    label: 'Verifying connectivity and registering BareMetalInstance CR',
  },
]

export type LaunchInstanceWizardForm = {
  instanceName: string
  sshPublicKey: string
}

export const DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM: LaunchInstanceWizardForm = {
  instanceName: LAUNCH_INSTANCE_WIZARD_DEMO.defaultInstanceName,
  sshPublicKey: LAUNCH_INSTANCE_WIZARD_DEMO.defaultSshPublicKey,
}

export function isInstanceNameValid(name: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name.trim())
}

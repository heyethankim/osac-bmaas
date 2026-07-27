export type LaunchInstanceWizardStepId =
  | 'configure'
  | 'networking'
  | 'review'
  | 'provisioning'

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

export function getLaunchInstanceWizardSteps(includeNetworking: boolean) {
  return includeNetworking
    ? LAUNCH_INSTANCE_WIZARD_STEPS
    : LAUNCH_INSTANCE_WIZARD_STEPS.filter((step) => step.id !== 'networking')
}

export const LAUNCH_INSTANCE_WIZARD_DEMO = {
  configureTitle: 'Name your instance',
  configureLede:
    'Hardware is pre-configured by your admin. Fill in the fields below to personalize your instance.',
  instanceNamePlaceholder: 'e.g. ML-Experiment-01',
  defaultInstanceName: 'ML-Experiment-01',
  sshPlaceholder: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC...',
  defaultSshPublicKey:
    'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7example+demo+key+northsummitbank+tenant-user@demo',
  preConfiguredTitle: 'Pre-configured by admin',
  hardwareProfile: 'Dell PowerEdge R750',
  osImage: 'RHEL 9.4',
  networkingTitle: 'Networking',
  networkingLede:
    'Your organization sets the network placement. Choose any options your project allows.',
  networkingAssignedHelper: 'Set by your organization',
  reviewTitle: 'Review',
  reviewHardware: 'Dell PowerEdge R750',
  reviewGpu: 'CPU-only',
  reviewOsImage: 'RHEL 9.4',
  reviewProvisioningNote:
    'Provisioning takes 10–20 minutes — live progress tracks setup in your environment.',
  confirmProvisioningLabel: 'Confirm & start provisioning',
  provisioningKicker: 'Provisioning in progress',
  provisioningTitle: 'Booting your instance',
  provisioningLede:
    'Provisioning is underway. This takes 10–20 minutes in production.',
  provisioningDismissibleNote:
    'Provisioning will continue in the background—check status in My instances.',
  bootLogRemaining: '~10 sec remaining',
  launchInstanceLabel: 'Launch instance',
  closeWhileProvisioningLabel: 'Close',
  backgroundProvisioningAlertTitle: 'Provisioning continues in the background',
  backgroundProvisioningAlertBody:
    'Your instance stays in Provisioning on My instances until setup finishes.',
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
export const LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS = 500
export const LAUNCH_INSTANCE_BOOT_LOG_STEP_MS = Math.floor(
  (LAUNCH_INSTANCE_PROVISIONING_DURATION_MS - LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS) /
    PROVISIONING_BOOT_LOG_STEPS.length,
)

export type LaunchInstanceWizardForm = {
  instanceName: string
  sshPublicKey: string
  virtualNetworkId: string
  subnetId: string
  securityGroupId: string
}

export const LAUNCH_INSTANCE_NAME_PREFIX = 'ML-Experiment'

/** Next demo name like ML-Experiment-01, ML-Experiment-02, … based on existing instances. */
export function getNextLaunchInstanceName(existingNames: readonly string[]): string {
  let highestNumber = 0
  const pattern = /^ml-experiment-(\d+)$/i

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

  return `${LAUNCH_INSTANCE_NAME_PREFIX}-${String(highestNumber + 1).padStart(2, '0')}`
}

export const DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM: LaunchInstanceWizardForm = {
  instanceName: LAUNCH_INSTANCE_WIZARD_DEMO.defaultInstanceName,
  sshPublicKey: LAUNCH_INSTANCE_WIZARD_DEMO.defaultSshPublicKey,
  virtualNetworkId: '',
  subnetId: '',
  securityGroupId: '',
}

export function createLaunchInstanceWizardForm(options: {
  virtualNetworkId: string
  subnetId: string
  securityGroupId: string
  instanceName?: string
}): LaunchInstanceWizardForm {
  return {
    ...DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM,
    instanceName: options.instanceName ?? DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM.instanceName,
    virtualNetworkId: options.virtualNetworkId,
    subnetId: options.subnetId,
    securityGroupId: options.securityGroupId,
  }
}

export function isInstanceNameValid(name: string): boolean {
  return /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(name.trim())
}

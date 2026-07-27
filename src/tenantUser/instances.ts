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
  hardwareProfile: string
  osImage: string
  /** Combined summary for legacy list views; prefer `networking` in details. */
  networkLabel: string
  networking?: TenantInstanceNetworking
  gpuLabel: string
  /** Scope label: project name when project-scoped, organization name otherwise. */
  projectName: string
  scopeKind: TenantInstanceScopeKind
  status: TenantInstanceStatus
  createdAt: string
  provisionedAt: string | null
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

/** Title-caps hyphenated instance names for display (e.g. ml-experiment-02 → ML-Experiment-02). */
export function formatTenantInstanceName(name: string): string {
  return name
    .split('-')
    .map((part) => {
      if (/^\d+$/.test(part)) {
        return part
      }
      if (part.length <= 2) {
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

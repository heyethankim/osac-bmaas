export type TenantInstanceStatus = 'provisioning' | 'running' | 'failed'

export type TenantInstance = {
  id: string
  name: string
  catalogItemDisplayName: string
  hardwareProfile: string
  osImage: string
  networkLabel: string
  gpuLabel: string
  projectName: string
  status: TenantInstanceStatus
  createdAt: string
  provisionedAt: string | null
}

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
    case 'failed':
      return 'Failed'
    default:
      return status
  }
}

export function getTenantInstanceActions(
  instance: TenantInstance,
  onTerminate: (instanceId: string) => void,
  onViewDetails?: (instance: TenantInstance) => void,
): Array<{
  title: string
  isAriaDisabled?: boolean
  onClick: () => void
}> {
  const isRunning = instance.status === 'running'

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
        /* demo */
      },
    },
    {
      title: 'Terminate instance',
      isAriaDisabled: instance.status === 'provisioning',
      onClick: () => {
        onTerminate(instance.id)
      },
    },
  ]
}

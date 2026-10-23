import {
  getCatalogClusterVersionOptions,
  getReleaseImageForClusterVersion,
  type CatalogClusterVersionOption,
} from '../catalog/catalogPublishConfig'
import {
  getClusterPlatformLabel,
  getClusterVersionShortLabel,
  resolveClusterConfig,
  type TenantClusterUpgradeHistoryEntry,
  type TenantClusterUpgradeStatus,
  type TenantInstance,
} from './instances'
import {
  type BareMetalProvisioningStageDef,
  type BareMetalProvisioningStageView,
  type BareMetalProvisioningStepDef,
  type BareMetalProvisioningStepStatus,
  type BareMetalProvisioningStepView,
} from './bareMetalProvisioning'

/** Demo wall-clock window for the upgrade progress stepper. */
export const CLUSTER_UPGRADE_DEMO_DURATION_MS = 12_000

/** User-facing estimate shown in remaining labels (not wall-clock). Under provisioning (~20 min). */
export const CLUSTER_UPGRADE_DISPLAY_DURATION_MS = 15 * 60 * 1000

export const CLUSTER_UPGRADE_STAGES: readonly BareMetalProvisioningStageDef[] = [
  {
    id: 'control-plane',
    label: 'Control plane',
    steps: [{ id: 'updating-control-plane', label: 'Updating control plane' }],
  },
  {
    id: 'node-sets',
    label: 'Node sets',
    steps: [{ id: 'updating-node-sets', label: 'Updating node sets' }],
  },
  {
    id: 'finalizing',
    label: 'Finalizing',
    steps: [{ id: 'completing-upgrade', label: 'Completing upgrade' }],
  },
]

export function getClusterUpgradeLeafSteps(): BareMetalProvisioningStepDef[] {
  return CLUSTER_UPGRADE_STAGES.flatMap((stage) => [...stage.steps])
}

export const CLUSTER_UPGRADE_LEAF_COUNT = getClusterUpgradeLeafSteps().length

export const CLUSTER_UPGRADE_STEP_MS = Math.floor(
  CLUSTER_UPGRADE_DEMO_DURATION_MS / CLUSTER_UPGRADE_LEAF_COUNT,
)

export function getClusterUpgradeStatusLabel(status: TenantClusterUpgradeStatus): string {
  switch (status) {
    case 'upgrade-available':
      return 'Upgrade available'
    case 'upgrading':
      return 'Upgrading'
    case 'up-to-date':
    default:
      return 'Up to date'
  }
}

export function getClusterUpgradeStatusColor(
  status: TenantClusterUpgradeStatus,
): 'green' | 'blue' | 'orange' | 'grey' {
  switch (status) {
    case 'upgrade-available':
      return 'orange'
    case 'upgrading':
      return 'blue'
    case 'up-to-date':
    default:
      return 'green'
  }
}

function parseVersionNumber(versionLabel: string): number {
  const short = getClusterVersionShortLabel(versionLabel)
  const match = short.match(/^(\d+)\.(\d+)/)
  if (!match) {
    return Number.NaN
  }
  return Number(match[1]) + Number(match[2]) / 100
}

/** Direct X→Y targets: every catalog version newer than the cluster’s current version. */
export function listClusterUpgradeTargetOptions(
  currentVersionLabel: string,
): CatalogClusterVersionOption[] {
  const current = parseVersionNumber(currentVersionLabel)
  if (Number.isNaN(current)) {
    return []
  }

  return getCatalogClusterVersionOptions().filter((option) => {
    const candidate = parseVersionNumber(option.label)
    return !Number.isNaN(candidate) && candidate > current
  })
}

export function getDefaultClusterUpgradeTargetId(
  currentVersionLabel: string,
  preferredTargetLabel?: string | null,
): string {
  const targets = listClusterUpgradeTargetOptions(currentVersionLabel)
  if (preferredTargetLabel?.trim()) {
    const preferredShort = getClusterVersionShortLabel(preferredTargetLabel)
    const match = targets.find(
      (option) => getClusterVersionShortLabel(option.label) === preferredShort,
    )
    if (match) {
      return match.id
    }
  }
  return targets[0]?.id ?? ''
}

export function formatClusterUpgradeHistoryWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getClusterUpgradeHistory(
  instance: TenantInstance,
): TenantClusterUpgradeHistoryEntry[] {
  return resolveClusterConfig(instance).upgradeHistory ?? []
}

export function applyClusterUpgradeStart(
  instance: TenantInstance,
  targetVersionLabel: string,
): TenantInstance {
  const config = resolveClusterConfig(instance)
  const startedAt = new Date().toISOString()
  return {
    ...instance,
    clusterConfig: {
      ...config,
      desiredVersion: targetVersionLabel,
      upgradeStatus: 'upgrading',
      upgradeStartedAt: startedAt,
      nodeSets: config.nodeSets.map((nodeSet) => ({
        ...nodeSet,
        status: 'updating',
      })),
    },
  }
}

function withClusterPlatformSpecRows(
  instance: TenantInstance,
  platformLabel: string,
): TenantInstance['specRows'] {
  if (!instance.specRows?.length) {
    return instance.specRows
  }
  return instance.specRows.map((row) =>
    row.label === 'Cluster version' || row.label === 'Platform'
      ? { ...row, value: platformLabel }
      : row,
  )
}

export function applyClusterUpgradeComplete(instance: TenantInstance): TenantInstance {
  const config = resolveClusterConfig(instance)
  const fromVersion = getClusterPlatformLabel(instance)
  const toVersion = config.desiredVersion?.trim() || fromVersion
  const shortTo = getClusterVersionShortLabel(toVersion)
  const completedAt = new Date().toISOString()
  const historyEntry: TenantClusterUpgradeHistoryEntry = {
    id: `upgrade-${completedAt}`,
    startedAt: config.upgradeStartedAt ?? completedAt,
    completedAt,
    fromVersion,
    toVersion,
    initiatedBy: config.creator?.trim() || 'Alex Johnson',
    result: 'succeeded',
  }

  return {
    ...instance,
    osImage: toVersion,
    specRows: withClusterPlatformSpecRows(instance, toVersion),
    clusterConfig: {
      ...config,
      releaseImage: getReleaseImageForClusterVersion(toVersion),
      desiredVersion: undefined,
      upgradeStatus: 'up-to-date',
      upgradeStartedAt: undefined,
      nodeSets: config.nodeSets.map((nodeSet) => ({
        ...nodeSet,
        version: shortTo,
        status: 'ready',
      })),
      upgradeHistory: [historyEntry, ...(config.upgradeHistory ?? [])],
    },
  }
}

export function formatClusterUpgradeRemainingLabel(activeLeafIndex: number): string {
  if (activeLeafIndex >= CLUSTER_UPGRADE_LEAF_COUNT) {
    return 'Finishing up'
  }

  const leavesRemaining = CLUSTER_UPGRADE_LEAF_COUNT - activeLeafIndex
  const remainingMs = Math.round(
    (CLUSTER_UPGRADE_DISPLAY_DURATION_MS / CLUSTER_UPGRADE_LEAF_COUNT) * leavesRemaining,
  )
  const minutes = Math.max(1, Math.round(remainingMs / 60_000))
  return `~${minutes} min remaining`
}

export function getClusterUpgradeActiveLeafIndex(
  startedAt: string,
  nowMs: number = Date.now(),
): number {
  const started = Date.parse(startedAt)
  if (Number.isNaN(started)) {
    return 0
  }
  const elapsed = Math.max(0, nowMs - started)
  return Math.min(CLUSTER_UPGRADE_LEAF_COUNT, Math.floor(elapsed / CLUSTER_UPGRADE_STEP_MS))
}

function stepStatus(
  leafIndex: number,
  activeLeafIndex: number,
): BareMetalProvisioningStepStatus {
  if (leafIndex < activeLeafIndex) {
    return 'completed'
  }
  if (leafIndex === activeLeafIndex) {
    return 'in-progress'
  }
  return 'pending'
}

function stageStatus(
  stepStatuses: readonly BareMetalProvisioningStepStatus[],
): BareMetalProvisioningStepStatus {
  if (stepStatuses.every((status) => status === 'completed')) {
    return 'completed'
  }
  if (stepStatuses.some((status) => status === 'in-progress')) {
    return 'in-progress'
  }
  return 'pending'
}

export function resolveClusterUpgradeStages(
  startedAt: string,
  nowMs: number = Date.now(),
): BareMetalProvisioningStageView[] {
  const activeLeafIndex = getClusterUpgradeActiveLeafIndex(startedAt, nowMs)
  let leafCursor = 0

  return CLUSTER_UPGRADE_STAGES.map((stage) => {
    const steps: BareMetalProvisioningStepView[] = stage.steps.map((step) => {
      const status = stepStatus(leafCursor, activeLeafIndex)
      leafCursor += 1
      return {
        id: step.id,
        label: step.label,
        status,
        message: status === 'in-progress' ? step.label : undefined,
      }
    })

    return {
      id: stage.id,
      label: stage.label,
      status: stageStatus(steps.map((step) => step.status)),
      steps,
    }
  })
}

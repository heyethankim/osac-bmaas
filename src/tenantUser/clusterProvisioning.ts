import {
  type BareMetalProvisioningStageDef,
  type BareMetalProvisioningStageView,
  type BareMetalProvisioningStepDef,
  type BareMetalProvisioningStepOverride,
  type BareMetalProvisioningStepStatus,
  type BareMetalProvisioningStepView,
} from './bareMetalProvisioning'

/** User-facing estimate shown in remaining labels (not wall-clock). */
export const CLUSTER_PROVISIONING_DISPLAY_DURATION_MS = 20 * 60 * 1000

/** Demo fast-track: all leaf steps complete within this wall-clock window. */
export const CLUSTER_PROVISIONING_DEMO_DURATION_MS = 15_000

/**
 * Cluster-as-a-service install progress (OpenShift-style), independent of the
 * bare-metal four-stage host allocation flow.
 */
export const CLUSTER_PROVISIONING_STAGES: readonly BareMetalProvisioningStageDef[] = [
  {
    id: 'validating',
    label: 'Validating',
    steps: [{ id: 'validating-configuration', label: 'Validating configuration' }],
  },
  {
    id: 'preparing',
    label: 'Preparing',
    steps: [{ id: 'creating-infrastructure', label: 'Creating infrastructure' }],
  },
  {
    id: 'bootstrapping',
    label: 'Bootstrapping',
    steps: [{ id: 'bootstrapping-control-plane', label: 'Bootstrapping control plane' }],
  },
  {
    id: 'installing',
    label: 'Installing',
    steps: [
      { id: 'joining-workers', label: 'Joining worker nodes' },
      { id: 'installing-operators', label: 'Installing cluster operators' },
      { id: 'configuring-cluster-network', label: 'Configuring cluster network' },
    ],
  },
  {
    id: 'finalizing',
    label: 'Finalizing',
    steps: [
      { id: 'approving-certificates', label: 'Approving certificates' },
      { id: 'completing-installation', label: 'Completing installation' },
    ],
  },
]

export function getClusterProvisioningLeafSteps(): BareMetalProvisioningStepDef[] {
  return CLUSTER_PROVISIONING_STAGES.flatMap((stage) => [...stage.steps])
}

export const CLUSTER_PROVISIONING_LEAF_COUNT = getClusterProvisioningLeafSteps().length

export const CLUSTER_PROVISIONING_STEP_MS = Math.floor(
  CLUSTER_PROVISIONING_DEMO_DURATION_MS / CLUSTER_PROVISIONING_LEAF_COUNT,
)

export function formatClusterProvisioningRemainingLabel(activeLeafIndex: number): string {
  if (activeLeafIndex >= CLUSTER_PROVISIONING_LEAF_COUNT) {
    return 'Finishing up'
  }

  const leavesRemaining = CLUSTER_PROVISIONING_LEAF_COUNT - activeLeafIndex
  const remainingMs = Math.round(
    (CLUSTER_PROVISIONING_DISPLAY_DURATION_MS / CLUSTER_PROVISIONING_LEAF_COUNT) * leavesRemaining,
  )
  const minutes = Math.max(1, Math.round(remainingMs / 60_000))
  return `~${minutes} min remaining`
}

export function getClusterProvisioningDemoRemainingMs(
  createdAt: string,
  nowMs: number = Date.now(),
): number {
  const started = Date.parse(createdAt)
  if (Number.isNaN(started)) {
    return CLUSTER_PROVISIONING_DEMO_DURATION_MS
  }
  return Math.max(0, CLUSTER_PROVISIONING_DEMO_DURATION_MS - (nowMs - started))
}

function deriveStageStatus(
  steps: readonly BareMetalProvisioningStepView[],
): BareMetalProvisioningStepStatus {
  if (steps.some((step) => step.status === 'failed')) {
    return 'failed'
  }
  if (steps.some((step) => step.status === 'warning')) {
    return 'warning'
  }
  if (steps.some((step) => step.status === 'in-progress')) {
    return 'in-progress'
  }
  if (steps.every((step) => step.status === 'completed')) {
    return 'completed'
  }
  if (steps.every((step) => step.status === 'pending')) {
    return 'pending'
  }
  return 'in-progress'
}

export function resolveClusterProvisioningStages(
  activeLeafIndex: number,
  overrides: Readonly<Record<string, BareMetalProvisioningStepOverride>> = {},
): BareMetalProvisioningStageView[] {
  let leafOffset = 0

  return CLUSTER_PROVISIONING_STAGES.map((stage) => {
    const steps: BareMetalProvisioningStepView[] = stage.steps.map((step) => {
      const index = leafOffset
      leafOffset += 1
      const override = overrides[step.id]

      if (override && index === activeLeafIndex) {
        return {
          ...step,
          status: override.status,
          message: override.message,
          detail: override.detail,
          nextStep: override.nextStep,
          actionLabel: override.actionLabel,
        }
      }

      if (index < activeLeafIndex) {
        return { ...step, status: 'completed' }
      }
      if (index === activeLeafIndex) {
        return { ...step, status: 'in-progress' }
      }
      return { ...step, status: 'pending' }
    })

    return {
      id: stage.id,
      label: stage.label,
      status: deriveStageStatus(steps),
      steps,
    }
  })
}

export function getClusterProvisioningActiveLeafIndex(
  createdAt: string,
  nowMs: number = Date.now(),
  stepMs: number = CLUSTER_PROVISIONING_STEP_MS,
): number {
  const started = Date.parse(createdAt)
  if (Number.isNaN(started) || stepMs <= 0) {
    return 0
  }

  const elapsed = Math.max(0, nowMs - started)
  return Math.min(CLUSTER_PROVISIONING_LEAF_COUNT, Math.floor(elapsed / stepMs))
}

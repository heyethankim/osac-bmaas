/** User-facing estimate shown in remaining labels (not wall-clock). */
export const BARE_METAL_PROVISIONING_DISPLAY_DURATION_MS = 20 * 60 * 1000

/** Demo fast-track: all leaf steps complete within this wall-clock window. */
export const BARE_METAL_PROVISIONING_DEMO_DURATION_MS = 15_000

/** Leaf / stage status for bare metal provisioning progress. */
export type BareMetalProvisioningStepStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'warning'
  | 'failed'

export type BareMetalProvisioningStepDef = {
  id: string
  label: string
}

export type BareMetalProvisioningStageDef = {
  id: string
  label: string
  steps: readonly BareMetalProvisioningStepDef[]
}

export type BareMetalProvisioningStepView = BareMetalProvisioningStepDef & {
  status: BareMetalProvisioningStepStatus
  message?: string
  detail?: string
  nextStep?: string
  actionLabel?: string
}

export type BareMetalProvisioningStageView = {
  id: string
  label: string
  status: BareMetalProvisioningStepStatus
  steps: BareMetalProvisioningStepView[]
}

/**
 * Bare metal provisioning: 4 user-facing stages mapped to backend HostAllocation,
 * Provisioning, NetworkSetup, and Ready (shown as Finalizing until power sync completes).
 */
export const BARE_METAL_PROVISIONING_STAGES: readonly BareMetalProvisioningStageDef[] = [
  {
    id: 'host-allocation',
    label: 'Host allocation',
    steps: [{ id: 'reserving-capacity', label: 'Reserving capacity' }],
  },
  {
    id: 'provisioning',
    label: 'Provisioning',
    steps: [{ id: 'provisioning-instance', label: 'Provisioning instance' }],
  },
  {
    id: 'network-setup',
    label: 'Network setup',
    steps: [
      { id: 'attaching-network', label: 'Attaching network' },
      { id: 'configuring-network', label: 'Configuring network' },
      { id: 'discovering-ip', label: 'Discovering IP address' },
    ],
  },
  {
    id: 'finalizing',
    label: 'Finalizing',
    steps: [{ id: 'synchronizing-power-state', label: 'Synchronizing power state' }],
  },
]

export function getBareMetalProvisioningLeafSteps(): BareMetalProvisioningStepDef[] {
  return BARE_METAL_PROVISIONING_STAGES.flatMap((stage) => [...stage.steps])
}

export const BARE_METAL_PROVISIONING_LEAF_COUNT = getBareMetalProvisioningLeafSteps().length

/**
 * Wall-clock interval per leaf for wizard and Services detail.
 * Evenly splits the 15s demo across all subtexts (6 leaves → 2.5s each).
 */
export const BARE_METAL_PROVISIONING_STEP_MS = Math.floor(
  BARE_METAL_PROVISIONING_DEMO_DURATION_MS / BARE_METAL_PROVISIONING_LEAF_COUNT,
)

/** @deprecated Use BARE_METAL_PROVISIONING_STEP_MS */
export const BARE_METAL_PROVISIONING_WIZARD_STEP_MS = BARE_METAL_PROVISIONING_STEP_MS

/** @deprecated Use BARE_METAL_PROVISIONING_STEP_MS */
export const BARE_METAL_PROVISIONING_SERVICES_STEP_MS = BARE_METAL_PROVISIONING_STEP_MS

/**
 * Remaining label for the 20-minute story, decremented evenly per leaf
 * while the UI fast-tracks in 15 seconds.
 */
export function formatBareMetalProvisioningRemainingLabel(activeLeafIndex: number): string {
  if (activeLeafIndex >= BARE_METAL_PROVISIONING_LEAF_COUNT) {
    return 'Finishing up'
  }

  const leavesRemaining = BARE_METAL_PROVISIONING_LEAF_COUNT - activeLeafIndex
  const remainingMs = Math.round(
    (BARE_METAL_PROVISIONING_DISPLAY_DURATION_MS / BARE_METAL_PROVISIONING_LEAF_COUNT) *
      leavesRemaining,
  )
  const minutes = Math.max(1, Math.round(remainingMs / 60_000))
  return `~${minutes} min remaining`
}

/** Wall-clock demo time left before the instance should flip to running. */
export function getBareMetalProvisioningDemoRemainingMs(
  createdAt: string,
  nowMs: number = Date.now(),
): number {
  const started = Date.parse(createdAt)
  if (Number.isNaN(started)) {
    return BARE_METAL_PROVISIONING_DEMO_DURATION_MS
  }
  return Math.max(0, BARE_METAL_PROVISIONING_DEMO_DURATION_MS - (nowMs - started))
}

export type BareMetalProvisioningStepOverride = {
  status: Extract<BareMetalProvisioningStepStatus, 'warning' | 'failed'>
  /** Short status shown inline under the stepper. */
  message?: string
  /** Explains the issue inside the help popover. */
  detail?: string
  /** Recovery guidance inside the help popover. */
  nextStep?: string
  /** Primary action label shown next to the help control. */
  actionLabel?: string
}

/** Leaf index for Network setup → Discovering IP address. */
export function getBareMetalDiscoveringIpLeafIndex(): number {
  const index = getBareMetalProvisioningLeafSteps().findIndex((step) => step.id === 'discovering-ip')
  return index >= 0 ? index : 0
}

/**
 * Demo / design-share copy for a recoverable IP discovery warning.
 * Inline link opens a popover: title + detail + Retry.
 */
export const BARE_METAL_IP_DISCOVERY_WARNING_OVERRIDE: BareMetalProvisioningStepOverride = {
  status: 'warning',
  message: 'Waiting for IP address',
  detail:
    'The host is up and attached to the network, but no IP address was discovered in time.',
  nextStep:
    'Confirm the subnet has free addresses and DHCP is reachable on this VLAN, then retry. If it still fails, contact your network administrator.',
  actionLabel: 'Retry IP discovery',
}

export type BareMetalProvisioningCardPresentation = {
  activeLeafIndex?: number
  overrides?: Readonly<Record<string, BareMetalProvisioningStepOverride>>
  remainingLabel?: string
}

/** Sticky warning demo instance id (kept here to avoid import cycles with instances). */
export const BARE_METAL_IP_DISCOVERY_WARNING_DEMO_INSTANCE_ID = 'instance-demo-bm-09'

/** Frozen presentation for sticky demo instances (happy path uses the live clock). */
export function getBareMetalProvisioningCardPresentation(
  instanceId: string,
): BareMetalProvisioningCardPresentation | null {
  if (instanceId !== BARE_METAL_IP_DISCOVERY_WARNING_DEMO_INSTANCE_ID) {
    return null
  }

  return {
    activeLeafIndex: getBareMetalDiscoveringIpLeafIndex(),
    overrides: {
      'discovering-ip': BARE_METAL_IP_DISCOVERY_WARNING_OVERRIDE,
    },
    remainingLabel: 'Action needed',
  }
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

/**
 * Resolve stage/step views from the active leaf index (0 = first step in progress).
 * When `activeLeafIndex >= leafCount`, all steps are completed.
 */
export function resolveBareMetalProvisioningStages(
  activeLeafIndex: number,
  overrides: Readonly<Record<string, BareMetalProvisioningStepOverride>> = {},
): BareMetalProvisioningStageView[] {
  let leafOffset = 0

  return BARE_METAL_PROVISIONING_STAGES.map((stage) => {
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

/** Active leaf index from instance `createdAt` for detail / services views. */
export function getBareMetalProvisioningActiveLeafIndex(
  createdAt: string,
  nowMs: number = Date.now(),
  stepMs: number = BARE_METAL_PROVISIONING_STEP_MS,
): number {
  const started = Date.parse(createdAt)
  if (Number.isNaN(started) || stepMs <= 0) {
    return 0
  }

  const elapsed = Math.max(0, nowMs - started)
  return Math.min(
    BARE_METAL_PROVISIONING_LEAF_COUNT,
    Math.floor(elapsed / stepMs),
  )
}

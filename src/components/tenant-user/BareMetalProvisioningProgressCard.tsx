import { useEffect, useRef, useState } from 'react'
import {
  Card,
  Content,
  Flex,
  FlexItem,
  ProgressStep,
  ProgressStepper,
  Spinner,
} from '@patternfly/react-core'
import {
  BARE_METAL_PROVISIONING_LEAF_COUNT,
  formatBareMetalProvisioningRemainingLabel,
  getBareMetalProvisioningActiveLeafIndex,
  resolveBareMetalProvisioningStages,
  type BareMetalProvisioningStageView,
  type BareMetalProvisioningStepOverride,
  type BareMetalProvisioningStepStatus,
  type BareMetalProvisioningStepView,
} from '../../tenantUser/bareMetalProvisioning'

type BareMetalProvisioningProgressCardProps = {
  instanceName: string
  /**
   * ISO timestamp when provisioning started. The card advances itself from this
   * clock so Wizard remounts cannot stall the stepper.
   */
  startedAt: string
  /** Called once when all leaf steps have completed. */
  onStagesComplete?: () => void
  overrides?: Readonly<Record<string, BareMetalProvisioningStepOverride>>
  className?: string
  /** Optional controlled index; when omitted, derived from `startedAt`. */
  activeLeafIndex?: number
  remainingLabel?: string
}

function stageVariant(
  status: BareMetalProvisioningStepStatus,
): 'default' | 'success' | 'pending' | 'warning' | 'danger' {
  if (status === 'completed') {
    return 'success'
  }
  if (status === 'warning') {
    return 'warning'
  }
  if (status === 'failed') {
    return 'danger'
  }
  if (status === 'in-progress') {
    return 'default'
  }
  return 'pending'
}

function stageAriaLabel(stage: BareMetalProvisioningStageView, description?: string): string {
  const detail = description ? `, ${description}` : ''
  if (stage.status === 'completed') {
    return `${stage.label}, completed${detail}`
  }
  if (stage.status === 'in-progress') {
    return `${stage.label}, current step, in progress${detail}`
  }
  if (stage.status === 'warning') {
    return `${stage.label}, current step, warning${detail}`
  }
  if (stage.status === 'failed') {
    return `${stage.label}, failed${detail}`
  }
  return `${stage.label}, pending${detail}`
}

/**
 * Subtext under each stage title.
 * Multi-leaf stages (Network setup) show only the current leaf — it replaces the previous.
 */
function getStageSubtext(stage: BareMetalProvisioningStageView): string | undefined {
  const activeLeaf =
    stage.steps.find(
      (step) =>
        step.status === 'in-progress' ||
        step.status === 'warning' ||
        step.status === 'failed',
    ) ??
    (stage.status === 'completed'
      ? stage.steps[stage.steps.length - 1]
      : undefined) ??
    stage.steps.find((step) => step.status === 'pending') ??
    stage.steps[0]

  if (!activeLeaf) {
    return undefined
  }

  return activeLeaf.message ?? activeLeaf.label
}

function getActiveLeaf(stage: BareMetalProvisioningStageView): BareMetalProvisioningStepView | undefined {
  return (
    stage.steps.find(
      (step) =>
        step.status === 'in-progress' ||
        step.status === 'warning' ||
        step.status === 'failed',
    ) ?? undefined
  )
}

export function BareMetalProvisioningProgressCard({
  instanceName,
  startedAt,
  onStagesComplete,
  overrides,
  className,
  activeLeafIndex: activeLeafIndexProp,
  remainingLabel: remainingLabelProp,
}: BareMetalProvisioningProgressCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const completedRef = useRef(false)
  const onStagesCompleteRef = useRef(onStagesComplete)
  onStagesCompleteRef.current = onStagesComplete

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 100)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [startedAt])

  const derivedLeafIndex = getBareMetalProvisioningActiveLeafIndex(startedAt, nowMs)
  const activeLeafIndex = activeLeafIndexProp ?? derivedLeafIndex
  const remainingLabel =
    remainingLabelProp ?? formatBareMetalProvisioningRemainingLabel(activeLeafIndex)
  const stages = resolveBareMetalProvisioningStages(activeLeafIndex, overrides)
  const issueLeaf = stages
    .map((stage) => getActiveLeaf(stage))
    .find(
      (step) =>
        step &&
        (step.status === 'warning' || step.status === 'failed') &&
        (step.message || step.detail || step.nextStep),
    )

  useEffect(() => {
    if (activeLeafIndex < BARE_METAL_PROVISIONING_LEAF_COUNT || completedRef.current) {
      return
    }
    completedRef.current = true
    onStagesCompleteRef.current?.()
  }, [activeLeafIndex])

  return (
    <Card
      className={['tenant-user-launch-wizard__boot-log', 'bare-metal-provisioning-progress', className]
        .filter(Boolean)
        .join(' ')}
    >
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        className="tenant-user-launch-wizard__boot-log-header"
      >
        <FlexItem>
          <Content component="p" className="tenant-user-launch-wizard__boot-log-title">
            Boot log · {instanceName}
          </Content>
        </FlexItem>
        {remainingLabel ? (
          <FlexItem>
            <Content component="p" className="tenant-user-launch-wizard__boot-log-remaining">
              {remainingLabel}
            </Content>
          </FlexItem>
        ) : null}
      </Flex>

      <ProgressStepper
        key={`bm-stages-${activeLeafIndex}`}
        isCenterAligned
        aria-label="Bare metal provisioning stages"
        className="bare-metal-provisioning-progress__stepper"
      >
        {stages.map((stage) => {
          const description = getStageSubtext(stage)
          const isCurrent =
            stage.status === 'in-progress' ||
            stage.status === 'warning' ||
            (stage.status === 'failed' &&
              !stages.some(
                (other) => other.status === 'in-progress' || other.status === 'warning',
              ))

          return (
            <ProgressStep
              key={stage.id}
              id={`bm-provision-stage-${stage.id}`}
              titleId={`bm-provision-stage-${stage.id}-title`}
              variant={stageVariant(stage.status)}
              isCurrent={isCurrent}
              description={description}
              icon={
                stage.status === 'in-progress' ? (
                  <Spinner
                    size="sm"
                    className="bare-metal-provisioning-progress__stage-spinner"
                    aria-label={`${stage.label} in progress`}
                  />
                ) : undefined
              }
              aria-label={stageAriaLabel(stage, description)}
            >
              {stage.label}
            </ProgressStep>
          )
        })}
      </ProgressStepper>

      {issueLeaf ? (
        <div className="bare-metal-provisioning-progress__issue">
          {issueLeaf.detail ? (
            <Content component="p" className="bare-metal-provisioning-progress__issue-detail">
              What happened: {issueLeaf.detail}
            </Content>
          ) : null}
          {issueLeaf.nextStep ? (
            <Content component="p" className="bare-metal-provisioning-progress__issue-detail">
              Next step: {issueLeaf.nextStep}
            </Content>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

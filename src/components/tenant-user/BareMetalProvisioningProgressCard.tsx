import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Button,
  Card,
  Content,
  Flex,
  FlexItem,
  Popover,
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
import {
  CLUSTER_PROVISIONING_LEAF_COUNT,
  formatClusterProvisioningRemainingLabel,
  getClusterProvisioningActiveLeafIndex,
  resolveClusterProvisioningStages,
} from '../../tenantUser/clusterProvisioning'

export type ProvisioningProgressService = 'baremetal' | 'cluster'

type BareMetalProvisioningProgressCardProps = {
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
  /** Bare metal vs cluster provisioning stages. Default bare metal. */
  service?: ProvisioningProgressService
  /** Primary action for the active warning/error (e.g. retry IP discovery). */
  onIssueAction?: () => void
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

/**
 * Subtext under each stage title.
 * Multi-leaf stages show only the current leaf — it replaces the previous.
 */
function getStageActiveLeaf(stage: BareMetalProvisioningStageView): BareMetalProvisioningStepView | undefined {
  return (
    getActiveLeaf(stage) ??
    (stage.status === 'completed' ? stage.steps[stage.steps.length - 1] : undefined) ??
    stage.steps.find((step) => step.status === 'pending') ??
    stage.steps[0]
  )
}

function getStageSubtext(stage: BareMetalProvisioningStageView): string | undefined {
  const activeLeaf = getStageActiveLeaf(stage)
  if (!activeLeaf) {
    return undefined
  }
  return activeLeaf.message ?? activeLeaf.label
}

function hasIssueDetails(leaf: BareMetalProvisioningStepView): boolean {
  return (
    (leaf.status === 'warning' || leaf.status === 'failed') &&
    (leaf.detail != null || leaf.nextStep != null || leaf.actionLabel != null)
  )
}

function ProvisioningIssueDescription({
  issueLeaf,
  label,
  onIssueAction,
}: {
  issueLeaf: BareMetalProvisioningStepView
  label: string
  onIssueAction?: () => void
}) {
  const isFailed = issueLeaf.status === 'failed'
  const title = issueLeaf.message ?? (isFailed ? 'Provisioning failed' : 'Action needed')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover
      aria-label={`${title} details`}
      position="right"
      hasAutoWidth
      maxWidth="22rem"
      isVisible={isOpen}
      shouldOpen={(_event, showFunction) => {
        setIsOpen(true)
        showFunction?.()
      }}
      shouldClose={(_event, hideFunction) => {
        setIsOpen(false)
        hideFunction?.()
      }}
      alertSeverityVariant={isFailed ? 'danger' : 'warning'}
      headerContent={title}
      bodyContent={
        <div className="bare-metal-provisioning-progress__issue-popover-body">
          {issueLeaf.detail ? <Content component="p">{issueLeaf.detail}</Content> : null}
          {issueLeaf.nextStep ? <Content component="p">{issueLeaf.nextStep}</Content> : null}
        </div>
      }
      footerContent={
        issueLeaf.actionLabel ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onIssueAction?.()
              setIsOpen(false)
            }}
          >
            {issueLeaf.actionLabel}
          </Button>
        ) : undefined
      }
      closeBtnAriaLabel="Close"
    >
      <Button
        variant="link"
        isInline
        className="bare-metal-provisioning-progress__issue-link"
        aria-expanded={isOpen}
      >
        {label}
      </Button>
    </Popover>
  )
}

export function BareMetalProvisioningProgressCard({
  startedAt,
  onStagesComplete,
  overrides,
  className,
  activeLeafIndex: activeLeafIndexProp,
  remainingLabel: remainingLabelProp,
  service = 'baremetal',
  onIssueAction,
}: BareMetalProvisioningProgressCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const completedRef = useRef(false)
  const onStagesCompleteRef = useRef(onStagesComplete)
  onStagesCompleteRef.current = onStagesComplete
  const isCluster = service === 'cluster'
  const leafCount = isCluster ? CLUSTER_PROVISIONING_LEAF_COUNT : BARE_METAL_PROVISIONING_LEAF_COUNT

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 100)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [startedAt])

  const derivedLeafIndex = isCluster
    ? getClusterProvisioningActiveLeafIndex(startedAt, nowMs)
    : getBareMetalProvisioningActiveLeafIndex(startedAt, nowMs)
  const activeLeafIndex = activeLeafIndexProp ?? derivedLeafIndex
  const remainingLabel =
    remainingLabelProp ??
    (isCluster
      ? formatClusterProvisioningRemainingLabel(activeLeafIndex)
      : formatBareMetalProvisioningRemainingLabel(activeLeafIndex))
  const stages = isCluster
    ? resolveClusterProvisioningStages(activeLeafIndex, overrides)
    : resolveBareMetalProvisioningStages(activeLeafIndex, overrides)
  const cardTitle = isCluster ? 'Installation progress' : 'Provisioning progress'
  const stepperAriaLabel = isCluster
    ? 'Cluster installation stages'
    : 'Bare metal provisioning stages'

  useEffect(() => {
    if (activeLeafIndex < leafCount || completedRef.current) {
      return
    }
    completedRef.current = true
    onStagesCompleteRef.current?.()
  }, [activeLeafIndex, leafCount])

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
            {cardTitle}
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
        key={`${service}-stages-${activeLeafIndex}`}
        isCenterAligned
        aria-label={stepperAriaLabel}
        className="bare-metal-provisioning-progress__stepper"
      >
        {stages.map((stage) => {
          const activeLeaf = getStageActiveLeaf(stage)
          const descriptionText = getStageSubtext(stage)
          const issueLeaf =
            activeLeaf && hasIssueDetails(activeLeaf) ? activeLeaf : undefined
          const description: ReactNode =
            issueLeaf && descriptionText ? (
              <ProvisioningIssueDescription
                issueLeaf={issueLeaf}
                label={descriptionText}
                onIssueAction={onIssueAction}
              />
            ) : (
              descriptionText
            )
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
              id={`${service}-provision-stage-${stage.id}`}
              titleId={`${service}-provision-stage-${stage.id}-title`}
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
              aria-label={stageAriaLabel(stage, descriptionText)}
            >
              {stage.label}
            </ProgressStep>
          )
        })}
      </ProgressStepper>
    </Card>
  )
}

/** Cluster detail / Services view: same stepper chrome with cluster-specific stages. */
export function ClusterProvisioningProgressCard(
  props: Omit<BareMetalProvisioningProgressCardProps, 'service'>,
) {
  return <BareMetalProvisioningProgressCard {...props} service="cluster" />
}

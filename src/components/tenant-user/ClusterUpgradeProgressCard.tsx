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
  CLUSTER_UPGRADE_LEAF_COUNT,
  formatClusterUpgradeRemainingLabel,
  getClusterUpgradeActiveLeafIndex,
  resolveClusterUpgradeStages,
} from '../../tenantUser/clusterUpgrade'
import type { BareMetalProvisioningStageView, BareMetalProvisioningStepStatus } from '../../tenantUser/bareMetalProvisioning'

type ClusterUpgradeProgressCardProps = {
  startedAt: string
  onStagesComplete?: () => void
  className?: string
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
  return `${stage.label}, pending${detail}`
}

function getStageSubtext(stage: BareMetalProvisioningStageView): string | undefined {
  const activeLeaf =
    stage.steps.find((step) => step.status === 'in-progress') ??
    (stage.status === 'completed' ? stage.steps[stage.steps.length - 1] : undefined) ??
    stage.steps.find((step) => step.status === 'pending') ??
    stage.steps[0]
  return activeLeaf?.message ?? activeLeaf?.label
}

export function ClusterUpgradeProgressCard({
  startedAt,
  onStagesComplete,
  className,
}: ClusterUpgradeProgressCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const completedRef = useRef(false)
  const onStagesCompleteRef = useRef(onStagesComplete)
  onStagesCompleteRef.current = onStagesComplete

  useEffect(() => {
    completedRef.current = false
    setNowMs(Date.now())
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 100)
    return () => window.clearInterval(intervalId)
  }, [startedAt])

  const activeLeafIndex = getClusterUpgradeActiveLeafIndex(startedAt, nowMs)
  const remainingLabel = formatClusterUpgradeRemainingLabel(activeLeafIndex)
  const stages = resolveClusterUpgradeStages(startedAt, nowMs)

  useEffect(() => {
    if (activeLeafIndex < CLUSTER_UPGRADE_LEAF_COUNT || completedRef.current) {
      return
    }
    completedRef.current = true
    onStagesCompleteRef.current?.()
  }, [activeLeafIndex])

  return (
    <Card
      className={[
        'tenant-user-launch-wizard__boot-log',
        'bare-metal-provisioning-progress',
        'cluster-upgrade-progress',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Cluster upgrade progress"
    >
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        className="tenant-user-launch-wizard__boot-log-header"
      >
        <FlexItem>
          <Content component="p" className="tenant-user-launch-wizard__boot-log-title">
            Upgrade progress
          </Content>
        </FlexItem>
        <FlexItem>
          <Content component="p" className="tenant-user-launch-wizard__boot-log-remaining">
            {remainingLabel}
          </Content>
        </FlexItem>
      </Flex>

      <ProgressStepper
        key={`cluster-upgrade-stages-${activeLeafIndex}`}
        isCenterAligned
        aria-label="Cluster upgrade stages"
        className="bare-metal-provisioning-progress__stepper cluster-upgrade-progress__stepper"
      >
        {stages.map((stage) => {
          const description = getStageSubtext(stage)
          const isCurrent = stage.status === 'in-progress'

          return (
            <ProgressStep
              key={stage.id}
              id={`cluster-upgrade-stage-${stage.id}`}
              titleId={`cluster-upgrade-stage-${stage.id}-title`}
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
    </Card>
  )
}

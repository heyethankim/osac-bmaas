import { useRef, type ReactNode } from 'react'
import { Wizard, WizardStep } from '@patternfly/react-core'
import { ResourceCreatePageShell } from '../shared/ResourceCreatePageShell'
import { useWizardLeaveConfirm } from '../shared/useWizardLeaveConfirm'
import type { NetworkInventoryCreateStep } from '../../networking/networkInventoryCreateWizard'

export type NetworkInventoryCreateBreadcrumbAncestor = {
  label: string
  onNavigate?: () => void
}

type WizardStepFooter = {
  nextButtonText?: ReactNode
  onNext?: () => void
  isNextDisabled?: boolean
  onClose?: () => void
  isCancelDisabled?: boolean
}

type NetworkInventoryCreateWizardShellProps = {
  isOpen: boolean
  ancestors?: readonly NetworkInventoryCreateBreadcrumbAncestor[]
  parentLabel?: string
  title: string
  titleId: string
  steps: readonly NetworkInventoryCreateStep[]
  renderStepContent: (stepId: string) => ReactNode
  getStepFooter: (stepId: string) => WizardStepFooter | undefined
  onClose: () => void
  className?: string
  leaveConfirmPrimaryActionLabel?: string
}

export function NetworkInventoryCreateWizardShell({
  isOpen,
  ancestors,
  parentLabel,
  title,
  titleId,
  steps,
  renderStepContent,
  getStepFooter,
  onClose,
  className,
  leaveConfirmPrimaryActionLabel,
}: NetworkInventoryCreateWizardShellProps) {
  const leaveAfterCloseRef = useRef<(() => void) | null>(null)
  const { requestClose, leaveConfirmModal, wrapStepFooter } = useWizardLeaveConfirm({
    onLeave: () => {
      const afterClose = leaveAfterCloseRef.current
      leaveAfterCloseRef.current = null
      onClose()
      afterClose?.()
    },
    onDismiss: () => {
      leaveAfterCloseRef.current = null
    },
    primaryActionLabel: leaveConfirmPrimaryActionLabel ?? 'Leave',
    titleId: `${titleId}-leave-confirm`,
  })
  const ancestorCrumbs = ancestors?.map((item) => ({
    label: item.label,
    onClick: item.onNavigate
      ? () => {
          leaveAfterCloseRef.current = item.onNavigate ?? null
          requestClose()
        }
      : undefined,
  }))

  if (!isOpen) {
    return null
  }

  return (
    <>
      <ResourceCreatePageShell
        ancestors={ancestorCrumbs}
        parentLabel={parentLabel}
        title={title}
        titleId={titleId}
        onBack={requestClose}
      >
        <Wizard
          key={titleId}
          className={['provider-admin-network-inventory__wizard', className]
            .filter(Boolean)
            .join(' ')}
          height="100%"
          isPlain
        >
          {steps.map((step) => (
            <WizardStep
              key={step.id}
              id={`network-create-step-${step.id}`}
              name={step.label}
              footer={wrapStepFooter(getStepFooter(step.id))}
            >
              {renderStepContent(step.id)}
            </WizardStep>
          ))}
        </Wizard>
      </ResourceCreatePageShell>
      {leaveConfirmModal}
    </>
  )
}

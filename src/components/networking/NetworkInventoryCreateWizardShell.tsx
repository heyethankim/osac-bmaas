import { useRef, type ReactNode } from 'react'
import {
  Modal,
  ModalVariant,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
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
  /** `page` replaces the inventory list. Default `page`. Use `modal` when stacked over another flow. */
  presentation?: 'modal' | 'page'
  ancestors?: readonly NetworkInventoryCreateBreadcrumbAncestor[]
  parentLabel?: string
  title: string
  titleId: string
  description?: string
  steps: readonly NetworkInventoryCreateStep[]
  renderStepContent: (stepId: string) => ReactNode
  getStepFooter: (stepId: string) => WizardStepFooter | undefined
  onClose: () => void
  className?: string
  leaveConfirmPrimaryActionLabel?: string
}

export function NetworkInventoryCreateWizardShell({
  isOpen,
  presentation = 'page',
  ancestors,
  parentLabel,
  title,
  titleId,
  description,
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

  const wizard = (
    <Wizard
      key={titleId}
      className={['provider-admin-network-inventory__wizard', className]
        .filter(Boolean)
        .join(' ')}
      height={presentation === 'modal' ? '40rem' : '100%'}
      isPlain={presentation === 'page'}
      onClose={presentation === 'modal' ? requestClose : undefined}
      header={
        presentation === 'modal' ? (
          <WizardHeader
            title={title}
            titleId={titleId}
            description={description}
            onClose={requestClose}
            closeButtonAriaLabel={`Close ${title.toLowerCase()}`}
          />
        ) : undefined
      }
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
  )

  if (presentation === 'modal') {
    return (
      <>
        <Modal
          variant={ModalVariant.medium}
          width="64rem"
          maxWidth="64rem"
          isOpen={isOpen}
          onEscapePress={requestClose}
          aria-labelledby={titleId}
          className="provider-admin-network-inventory__modal-wizard"
        >
          {wizard}
        </Modal>
        {leaveConfirmModal}
      </>
    )
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
        {wizard}
      </ResourceCreatePageShell>
      {leaveConfirmModal}
    </>
  )
}

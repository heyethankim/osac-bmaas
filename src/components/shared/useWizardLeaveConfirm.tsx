import { useCallback, useState, type ReactNode } from 'react'
import { WizardLeaveConfirmModal } from './WizardLeaveConfirmModal'

export type WizardStepFooterConfig = {
  onClose?: () => void
  isCancelDisabled?: boolean
  [key: string]: unknown
}

export type UseWizardLeaveConfirmOptions = {
  onLeave: () => void
  isLeaveDisabled?: boolean
  primaryActionLabel?: string
  description?: string
  titleId?: string
}

export function useWizardLeaveConfirm({
  onLeave,
  isLeaveDisabled = false,
  primaryActionLabel = 'Leave',
  description = 'Your progress will not be saved.',
  titleId = 'wizard-leave-confirm-title',
}: UseWizardLeaveConfirmOptions) {
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)

  const requestClose = useCallback(() => {
    if (isLeaveDisabled) {
      return
    }
    setIsLeaveConfirmOpen(true)
  }, [isLeaveDisabled])

  const closeLeaveConfirm = useCallback(() => {
    setIsLeaveConfirmOpen(false)
  }, [])

  const confirmLeave = useCallback(() => {
    setIsLeaveConfirmOpen(false)
    onLeave()
  }, [onLeave])

  const wrapStepFooter = useCallback(
    <T extends WizardStepFooterConfig | undefined>(footer?: T): T | WizardStepFooterConfig => {
      if (isLeaveDisabled) {
        return footer ?? {}
      }

      const wrapped: WizardStepFooterConfig = {
        ...(footer ?? {}),
        onClose: footer?.onClose ?? requestClose,
      }

      return wrapped as T extends undefined ? WizardStepFooterConfig : T & WizardStepFooterConfig
    },
    [isLeaveDisabled, requestClose],
  )

  const leaveConfirmModal: ReactNode = (
    <WizardLeaveConfirmModal
      isOpen={isLeaveConfirmOpen}
      onClose={closeLeaveConfirm}
      onConfirm={confirmLeave}
      primaryActionLabel={primaryActionLabel}
      description={description}
      titleId={titleId}
    />
  )

  return {
    requestClose,
    confirmLeave,
    closeLeaveConfirm,
    leaveConfirmModal,
    wrapStepFooter,
    isLeaveConfirmOpen,
  }
}

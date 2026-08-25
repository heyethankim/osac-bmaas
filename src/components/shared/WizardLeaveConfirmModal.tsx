import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'

export type WizardLeaveConfirmModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  primaryActionLabel?: string
  description?: string
  titleId?: string
}

export function WizardLeaveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  primaryActionLabel = 'Leave',
  description = 'Your progress will not be saved.',
  titleId = 'wizard-leave-confirm-title',
}: WizardLeaveConfirmModalProps) {
  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-description`}
    >
      <ModalHeader title={title} titleIconVariant="warning" labelId={titleId} />
      <ModalBody>
        <Content component="p" id={`${titleId}-description`}>
          {description}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onConfirm}>
          {primaryActionLabel}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

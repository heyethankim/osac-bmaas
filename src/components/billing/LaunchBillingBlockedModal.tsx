import { Button, Content, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core'

type LaunchBillingBlockedModalProps = {
  isOpen: boolean
  catalogItemName: string
  organizationName: string
  onClose: () => void
  onOpenBilling?: () => void
}

export function LaunchBillingBlockedModal({
  isOpen,
  catalogItemName,
  organizationName,
  onClose,
  onOpenBilling,
}: LaunchBillingBlockedModalProps) {
  return (
    <Modal
      variant="small"
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="launch-billing-blocked-title"
    >
      <ModalHeader
        title="Cannot launch instance"
        titleIconVariant="danger"
        labelId="launch-billing-blocked-title"
      />
      <ModalBody>
        <Content component="p">
          <strong>{organizationName}</strong> cannot launch{' '}
          <strong>{catalogItemName}</strong> while its M360 billing account is inactive.
        </Content>
        <Content component="p">
          Activate the billing account in M360, then return to OSAC to launch instances from the
          catalog.
        </Content>
      </ModalBody>
      <ModalFooter>
        {onOpenBilling ? (
          <Button variant="primary" onClick={onOpenBilling}>
            View billing
          </Button>
        ) : null}
        <Button variant="link" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}

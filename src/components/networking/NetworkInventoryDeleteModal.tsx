import { Button, Content, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core'

type NetworkInventoryDeleteModalProps = {
  isOpen: boolean
  title: string
  resourceName: string
  impactMessage: string
  onClose: () => void
  onConfirm: () => void
}

export function NetworkInventoryDeleteModal({
  isOpen,
  title,
  resourceName,
  impactMessage,
  onClose,
  onConfirm,
}: NetworkInventoryDeleteModalProps) {
  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="network-inventory-delete-title"
      aria-describedby="network-inventory-delete-description"
      className="provider-admin-network-inventory__modal"
    >
      <ModalHeader title={title} titleIconVariant="warning" labelId="network-inventory-delete-title" />
      <ModalBody>
        <Content component="p" id="network-inventory-delete-description">
          <strong>{resourceName}</strong> {impactMessage}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" onClick={onConfirm}>
          Delete
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

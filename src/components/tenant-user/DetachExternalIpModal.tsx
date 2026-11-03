import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import {
  formatTenantInstanceName,
  resolveInstancePublicIp,
  type TenantInstance,
} from '../../tenantUser/instances'

type DetachExternalIpModalProps = {
  isOpen: boolean
  instance: TenantInstance | null
  onClose: () => void
  onConfirm: (instance: TenantInstance) => void
}

export function DetachExternalIpModal({
  isOpen,
  instance,
  onClose,
  onConfirm,
}: DetachExternalIpModalProps) {
  if (!instance) {
    return null
  }

  const publicIp = resolveInstancePublicIp(instance)

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="detach-public-ip-title"
      aria-describedby="detach-public-ip-description"
    >
      <ModalHeader title="Detach external IP?" labelId="detach-public-ip-title" />
      <ModalBody>
        <Content component="p" id="detach-public-ip-description">
          {publicIp ? (
            <>
              <code>{publicIp}</code> will be released from{' '}
              <strong>{formatTenantInstanceName(instance.name)}</strong> back to the pool. SSH
              access over this address will stop.
            </>
          ) : (
            <>
              The external IP will be released from{' '}
              <strong>{formatTenantInstanceName(instance.name)}</strong> back to the pool.
            </>
          )}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => onConfirm(instance)}>
          Detach
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

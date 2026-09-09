import { Button, Content, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core'
import type { ProviderVirtualNetwork } from '../../providerAdmin/networkInventory'
import { hasVirtualNetworkNatGateway } from '../../providerAdmin/networkInventory'

type DetachNatGatewayModalProps = {
  network: ProviderVirtualNetwork | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DetachNatGatewayModal({
  network,
  isOpen,
  onClose,
  onConfirm,
}: DetachNatGatewayModalProps) {
  const natGateway = network && hasVirtualNetworkNatGateway(network) ? network.natGateway : null

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="detach-nat-gateway-title"
      aria-describedby="detach-nat-gateway-description"
      className="provider-admin-network-inventory__modal"
    >
      <ModalHeader
        title="Detach NAT gateway?"
        titleIconVariant="warning"
        labelId="detach-nat-gateway-title"
      />
      <ModalBody>
        <Content component="p" id="detach-nat-gateway-description">
          {network && natGateway ? (
            <>
              <strong>{natGateway.name}</strong> will be detached from{' '}
              <strong>{network.name}</strong>. Workloads in this virtual network will lose outbound
              internet access.
            </>
          ) : (
            'This NAT gateway will be detached from the virtual network.'
          )}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" isDisabled={!network || !natGateway} onClick={onConfirm}>
          Detach
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

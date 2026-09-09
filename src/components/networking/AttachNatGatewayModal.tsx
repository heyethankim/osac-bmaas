import { useEffect, useState } from 'react'
import {
  Button,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import {
  findNatGatewayProfileForGateway,
  hasVirtualNetworkNatGateway,
  NAT_GATEWAY_PROFILES,
  type NatGatewayProfile,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'

type NatGatewayModalMode = 'attach' | 'edit'

type AttachNatGatewayModalProps = {
  network: ProviderVirtualNetwork | null
  mode?: NatGatewayModalMode
  isOpen: boolean
  onClose: () => void
  onAttach: (network: ProviderVirtualNetwork, profile: NatGatewayProfile) => void
}

export function AttachNatGatewayModal({
  network,
  mode = 'attach',
  isOpen,
  onClose,
  onAttach,
}: AttachNatGatewayModalProps) {
  const [selectedProfileId, setSelectedProfileId] = useState(NAT_GATEWAY_PROFILES[0]?.id ?? '')
  const isEditMode = mode === 'edit'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (network && isEditMode && hasVirtualNetworkNatGateway(network)) {
      const matchingProfile = findNatGatewayProfileForGateway(network.natGateway)
      setSelectedProfileId(matchingProfile?.id ?? NAT_GATEWAY_PROFILES[0]?.id ?? '')
      return
    }

    setSelectedProfileId(NAT_GATEWAY_PROFILES[0]?.id ?? '')
  }, [isOpen, isEditMode, network?.id, network?.natGateway?.id])

  const selectedProfile =
    NAT_GATEWAY_PROFILES.find((profile) => profile.id === selectedProfileId) ??
    NAT_GATEWAY_PROFILES[0] ??
    null

  const handleSubmit = () => {
    if (!network || !selectedProfile) {
      return
    }

    onAttach(network, selectedProfile)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="attach-nat-gateway-title"
      className="provider-admin-network-inventory__modal"
    >
      <ModalHeader
        title={isEditMode ? 'Change NAT gateway' : 'Attach NAT gateway'}
        labelId="attach-nat-gateway-title"
      />
      <ModalBody>
        {network ? (
          <>
            <Content component="p" className="provider-admin-network-inventory__modal-lede">
              {isEditMode
                ? 'Select a different NAT gateway profile for outbound internet access.'
                : 'Provides outbound internet access for workloads in this virtual network.'}
            </Content>
            <Form autoComplete="off" className="provider-admin-network-inventory__form">
              <FormGroup label="Virtual network" fieldId="attach-nat-gateway-network">
                {network.name}
              </FormGroup>
              <FormGroup label="IPv4 CIDR" fieldId="attach-nat-gateway-cidr">
                <code>{network.cidr}</code>
              </FormGroup>
              <FormGroup label="NAT gateway" fieldId="attach-nat-gateway-profile" isRequired>
                <FormSelect
                  id="attach-nat-gateway-profile"
                  value={selectedProfileId}
                  onChange={(_event, value) => setSelectedProfileId(value)}
                  aria-label="NAT gateway profile"
                >
                  {NAT_GATEWAY_PROFILES.map((profile) => (
                    <FormSelectOption
                      key={profile.id}
                      value={profile.id}
                      label={`${profile.name} · ${profile.publicIp}`}
                    />
                  ))}
                </FormSelect>
                {selectedProfile ? (
                  <FormHelperText>{selectedProfile.description}</FormHelperText>
                ) : null}
              </FormGroup>
            </Form>
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!network || !selectedProfile}
          onClick={handleSubmit}
        >
          {isEditMode ? 'Save' : 'Attach'}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

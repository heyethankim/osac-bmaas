import { useEffect, useState } from 'react'
import {
  Button,
  Content,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core'
import {
  formatSubnetDetail,
  generateProviderSubnetId,
  type ProviderSubnet,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { addProviderSubnet } from '../../providerSetup/storage'

type CreateSubnetForm = {
  name: string
  cidr: string
  vlan: string
  virtualNetworkId: string
}

type CreateSubnetModalProps = {
  isOpen: boolean
  virtualNetworks: ProviderVirtualNetwork[]
  onClose: () => void
  onCreated: (subnet: ProviderSubnet) => void
}

export function CreateSubnetModal({
  isOpen,
  virtualNetworks,
  onClose,
  onCreated,
}: CreateSubnetModalProps) {
  const defaultVirtualNetworkId = virtualNetworks[0]?.id ?? ''
  const [form, setForm] = useState<CreateSubnetForm>({
    name: '',
    cidr: '',
    vlan: '',
    virtualNetworkId: defaultVirtualNetworkId,
  })

  useEffect(() => {
    if (!isOpen) {
      setForm({
        name: '',
        cidr: '',
        vlan: '',
        virtualNetworkId: virtualNetworks[0]?.id ?? '',
      })
    }
  }, [isOpen, virtualNetworks])

  const isCreateDisabled =
    !form.name.trim() ||
    !form.cidr.trim() ||
    !form.vlan.trim() ||
    !form.virtualNetworkId.trim() ||
    virtualNetworks.length === 0

  const handleCreate = () => {
    if (isCreateDisabled) {
      return
    }

    const subnet: ProviderSubnet = {
      id: generateProviderSubnetId(),
      name: form.name.trim(),
      cidr: form.cidr.trim(),
      vlan: form.vlan.trim(),
      detail: formatSubnetDetail(form.cidr.trim(), form.vlan.trim()),
      virtualNetworkId: form.virtualNetworkId,
      createdAt: new Date().toISOString(),
    }

    addProviderSubnet(subnet)
    onCreated(subnet)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-subnet-title"
      className="provider-admin-network-inventory__modal"
    >
      <ModalHeader title="Create subnet" labelId="create-subnet-title" />
      <ModalBody>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <Content component="p" className="provider-admin-network-inventory__modal-lede">
            Subnets are scoped to a virtual network and appear in catalog defaults for that
            network.
          </Content>
          <FormGroup label="Name" fieldId="create-subnet-name" isRequired>
            <TextInput
              id="create-subnet-name"
              value={form.name}
              onChange={(_event, value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="bm-compute-a"
            />
          </FormGroup>
          <FormGroup label="Virtual network" fieldId="create-subnet-vnet" isRequired>
            <FormSelect
              id="create-subnet-vnet"
              value={form.virtualNetworkId}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, virtualNetworkId: value }))
              }
              aria-label="Virtual network"
              isDisabled={virtualNetworks.length === 0}
            >
              {virtualNetworks.map((network) => (
                <FormSelectOption key={network.id} value={network.id} label={network.name} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="CIDR" fieldId="create-subnet-cidr" isRequired>
            <TextInput
              id="create-subnet-cidr"
              value={form.cidr}
              onChange={(_event, value) => setForm((current) => ({ ...current, cidr: value }))}
              placeholder="10.42.0.0/24"
            />
          </FormGroup>
          <FormGroup label="VLAN" fieldId="create-subnet-vlan" isRequired>
            <TextInput
              id="create-subnet-vlan"
              value={form.vlan}
              onChange={(_event, value) => setForm((current) => ({ ...current, vlan: value }))}
              placeholder="200"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleCreate} isDisabled={isCreateDisabled}>
          Create subnet
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

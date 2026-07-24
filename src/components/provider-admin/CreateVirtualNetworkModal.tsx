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
  generateProviderVirtualNetworkId,
  NETWORK_INVENTORY_DATA_CENTERS,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { addProviderVirtualNetwork } from '../../providerSetup/storage'

type CreateVirtualNetworkForm = {
  name: string
  detail: string
  cidr: string
  dataCenter: string
}

const DEFAULT_FORM: CreateVirtualNetworkForm = {
  name: '',
  detail: '',
  cidr: '',
  dataCenter: NETWORK_INVENTORY_DATA_CENTERS[0],
}

type CreateVirtualNetworkModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: (network: ProviderVirtualNetwork) => void
}

export function CreateVirtualNetworkModal({
  isOpen,
  onClose,
  onCreated,
}: CreateVirtualNetworkModalProps) {
  const [form, setForm] = useState<CreateVirtualNetworkForm>(DEFAULT_FORM)

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_FORM)
    }
  }, [isOpen])

  const isCreateDisabled =
    !form.name.trim() || !form.detail.trim() || !form.cidr.trim() || !form.dataCenter.trim()

  const handleCreate = () => {
    if (isCreateDisabled) {
      return
    }

    const network: ProviderVirtualNetwork = {
      id: generateProviderVirtualNetworkId(),
      name: form.name.trim(),
      detail: form.detail.trim(),
      cidr: form.cidr.trim(),
      dataCenter: form.dataCenter.trim(),
      createdAt: new Date().toISOString(),
    }

    addProviderVirtualNetwork(network)
    onCreated(network)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-virtual-network-title"
      className="provider-admin-network-inventory__modal"
    >
      <ModalHeader title="Create virtual network" labelId="create-virtual-network-title" />
      <ModalBody>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <Content component="p" className="provider-admin-network-inventory__modal-lede">
            Virtual networks become available as catalog defaults after creation.
          </Content>
          <FormGroup label="Name" fieldId="create-vnet-name" isRequired>
            <TextInput
              id="create-vnet-name"
              value={form.name}
              onChange={(_event, value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="Tenant workload VNet"
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="create-vnet-detail" isRequired>
            <TextInput
              id="create-vnet-detail"
              value={form.detail}
              onChange={(_event, value) => setForm((current) => ({ ...current, detail: value }))}
              placeholder="Primary tenant compute network"
            />
          </FormGroup>
          <FormGroup label="CIDR" fieldId="create-vnet-cidr" isRequired>
            <TextInput
              id="create-vnet-cidr"
              value={form.cidr}
              onChange={(_event, value) => setForm((current) => ({ ...current, cidr: value }))}
              placeholder="10.42.0.0/16"
            />
          </FormGroup>
          <FormGroup label="Data center" fieldId="create-vnet-data-center" isRequired>
            <FormSelect
              id="create-vnet-data-center"
              value={form.dataCenter}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, dataCenter: value }))
              }
              aria-label="Data center"
            >
              {NETWORK_INVENTORY_DATA_CENTERS.map((dataCenter) => (
                <FormSelectOption key={dataCenter} value={dataCenter} label={dataCenter} />
              ))}
            </FormSelect>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleCreate} isDisabled={isCreateDisabled}>
          Create virtual network
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import {
  Button,
  Content,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import {
  generateProviderVirtualNetworkId,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { addProviderVirtualNetwork } from '../../providerSetup/storage'

type CreateVirtualNetworkForm = {
  name: string
  detail: string
  cidr: string
  ipv6Cidr: string
}

/** Demo prefills so the create flow is ready to submit. */
const DEFAULT_FORM: CreateVirtualNetworkForm = {
  name: 'demo-workload',
  detail: 'Prefilled demo virtual network for tenant workloads',
  cidr: '10.60.0.0/16',
  ipv6Cidr: '2001:db8:60::/48',
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

  const isNameValid = isValidKubernetesResourceName(form.name)
  const isCreateDisabled = !isNameValid || !form.cidr.trim()

  const handleCreate = () => {
    if (isCreateDisabled) {
      return
    }

    const network: ProviderVirtualNetwork = {
      id: generateProviderVirtualNetworkId(),
      name: form.name.trim(),
      detail: form.detail.trim(),
      cidr: form.cidr.trim(),
      ipv6Cidr: form.ipv6Cidr.trim(),
      createdAt: new Date().toISOString(),
      status: 'Ready',
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
        <Content component="p" className="provider-admin-network-inventory__modal-lede">
          Create a virtual network to make address space available for workloads, subnets, and catalog networking.
        </Content>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <FormGroup label="Name" fieldId="create-vnet-name" isRequired>
            <KubernetesResourceNameField
              id="create-vnet-name"
              value={form.name}
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="e.g. demo-workload"
              isRequired
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="create-vnet-detail">
            <TextInput
              id="create-vnet-detail"
              value={form.detail}
              onChange={(_event, value) => setForm((current) => ({ ...current, detail: value }))}
            />
          </FormGroup>
          <FormGroup label="IPv4 CIDR" fieldId="create-vnet-ipv4-cidr" isRequired>
            <TextInput
              id="create-vnet-ipv4-cidr"
              value={form.cidr}
              onChange={(_event, value) => setForm((current) => ({ ...current, cidr: value }))}
            />
          </FormGroup>
          <FormGroup label="IPv6 CIDR" fieldId="create-vnet-ipv6-cidr">
            <TextInput
              id="create-vnet-ipv6-cidr"
              value={form.ipv6Cidr}
              onChange={(_event, value) => setForm((current) => ({ ...current, ipv6Cidr: value }))}
            />
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

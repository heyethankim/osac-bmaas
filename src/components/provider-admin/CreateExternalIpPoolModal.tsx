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
import { KubernetesResourceNameHelper } from '../shared/KubernetesResourceNameHelper'
import {
  EXTERNAL_IP_POOL_DATA_CENTERS,
  generateExternalIpPoolId,
  type ExternalIpPool,
} from '../../providerAdmin/externalIpPools'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { addProviderExternalIpPool } from '../../providerSetup/storage'

type CreatePoolForm = {
  name: string
  cidr: string
  dataCenter: string
  totalAddresses: string
}

const DEFAULT_CREATE_POOL_FORM: CreatePoolForm = {
  name: '',
  cidr: '',
  dataCenter: EXTERNAL_IP_POOL_DATA_CENTERS[0],
  totalAddresses: '62',
}

type CreateExternalIpPoolModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: (pool: ExternalIpPool) => void
}

export function CreateExternalIpPoolModal({
  isOpen,
  onClose,
  onCreated,
}: CreateExternalIpPoolModalProps) {
  const [form, setForm] = useState<CreatePoolForm>(DEFAULT_CREATE_POOL_FORM)

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_CREATE_POOL_FORM)
    }
  }, [isOpen])

  const totalAddresses = Number.parseInt(form.totalAddresses, 10)
  const isNameValid = isValidKubernetesResourceName(form.name)
  const isCreateDisabled =
    !isNameValid ||
    !form.cidr.trim() ||
    !form.dataCenter.trim() ||
    !Number.isFinite(totalAddresses) ||
    totalAddresses <= 0

  const handleCreatePool = () => {
    if (isCreateDisabled) {
      return
    }

    const pool: ExternalIpPool = {
      id: generateExternalIpPoolId(),
      name: form.name.trim(),
      cidr: form.cidr.trim(),
      dataCenter: form.dataCenter.trim(),
      totalAddresses,
      assignedOrganizationId: null,
      assignedOrganizationName: null,
      createdAt: new Date().toISOString(),
    }

    addProviderExternalIpPool(pool)
    onCreated(pool)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-external-ip-pool-title"
      className="provider-admin-external-ip-pools__create-modal"
    >
      <ModalHeader title="Create external IP pool" labelId="create-external-ip-pool-title" />
      <ModalBody>
        <Form autoComplete="off" className="provider-admin-external-ip-pools__form">
          <Content component="p" className="provider-admin-external-ip-pools__modal-lede">
            Pools become assignable to tenant organizations after creation.
          </Content>
          <FormGroup label="Pool name" fieldId="create-pool-name" isRequired>
            <TextInput
              id="create-pool-name"
              value={form.name}
              validated={form.name.trim() && !isNameValid ? 'error' : 'default'}
              onChange={(_event, value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="e.g. tenant-edge-pool"
            />
            <KubernetesResourceNameHelper value={form.name} id="create-pool-name-helper" />
          </FormGroup>
          <FormGroup label="CIDR" fieldId="create-pool-cidr" isRequired>
            <TextInput
              id="create-pool-cidr"
              value={form.cidr}
              onChange={(_event, value) => setForm((current) => ({ ...current, cidr: value }))}
              placeholder="203.0.113.0/26"
            />
          </FormGroup>
          <FormGroup label="Data center" fieldId="create-pool-data-center" isRequired>
            <FormSelect
              id="create-pool-data-center"
              value={form.dataCenter}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, dataCenter: value }))
              }
              aria-label="Data center"
            >
              {EXTERNAL_IP_POOL_DATA_CENTERS.map((dataCenter) => (
                <FormSelectOption key={dataCenter} value={dataCenter} label={dataCenter} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Total addresses" fieldId="create-pool-capacity" isRequired>
            <TextInput
              id="create-pool-capacity"
              type="number"
              min={1}
              value={form.totalAddresses}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, totalAddresses: value }))
              }
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" isDisabled={isCreateDisabled} onClick={handleCreatePool}>
          Create pool
        </Button>
      </ModalFooter>
    </Modal>
  )
}

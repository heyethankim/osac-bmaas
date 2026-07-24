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
import {
  generateProviderSecurityGroupId,
  type ProviderSecurityGroup,
} from '../../providerAdmin/networkInventory'
import { addProviderSecurityGroup } from '../../providerSetup/storage'

type CreateSecurityGroupForm = {
  name: string
  detail: string
}

const DEFAULT_FORM: CreateSecurityGroupForm = {
  name: '',
  detail: '',
}

type CreateSecurityGroupModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: (group: ProviderSecurityGroup) => void
}

export function CreateSecurityGroupModal({
  isOpen,
  onClose,
  onCreated,
}: CreateSecurityGroupModalProps) {
  const [form, setForm] = useState<CreateSecurityGroupForm>(DEFAULT_FORM)

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_FORM)
    }
  }, [isOpen])

  const isCreateDisabled = !form.name.trim() || !form.detail.trim()

  const handleCreate = () => {
    if (isCreateDisabled) {
      return
    }

    const group: ProviderSecurityGroup = {
      id: generateProviderSecurityGroupId(),
      name: form.name.trim(),
      detail: form.detail.trim(),
      createdAt: new Date().toISOString(),
    }

    addProviderSecurityGroup(group)
    onCreated(group)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-security-group-title"
      className="provider-admin-network-inventory__modal"
    >
      <ModalHeader title="Create security group" labelId="create-security-group-title" />
      <ModalBody>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <Content component="p" className="provider-admin-network-inventory__modal-lede">
            Security groups become available as catalog defaults after creation.
          </Content>
          <FormGroup label="Name" fieldId="create-sg-name" isRequired>
            <TextInput
              id="create-sg-name"
              value={form.name}
              onChange={(_event, value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="allow-ssh-https"
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="create-sg-detail" isRequired>
            <TextInput
              id="create-sg-detail"
              value={form.detail}
              onChange={(_event, value) => setForm((current) => ({ ...current, detail: value }))}
              placeholder="SSH + HTTPS ingress"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleCreate} isDisabled={isCreateDisabled}>
          Create security group
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

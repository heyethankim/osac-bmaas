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
  buildAbbreviation,
  COMPUTE_IMAGE_ARCHITECTURES,
  COMPUTE_IMAGE_FORMATS,
  generateComputeImageId,
  type ComputeImage,
  type ComputeImageFormat,
} from '../../providerAdmin/computeImages'
import { addProviderComputeImage } from '../../providerSetup/storage'

type CreateComputeImageForm = {
  name: string
  architecture: string
  format: ComputeImageFormat
  sizeLabel: string
  imageUrl: string
  checksum: string
}

const DEFAULT_CREATE_COMPUTE_IMAGE_FORM: CreateComputeImageForm = {
  name: '',
  architecture: COMPUTE_IMAGE_ARCHITECTURES[0],
  format: COMPUTE_IMAGE_FORMATS[0],
  sizeLabel: '',
  imageUrl: '',
  checksum: '',
}

type CreateComputeImageModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: (image: ComputeImage) => void
}

export function CreateComputeImageModal({
  isOpen,
  onClose,
  onCreated,
}: CreateComputeImageModalProps) {
  const [form, setForm] = useState<CreateComputeImageForm>(DEFAULT_CREATE_COMPUTE_IMAGE_FORM)

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_CREATE_COMPUTE_IMAGE_FORM)
    }
  }, [isOpen])

  const isCreateDisabled =
    !form.name.trim() ||
    !form.architecture.trim() ||
    !form.sizeLabel.trim() ||
    !form.imageUrl.trim() ||
    !form.checksum.trim()

  const handleCreateImage = () => {
    if (isCreateDisabled) {
      return
    }

    const image: ComputeImage = {
      id: generateComputeImageId(),
      name: form.name.trim(),
      abbrev: buildAbbreviation(form.name),
      architecture: form.architecture.trim(),
      sizeLabel: form.sizeLabel.trim(),
      imageUrl: form.imageUrl.trim(),
      checksum: form.checksum.trim(),
      format: form.format,
      recommended: false,
      createdAt: new Date().toISOString(),
    }

    addProviderComputeImage(image)
    onCreated(image)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-compute-image-title"
      className="provider-admin-compute-images__create-modal"
    >
      <ModalHeader title="Create compute image" labelId="create-compute-image-title" />
      <ModalBody>
        <Form autoComplete="off" className="provider-admin-compute-images__form">
          <Content component="p" className="provider-admin-compute-images__modal-lede">
            Register bootable OS images for Metal3 provisioning. BMaaS templates reference images
            from this registry.
          </Content>
          <FormGroup label="Image name" fieldId="create-compute-image-name" isRequired>
            <TextInput
              id="create-compute-image-name"
              value={form.name}
              onChange={(_event, value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="Red Hat Enterprise Linux 9.4"
            />
          </FormGroup>
          <FormGroup label="Architecture" fieldId="create-compute-image-architecture" isRequired>
            <FormSelect
              id="create-compute-image-architecture"
              value={form.architecture}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, architecture: value }))
              }
              aria-label="Architecture"
            >
              {COMPUTE_IMAGE_ARCHITECTURES.map((architecture) => (
                <FormSelectOption
                  key={architecture}
                  value={architecture}
                  label={architecture}
                />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Format" fieldId="create-compute-image-format" isRequired>
            <FormSelect
              id="create-compute-image-format"
              value={form.format}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, format: value as ComputeImageFormat }))
              }
              aria-label="Image format"
            >
              {COMPUTE_IMAGE_FORMATS.map((format) => (
                <FormSelectOption key={format} value={format} label={format} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Size" fieldId="create-compute-image-size" isRequired>
            <TextInput
              id="create-compute-image-size"
              value={form.sizeLabel}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, sizeLabel: value }))
              }
              placeholder="9.2 GB"
            />
          </FormGroup>
          <FormGroup label="Image URL" fieldId="create-compute-image-url" isRequired>
            <TextInput
              id="create-compute-image-url"
              value={form.imageUrl}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, imageUrl: value }))
              }
              placeholder="https://images.provider.local/bmaas/rhel-9.4-x86_64.qcow2"
            />
          </FormGroup>
          <FormGroup label="Checksum" fieldId="create-compute-image-checksum" isRequired>
            <TextInput
              id="create-compute-image-checksum"
              value={form.checksum}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, checksum: value }))
              }
              placeholder="sha256:..."
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" isDisabled={isCreateDisabled} onClick={handleCreateImage}>
          Create image
        </Button>
      </ModalFooter>
    </Modal>
  )
}

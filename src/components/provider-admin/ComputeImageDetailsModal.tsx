import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import type { ComputeImage } from '../../providerAdmin/computeImages'

type ComputeImageDetailsModalProps = {
  image: ComputeImage | null
  inUse: boolean
  onClose: () => void
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ComputeImageDetailsModal({
  image,
  inUse,
  onClose,
}: ComputeImageDetailsModalProps) {
  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={image !== null}
      onClose={onClose}
      aria-labelledby="compute-image-details-title"
      className="provider-admin-compute-images__details-modal"
    >
      <ModalHeader
        title={image?.name ?? 'Compute image details'}
        labelId="compute-image-details-title"
      />
      <ModalBody>
        {image ? (
          <DescriptionList isCompact>
            <DescriptionListGroup>
              <DescriptionListTerm>Image ID</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{image.id}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Architecture</DescriptionListTerm>
              <DescriptionListDescription>{image.architecture}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Format</DescriptionListTerm>
              <DescriptionListDescription>{image.format}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Size</DescriptionListTerm>
              <DescriptionListDescription>{image.sizeLabel}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Image URL</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{image.imageUrl}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Checksum</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{image.checksum}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                {inUse ? (
                  <Label color="blue" isCompact>
                    In use by template
                  </Label>
                ) : (
                  <Label color="green" isCompact>
                    Available
                  </Label>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>{formatCreatedAt(image.createdAt)}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        ) : null}
      </ModalBody>
    </Modal>
  )
}

import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button, Content, Label } from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { ComputeImageDetailsModal } from '../../components/provider-admin/ComputeImageDetailsModal'
import { CreateComputeImageModal } from '../../components/provider-admin/CreateComputeImageModal'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import type { ComputeImage } from '../../providerAdmin/computeImages'
import {
  getProviderComputeImages,
  isProviderComputeImageInUse,
} from '../../providerSetup/storage'

function getComputeImageActions(
  image: ComputeImage,
  inUse: boolean,
  onViewDetails: (image: ComputeImage) => void,
): IAction[] {
  return [
    {
      title: 'View details',
      onClick: () => onViewDetails(image),
    },
    {
      title: 'Edit image',
      isAriaDisabled: inUse,
      onClick: () => {
        /* demo */
      },
    },
    {
      isSeparator: true,
    },
    {
      title: 'Delete image',
      isAriaDisabled: inUse,
      onClick: () => {
        /* demo */
      },
    },
  ]
}

export function ProviderAdminComputeImagesPage() {
  const [images, setImages] = useState<ComputeImage[]>(() => getProviderComputeImages())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [detailsImage, setDetailsImage] = useState<ComputeImage | null>(null)

  const refreshImages = () => {
    setImages(getProviderComputeImages())
  }

  const detailsImageInUse = useMemo(
    () => (detailsImage ? isProviderComputeImageInUse(detailsImage.id) : false),
    [detailsImage, images],
  )

  return (
    <div className="provider-admin-workspace-page provider-admin-compute-images">
      <ProviderAdminWorkspacePageHeader
        kicker="Infrastructure"
        title="Compute images"
        lede="Register bootable OS images for Metal3 provisioning. Bare metal templates select images from this registry."
        action={
          <Button
            variant="primary"
            icon={<PlusIcon />}
            className="provider-admin-workspace-page__action"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create image
          </Button>
        }
      />

      <Table
        aria-label="Compute images"
        variant="compact"
        borders={false}
        className="provider-admin-compute-images__table"
      >
        <Thead>
          <Tr>
            <Th modifier="wrap">Image</Th>
            <Th modifier="wrap">Status</Th>
            <Th modifier="wrap">Architecture</Th>
            <Th modifier="wrap">Format</Th>
            <Th modifier="wrap">Size</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {images.map((image) => {
            const inUse = isProviderComputeImageInUse(image.id)

            return (
              <Tr key={image.id}>
                <Td dataLabel="Image">
                  <Content component="p" className="provider-admin-compute-images__primary-cell">
                    {image.name}
                  </Content>
                  <Content component="p" className="provider-admin-compute-images__meta-cell">
                    <code>{image.id}</code>
                  </Content>
                </Td>
                <Td dataLabel="Status">
                  {inUse ? (
                    <Label color="blue" isCompact>
                      In use
                    </Label>
                  ) : image.recommended ? (
                    <Label color="green" isCompact>
                      Recommended
                    </Label>
                  ) : (
                    <Label color="green" isCompact>
                      Available
                    </Label>
                  )}
                </Td>
                <Td dataLabel="Architecture">{image.architecture}</Td>
                <Td dataLabel="Format">{image.format}</Td>
                <Td dataLabel="Size">{image.sizeLabel}</Td>
                <Td isActionCell>
                  <ActionsColumn
                    items={getComputeImageActions(image, inUse, setDetailsImage)}
                  />
                </Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>

      <CreateComputeImageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => refreshImages()}
      />

      <ComputeImageDetailsModal
        image={detailsImage}
        inUse={detailsImageInUse}
        onClose={() => setDetailsImage(null)}
      />
    </div>
  )
}

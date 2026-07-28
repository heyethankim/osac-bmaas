import { useEffect, useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button, Content, Label } from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { BmaasTemplateDetailsDrawer } from '../../components/provider-admin/BmaasTemplateDetailsDrawer'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import {
  getBmaasTemplateStatus,
  getTemplateNetworkDefaults,
  mergeAvailableTemplates,
  findBmaasTemplate,
  toBlueprintFormFromTemplate,
  type BmaasTemplateLookup,
} from '../../providerAdmin/bmaasTemplates'
import {
  GPU_BLUEPRINT_FORM,
  SECOND_HARDWARE_PROFILE_ID,
  getHardwareProfileLabel,
  getSwitchPortProfileLabel,
  formatRateCardSummary,
  resolveRateCard,
  type PublishedTemplatePayload,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'
import { getOsImageLabel } from '../../providerAdmin/osImageLabels'
import {
  addProviderSavedTemplate,
  getProviderCatalogItems,
  getProviderRegisteredOrganizations,
  getProviderSavedTemplates,
  syncCatalogLinkedTemplateName,
  upsertProviderSavedTemplate,
} from '../../providerSetup/storage'
import { ProviderSetupBlueprintDesigner } from '../provider-setup/ProviderSetupBlueprintDesigner'
import { ProviderSetupPublishCatalogWizard } from '../provider-setup/ProviderSetupPublishCatalogWizard'

type ProviderAdminBmaasTemplatesPageProps = {
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  isPublishing?: boolean
  openTemplateLookup?: BmaasTemplateLookup | null
  onOpenTemplateConsumed?: () => void
}

function getTemplateActions(
  isPublished: boolean,
  isPublishing: boolean,
  onViewDetails: () => void,
  onEdit: () => void,
  onPublish: () => void,
): IAction[] {
  return [
    {
      title: 'View details',
      onClick: onViewDetails,
    },
    {
      title: 'Edit template',
      onClick: onEdit,
    },
    {
      isSeparator: true,
    },
    {
      title: 'Publish to catalog',
      isAriaDisabled: isPublished || isPublishing,
      onClick: () => {
        if (!isPublished && !isPublishing) {
          onPublish()
        }
      },
    },
  ]
}

export function ProviderAdminBmaasTemplatesPage({
  onCreateCatalogItem,
  isPublishing = false,
  openTemplateLookup = null,
  onOpenTemplateConsumed,
}: ProviderAdminBmaasTemplatesPageProps) {
  const [savedTemplates, setSavedTemplates] = useState(() => getProviderSavedTemplates())
  const [isDesignerOpen, setIsDesignerOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SavedMasterTemplate | null>(null)
  const [isPublishWizardOpen, setIsPublishWizardOpen] = useState(false)
  const [publishTemplateRefId, setPublishTemplateRefId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<SavedMasterTemplate | null>(() =>
    openTemplateLookup
      ? findBmaasTemplate(
          openTemplateLookup,
          mergeAvailableTemplates(getProviderSavedTemplates()),
        )
      : null,
  )
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(() => selectedTemplate !== null)

  const catalogItems = getProviderCatalogItems()
  const availableTemplates = useMemo(
    () => mergeAvailableTemplates(savedTemplates),
    [savedTemplates],
  )
  const hasGpuTemplate = savedTemplates.some(
    (template) => template.hardwareProfileId === SECOND_HARDWARE_PROFILE_ID,
  )
  const designerInitialForm = useMemo(
    () => (editingTemplate ? toBlueprintFormFromTemplate(editingTemplate) : GPU_BLUEPRINT_FORM),
    [editingTemplate],
  )

  useEffect(() => {
    if (!openTemplateLookup) {
      return
    }

    const match = findBmaasTemplate(openTemplateLookup, availableTemplates)
    if (match) {
      setSelectedTemplate(match)
      setIsDetailsDrawerOpen(true)
    }
    onOpenTemplateConsumed?.()
  }, [openTemplateLookup, availableTemplates, onOpenTemplateConsumed])

  const refreshTemplates = () => {
    setSavedTemplates(getProviderSavedTemplates())
  }

  const handleTemplateSaved = (template: SavedMasterTemplate) => {
    if (editingTemplate) {
      upsertProviderSavedTemplate(template)
      syncCatalogLinkedTemplateName(template)
    } else {
      addProviderSavedTemplate(template)
    }

    refreshTemplates()
    setSelectedTemplate((current) =>
      current?.templateRefId === template.templateRefId ? template : current,
    )
    setEditingTemplate(null)
    setIsDesignerOpen(false)
  }

  const handleOpenCreateDesigner = () => {
    setEditingTemplate(null)
    setIsDesignerOpen(true)
  }

  const handleOpenEditDesigner = (template: SavedMasterTemplate) => {
    setIsDetailsDrawerOpen(false)
    setEditingTemplate(template)
    setIsDesignerOpen(true)
  }

  const handleOpenPublishWizard = (templateRefId: string) => {
    setPublishTemplateRefId(templateRefId)
    setIsPublishWizardOpen(true)
  }

  const openDetails = (template: SavedMasterTemplate) => {
    setSelectedTemplate(template)
    setIsDetailsDrawerOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsDrawerOpen(false)
  }

  return (
    <BmaasTemplateDetailsDrawer
      isExpanded={isDetailsDrawerOpen}
      template={selectedTemplate}
      onClose={closeDetails}
      isPublishing={isPublishing}
      onEdit={
        selectedTemplate ? () => handleOpenEditDesigner(selectedTemplate) : undefined
      }
      onPublish={
        selectedTemplate
          ? () => {
              closeDetails()
              handleOpenPublishWizard(selectedTemplate.templateRefId)
            }
          : undefined
      }
    >
      <div className="provider-admin-workspace-page">
        <ProviderAdminWorkspacePageHeader
          kicker="Infrastructure"
          title="Bare metal templates"
          lede="Private master templates linked to discovered hardware profiles and compute images from the image registry."
          action={
            <Button
              variant="primary"
              icon={<PlusIcon />}
              onClick={handleOpenCreateDesigner}
              isDisabled={hasGpuTemplate}
            >
              Create template for catalog
            </Button>
          }
        />

        <Table
          aria-label="Bare metal templates"
          variant="compact"
          borders={false}
          className="provider-admin-bmaas-templates__table"
        >
          <Thead>
            <Tr>
              <Th modifier="wrap">Template</Th>
              <Th modifier="wrap">Hardware profile</Th>
              <Th modifier="wrap">OS image</Th>
              <Th modifier="wrap">Network</Th>
              <Th modifier="wrap">Rate card</Th>
              <Th modifier="wrap">Status</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {availableTemplates.map((template) => {
              const status = getBmaasTemplateStatus(template, savedTemplates, catalogItems)
              const isPublished = status === 'published'
              const network = getTemplateNetworkDefaults(template.hardwareProfileId)

              return (
                <Tr key={template.templateRefId}>
                  <Td dataLabel="Template">
                    <Button
                      variant="link"
                      isInline
                      className="provider-admin-bmaas-templates__name-link"
                      onClick={() => openDetails(template)}
                    >
                      {template.templateName}
                    </Button>
                  </Td>
                  <Td dataLabel="Hardware profile">
                    {getHardwareProfileLabel(template.hardwareProfileId)}
                  </Td>
                  <Td dataLabel="OS image">{getOsImageLabel(template.osImageId)}</Td>
                  <Td dataLabel="Network">
                    <Content component="p" className="provider-admin-bmaas-templates__primary-cell">
                      {network.subnetCidr}
                    </Content>
                    <Content
                      component="p"
                      className="provider-admin-bmaas-templates__secondary-cell"
                    >
                      VLAN {network.vlanId} ·{' '}
                      {getSwitchPortProfileLabel(network.switchPortProfile)}
                    </Content>
                  </Td>
                  <Td dataLabel="Rate card">
                    {formatRateCardSummary(resolveRateCard(template))}
                  </Td>
                  <Td dataLabel="Status">
                    {isPublished ? (
                      <Label color="green" isCompact>
                        Published
                      </Label>
                    ) : (
                      <Label color="grey" isCompact>
                        {status === 'draft' ? 'Draft' : 'Private'}
                      </Label>
                    )}
                  </Td>
                  <Td isActionCell>
                    <ActionsColumn
                      items={getTemplateActions(
                        isPublished,
                        isPublishing,
                        () => openDetails(template),
                        () => handleOpenEditDesigner(template),
                        () => handleOpenPublishWizard(template.templateRefId),
                      )}
                    />
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>

        <ProviderSetupBlueprintDesigner
          isOpen={isDesignerOpen}
          initialForm={designerInitialForm}
          existingTemplateRefId={editingTemplate?.templateRefId}
          title={editingTemplate ? 'Edit template' : 'Create template for catalog'}
          onClose={() => {
            setIsDesignerOpen(false)
            setEditingTemplate(null)
          }}
          onTemplateSaved={handleTemplateSaved}
        />

        <ProviderSetupPublishCatalogWizard
          isOpen={isPublishWizardOpen}
          templates={availableTemplates}
          organizations={getProviderRegisteredOrganizations()}
          defaultTemplateRefId={publishTemplateRefId ?? availableTemplates[0]?.templateRefId}
          onClose={() => {
            setIsPublishWizardOpen(false)
            setPublishTemplateRefId(null)
          }}
          onCreateCatalogItem={(payload) => {
            setIsPublishWizardOpen(false)
            setPublishTemplateRefId(null)
            onCreateCatalogItem(payload)
          }}
          isPublishing={isPublishing}
        />
      </div>
    </BmaasTemplateDetailsDrawer>
  )
}

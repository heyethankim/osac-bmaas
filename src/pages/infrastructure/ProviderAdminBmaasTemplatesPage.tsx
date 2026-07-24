import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button, Content, Label } from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import {
  DEFAULT_BLUEPRINT_FORM,
  DEMO_EXISTING_MASTER_TEMPLATES,
  GPU_BLUEPRINT_FORM,
  SECOND_HARDWARE_PROFILE_ID,
  getHardwareProfileLabel,
  getSwitchPortProfileLabel,
  parseRateCardFromForm,
  formatRateCardSummary,
  resolveRateCard,
  type PublishedTemplatePayload,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'
import { getOsImageLabel } from '../../providerAdmin/osImageLabels'
import {
  addProviderSavedTemplate,
  getProviderCatalogDraft,
  getProviderRegisteredOrganizations,
  getProviderSavedTemplates,
} from '../../providerSetup/storage'
import { ProviderSetupBlueprintDesigner } from '../provider-setup/ProviderSetupBlueprintDesigner'
import { ProviderSetupPublishCatalogWizard } from '../provider-setup/ProviderSetupPublishCatalogWizard'

type ProviderAdminBmaasTemplatesPageProps = {
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  isPublishing?: boolean
}

function getPendingTemplateRow(): SavedMasterTemplate {
  return {
    templateRefId: 'bm_pending',
    templateName: DEFAULT_BLUEPRINT_FORM.templateName,
    description: DEFAULT_BLUEPRINT_FORM.description,
    hardwareProfileId: DEFAULT_BLUEPRINT_FORM.hardwareProfileId,
    osImageId: DEFAULT_BLUEPRINT_FORM.osImage,
    suggestedDisplayName: DEFAULT_BLUEPRINT_FORM.templateName,
    rateCard: parseRateCardFromForm(DEFAULT_BLUEPRINT_FORM)!,
  }
}

function mergeAvailableTemplates(savedTemplates: SavedMasterTemplate[]): SavedMasterTemplate[] {
  const templates =
    savedTemplates.length > 0 ? savedTemplates : [getPendingTemplateRow(), ...DEMO_EXISTING_MASTER_TEMPLATES]
  const seen = new Set<string>()

  return templates.filter((item) => {
    if (seen.has(item.templateRefId)) {
      return false
    }

    seen.add(item.templateRefId)
    return true
  })
}

function getTemplateActions(
  isPublished: boolean,
  isPublishing: boolean,
  onPublish: () => void,
): IAction[] {
  return [
    {
      title: 'View details',
      onClick: () => {
        /* demo */
      },
    },
    {
      title: 'Edit template',
      onClick: () => {
        /* demo */
      },
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
}: ProviderAdminBmaasTemplatesPageProps) {
  const [savedTemplates, setSavedTemplates] = useState(() => getProviderSavedTemplates())
  const [isDesignerOpen, setIsDesignerOpen] = useState(false)
  const [isPublishWizardOpen, setIsPublishWizardOpen] = useState(false)
  const [publishTemplateRefId, setPublishTemplateRefId] = useState<string | null>(null)

  const catalogDraft = getProviderCatalogDraft()
  const availableTemplates = useMemo(
    () => mergeAvailableTemplates(savedTemplates),
    [savedTemplates],
  )
  const hasGpuTemplate = savedTemplates.some(
    (template) => template.hardwareProfileId === SECOND_HARDWARE_PROFILE_ID,
  )

  const handleTemplateSaved = (template: SavedMasterTemplate) => {
    addProviderSavedTemplate(template)
    setSavedTemplates(getProviderSavedTemplates())
    setIsDesignerOpen(false)
  }

  const handleOpenPublishWizard = (templateRefId: string) => {
    setPublishTemplateRefId(templateRefId)
    setIsPublishWizardOpen(true)
  }

  return (
    <div className="provider-admin-workspace-page">
      <ProviderAdminWorkspacePageHeader
        kicker="Infrastructure"
        title="BMaaS templates"
        lede="Private master templates linked to discovered hardware profiles and compute images from the image registry."
        action={
          <Button
            variant="primary"
            icon={<PlusIcon />}
            onClick={() => setIsDesignerOpen(true)}
            isDisabled={hasGpuTemplate}
          >
            Create template for catalog
          </Button>
        }
      />

      <Table
        aria-label="BMaaS templates"
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
            const isPublished = catalogDraft?.templateRefId === template.templateRefId
            const isPending = template.templateRefId === 'bm_pending'

            return (
              <Tr key={template.templateRefId}>
                <Td dataLabel="Template">
                  <Content component="p" className="provider-admin-bmaas-templates__primary-cell">
                    {template.templateName}
                  </Content>
                </Td>
                <Td dataLabel="Hardware profile">
                  {getHardwareProfileLabel(template.hardwareProfileId)}
                </Td>
                <Td dataLabel="OS image">{getOsImageLabel(template.osImageId)}</Td>
                <Td dataLabel="Network">
                  <Content component="p" className="provider-admin-bmaas-templates__primary-cell">
                    {DEFAULT_BLUEPRINT_FORM.subnetCidr}
                  </Content>
                  <Content component="p" className="provider-admin-bmaas-templates__secondary-cell">
                    VLAN {DEFAULT_BLUEPRINT_FORM.vlanId} ·{' '}
                    {getSwitchPortProfileLabel(DEFAULT_BLUEPRINT_FORM.switchPortProfile)}
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
                      {isPending ? 'Draft' : 'Private'}
                    </Label>
                  )}
                </Td>
                <Td isActionCell>
                  <ActionsColumn
                    items={getTemplateActions(isPublished, isPublishing || isPending, () =>
                      handleOpenPublishWizard(template.templateRefId),
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
        initialForm={GPU_BLUEPRINT_FORM}
        title="Create template for catalog"
        onClose={() => setIsDesignerOpen(false)}
        onTemplateSaved={handleTemplateSaved}
      />

      <ProviderSetupPublishCatalogWizard
        isOpen={isPublishWizardOpen}
        templates={availableTemplates.filter((template) => template.templateRefId !== 'bm_pending')}
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
  )
}

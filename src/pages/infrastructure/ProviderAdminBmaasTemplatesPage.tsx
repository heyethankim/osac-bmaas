import { useEffect, useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import { BmaasTemplateDetailsPage } from '../../components/provider-admin/BmaasTemplateDetailsPage'
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
  type CatalogServiceId,
  type PublishedTemplatePayload,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'
import { getOsImageLabel } from '../../providerAdmin/osImageLabels'
import {
  addProviderSavedTemplate,
  getCatalogItemStatus,
  getProviderCatalogItems,
  getProviderRegisteredOrganizations,
  getProviderSavedTemplates,
  syncCatalogLinkedTemplateName,
  upsertProviderSavedTemplate,
  type ProviderCatalogDraft,
} from '../../providerSetup/storage'
import { ProviderSetupBlueprintDesigner } from '../provider-setup/ProviderSetupBlueprintDesigner'
import { ProviderSetupPublishCatalogWizard } from '../provider-setup/ProviderSetupPublishCatalogWizard'

type ProfilesTemplatesTab = 'baremetal' | 'cluster' | 'virtual-machine'

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
      title: 'Create catalog item',
      isAriaDisabled: isPublished || isPublishing,
      onClick: () => {
        if (!isPublished && !isPublishing) {
          onPublish()
        }
      },
    },
  ]
}

function getServiceProfiles(
  catalogItems: ProviderCatalogDraft[],
  serviceId: CatalogServiceId,
): ProviderCatalogDraft[] {
  return catalogItems.filter((item) => (item.serviceId ?? 'baremetal') === serviceId)
}

function ServiceProfilesTable({
  serviceId,
  profiles,
  emptyTitle,
  emptyBody,
  ariaLabel,
  resultNoun,
}: {
  serviceId: 'cluster' | 'virtual-machine'
  profiles: ProviderCatalogDraft[]
  emptyTitle: string
  emptyBody: string
  ariaLabel: string
  resultNoun: string
}) {
  const profileColumnLabel = serviceId === 'cluster' ? 'Cluster profile' : 'VM profile'

  if (profiles.length === 0) {
    return (
      <EmptyState titleText={emptyTitle} headingLevel="h2" className="provider-admin-profiles__empty">
        <EmptyStateBody>{emptyBody}</EmptyStateBody>
      </EmptyState>
    )
  }

  return (
    <div className="catalog-table-panel">
      <Content component="p" className="catalog-table-result-count">
        {formatCatalogTableResultCount(profiles.length, resultNoun)}
      </Content>
      <Table
        aria-label={ariaLabel}
        className="catalog-data-table provider-admin-bmaas-templates__table"
      >
        <Thead>
          <Tr>
            <Th>{profileColumnLabel}</Th>
            <Th>Status</Th>
            <Th>Catalog item</Th>
            <Th>Rate card</Th>
          </Tr>
        </Thead>
        <Tbody>
          {profiles.map((profile) => {
            const isLive = getCatalogItemStatus(profile) === 'live'

            return (
              <Tr key={profile.catalogItemId}>
                <Td dataLabel={profileColumnLabel}>
                  <Content component="p" className="provider-admin-bmaas-templates__primary-cell">
                    {profile.templateName}
                  </Content>
                  <Content component="p" className="provider-admin-bmaas-templates__meta-cell">
                    <code>{profile.templateRefId}</code>
                  </Content>
                </Td>
                <Td dataLabel="Status">
                  {isLive ? (
                    <Label color="green" isCompact>
                      Published
                    </Label>
                  ) : (
                    <Label color="grey" isCompact>
                      Unpublished
                    </Label>
                  )}
                </Td>
                <Td dataLabel="Catalog item">{profile.displayName}</Td>
                <Td dataLabel="Rate card">{formatRateCardSummary(profile.rateCard)}</Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>
    </div>
  )
}

export function ProviderAdminBmaasTemplatesPage({
  onCreateCatalogItem,
  isPublishing = false,
  openTemplateLookup = null,
  onOpenTemplateConsumed,
}: ProviderAdminBmaasTemplatesPageProps) {
  const [savedTemplates, setSavedTemplates] = useState(() => getProviderSavedTemplates())
  const [activeTab, setActiveTab] = useState<ProfilesTemplatesTab>('baremetal')
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
  const [isDetailsPageOpen, setIsDetailsPageOpen] = useState(() => selectedTemplate !== null)

  const catalogItems = getProviderCatalogItems()
  const availableTemplates = useMemo(
    () => mergeAvailableTemplates(savedTemplates),
    [savedTemplates],
  )
  const clusterProfiles = useMemo(
    () => getServiceProfiles(catalogItems, 'cluster'),
    [catalogItems],
  )
  const vmProfiles = useMemo(
    () => getServiceProfiles(catalogItems, 'virtual-machine'),
    [catalogItems],
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
    setActiveTab('baremetal')
    if (match) {
      setSelectedTemplate(match)
      setIsDetailsPageOpen(true)
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
    setIsDetailsPageOpen(false)
    setEditingTemplate(template)
    setIsDesignerOpen(true)
  }

  const handleOpenPublishWizard = (templateRefId: string) => {
    setPublishTemplateRefId(templateRefId)
    setIsPublishWizardOpen(true)
  }

  const openDetails = (template: SavedMasterTemplate) => {
    setSelectedTemplate(template)
    setIsDetailsPageOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsPageOpen(false)
  }

  return (
    <>
      {isDetailsPageOpen && selectedTemplate ? (
        <BmaasTemplateDetailsPage
          template={selectedTemplate}
          onBack={closeDetails}
          isPublishing={isPublishing}
          onEdit={() => handleOpenEditDesigner(selectedTemplate)}
          onPublish={() => {
            closeDetails()
            handleOpenPublishWizard(selectedTemplate.templateRefId)
          }}
        />
      ) : (
      <div className="provider-admin-workspace-page provider-admin-profiles">
        <ProviderAdminWorkspacePageHeader
          kicker="Infrastructure"
          title="Profiles & templates"
          lede="Author bare metal templates, cluster profiles, and VM profiles used when publishing catalog offerings."
          action={
            activeTab === 'baremetal' ? (
              <Button
                variant="primary"
                icon={<PlusIcon />}
                onClick={handleOpenCreateDesigner}
                isDisabled={hasGpuTemplate}
              >
                Create template for catalog
              </Button>
            ) : undefined
          }
        />

        <ToggleGroup
          aria-label="Profiles and templates views"
          className="provider-admin-profiles__toggle-group"
        >
          <ToggleGroupItem
            text={`Bare metal templates ${availableTemplates.length}`}
            buttonId="profiles-view-baremetal"
            isSelected={activeTab === 'baremetal'}
            onChange={() => setActiveTab('baremetal')}
          />
          <ToggleGroupItem
            text={`Cluster profiles ${clusterProfiles.length}`}
            buttonId="profiles-view-cluster"
            isSelected={activeTab === 'cluster'}
            onChange={() => setActiveTab('cluster')}
          />
          <ToggleGroupItem
            text={`VM profiles ${vmProfiles.length}`}
            buttonId="profiles-view-vm"
            isSelected={activeTab === 'virtual-machine'}
            onChange={() => setActiveTab('virtual-machine')}
          />
        </ToggleGroup>

        {activeTab === 'baremetal' ? (
          availableTemplates.length === 0 ? (
            <EmptyState
              titleText="No bare metal templates yet"
              headingLevel="h2"
              className="provider-admin-profiles__empty"
            >
              <EmptyStateBody>
                Create a template to get started publishing bare metal catalog offerings.
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <div className="catalog-table-panel">
              <Content component="p" className="catalog-table-result-count">
                {formatCatalogTableResultCount(availableTemplates.length, 'bare metal template')}
              </Content>
              <Table
                aria-label="Bare metal templates"
                className="catalog-data-table provider-admin-bmaas-templates__table"
              >
                <Thead>
                  <Tr>
                    <Th>Template</Th>
                    <Th>Status</Th>
                    <Th>Hardware profile</Th>
                    <Th>OS image</Th>
                    <Th>Network</Th>
                    <Th>Rate card</Th>
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
                          <Content
                            component="p"
                            className="provider-admin-bmaas-templates__primary-cell"
                          >
                            <Button
                              variant="link"
                              isInline
                              className="catalog-table-name-link"
                              onClick={() => openDetails(template)}
                            >
                              {template.templateName}
                            </Button>
                          </Content>
                          <Content
                            component="p"
                            className="provider-admin-bmaas-templates__meta-cell"
                          >
                            <code>{template.templateRefId}</code>
                          </Content>
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
                        <Td dataLabel="Hardware profile">
                          {getHardwareProfileLabel(template.hardwareProfileId)}
                        </Td>
                        <Td dataLabel="OS image">{getOsImageLabel(template.osImageId)}</Td>
                        <Td dataLabel="Network">
                          <Content
                            component="p"
                            className="provider-admin-bmaas-templates__primary-cell"
                          >
                            {network.subnetCidr}
                          </Content>
                          <Content
                            component="p"
                            className="provider-admin-bmaas-templates__meta-cell"
                          >
                            VLAN {network.vlanId} ·{' '}
                            {getSwitchPortProfileLabel(network.switchPortProfile)}
                          </Content>
                        </Td>
                        <Td dataLabel="Rate card">
                          {formatRateCardSummary(resolveRateCard(template))}
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
            </div>
          )
        ) : null}

        {activeTab === 'cluster' ? (
          <ServiceProfilesTable
            serviceId="cluster"
            profiles={clusterProfiles}
            emptyTitle="No cluster profiles yet"
            emptyBody="Cluster profiles appear here after you publish a cluster catalog offering."
            ariaLabel="Cluster profiles"
            resultNoun="cluster profile"
          />
        ) : null}

        {activeTab === 'virtual-machine' ? (
          <ServiceProfilesTable
            serviceId="virtual-machine"
            profiles={vmProfiles}
            emptyTitle="No VM profiles yet"
            emptyBody="VM profiles appear here after you publish a virtual machine catalog offering."
            ariaLabel="VM profiles"
            resultNoun="VM profile"
          />
        ) : null}
      </div>
      )}

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
        templates={
          publishTemplateRefId
            ? availableTemplates.filter(
                (template) => template.templateRefId === publishTemplateRefId,
              )
            : availableTemplates.slice(0, 1)
        }
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
    </>
  )
}

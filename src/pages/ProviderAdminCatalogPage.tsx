import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Alert,
  AlertActionLink,
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { Table, ActionsColumn, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { CatalogServiceFilterToggle, countCatalogServices, toggleCatalogServiceFilter } from '../components/catalog/CatalogServiceFilterToggle'
import { CatalogViewToggle } from '../components/catalog/CatalogViewToggle'
import { AssignCatalogToOrganizationModal } from '../components/provider-admin/AssignCatalogToOrganizationModal'
import { CatalogItemDetailsDrawer } from '../components/provider-admin/CatalogItemDetailsDrawer'
import { CatalogPublishScopeIcon } from '../components/provider-admin/CatalogPublishScopeIcon'
import { formatVipEnterpriseVisibilityLabel } from '../components/provider-admin/VipEnterpriseOrganizationField'
import { OpenCatalogAsTenantUserModal } from '../components/provider-admin/OpenCatalogAsTenantUserModal'
import {
  EditCatalogItemModal,
  type CatalogItemEditFields,
} from '../components/provider-admin/EditCatalogItemModal'
import { getCatalogServiceIcon } from '../catalog/serviceIcons'
import { formatCatalogTableResultCount } from '../catalog/tableResultCount'
import { resolveHardwareSpecsForCatalogItem } from '../catalog/hardwareSpecs'
import { getCatalogViewMode, setCatalogViewMode, type CatalogViewMode } from '../catalog/viewMode'
import { getCatalogNetworkLockSummary } from '../providerAdmin/catalogNetworkPolicy'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import { openAsTenantUser, resolveOrganizationForTenantUserPreview } from '../providerAdmin/openAsTenantUser'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import {
  assignCatalogToRegisteredOrganization,
  consumeProviderVipCatalogResumeIntent,
  duplicateProviderCatalogItem,
  getCatalogItemNetworkPolicy,
  getCatalogItemStatus,
  getProviderRegisteredOrganizations,
  getProviderSavedTemplate,
  deleteProviderCatalogItem,
  setProviderCatalogItemStatus,
  setProviderVipCatalogResumeIntent,
  updateProviderCatalogItem,
  updateProviderCatalogNetworkPolicy,
} from '../providerSetup/storage'
import {
  CATALOG_SERVICE_FILTER_LABELS,
  CATALOG_SERVICE_LABELS,
  DEFAULT_BLUEPRINT_FORM,
  DEMO_EXISTING_MASTER_TEMPLATES,
  SECOND_CATALOG_ITEM_DISPLAY_NAME,
  formatRateCardSummary,
  parseRateCardFromForm,
  type CatalogServiceId,
  type PublishedTemplatePayload,
} from '../providerSetup/templateDemo'
import { ProviderSetupPublishCatalogWizard } from './provider-setup/ProviderSetupPublishCatalogWizard'

type ProviderAdminCatalogPageProps = {
  catalogItems: ProviderCatalogDraft[]
  isEntering?: boolean
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  onCatalogItemsChange?: () => void
  isPublishing?: boolean
  onRegisterOrganization?: () => void
}

function getDraftServiceId(catalogDraft: ProviderCatalogDraft): CatalogServiceId {
  return catalogDraft.serviceId ?? 'baremetal'
}

function formatCatalogCreatedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

function CatalogStatusLabel({ item }: { item: ProviderCatalogDraft }) {
  const status = getCatalogItemStatus(item)
  const isLive = status === 'live'

  return (
    <Label
      color={isLive ? 'green' : 'grey'}
      className="provider-admin-catalog-items__card-label provider-admin-catalog-items__status"
    >
      {isLive ? 'Live' : 'Unpublished'}
    </Label>
  )
}

function getVisibilityTooltip(scope: ProviderCatalogDraft['scope']): string {
  return scope === 'vip-enterprise'
    ? 'Visible only to chosen tenant organizations'
    : 'Visible to all tenants'
}

function ScopeCell({ scope }: { scope: ProviderCatalogDraft['scope'] }) {
  const label = scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global'

  return (
    <Tooltip content={getVisibilityTooltip(scope)} position="top" enableFlip={false}>
      <span className="provider-admin-catalog-items__scope">
        <CatalogPublishScopeIcon scope={scope} className="provider-admin-catalog__scope-icon" />
        <span>{label}</span>
      </span>
    </Tooltip>
  )
}

function NetworkingSummary({
  item,
  compact = false,
  onViewDetails,
}: {
  item: ProviderCatalogDraft
  compact?: boolean
  onViewDetails?: () => void
}) {
  const lockSummary = getCatalogNetworkLockSummary(getCatalogItemNetworkPolicy(item))

  const statusContent = lockSummary ? (
    <span className="provider-admin-catalog-items__networking-status">
      <Label
        color={
          lockSummary.kind === 'all-locked'
            ? 'grey'
            : lockSummary.kind === 'all-editable'
              ? 'blue'
              : 'orange'
        }
        isCompact
        icon={lockSummary.kind === 'all-locked' ? <LockIcon /> : undefined}
        className="provider-admin-catalog-items__networking-status-label"
      >
        {lockSummary.label}
      </Label>
      {onViewDetails ? (
        <Button
          variant="link"
          isInline
          className="provider-admin-catalog-items__inline-link"
          onClick={onViewDetails}
        >
          Details
        </Button>
      ) : null}
    </span>
  ) : (
    <Content
      component="p"
      className={
        compact ? 'provider-admin-catalog-items__networking-table-summary' : undefined
      }
    >
      Not configured
    </Content>
  )

  if (compact) {
    return statusContent
  }

  return (
    <div className="provider-admin-catalog-items__card-spec">
      <dt>Networking</dt>
      <dd>{statusContent}</dd>
    </div>
  )
}

function getTemplateRowData() {
  const saved = getProviderSavedTemplate()
  if (saved) {
    return saved
  }

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

function getCatalogItemActions(
  item: ProviderCatalogDraft,
  hasUnassignedOrganizations: boolean,
  onViewDetails: () => void,
  onAssignToOrganization: () => void,
  onOpenAsTenantUser: () => void,
  onEdit: () => void,
  onDuplicate: () => void,
  onTogglePublish: () => void,
  onDelete: () => void,
  onRegisterOrganization?: () => void,
): IAction[] {
  const isGlobalPublic = item.scope === 'global-public'
  const isUnpublished = getCatalogItemStatus(item) === 'unpublished'
  const actions: IAction[] = [
    {
      title: 'View details',
      onClick: onViewDetails,
    },
    {
      title: 'Open as tenant user',
      isAriaDisabled: isUnpublished,
      onClick: () => {
        if (!isUnpublished) {
          onOpenAsTenantUser()
        }
      },
    },
  ]

  if (!isGlobalPublic) {
    actions.push(
      {
        title: 'Assign to organization',
        isAriaDisabled: !hasUnassignedOrganizations || isUnpublished,
        onClick: () => {
          if (hasUnassignedOrganizations && !isUnpublished) {
            onAssignToOrganization()
          }
        },
      },
      {
        title: 'Register organization',
        onClick: () => {
          onRegisterOrganization?.()
        },
      },
    )
  }

  actions.push(
    {
      title: 'Edit',
      onClick: onEdit,
    },
    {
      title: 'Duplicate',
      onClick: onDuplicate,
    },
    {
      isSeparator: true,
    },
    {
      title: isUnpublished ? 'Publish' : 'Unpublish',
      onClick: onTogglePublish,
    },
    {
      title: 'Delete',
      isDanger: true,
      onClick: onDelete,
    },
  )

  return actions
}

export function ProviderAdminCatalogPage({
  catalogItems,
  isEntering = false,
  onCreateCatalogItem,
  onCatalogItemsChange,
  isPublishing = false,
  onRegisterOrganization,
}: ProviderAdminCatalogPageProps) {
  const navigate = useNavigate()
  const initialServiceFilters = catalogItems.map(getDraftServiceId)
  const [selectedFilters, setSelectedFilters] = useState<Set<CatalogServiceId>>(
    () => new Set(initialServiceFilters.length > 0 ? initialServiceFilters : ['baremetal']),
  )
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => getCatalogViewMode('grid'))
  const [searchValue, setSearchValue] = useState('')
  const [organizations, setOrganizations] = useState(() => getProviderRegisteredOrganizations())
  const [isPublishWizardOpen, setIsPublishWizardOpen] = useState(false)
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ProviderCatalogDraft | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isOpenAsTenantUserModalOpen, setIsOpenAsTenantUserModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [publishResumeScope, setPublishResumeScope] = useState<'global-public' | 'vip-enterprise'>(
    'global-public',
  )
  const [publishResumeTenantId, setPublishResumeTenantId] = useState('')
  const [editResumeTenantId, setEditResumeTenantId] = useState<string | undefined>(undefined)

  const newestCatalogItem = catalogItems[0] ?? null

  useEffect(() => {
    if (!newestCatalogItem) {
      return
    }

    setSelectedFilters((current) => {
      const next = new Set(current)
      next.add(getDraftServiceId(newestCatalogItem))
      return next
    })
  }, [newestCatalogItem?.catalogItemId])

  const serviceCounts = useMemo(
    () => countCatalogServices(catalogItems.map(getDraftServiceId)),
    [catalogItems],
  )
  const filteredCatalogItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return catalogItems.filter((item) => {
      if (!selectedFilters.has(getDraftServiceId(item))) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        item.displayName.toLowerCase().includes(query) ||
        item.catalogItemId.toLowerCase().includes(query) ||
        item.templateName.toLowerCase().includes(query) ||
        item.templateRefId.toLowerCase().includes(query)
      )
    })
  }, [catalogItems, selectedFilters, searchValue])

  const unassignedOrganizations = useMemo(
    () => organizations.filter((organization) => !organization.catalogItemId),
    [organizations],
  )
  const hasRegisteredOrganizations = organizations.length > 0
  const hasUnassignedOrganizations = unassignedOrganizations.length > 0

  const linkedTemplate = useMemo(() => getTemplateRowData(), [])
  const availableTemplates = useMemo(() => {
    const template = getTemplateRowData()
    const templates = [template, ...DEMO_EXISTING_MASTER_TEMPLATES]
    const seen = new Set<string>()
    return templates.filter((item) => {
      if (seen.has(item.templateRefId)) {
        return false
      }
      seen.add(item.templateRefId)
      return true
    })
  }, [isPublishWizardOpen])

  const refreshOrganizations = () => {
    setOrganizations(getProviderRegisteredOrganizations())
  }

  useEffect(() => {
    const intent = consumeProviderVipCatalogResumeIntent()
    if (!intent) {
      return
    }

    const latestOrganizations = getProviderRegisteredOrganizations()
    setOrganizations(latestOrganizations)
    const preferredTenantId = latestOrganizations[0]?.tenantId ?? ''

    if (intent.kind === 'publish') {
      setPublishResumeScope('vip-enterprise')
      setPublishResumeTenantId(preferredTenantId)
      setIsPublishWizardOpen(true)
      return
    }

    const catalogItem =
      catalogItems.find((item) => item.catalogItemId === intent.catalogItemId) ?? null
    if (!catalogItem) {
      return
    }

    setSelectedCatalogItem(catalogItem)
    setEditResumeTenantId(preferredTenantId)
    setIsEditModalOpen(true)
    // Resume once when returning from organization registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only resume
  }, [])

  const handleRegisterOrganizationFromVip = (intent: {
    kind: 'publish'
  } | {
    kind: 'edit'
    catalogItemId: string
  }) => {
    setProviderVipCatalogResumeIntent(intent)
    setIsPublishWizardOpen(false)
    setIsEditModalOpen(false)
    onRegisterOrganization?.()
  }

  const openDetails = (item: ProviderCatalogDraft) => {
    setSelectedCatalogItem(item)
    setIsDetailsDrawerOpen(true)
  }

  const openAssign = (item: ProviderCatalogDraft) => {
    setSelectedCatalogItem(item)
    setIsAssignModalOpen(true)
  }

  const openAsTenantUserForItem = (item: ProviderCatalogDraft) => {
    setSelectedCatalogItem(item)
    if (organizations.length <= 1) {
      navigate(
        openAsTenantUser(resolveOrganizationForTenantUserPreview(organizations), {
          catalogItem: item,
          autoLaunch: false,
          returnNav: 'catalog',
        }),
      )
      return
    }
    setIsOpenAsTenantUserModalOpen(true)
  }

  const handleOpenAsTenantUser = (organization: RegisteredOrganization) => {
    if (!selectedCatalogItem) {
      return
    }

    navigate(
      openAsTenantUser(organization, {
        catalogItem: selectedCatalogItem,
        autoLaunch: false,
        returnNav: 'catalog',
      }),
    )
  }

  const openEdit = (item: ProviderCatalogDraft) => {
    setSelectedCatalogItem(item)
    setIsEditModalOpen(true)
  }

  const handleDuplicate = (item: ProviderCatalogDraft) => {
    const duplicate = duplicateProviderCatalogItem(item.catalogItemId)
    if (!duplicate) {
      return
    }

    setSelectedCatalogItem(duplicate)
    onCatalogItemsChange?.()
  }

  const openTogglePublish = (item: ProviderCatalogDraft) => {
    setSelectedCatalogItem(item)
    if (getCatalogItemStatus(item) === 'unpublished') {
      const updated = setProviderCatalogItemStatus(item.catalogItemId, 'live')
      if (updated) {
        setSelectedCatalogItem(updated)
        onCatalogItemsChange?.()
      }
      return
    }

    setIsUnpublishModalOpen(true)
  }

  const handleConfirmUnpublish = () => {
    if (!selectedCatalogItem) {
      return
    }

    const updated = setProviderCatalogItemStatus(selectedCatalogItem.catalogItemId, 'unpublished')
    if (updated) {
      setSelectedCatalogItem(updated)
      onCatalogItemsChange?.()
    }
    setIsUnpublishModalOpen(false)
  }

  const openDelete = (item: ProviderCatalogDraft) => {
    setSelectedCatalogItem(item)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!selectedCatalogItem) {
      return
    }

    const deletedId = selectedCatalogItem.catalogItemId
    const deleted = deleteProviderCatalogItem(deletedId)
    if (deleted) {
      setIsDetailsDrawerOpen(false)
      setIsAssignModalOpen(false)
      setIsEditModalOpen(false)
      setSelectedCatalogItem(null)
      onCatalogItemsChange?.()
      refreshOrganizations()
    }
    setIsDeleteModalOpen(false)
  }

  const handleAssignCatalog = (organizationId: string) => {
    if (!selectedCatalogItem) {
      return
    }

    assignCatalogToRegisteredOrganization(organizationId, selectedCatalogItem)
    refreshOrganizations()
    setIsAssignModalOpen(false)
  }

  const handleSaveCatalogEdit = (fields: CatalogItemEditFields) => {
    if (!selectedCatalogItem) {
      return
    }

    const updated = updateProviderCatalogItem(selectedCatalogItem.catalogItemId, fields)
    if (updated) {
      setSelectedCatalogItem(updated)
      onCatalogItemsChange?.()
      refreshOrganizations()
    }
  }

  const handleViewModeChange = (nextViewMode: CatalogViewMode) => {
    setViewMode(nextViewMode)
    setCatalogViewMode(nextViewMode)
  }

  const handleFilterToggle = (serviceId: CatalogServiceId, isSelected: boolean) => {
    setSelectedFilters((current) => toggleCatalogServiceFilter(current, serviceId, isSelected))
  }

  const emptyStateTitle = (() => {
    if (selectedFilters.size === 0) {
      return 'Select a service to view catalog items'
    }
    if (searchValue.trim()) {
      return 'No matching catalog items'
    }
    if (selectedFilters.size === 1) {
      const [onlyFilter] = selectedFilters
      return `No ${CATALOG_SERVICE_FILTER_LABELS[onlyFilter!]} items yet`
    }
    return 'No catalog items for the selected services'
  })()

  const drawerCatalog = selectedCatalogItem ?? newestCatalogItem

  return (
    <CatalogItemDetailsDrawer
      isExpanded={isDetailsDrawerOpen}
      onClose={() => setIsDetailsDrawerOpen(false)}
      catalog={drawerCatalog}
      serviceId={drawerCatalog ? getDraftServiceId(drawerCatalog) : 'baremetal'}
      templateDescription={linkedTemplate.description}
      canAssign={
        Boolean(drawerCatalog) &&
        hasUnassignedOrganizations &&
        drawerCatalog!.scope !== 'global-public'
      }
      onAssignToOrganization={() => {
        setIsDetailsDrawerOpen(false)
        setIsAssignModalOpen(true)
      }}
      onPublish={() => {
        if (!drawerCatalog) {
          return
        }
        openTogglePublish(drawerCatalog)
      }}
      onNetworkPolicyChange={(networkPolicy) => {
        if (!drawerCatalog) {
          return
        }
        const updated = updateProviderCatalogNetworkPolicy(
          drawerCatalog.catalogItemId,
          networkPolicy,
        )
        if (updated) {
          setSelectedCatalogItem(updated)
          onCatalogItemsChange?.()
        }
      }}
    >
    <div
      className={`provider-admin-catalog-items${
        isEntering ? ' provider-admin-catalog-items--entering' : ''
      }`}
    >
      <Flex
        className="provider-admin-catalog-items__header"
        alignItems={{ default: 'alignItemsFlexStart' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        gap={{ default: 'gapMd' }}
      >
        <FlexItem>
          <Label color="grey" className="provider-admin-catalog-items__kicker">
            Global marketplace
          </Label>
          <Title headingLevel="h1" size="3xl" className="provider-admin-catalog-items__title">
            Catalog
          </Title>
          <Content component="p" className="provider-admin-catalog-items__lede">
            Publish products from master templates across Bare Metal, Clusters, Models, and
            Virtual machines, then attach catalog items to tenant organizations.
          </Content>
        </FlexItem>
        <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
          <Button
            variant="primary"
            icon={<PlusIcon />}
            className="provider-admin-catalog-items__create"
            isDisabled={isPublishing}
            onClick={() => {
              setPublishResumeScope('global-public')
              setPublishResumeTenantId('')
              setIsPublishWizardOpen(true)
            }}
          >
            Create catalog item
          </Button>
        </FlexItem>
      </Flex>

      <div className="catalog-view-toolbar">
        <div className="catalog-view-toolbar__start">
          <CatalogServiceFilterToggle
            selectedFilters={selectedFilters}
            serviceCounts={serviceCounts}
            onToggle={handleFilterToggle}
          />
          <SearchInput
            className="catalog-search provider-admin-catalog-items__search"
            placeholder="Search catalog items"
            value={searchValue}
            onChange={(_event, value) => setSearchValue(value)}
            onClear={() => setSearchValue('')}
            aria-label="Search catalog items"
          />
        </div>
        <CatalogViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
      </div>

      {filteredCatalogItems.length > 0 &&
      hasRegisteredOrganizations &&
      hasUnassignedOrganizations ? (
        <Alert
          variant="info"
          isInline
          title="Organizations are waiting for catalog access"
          className="provider-admin-catalog-items__assign-alert"
          actionLinks={
            <AlertActionLink
              component="button"
              onClick={() => {
                if (newestCatalogItem) {
                  openAssign(newestCatalogItem)
                }
              }}
            >
              Assign to organization
            </AlertActionLink>
          }
        >
          <Content component="p">
            {unassignedOrganizations.length} registered{' '}
            {unassignedOrganizations.length === 1 ? 'organization does' : 'organizations do'} not
            have a catalog item attached yet.
          </Content>
        </Alert>
      ) : null}

      {filteredCatalogItems.length === 0 ? (
        <EmptyState className="provider-admin-catalog-items__empty">
          <Title headingLevel="h2" size="lg">
            {emptyStateTitle}
          </Title>
          <EmptyStateBody>
            {selectedFilters.size === 0
              ? 'Choose one or more services above to filter the catalog.'
              : searchValue.trim()
                ? 'Try a different search term or clear the search field.'
                : 'Create a catalog item for this service to see it listed here.'}
          </EmptyStateBody>
        </EmptyState>
      ) : viewMode === 'grid' ? (
        <div className="catalog-card-grid provider-admin-catalog-items__card-grid">
          {filteredCatalogItems.map((item) => {
            const serviceId = getDraftServiceId(item)
            const catalogItemActions = getCatalogItemActions(
              item,
              hasUnassignedOrganizations,
              () => openDetails(item),
              () => openAssign(item),
              () => openAsTenantUserForItem(item),
              () => openEdit(item),
              () => handleDuplicate(item),
              () => openTogglePublish(item),
              () => openDelete(item),
              onRegisterOrganization,
            )
            const visibilityDetail =
              item.scope === 'vip-enterprise'
                ? formatVipEnterpriseVisibilityLabel(organizations, item.enterpriseTenantId)
                : 'Global public'
            const hardwareSpecs = resolveHardwareSpecsForCatalogItem(item)

            return (
              <Card
                key={item.catalogItemId}
                isCompact={false}
                className={[
                  'provider-admin-catalog-items__card',
                  getCatalogItemStatus(item) === 'unpublished'
                    ? 'provider-admin-catalog-items__card--unpublished'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <CardBody>
                  <div className="provider-admin-catalog-items__card-header">
                    <span className="provider-admin-catalog-items__card-icon" aria-hidden>
                      {getCatalogServiceIcon(serviceId)}
                    </span>
                    <div className="provider-admin-catalog-items__card-header-actions">
                      <Label color="blue" className="provider-admin-catalog-items__card-label">
                        {CATALOG_SERVICE_LABELS[serviceId]}
                      </Label>
                      <CatalogStatusLabel item={item} />
                      <ActionsColumn items={catalogItemActions} />
                    </div>
                  </div>
                  <Content component="p" className="provider-admin-catalog-items__primary-cell">
                    <Button
                      variant="link"
                      isInline
                      className="provider-admin-catalog-items__name-link catalog-item-name-link"
                      onClick={() => openDetails(item)}
                    >
                      {item.displayName}
                    </Button>
                  </Content>
                  <Content component="p" className="provider-admin-catalog-items__secondary-cell">
                    <code>{item.catalogItemId}</code>
                  </Content>
                  <dl className="provider-admin-catalog-items__specs-list">
                    <div className="provider-admin-catalog-items__spec-row">
                      <dt className="provider-admin-catalog-items__spec-label">CPU</dt>
                      <dd className="provider-admin-catalog-items__spec-value">{hardwareSpecs.cpu}</dd>
                    </div>
                    <div className="provider-admin-catalog-items__spec-row">
                      <dt className="provider-admin-catalog-items__spec-label">RAM</dt>
                      <dd className="provider-admin-catalog-items__spec-value">{hardwareSpecs.ram}</dd>
                    </div>
                    <div className="provider-admin-catalog-items__spec-row">
                      <dt className="provider-admin-catalog-items__spec-label">GPU</dt>
                      <dd className="provider-admin-catalog-items__spec-value">{hardwareSpecs.gpu}</dd>
                    </div>
                    <div className="provider-admin-catalog-items__spec-row">
                      <dt className="provider-admin-catalog-items__spec-label">OS image</dt>
                      <dd className="provider-admin-catalog-items__spec-value">
                        {hardwareSpecs.osImage}
                      </dd>
                    </div>
                  </dl>
                  <dl className="provider-admin-catalog-items__card-specs">
                    <div className="provider-admin-catalog-items__card-spec">
                      <dt>Linked template</dt>
                      <dd>{item.templateName}</dd>
                    </div>
                    <div className="provider-admin-catalog-items__card-spec">
                      <dt>Rate</dt>
                      <dd>{formatRateCardSummary(item.rateCard)}</dd>
                    </div>
                    <NetworkingSummary item={item} onViewDetails={() => openDetails(item)} />
                  </dl>
                  <div
                    className="provider-admin-catalog-items__card-footer"
                    aria-label="Visibility"
                  >
                    <Tooltip
                      content={getVisibilityTooltip(item.scope)}
                      position="top"
                      enableFlip={false}
                    >
                      <span className="provider-admin-catalog-items__scope">
                        <CatalogPublishScopeIcon
                          scope={item.scope}
                          className="provider-admin-catalog__scope-icon"
                        />
                        <span>{visibilityDetail}</span>
                      </span>
                    </Tooltip>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="catalog-table-panel">
          <Content component="p" className="catalog-table-result-count">
            {formatCatalogTableResultCount(filteredCatalogItems.length, 'catalog item')}
          </Content>
          <Table
            aria-label="Catalog items"
            className="catalog-data-table provider-admin-catalog-items__table"
          >
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Linked template</Th>
              <Th>CPU</Th>
              <Th>RAM</Th>
              <Th>GPU</Th>
              <Th>Rate</Th>
              <Th>Networking</Th>
              <Th>Visibility</Th>
              <Th>Created</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {filteredCatalogItems.map((item) => {
              const catalogItemActions = getCatalogItemActions(
                item,
                hasUnassignedOrganizations,
                () => openDetails(item),
                () => openAssign(item),
                () => openAsTenantUserForItem(item),
                () => openEdit(item),
                () => handleDuplicate(item),
                () => openTogglePublish(item),
                () => openDelete(item),
                onRegisterOrganization,
              )
              const hardwareSpecs = resolveHardwareSpecsForCatalogItem(item)

              return (
                <Tr key={item.catalogItemId}>
                  <Td dataLabel="Name">
                    <Content component="p" className="provider-admin-catalog-items__primary-cell">
                      <Button
                        variant="link"
                        isInline
                        className="provider-admin-catalog-items__name-link catalog-item-name-link catalog-table-name-link"
                        onClick={() => openDetails(item)}
                      >
                        {item.displayName}
                      </Button>
                    </Content>
                    <Content component="p" className="provider-admin-catalog-items__secondary-cell">
                      <code>{item.catalogItemId}</code>
                    </Content>
                  </Td>
                  <Td dataLabel="Status">
                    <CatalogStatusLabel item={item} />
                  </Td>
                  <Td dataLabel="Linked template">{item.templateName}</Td>
                  <Td dataLabel="CPU">{hardwareSpecs.cpu}</Td>
                  <Td dataLabel="RAM">{hardwareSpecs.ram}</Td>
                  <Td dataLabel="GPU">{hardwareSpecs.gpu}</Td>
                  <Td dataLabel="Rate">
                    <Content component="p" className="provider-admin-catalog-items__primary-cell">
                      {formatRateCardSummary(item.rateCard)}
                    </Content>
                  </Td>
                  <Td dataLabel="Networking">
                    <NetworkingSummary
                      item={item}
                      compact
                      onViewDetails={() => openDetails(item)}
                    />
                  </Td>
                  <Td dataLabel="Visibility">
                    <ScopeCell scope={item.scope} />
                  </Td>
                  <Td dataLabel="Created">{formatCatalogCreatedAt(item.createdAt)}</Td>
                  <Td isActionCell>
                    <ActionsColumn items={catalogItemActions} />
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        </div>
      )}

      <ProviderSetupPublishCatalogWizard
        isOpen={isPublishWizardOpen}
        templates={availableTemplates}
        organizations={organizations}
        defaultTemplateRefId={newestCatalogItem?.templateRefId}
        defaultDisplayName={
          catalogItems.length > 0 ? SECOND_CATALOG_ITEM_DISPLAY_NAME : undefined
        }
        initialPublishScope={publishResumeScope}
        initialEnterpriseTenantId={publishResumeTenantId}
        onClose={() => {
          setIsPublishWizardOpen(false)
          setPublishResumeScope('global-public')
          setPublishResumeTenantId('')
        }}
        onCreateCatalogItem={(payload) => {
          setIsPublishWizardOpen(false)
          setPublishResumeScope('global-public')
          setPublishResumeTenantId('')
          onCreateCatalogItem(payload)
        }}
        onRegisterOrganization={() => handleRegisterOrganizationFromVip({ kind: 'publish' })}
        isPublishing={isPublishing}
      />

      <AssignCatalogToOrganizationModal
        catalog={isAssignModalOpen ? selectedCatalogItem : null}
        organizations={organizations}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignCatalog}
      />

      <OpenCatalogAsTenantUserModal
        catalog={isOpenAsTenantUserModalOpen ? selectedCatalogItem : null}
        organizations={organizations}
        onClose={() => setIsOpenAsTenantUserModalOpen(false)}
        onConfirm={handleOpenAsTenantUser}
      />

      <EditCatalogItemModal
        catalog={isEditModalOpen ? selectedCatalogItem : null}
        serviceId={
          selectedCatalogItem ? getDraftServiceId(selectedCatalogItem) : 'baremetal'
        }
        organizations={organizations}
        initialEnterpriseTenantId={editResumeTenantId}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditResumeTenantId(undefined)
        }}
        onSave={handleSaveCatalogEdit}
        onRegisterOrganization={
          selectedCatalogItem
            ? () =>
                handleRegisterOrganizationFromVip({
                  kind: 'edit',
                  catalogItemId: selectedCatalogItem.catalogItemId,
                })
            : onRegisterOrganization
        }
      />

      <Modal
        variant={ModalVariant.small}
        isOpen={isUnpublishModalOpen}
        onClose={() => setIsUnpublishModalOpen(false)}
        aria-labelledby="unpublish-catalog-item-title"
      >
        <ModalHeader title="Unpublish catalog item?" labelId="unpublish-catalog-item-title" />
        <ModalBody>
          <Content component="p">
            {selectedCatalogItem ? (
              <>
                <strong>{selectedCatalogItem.displayName}</strong> will leave the tenant storefront.
                You can publish it again later.
              </>
            ) : (
              'This catalog item will leave the tenant storefront. You can publish it again later.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleConfirmUnpublish}>
            Unpublish
          </Button>
          <Button variant="link" onClick={() => setIsUnpublishModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant={ModalVariant.small}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        aria-labelledby="delete-catalog-item-title"
        aria-describedby="delete-catalog-item-description"
      >
        <ModalHeader
          title="Delete catalog item?"
          titleIconVariant="warning"
          labelId="delete-catalog-item-title"
        />
        <ModalBody>
          <Content component="p" id="delete-catalog-item-description">
            {selectedCatalogItem ? (
              <>
                <strong>{selectedCatalogItem.displayName}</strong> will be permanently removed from
                the catalog. This cannot be undone.
              </>
            ) : (
              'This catalog item will be permanently removed from the catalog. This cannot be undone.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
          <Button variant="link" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
    </CatalogItemDetailsDrawer>
  )
}

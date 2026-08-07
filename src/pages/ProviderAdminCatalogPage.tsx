import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Spinner,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { Table, ActionsColumn, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { CatalogServiceFilterToggle, countCatalogServices, toggleCatalogServiceFilter } from '../components/catalog/CatalogServiceFilterToggle'
import { CatalogViewToggle } from '../components/catalog/CatalogViewToggle'
import { AssignCatalogToOrganizationModal } from '../components/provider-admin/AssignCatalogToOrganizationModal'
import { CatalogItemDetailsPage } from '../components/provider-admin/CatalogItemDetailsPage'
import { CatalogPublishScopeIcon } from '../components/provider-admin/CatalogPublishScopeIcon'
import {
  formatVipEnterpriseVisibilityLabel,
  getCatalogEnterpriseTenantIds,
} from '../components/provider-admin/VipEnterpriseOrganizationField'
import {
  EditCatalogItemModal,
  type CatalogItemEditFields,
} from '../components/provider-admin/EditCatalogItemModal'
import { getCatalogServiceIcon } from '../catalog/serviceIcons'
import { formatCatalogTableResultCount } from '../catalog/tableResultCount'
import {
  formatCatalogConfigurationSummary,
  getCatalogProfileFieldLabel,
  resolveCatalogSpecRows,
} from '../catalog/catalogSpecs'
import { CatalogSpecRowsList } from '../components/catalog/CatalogSpecRowsList'
import { findCatalogLinkedTemplate } from '../catalog/hardwareSpecs'
import { getCatalogViewMode, setCatalogViewMode, type CatalogViewMode } from '../catalog/viewMode'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import { getCatalogNetworkLockSummary } from '../providerAdmin/catalogNetworkPolicy'
import { sortByDemoCatalogOrder } from '../providerSetup/prototypeEntry'
import type { CatalogItemStatus, ProviderCatalogDraft } from '../providerSetup/storage'
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
  PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAME,
  formatRateCardSummary,
  parseRateCardFromForm,
  type CatalogServiceId,
  type PublishedTemplatePayload,
} from '../providerSetup/templateDemo'
import { ProviderSetupPublishCatalogWizard } from './provider-setup/ProviderSetupPublishCatalogWizard'
import { TenantUserLaunchInstanceWizard } from '../components/tenant-user/TenantUserLaunchInstanceWizard'
import { getTenantUserCatalogCardFromDraft } from '../tenantUser/catalog'
import type { TenantInstance } from '../tenantUser/instances'
import {
  LAUNCH_INSTANCE_PROVISIONING_DURATION_MS,
  LAUNCH_INSTANCE_WIZARD_DEMO,
} from '../tenantUser/launchInstanceWizard'
import {
  addTenantUserInstance,
  getTenantUserInstances,
  updateTenantUserInstance,
} from '../tenantUser/storage'

type ProviderAdminCatalogPageProps = {
  catalogItems: ProviderCatalogDraft[]
  isEntering?: boolean
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => ProviderCatalogDraft | void
  onCatalogItemsChange?: () => void
  isPublishing?: boolean
  onRegisterOrganization?: () => void
  onNavigateToLinkedTemplate?: (template: {
    templateRefId: string
    templateName: string
  }) => void
  onNavigateToNetworking?: () => void
  onProvisioningStarted?: (instance: TenantInstance) => void
  onDismissDuringProvisioning?: (instanceId: string, serviceId: CatalogServiceId) => void
  onWizardFinished?: (instanceId: string, serviceId: CatalogServiceId) => void
}

/** Intentional create latency before revealing the new catalog card. */
const CATALOG_ITEM_CREATE_REVEAL_MS = 1600
const PROVIDER_LAUNCH_DEMO_TENANT = 'northstar'

function getDraftServiceId(catalogDraft: ProviderCatalogDraft): CatalogServiceId {
  return catalogDraft.serviceId ?? 'baremetal'
}

function catalogItemMatchesOrganization(
  item: ProviderCatalogDraft,
  organization: RegisteredOrganization,
): boolean {
  if (item.scope !== 'vip-enterprise') {
    return false
  }

  return getCatalogEnterpriseTenantIds(item).some(
    (tenantId) => tenantId === organization.tenantId || tenantId === organization.id,
  )
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
  const policy = getCatalogItemNetworkPolicy(item)
  const lockSummary = getCatalogNetworkLockSummary(policy)

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
    templateRefId: 'bm-dell-r750',
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
  onViewDetails: () => void,
  onLaunch: () => void,
  onEdit: () => void,
  onDuplicate: () => void,
  onTogglePublish: () => void,
  onDelete: () => void,
): IAction[] {
  const isUnpublished = getCatalogItemStatus(item) === 'unpublished'
  const actions: IAction[] = [
    {
      title: 'View details',
      onClick: onViewDetails,
    },
  ]

  if (!isUnpublished) {
    actions.push({
      title: LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel,
      onClick: onLaunch,
    })
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
  onNavigateToLinkedTemplate,
  onNavigateToNetworking,
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: ProviderAdminCatalogPageProps) {
  const initialServiceFilters = catalogItems.map(getDraftServiceId)
  const [selectedFilters, setSelectedFilters] = useState<Set<CatalogServiceId>>(
    () => new Set(initialServiceFilters.length > 0 ? initialServiceFilters : ['baremetal']),
  )
  const [selectedStatus, setSelectedStatus] = useState<'all' | CatalogItemStatus>('all')
  const [organizationFilter, setOrganizationFilter] = useState('')
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => getCatalogViewMode('grid'))
  const [searchValue, setSearchValue] = useState('')
  const [organizations, setOrganizations] = useState(() => getProviderRegisteredOrganizations())
  const [isPublishWizardOpen, setIsPublishWizardOpen] = useState(false)
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ProviderCatalogDraft | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewingDetails, setIsViewingDetails] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [existingInstanceNames, setExistingInstanceNames] = useState(() =>
    getTenantUserInstances(PROVIDER_LAUNCH_DEMO_TENANT).map((instance) => instance.name),
  )
  const [publishResumeScope, setPublishResumeScope] = useState<'global-public' | 'vip-enterprise'>(
    'global-public',
  )
  const [publishResumeTenantId, setPublishResumeTenantId] = useState('')
  const [editResumeTenantId, setEditResumeTenantId] = useState<string | undefined>(undefined)
  const [creatingCatalogItemId, setCreatingCatalogItemId] = useState<string | null>(null)
  const [creatingCardHeightPx, setCreatingCardHeightPx] = useState<number | null>(null)
  const createRevealTimeoutRef = useRef<number | null>(null)
  const catalogCardGridRef = useRef<HTMLDivElement | null>(null)

  const newestCatalogItem = catalogItems[0] ?? null
  const knownServiceFiltersRef = useRef(new Set(initialServiceFilters))

  useEffect(() => {
    return () => {
      if (createRevealTimeoutRef.current !== null) {
        window.clearTimeout(createRevealTimeoutRef.current)
      }
    }
  }, [])

  const beginCatalogItemCreateReveal = (catalogItemId: string) => {
    if (createRevealTimeoutRef.current !== null) {
      window.clearTimeout(createRevealTimeoutRef.current)
    }
    setCreatingCardHeightPx(null)
    setCreatingCatalogItemId(catalogItemId)
    createRevealTimeoutRef.current = window.setTimeout(() => {
      setCreatingCatalogItemId((current) => (current === catalogItemId ? null : current))
      setCreatingCardHeightPx(null)
      createRevealTimeoutRef.current = null
    }, CATALOG_ITEM_CREATE_REVEAL_MS)
  }

  useEffect(() => {
    setSelectedFilters((current) => {
      const next = new Set(current)
      let changed = false

      for (const item of catalogItems) {
        const serviceId = getDraftServiceId(item)
        if (!knownServiceFiltersRef.current.has(serviceId)) {
          knownServiceFiltersRef.current.add(serviceId)
          next.add(serviceId)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [catalogItems])

  const serviceCounts = useMemo(
    () => countCatalogServices(catalogItems.map(getDraftServiceId)),
    [catalogItems],
  )
  const organizationOptions = useMemo(
    () =>
      [...organizations].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      ),
    [organizations],
  )
  const filteredCatalogItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    const selectedOrganization = organizationFilter
      ? organizations.find(
          (organization) =>
            organization.tenantId === organizationFilter || organization.id === organizationFilter,
        )
      : null

    return sortByDemoCatalogOrder(
      catalogItems.filter((item) => {
        if (!selectedFilters.has(getDraftServiceId(item))) {
          return false
        }

        if (selectedStatus !== 'all' && getCatalogItemStatus(item) !== selectedStatus) {
          return false
        }

        if (selectedOrganization && !catalogItemMatchesOrganization(item, selectedOrganization)) {
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
      }),
    )
  }, [
    catalogItems,
    selectedFilters,
    selectedStatus,
    organizationFilter,
    organizations,
    searchValue,
  ])

  useLayoutEffect(() => {
    if (!creatingCatalogItemId || viewMode !== 'grid') {
      setCreatingCardHeightPx(null)
      return
    }

    const grid = catalogCardGridRef.current
    if (!grid) {
      return
    }

    const referenceCard = Array.from(
      grid.querySelectorAll<HTMLElement>('.provider-admin-catalog-items__card'),
    ).find((card) => !card.classList.contains('provider-admin-catalog-items__card--creating'))

    if (!referenceCard) {
      setCreatingCardHeightPx(null)
      return
    }

    setCreatingCardHeightPx(Math.round(referenceCard.getBoundingClientRect().height))
  }, [creatingCatalogItemId, filteredCatalogItems, viewMode])

  const unassignedOrganizations = useMemo(
    () => organizations.filter((organization) => !organization.catalogItemId),
    [organizations],
  )
  const hasRegisteredOrganizations = organizations.length > 0
  const hasUnassignedOrganizations = unassignedOrganizations.length > 0

  const linkedTemplate = useMemo(() => getTemplateRowData(), [])
  const availableTemplates = useMemo(() => {
    // Demo currently has one real template; don't invent a second picker option.
    return [getTemplateRowData()]
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
    setIsViewingDetails(true)
  }

  const closeDetails = () => {
    setIsViewingDetails(false)
  }

  const openAssign = (item: ProviderCatalogDraft) => {
    setSelectedCatalogItem(item)
    setIsAssignModalOpen(true)
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
      setIsViewingDetails(false)
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
    if (searchValue.trim() || organizationFilter) {
      return 'No matching catalog items'
    }
    if (selectedStatus !== 'all') {
      return `No ${selectedStatus === 'live' ? 'published' : 'unpublished'} catalog items`
    }
    if (selectedFilters.size === 1) {
      const [onlyFilter] = selectedFilters
      return `No ${CATALOG_SERVICE_FILTER_LABELS[onlyFilter!]} items yet`
    }
    return 'No catalog items for the selected services'
  })()

  const emptyStateBody = (() => {
    if (selectedFilters.size === 0) {
      return 'Choose one or more services above to filter the catalog.'
    }
    if (searchValue.trim() || organizationFilter) {
      return 'Try a different search, organization, or clear filters.'
    }
    if (selectedStatus !== 'all') {
      return 'Try a different publish status or clear filters.'
    }
    return 'Create a catalog item for this service to see it listed here.'
  })()

  const drawerCatalog = selectedCatalogItem
    ? (catalogItems.find((item) => item.catalogItemId === selectedCatalogItem.catalogItemId) ??
      selectedCatalogItem)
    : null
  const launchOrganization =
    organizations.find((organization) => organization.slug === PROVIDER_LAUNCH_DEMO_TENANT) ??
    organizations[0] ??
    null
  const launchCatalogCard = drawerCatalog
    ? getTenantUserCatalogCardFromDraft(drawerCatalog)
    : null

  const openLaunchWizard = (catalog: ProviderCatalogDraft) => {
    if (getCatalogItemStatus(catalog) === 'unpublished') {
      return
    }
    setSelectedCatalogItem(catalog)
    setIsWizardOpen(true)
  }

  const linkedTemplateForDetails = drawerCatalog
    ? findCatalogLinkedTemplate(drawerCatalog.templateRefId, drawerCatalog.templateName)
    : null

  return (
    <>
      {isViewingDetails && drawerCatalog ? (
        <CatalogItemDetailsPage
          catalog={drawerCatalog}
          templateDescription={
            linkedTemplateForDetails?.description ?? linkedTemplate.description
          }
          onBackToCatalog={closeDetails}
          onPublish={() => openTogglePublish(drawerCatalog)}
          onUnpublish={() => openTogglePublish(drawerCatalog)}
          onLaunch={() => openLaunchWizard(drawerCatalog)}
          onEdit={() => openEdit(drawerCatalog)}
          onDuplicate={() => handleDuplicate(drawerCatalog)}
          onDelete={() => openDelete(drawerCatalog)}
          onNavigateToLinkedTemplate={onNavigateToLinkedTemplate}
          onNavigateToNetworking={onNavigateToNetworking}
          onNetworkPolicyChange={(networkPolicy) => {
            const updated = updateProviderCatalogNetworkPolicy(
              drawerCatalog.catalogItemId,
              networkPolicy,
            )
            if (updated) {
              setSelectedCatalogItem(updated)
              onCatalogItemsChange?.()
            }
          }}
        />
      ) : (
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
            Create catalog items from master templates across Bare Metal, Clusters, Models, and
            Virtual machines, then attach them to tenant organizations.
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
          <FormSelect
            className="catalog-status-filter"
            id="catalog-status-filter"
            value={selectedStatus}
            onChange={(_event, value) =>
              setSelectedStatus(value as 'all' | CatalogItemStatus)
            }
            aria-label="Filter catalog items by publish status"
          >
            <FormSelectOption value="all" label="All publish states" />
            <FormSelectOption value="live" label="Published" />
            <FormSelectOption value="unpublished" label="Unpublished" />
          </FormSelect>
          <FormSelect
            className="catalog-organization-filter"
            id="catalog-organization-filter"
            value={organizationFilter}
            onChange={(_event, value) => setOrganizationFilter(value)}
            aria-label="Filter catalog items by organization"
          >
            <FormSelectOption value="" label="All organizations" />
            {organizationOptions.map((organization) => (
              <FormSelectOption
                key={organization.id}
                value={organization.tenantId}
                label={organization.name}
              />
            ))}
          </FormSelect>
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
          <EmptyStateBody>{emptyStateBody}</EmptyStateBody>
        </EmptyState>
      ) : viewMode === 'grid' ? (
        <div
          ref={catalogCardGridRef}
          className="catalog-card-grid provider-admin-catalog-items__card-grid"
        >
          {filteredCatalogItems.map((item) => {
            const serviceId = getDraftServiceId(item)
            const isCreating = creatingCatalogItemId === item.catalogItemId
            const catalogItemActions = getCatalogItemActions(
              item,
              () => openDetails(item),
              () => openLaunchWizard(item),
              () => openEdit(item),
              () => handleDuplicate(item),
              () => openTogglePublish(item),
              () => openDelete(item),
            )
            const visibilityDetail =
              item.scope === 'vip-enterprise'
                ? formatVipEnterpriseVisibilityLabel(
                    organizations,
                    getCatalogEnterpriseTenantIds(item),
                  )
                : 'Global public'
            const specRows = resolveCatalogSpecRows(item)

            return (
              <Card
                key={item.catalogItemId}
                isCompact={false}
                className={[
                  'provider-admin-catalog-items__card',
                  getCatalogItemStatus(item) === 'unpublished'
                    ? 'provider-admin-catalog-items__card--unpublished'
                    : '',
                  isCreating ? 'provider-admin-catalog-items__card--creating' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  isCreating && creatingCardHeightPx
                    ? { height: creatingCardHeightPx, minBlockSize: creatingCardHeightPx }
                    : undefined
                }
              >
                {isCreating ? (
                  <CardBody className="provider-admin-catalog-items__card-body--creating">
                    <Spinner
                      size="lg"
                      aria-label={`Creating ${item.displayName}`}
                    />
                    <Content
                      component="p"
                      className="provider-admin-catalog-items__creating-kicker"
                    >
                      Creating catalog item…
                    </Content>
                  </CardBody>
                ) : (
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
                  <CatalogSpecRowsList
                    rows={specRows}
                    className="provider-admin-catalog-items__specs-list"
                  />
                  <dl className="provider-admin-catalog-items__card-specs">
                    <div className="provider-admin-catalog-items__card-spec">
                      <dt>{getCatalogProfileFieldLabel(serviceId)}</dt>
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
                )}
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
              <Th>Profile / template</Th>
              <Th>Configuration</Th>
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
                () => openDetails(item),
                () => openLaunchWizard(item),
                () => openEdit(item),
                () => handleDuplicate(item),
                () => openTogglePublish(item),
                () => openDelete(item),
              )

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
                  <Td dataLabel="Profile / template">{item.templateName}</Td>
                  <Td dataLabel="Configuration">
                    <Content component="p" className="provider-admin-catalog-items__primary-cell">
                      {formatCatalogConfigurationSummary(item)}
                    </Content>
                  </Td>
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
    </div>
      )}

      <ProviderSetupPublishCatalogWizard
        isOpen={isPublishWizardOpen}
        templates={availableTemplates}
        organizations={organizations}
        defaultTemplateRefId={newestCatalogItem?.templateRefId}
        defaultDisplayName={
          catalogItems.length > 0 ? PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAME : undefined
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
          const created = onCreateCatalogItem(payload)
          if (created?.catalogItemId) {
            setViewMode('grid')
            setCatalogViewMode('grid')
            setSelectedStatus('all')
            setSearchValue('')
            beginCatalogItemCreateReveal(created.catalogItemId)
            setIsViewingDetails(false)
          }
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
      {launchCatalogCard ? (
        <TenantUserLaunchInstanceWizard
          isOpen={isWizardOpen}
          catalogItem={launchCatalogCard}
          organization={launchOrganization}
          catalogDraft={drawerCatalog}
          preferCatalogDraft
          scopeKind="organization"
          scopeLabel={launchOrganization?.name ?? 'Organization'}
          scopeFieldLabel="Organization"
          existingInstanceNames={existingInstanceNames}
          onClose={() => setIsWizardOpen(false)}
          onProvisioningStarted={(instance) => {
            onProvisioningStarted?.(instance)
            if (!onProvisioningStarted) {
              addTenantUserInstance(PROVIDER_LAUNCH_DEMO_TENANT, instance)
              window.setTimeout(() => {
                updateTenantUserInstance(PROVIDER_LAUNCH_DEMO_TENANT, instance.id, {
                  status: 'running',
                  provisionedAt: new Date().toISOString(),
                })
              }, LAUNCH_INSTANCE_PROVISIONING_DURATION_MS)
            }
            setExistingInstanceNames(
              getTenantUserInstances(PROVIDER_LAUNCH_DEMO_TENANT).map((item) => item.name),
            )
          }}
          onDismissDuringProvisioning={(instanceId, serviceId) => {
            onDismissDuringProvisioning?.(instanceId, serviceId)
            setIsWizardOpen(false)
          }}
          onWizardFinished={(instanceId, serviceId) => {
            onWizardFinished?.(instanceId, serviceId)
            setIsWizardOpen(false)
            setExistingInstanceNames(
              getTenantUserInstances(PROVIDER_LAUNCH_DEMO_TENANT).map((item) => item.name),
            )
          }}
        />
      ) : null}
    </>
  )
}

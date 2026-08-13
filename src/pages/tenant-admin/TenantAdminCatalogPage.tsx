import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
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
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import {
  CatalogServiceFilterToggle,
  countCatalogServices,
  toggleCatalogServiceFilter,
} from '../../components/catalog/CatalogServiceFilterToggle'
import { CatalogViewToggle } from '../../components/catalog/CatalogViewToggle'
import { CatalogPublishScopeIcon } from '../../components/provider-admin/CatalogPublishScopeIcon'
import { TenantCatalogItemDetailsPage } from '../../components/tenant-admin/TenantCatalogItemDetailsPage'
import { TenantUserLaunchInstanceWizard } from '../../components/tenant-user/TenantUserLaunchInstanceWizard'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { KubernetesResourceNameField } from '../../components/shared/KubernetesResourceNameHelper'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { formatCatalogConfigurationSummary } from '../../catalog/catalogSpecs'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import { getCatalogViewMode, setCatalogViewMode, type CatalogViewMode } from '../../catalog/viewMode'
import {
  findCatalogItemByWorkspaceParam,
  getWorkspaceCatalogItemParam,
  syncWorkspaceCatalogItemParam,
} from '../../shared/workspaceNavUrl'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { getProviderCatalogItems } from '../../providerSetup/storage'
import { CATALOG_SERVICE_FILTER_LABELS, type CatalogServiceId } from '../../providerSetup/templateDemo'
import {
  getTenantCatalogGovernanceItems,
  TENANT_CATALOG_MANAGER_DEMO,
  type TenantCatalogGovernanceItemWithNetworking,
} from '../../tenantAdmin/catalogManager'
import {
  applyTenantLocksForUsers,
  getTenantNetworkLockSummary,
  getTenantNetworkOverrides,
  setTenantNetworkOverrides,
  type TenantNetworkResourceKind,
} from '../../tenantAdmin/networking'
import { ensureTenantDemoProjects } from '../../tenantAdmin/storage'
import type { TenantProject } from '../../tenantAdmin/projects'
import { getTenantUserCatalogCardFromDraft, TENANT_USER_CATALOG_FALLBACK } from '../../tenantUser/catalog'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import type { TenantInstance } from '../../tenantUser/instances'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'

type TenantAdminCatalogPageProps = {
  organization: RegisteredOrganization
  catalogDraft: ProviderCatalogDraft | null
  projects: readonly TenantProject[]
  initialProjectId?: string | null
  onProjectScopeChange?: (projectId: string) => void
  onProjectsChange: (projects: TenantProject[]) => void
  onNavigateToProjectsTeams: () => void
  existingInstanceNames?: readonly string[]
  /** When set, open this catalog item's detail page (id or display name). */
  openCatalogItemKey?: string | null
  onOpenCatalogItemConsumed?: () => void
  onProvisioningStarted?: (instance: TenantInstance) => void
  onDismissDuringProvisioning?: (instanceId: string, serviceId: CatalogServiceId) => void
  onWizardFinished?: (instanceId: string, serviceId: CatalogServiceId) => void
}

function getVisibilityTooltip(scope: TenantCatalogGovernanceItemWithNetworking['scope']): string {
  return scope === 'vip-enterprise'
    ? 'Only visible to your organization'
    : 'Visible to all tenants'
}

function getVisibilityLabel(scope: TenantCatalogGovernanceItemWithNetworking['scope']): string {
  return scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global public'
}

function toLaunchCatalogCard(
  item: TenantCatalogGovernanceItemWithNetworking,
): ReturnType<typeof getTenantUserCatalogCardFromDraft> {
  const draft = getProviderCatalogItems().find(
    (catalogItem) => catalogItem.catalogItemId === item.catalogItemId,
  )
  if (draft) {
    return getTenantUserCatalogCardFromDraft(draft)
  }

  return {
    ...TENANT_USER_CATALOG_FALLBACK,
    serviceId: item.serviceId,
    service: item.service,
    status: item.status,
    displayName: item.displayName,
    description: item.description,
    categoryLabel: item.categoryLabel,
    specRows: item.specRows,
    cpu: item.cpu,
    ram: item.ram,
    gpu: item.gpu,
    osImage: item.osImage,
    catalogItemId: item.catalogItemId ?? item.id,
    templateRefId: item.templateRefId,
    templateName: item.templateName,
  }
}

function NetworkingSummary({
  item,
  organizationSlug,
  compact = false,
  onViewDetails,
}: {
  item: TenantCatalogGovernanceItemWithNetworking
  organizationSlug: string
  compact?: boolean
  onViewDetails?: () => void
}) {
  const overrides = getTenantNetworkOverrides(organizationSlug, item.catalogItemId)
  const lockSummary = getTenantNetworkLockSummary(
    applyTenantLocksForUsers(item.networkPolicy, overrides),
  )

  const statusContent = lockSummary ? (
    <span className="tenant-admin-catalog-manager__networking-status">
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
        className="tenant-admin-catalog-manager__networking-status-label"
      >
        {lockSummary.label}
      </Label>
      {onViewDetails ? (
        <Button
          variant="link"
          isInline
          className="tenant-admin-catalog-manager__inline-link"
          onClick={onViewDetails}
        >
          {TENANT_CATALOG_MANAGER_DEMO.networkingViewDetailsLabel}
        </Button>
      ) : null}
    </span>
  ) : (
    <Content
      component="p"
      className={
        compact ? 'tenant-admin-catalog-manager__networking-table-summary' : undefined
      }
    >
      {compact
        ? TENANT_CATALOG_MANAGER_DEMO.networkingNotConfiguredTableLabel
        : TENANT_CATALOG_MANAGER_DEMO.networkingNotConfiguredSummary}
    </Content>
  )

  if (compact) {
    return statusContent
  }

  return (
    <div className="tenant-admin-catalog-manager__spec-row">
      <dt className="tenant-admin-catalog-manager__spec-label">
        {TENANT_CATALOG_MANAGER_DEMO.networkingLabel}
      </dt>
      <dd className="tenant-admin-catalog-manager__spec-value">{statusContent}</dd>
    </div>
  )
}

function AccessSummary({
  compact = false,
  onViewDetails,
}: {
  compact?: boolean
  onViewDetails?: () => void
}) {
  const statusContent = (
    <span className="tenant-admin-catalog-manager__access-status">
      <Label
        color="grey"
        isCompact
        className="tenant-admin-catalog-manager__access-status-label"
      >
        {TENANT_CATALOG_MANAGER_DEMO.accessDefaultLabel}
      </Label>
      {onViewDetails ? (
        <Button
          variant="link"
          isInline
          className="tenant-admin-catalog-manager__inline-link"
          onClick={onViewDetails}
        >
          {TENANT_CATALOG_MANAGER_DEMO.accessViewDetailsLabel}
        </Button>
      ) : null}
    </span>
  )

  if (compact) {
    return statusContent
  }

  return (
    <div className="tenant-admin-catalog-manager__spec-row">
      <dt className="tenant-admin-catalog-manager__spec-label">
        {TENANT_CATALOG_MANAGER_DEMO.accessLabel}
      </dt>
      <dd className="tenant-admin-catalog-manager__spec-value">{statusContent}</dd>
    </div>
  )
}

function getCatalogItemActions(
  item: TenantCatalogGovernanceItemWithNetworking,
  onViewDetails: () => void,
  onLaunch: () => void,
  onEdit: () => void,
  onDuplicate: () => void,
  onTogglePublish: () => void,
  onDelete: () => void,
): IAction[] {
  const isUnpublished = item.status === 'Unpublished'

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

export function TenantAdminCatalogPage({
  organization,
  catalogDraft,
  projects,
  initialProjectId = null,
  onProjectScopeChange,
  onProjectsChange,
  onNavigateToProjectsTeams,
  existingInstanceNames = [],
  openCatalogItemKey = null,
  onOpenCatalogItemConsumed,
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: TenantAdminCatalogPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [catalogItems, setCatalogItems] = useState(() =>
    getTenantCatalogGovernanceItems(organization, catalogDraft),
  )
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => getCatalogViewMode('grid'))
  const initialServiceFilters = catalogItems.map((item) => item.serviceId)
  const [selectedFilters, setSelectedFilters] = useState<Set<CatalogServiceId>>(
    () => new Set(initialServiceFilters.length > 0 ? initialServiceFilters : ['baremetal']),
  )
  const knownServiceFiltersRef = useRef(new Set(initialServiceFilters))
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'Live' | 'Unpublished'>('all')
  const [searchValue, setSearchValue] = useState('')
  const [selectedCatalogItem, setSelectedCatalogItem] =
    useState<TenantCatalogGovernanceItemWithNetworking | null>(null)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const itemParam = getWorkspaceCatalogItemParam(searchParams)

  useEffect(() => {
    setCatalogItems(getTenantCatalogGovernanceItems(organization, catalogDraft))
  }, [organization, catalogDraft])

  useEffect(() => {
    setSelectedFilters((current) => {
      const next = new Set(current)
      let changed = false

      for (const item of catalogItems) {
        if (!knownServiceFiltersRef.current.has(item.serviceId)) {
          knownServiceFiltersRef.current.add(item.serviceId)
          next.add(item.serviceId)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [catalogItems])

  const serviceCounts = useMemo(
    () => countCatalogServices(catalogItems.map((item) => item.serviceId)),
    [catalogItems],
  )
  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return catalogItems.filter((item) => {
      if (!selectedFilters.has(item.serviceId)) {
        return false
      }

      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        item.displayName.toLowerCase().includes(query) ||
        item.service.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.templateName.toLowerCase().includes(query) ||
        item.specRows.some(
          (row) =>
            row.label.toLowerCase().includes(query) || row.value.toLowerCase().includes(query),
        )
      )
    })
  }, [catalogItems, selectedFilters, selectedStatus, searchValue])

  const emptyStateTitle = (() => {
    if (selectedFilters.size === 0) {
      return 'Select a service to view catalog items'
    }
    if (searchValue.trim()) {
      return 'No catalog items match your search'
    }
    if (selectedStatus !== 'all') {
      return `No ${selectedStatus === 'Live' ? 'published' : 'unpublished'} catalog items`
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
    if (searchValue.trim()) {
      return 'Try a different search term or clear the search field.'
    }
    if (selectedStatus !== 'all') {
      return 'Try a different publish status or clear filters.'
    }
    return 'No approved catalog items match the selected services.'
  })()

  const handleViewModeChange = (nextViewMode: CatalogViewMode) => {
    setViewMode(nextViewMode)
    setCatalogViewMode(nextViewMode)
  }

  const handleFilterToggle = (serviceId: CatalogServiceId, isSelected: boolean) => {
    setSelectedFilters((current) => toggleCatalogServiceFilter(current, serviceId, isSelected))
  }

  const openDetails = (item: TenantCatalogGovernanceItemWithNetworking) => {
    setSelectedCatalogItem(item)
    setIsDetailsDrawerOpen(true)
    syncWorkspaceCatalogItemParam(setSearchParams, item.displayName)
  }

  useEffect(() => {
    if (!openCatalogItemKey) {
      return
    }

    const match = findCatalogItemByWorkspaceParam(catalogItems, openCatalogItemKey)
    if (match) {
      openDetails(match)
      setIsWizardOpen(false)
    }

    onOpenCatalogItemConsumed?.()
  }, [openCatalogItemKey, catalogItems, onOpenCatalogItemConsumed])

  useEffect(() => {
    const match = findCatalogItemByWorkspaceParam(catalogItems, itemParam)
    if (match) {
      setSelectedCatalogItem(match)
      if (!isWizardOpen) {
        setIsDetailsDrawerOpen(true)
      }
      return
    }

    if (!itemParam) {
      setIsDetailsDrawerOpen(false)
    }
  }, [itemParam, catalogItems, isWizardOpen])

  const openLaunchWizard = (item: TenantCatalogGovernanceItemWithNetworking) => {
    if (item.status === 'Unpublished') {
      return
    }
    setSelectedCatalogItem(item)
    setIsDetailsDrawerOpen(false)
    setIsWizardOpen(true)
    syncWorkspaceCatalogItemParam(setSearchParams, null, { replace: true })
  }

  const launchCatalogCard = selectedCatalogItem ? toLaunchCatalogCard(selectedCatalogItem) : null
  const launchCatalogDraft =
    selectedCatalogItem
      ? (getProviderCatalogItems().find(
          (item) => item.catalogItemId === selectedCatalogItem.catalogItemId,
        ) ??
        catalogDraft)
      : catalogDraft

  const closeDetails = () => {
    setIsDetailsDrawerOpen(false)
    syncWorkspaceCatalogItemParam(setSearchParams, null)
  }

  const handleChangeLockForUsers = (kind: TenantNetworkResourceKind, locked: boolean) => {
    if (!selectedCatalogItem) {
      return
    }

    const catalogItemId = selectedCatalogItem.catalogItemId
    if (!catalogItemId) {
      return
    }
  const lockKey =
      kind === 'virtual-network'
        ? 'virtualNetwork'
        : kind === 'subnet'
          ? 'subnet'
          : kind === 'security-group'
            ? 'securityGroup'
            : 'externalIpPool'
    const currentOverrides = getTenantNetworkOverrides(organization.slug, catalogItemId)
    setTenantNetworkOverrides(organization.slug, catalogItemId, {
      ...currentOverrides,
      lockForUsers: {
        ...currentOverrides.lockForUsers,
        [lockKey]: locked,
      },
    })

    const refreshed = getTenantCatalogGovernanceItems(organization, catalogDraft)
    setCatalogItems(refreshed)
    setSelectedCatalogItem((selected) => {
      if (!selected) {
        return selected
      }
      return refreshed.find((item) => item.id === selected.id) ?? selected
    })
  }

  const updateCatalogItem = (
    itemId: string,
    updater: (
      item: TenantCatalogGovernanceItemWithNetworking,
    ) => TenantCatalogGovernanceItemWithNetworking,
  ) => {
    setCatalogItems((current) => {
      const next = current.map((item) => (item.id === itemId ? updater(item) : item))
      const updated = next.find((item) => item.id === itemId)
      if (updated) {
        setSelectedCatalogItem((selected) => (selected?.id === itemId ? updated : selected))
      }
      return next
    })
  }

  const openEdit = (item: TenantCatalogGovernanceItemWithNetworking) => {
    setSelectedCatalogItem(item)
    setEditDisplayName(item.displayName)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = () => {
    if (!selectedCatalogItem || !editDisplayName.trim()) {
      return
    }

    updateCatalogItem(selectedCatalogItem.id, (item) => ({
      ...item,
      displayName: editDisplayName.trim(),
    }))
    setIsEditModalOpen(false)
  }

  const handleDuplicate = (item: TenantCatalogGovernanceItemWithNetworking) => {
    const suffix = Math.random().toString(36).slice(2, 6)
    const duplicate: TenantCatalogGovernanceItemWithNetworking = {
      ...item,
      id: `${item.id}-copy-${suffix}`,
      displayName: `${item.displayName}-copy`,
      status: 'Unpublished',
      approved: false,
    }

    setCatalogItems((current) => [...current, duplicate])
    setSelectedCatalogItem(duplicate)
  }

  const openTogglePublish = (item: TenantCatalogGovernanceItemWithNetworking) => {
    setSelectedCatalogItem(item)
    if (item.status === 'Unpublished') {
      updateCatalogItem(item.id, (current) => ({
        ...current,
        status: 'Live',
      }))
      return
    }

    setIsUnpublishModalOpen(true)
  }

  const handleConfirmUnpublish = () => {
    if (!selectedCatalogItem) {
      return
    }

    updateCatalogItem(selectedCatalogItem.id, (item) => ({
      ...item,
      status: 'Unpublished',
    }))
    setIsUnpublishModalOpen(false)
  }

  const openDelete = (item: TenantCatalogGovernanceItemWithNetworking) => {
    setSelectedCatalogItem(item)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!selectedCatalogItem) {
      return
    }

    const deletedId = selectedCatalogItem.id
    setCatalogItems((current) => current.filter((item) => item.id !== deletedId))
    setIsDetailsDrawerOpen(false)
    syncWorkspaceCatalogItemParam(setSearchParams, null, { replace: true })
    setIsEditModalOpen(false)
    setSelectedCatalogItem(null)
    setIsDeleteModalOpen(false)
  }

  const buildCatalogItemActions = (item: TenantCatalogGovernanceItemWithNetworking) =>
    getCatalogItemActions(
      item,
      () => openDetails(item),
      () => openLaunchWizard(item),
      () => openEdit(item),
      () => handleDuplicate(item),
      () => openTogglePublish(item),
      () => openDelete(item),
    )

  const detailsItem = selectedCatalogItem
    ? (catalogItems.find((entry) => entry.id === selectedCatalogItem.id) ?? selectedCatalogItem)
    : null
  const projectCount = ensureTenantDemoProjects(organization.slug).length

  return (
    <>
      {isDetailsDrawerOpen && detailsItem ? (
        <TenantCatalogItemDetailsPage
          item={detailsItem}
          organizationSlug={organization.slug}
          projectCount={projectCount}
          onBack={closeDetails}
          onNavigateToProjectsTeams={onNavigateToProjectsTeams}
          onChangeLockForUsers={handleChangeLockForUsers}
          onLaunch={() => openLaunchWizard(detailsItem)}
        />
      ) : (
      <div className="tenant-admin-workspace-page tenant-admin-catalog-manager">
        <Flex
          className="tenant-admin-catalog-manager__page-header"
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsFlexStart' }}
          gap={{ default: 'gapMd' }}
        >
          <FlexItem>
            <Title headingLevel="h1" size="3xl" className="tenant-admin-catalog-manager__title">
              {TENANT_CATALOG_MANAGER_DEMO.title}
            </Title>
            <Content component="p" className="tenant-admin-catalog-manager__lede">
              {TENANT_CATALOG_MANAGER_DEMO.lede}
            </Content>
          </FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
            <Tooltip content="Catalog items are created by the provider. Tenant admins govern inherited offerings.">
              <Button
                variant="primary"
                icon={<PlusIcon />}
                className="tenant-admin-catalog-manager__create"
                isAriaDisabled
              >
                Create catalog item
              </Button>
            </Tooltip>
          </FlexItem>
        </Flex>

        <div className="catalog-view-toolbar tenant-admin-catalog-manager__toolbar">
          <div className="catalog-view-toolbar__start">
            <CatalogServiceFilterToggle
              selectedFilters={selectedFilters}
              serviceCounts={serviceCounts}
              onToggle={handleFilterToggle}
            />
            <FormSelect
              className="catalog-status-filter"
              id="tenant-admin-catalog-status-filter"
              value={selectedStatus}
              onChange={(_event, value) =>
                setSelectedStatus(value as 'all' | 'Live' | 'Unpublished')
              }
              aria-label="Filter catalog items by publish status"
            >
              <FormSelectOption value="all" label="All publish states" />
              <FormSelectOption value="Live" label="Published" />
              <FormSelectOption value="Unpublished" label="Unpublished" />
            </FormSelect>
            <SearchInput
              className="catalog-search"
              placeholder="Search catalog items"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search catalog items"
            />
          </div>
          <CatalogViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState className="tenant-admin-catalog-manager__empty">
            <Title headingLevel="h2" size="lg">
              {emptyStateTitle}
            </Title>
            <EmptyStateBody>{emptyStateBody}</EmptyStateBody>
          </EmptyState>
        ) : viewMode === 'grid' ? (
          <div className="catalog-card-grid tenant-admin-catalog-manager__catalog-list">
            {filteredItems.map((item) => {
              const catalogItemActions = buildCatalogItemActions(item)

              return (
                <Card
                  key={item.id}
                  isCompact={false}
                  className={[
                    'tenant-admin-catalog-manager__card',
                    item.status === 'Unpublished'
                      ? 'tenant-admin-catalog-manager__card--unpublished'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <CardBody>
                    <div className="tenant-admin-catalog-manager__card-header">
                      <span className="tenant-admin-catalog-manager__icon" aria-hidden>
                        {getCatalogServiceIcon(item.serviceId)}
                      </span>
                      <div className="tenant-admin-catalog-manager__card-header-actions">
                        <Label color="blue" className="tenant-admin-catalog-manager__card-label">
                          {item.service}
                        </Label>
                        <Label
                          color={item.status === 'Unpublished' ? 'grey' : 'green'}
                          className="tenant-admin-catalog-manager__card-label"
                        >
                          {item.status}
                        </Label>
                        <ActionsColumn items={catalogItemActions} />
                      </div>
                    </div>

                    <Content component="p" className="tenant-admin-catalog-manager__primary-cell">
                      <Button
                        variant="link"
                        isInline
                        className="tenant-admin-catalog-manager__name-link catalog-item-name-link"
                        onClick={() => openDetails(item)}
                      >
                        {item.displayName}
                      </Button>
                    </Content>

                    <CatalogSpecRowsList
                      rows={item.specRows}
                      className="tenant-admin-catalog-manager__specs-list"
                      rowClassName="tenant-admin-catalog-manager__spec-row"
                      labelClassName="tenant-admin-catalog-manager__spec-label"
                      valueClassName="tenant-admin-catalog-manager__spec-value"
                    />

                    <dl className="tenant-admin-catalog-manager__networking-list">
                      <NetworkingSummary
                        item={item}
                        organizationSlug={organization.slug}
                        onViewDetails={() => openDetails(item)}
                      />
                    </dl>

                    <div className="tenant-admin-catalog-manager__card-footer">
                      <div
                        className="tenant-admin-catalog-manager__card-footer-visibility"
                        aria-label="Visibility"
                      >
                        <Tooltip
                          content={getVisibilityTooltip(item.scope)}
                          position="top"
                          enableFlip={false}
                        >
                          <span className="tenant-admin-catalog-manager__scope">
                            <CatalogPublishScopeIcon
                              scope={item.scope}
                              className="tenant-admin-catalog-manager__scope-icon"
                            />
                            <span>{getVisibilityLabel(item.scope)}</span>
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="catalog-table-panel">
            <Content component="p" className="catalog-table-result-count">
              {formatCatalogTableResultCount(filteredItems.length, 'catalog item')}
            </Content>
            <Table
              aria-label="Catalog items"
              className="catalog-data-table tenant-admin-catalog-manager__table"
            >
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>Configuration</Th>
                  <Th>Networking</Th>
                  <Th>Access</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {filteredItems.map((item) => {
                  const catalogItemActions = buildCatalogItemActions(item)

                  return (
                    <Tr key={item.id}>
                      <Td dataLabel="Name">
                        <Content component="p" className="tenant-admin-catalog-manager__primary-cell">
                          <Button
                            variant="link"
                            isInline
                            className="tenant-admin-catalog-manager__name-link catalog-item-name-link"
                            onClick={() => openDetails(item)}
                          >
                            {item.displayName}
                          </Button>
                        </Content>
                      </Td>
                      <Td dataLabel="Status">
                        <Label color={item.status === 'Unpublished' ? 'grey' : 'green'} isCompact>
                          {item.status}
                        </Label>
                      </Td>
                      <Td dataLabel="Configuration">
                        <Content component="p" className="tenant-admin-catalog-manager__primary-cell">
                          {formatCatalogConfigurationSummary({
                            serviceId: item.serviceId,
                            templateRefId: item.templateRefId,
                            templateName: item.templateName,
                            instanceTypeLabel: item.instanceTypeLabel,
                            diskImageLabel: item.diskImageLabel,
                            diskImageId: item.diskImageId,
                            clusterVersionMode: item.clusterVersionMode,
                          })}
                        </Content>
                      </Td>
                      <Td dataLabel="Networking">
                        <NetworkingSummary
                          item={item}
                          organizationSlug={organization.slug}
                          compact
                          onViewDetails={() => openDetails(item)}
                        />
                      </Td>
                      <Td dataLabel="Access">
                        <AccessSummary compact onViewDetails={() => openDetails(item)} />
                      </Td>
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

      <Modal
        variant={ModalVariant.small}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        aria-labelledby="tenant-edit-catalog-item-title"
      >
        <ModalHeader title="Edit catalog item" labelId="tenant-edit-catalog-item-title" />
        <ModalBody>
          <Form>
            <FormGroup label="Name" fieldId="tenant-edit-catalog-display-name" isRequired>
              <KubernetesResourceNameField
                id="tenant-edit-catalog-display-name"
                value={editDisplayName}
                onChange={setEditDisplayName}
                aria-label="Name"
                isRequired
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleSaveEdit}
            isDisabled={!isValidKubernetesResourceName(editDisplayName)}
          >
            Save
          </Button>
          <Button variant="link" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant={ModalVariant.small}
        isOpen={isUnpublishModalOpen}
        onClose={() => setIsUnpublishModalOpen(false)}
        aria-labelledby="tenant-unpublish-catalog-item-title"
      >
        <ModalHeader
          title="Unpublish catalog item?"
          labelId="tenant-unpublish-catalog-item-title"
        />
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
        aria-labelledby="tenant-delete-catalog-item-title"
        aria-describedby="tenant-delete-catalog-item-description"
      >
        <ModalHeader
          title="Delete catalog item?"
          titleIconVariant="warning"
          labelId="tenant-delete-catalog-item-title"
        />
        <ModalBody>
          <Content component="p" id="tenant-delete-catalog-item-description">
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
          organization={organization}
          catalogDraft={launchCatalogDraft}
          preferCatalogDraft
          tenantSlug={organization.slug}
          projects={projects}
          initialProjectId={initialProjectId}
          onProjectScopeChange={onProjectScopeChange}
          onProjectsChange={onProjectsChange}
          existingInstanceNames={existingInstanceNames}
          onClose={() => setIsWizardOpen(false)}
          onProvisioningStarted={(instance) => {
            onProvisioningStarted?.(instance)
          }}
          onDismissDuringProvisioning={(instanceId, serviceId) => {
            onDismissDuringProvisioning?.(instanceId, serviceId)
            setIsWizardOpen(false)
          }}
          onWizardFinished={(instanceId, serviceId) => {
            onWizardFinished?.(instanceId, serviceId)
            setIsWizardOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AngleDownIcon } from '@patternfly/react-icons/dist/esm/icons/angle-down-icon'
import { AngleRightIcon } from '@patternfly/react-icons/dist/esm/icons/angle-right-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
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
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import {
  ExternalIpPoolHubCardCapacityFooter,
  ExternalIpPoolHubCardSpecs,
  formatExternalIpPoolCapacitySummary,
} from '../../components/provider-admin/ExternalIpPoolHubCardSections'
import {
  EXTERNAL_NETWORK_CARD_ICON,
  renderInventoryCardIcon,
} from '../../components/catalog/inventoryCardIcons'
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import { getNetworkingViewMode, setNetworkingViewMode, type ViewMode } from '../../catalog/viewMode'
import { CreateExternalIpPoolWizard } from '../../components/networking/CreateExternalIpPoolWizard'
import { ExternalIpPoolDetailsPage } from '../../components/provider-admin/ExternalIpPoolDetailsPage'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { buildFilterDescription, buildInventoryFilterParts } from '../../catalog/catalogFilterSummary'
import {
  getExternalIpPoolCidrs,
  getExternalIpPoolLifecycleStatus,
  getExternalIpPoolLifecycleStatusLabelColor,
  getExternalIpPoolTotalAddresses,
  type ExternalIpPool,
} from '../../providerAdmin/externalIpPools'
import {
  getExternalIpStatusLabelColor,
  groupExternalIpsByPool,
  type ExternalIp,
  type ExternalIpPoolGroup,
} from '../../providerAdmin/externalIps'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { getProviderRegisteredOrganizations } from '../../providerSetup/storage'
import { PROVIDER_ADMIN_NETWORKING_NAV_LABEL } from '../../providerAdmin/constants'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'

const EXTERNAL_NETWORK_STATUS_FILTERS = ['Ready', 'Available', 'In use'] as const

type ExternalIpPoolStatus = 'Available' | 'Ready'
type ExternalNetworkStatusFilter = 'all' | (typeof EXTERNAL_NETWORK_STATUS_FILTERS)[number]
type ExternalNetworkResourceFilter = 'all' | 'ip-pool' | 'ip'

type FilteredExternalNetworkGroup = ExternalIpPoolGroup & {
  visibleIps: ExternalIp[]
}

/** Intentional create latency before revealing the new external IP pool card or row. */
const EXTERNAL_IP_POOL_CREATE_REVEAL_MS = 1600

function sortPoolGroupsByCreatedAtDesc(groups: readonly ExternalIpPoolGroup[]): ExternalIpPoolGroup[] {
  return [...groups].sort((left, right) =>
    right.pool.createdAt.localeCompare(left.pool.createdAt),
  )
}

function orderPoolGroupsForDisplay(
  groups: readonly ExternalIpPoolGroup[],
  displayOrderRef: { current: string[] | null },
): ExternalIpPoolGroup[] {
  const byId = new Map(groups.map((group) => [group.pool.id, group] as const))
  const currentIds = new Set(byId.keys())

  if (!displayOrderRef.current) {
    displayOrderRef.current = sortPoolGroupsByCreatedAtDesc(groups).map((group) => group.pool.id)
  } else {
    const retained = displayOrderRef.current.filter((id) => currentIds.has(id))
    const retainedSet = new Set(retained)
    const added = sortPoolGroupsByCreatedAtDesc(
      groups.filter((group) => !retainedSet.has(group.pool.id)),
    ).map((group) => group.pool.id)
    displayOrderRef.current = [...added, ...retained]
  }

  return displayOrderRef.current
    .map((id) => byId.get(id))
    .filter((group): group is ExternalIpPoolGroup => Boolean(group))
}

function getExternalIpPoolStatus(pool: ExternalIpPool): ExternalIpPoolStatus {
  return getExternalIpPoolLifecycleStatus(pool)
}

function getExternalIpPoolStatusLabelColor(status: ExternalIpPoolStatus): 'blue' | 'green' {
  return getExternalIpPoolLifecycleStatusLabelColor(status)
}

function matchesSearch(query: string, values: Array<string | null | undefined>): boolean {
  if (!query) {
    return true
  }

  return values.some((value) => value?.toLowerCase().includes(query) ?? false)
}

function ipMatchesSearch(ip: ExternalIp, query: string): boolean {
  return matchesSearch(query, [ip.address, ip.attachedTo, ip.poolName, ip.status])
}

function poolMatchesSearch(pool: ExternalIpPool, query: string): boolean {
  return matchesSearch(query, [
    pool.name,
    pool.id,
    pool.cidr,
    pool.description,
    pool.ipFamily,
    ...getExternalIpPoolCidrs(pool),
    pool.dataCenter,
    pool.assignedOrganizationName,
    getExternalIpPoolStatus(pool),
  ])
}

function filterExternalNetworkGroups(
  groups: ExternalIpPoolGroup[],
  searchValue: string,
  selectedStatus: ExternalNetworkStatusFilter,
  selectedResource: ExternalNetworkResourceFilter,
): FilteredExternalNetworkGroup[] {
  const query = searchValue.trim().toLowerCase()

  return groups.flatMap(({ pool, ips }) => {
    const poolStatus = getExternalIpPoolStatus(pool)
    const poolMatchesQuery = poolMatchesSearch(pool, query)

    let visibleIps = ips.filter((ip) => {
      if (selectedStatus === 'In use' && ip.status !== 'In use') {
        return false
      }

      if (selectedStatus === 'Available' && ip.status !== 'Available') {
        return false
      }

      if (!query) {
        return true
      }

      if (poolMatchesQuery) {
        return true
      }

      return ipMatchesSearch(ip, query)
    })

    if (selectedStatus === 'Ready' && poolStatus !== 'Ready') {
      return []
    }

    if (selectedStatus === 'In use' && visibleIps.length === 0) {
      return []
    }

    if (selectedStatus === 'Available' && poolStatus !== 'Available' && visibleIps.length === 0) {
      return []
    }

    if (query && !poolMatchesQuery && visibleIps.length === 0) {
      return []
    }

    if (selectedResource === 'ip-pool') {
      if (selectedStatus === 'In use') {
        return []
      }

      if (selectedStatus === 'Available' && poolStatus !== 'Available') {
        return []
      }

      if (query && !poolMatchesQuery) {
        return []
      }

      return [{ pool, ips, visibleIps: [] }]
    }

    if (selectedResource === 'ip') {
      return visibleIps.length > 0 ? [{ pool, ips, visibleIps }] : []
    }

    return [{ pool, ips, visibleIps }]
  })
}

function formatSummaryAddressCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? 'address' : 'addresses'}`
}

function getPoolInUseCount(ips: readonly ExternalIp[]): number {
  return ips.filter((ip) => ip.status === 'In use').length
}

function buildExternalNetworkFilterParts(
  searchValue: string,
  selectedStatus: ExternalNetworkStatusFilter,
  selectedResource: ExternalNetworkResourceFilter,
): string[] {
  const parts: string[] = []

  if (selectedResource === 'ip-pool') {
    parts.push('resource: IP pools')
  }

  if (selectedResource === 'ip') {
    parts.push('resource: IPs')
  }

  parts.push(...buildInventoryFilterParts(searchValue, selectedStatus))

  return parts
}

function getExternalIpPoolActions(
  pool: ExternalIpPool,
  onViewDetails: (pool: ExternalIpPool) => void,
  onDelete: (pool: ExternalIpPool) => void,
  canManage: boolean,
): IAction[] {
  if (!canManage) {
    return [{ title: 'View details', onClick: () => onViewDetails(pool) }]
  }

  return [
    { title: 'View details', onClick: () => onViewDetails(pool) },
    { isSeparator: true },
    { title: 'Delete', isDanger: true, onClick: () => onDelete(pool) },
  ]
}

type ExternalNetworkListRow =
  | {
      kind: 'pool'
      pool: ExternalIpPool
      ips: ExternalIp[]
      visibleIps: ExternalIp[]
      hasNestedIps: boolean
      isExpanded: boolean
    }
  | {
      kind: 'ip'
      pool: ExternalIpPool
      ip: ExternalIp
      showPoolName: boolean
    }
  | {
      kind: 'ip-empty'
      pool: ExternalIpPool
    }

function getAutoExpandedPoolIds(
  filteredGroups: readonly FilteredExternalNetworkGroup[],
  searchValue: string,
  selectedResource: ExternalNetworkResourceFilter,
): Set<string> {
  const expanded = new Set<string>()

  if (selectedResource === 'ip-pool') {
    return expanded
  }

  const query = searchValue.trim().toLowerCase()

  for (const { pool, ips, visibleIps } of filteredGroups) {
    if (visibleIps.length > 0) {
      expanded.add(pool.id)
    }

    if (
      query &&
      ips.some(
        (ip) =>
          ip.address.toLowerCase().includes(query) ||
          ip.attachedTo.toLowerCase().includes(query),
      )
    ) {
      expanded.add(pool.id)
    }
  }

  return expanded
}

function buildExternalNetworkListRows(
  filteredGroups: readonly FilteredExternalNetworkGroup[],
  selectedResource: ExternalNetworkResourceFilter,
  expandedPoolIds: ReadonlySet<string>,
): ExternalNetworkListRow[] {
  const rows: ExternalNetworkListRow[] = []
  const showPoolHeader = selectedResource !== 'ip'
  const showIpSection = selectedResource !== 'ip-pool'

  for (const group of filteredGroups) {
    const { pool, ips, visibleIps } = group
    const hasNestedIps = showIpSection && ips.length > 0 && showPoolHeader
    const isExpanded = expandedPoolIds.has(pool.id)

    if (showPoolHeader) {
      rows.push({
        kind: 'pool',
        pool,
        ips,
        visibleIps,
        hasNestedIps,
        isExpanded,
      })
    }

    if (!showIpSection) {
      continue
    }

    if (showPoolHeader) {
      if (!hasNestedIps || !isExpanded) {
        continue
      }

      if (visibleIps.length === 0) {
        rows.push({ kind: 'ip-empty', pool })
        continue
      }

      for (const ip of visibleIps) {
        rows.push({ kind: 'ip', pool, ip, showPoolName: false })
      }
      continue
    }

    for (const ip of visibleIps) {
      rows.push({ kind: 'ip', pool, ip, showPoolName: true })
    }
  }

  return rows
}

function renderExternalIpPoolCreatingTableRow(pool: ExternalIpPool) {
  return (
    <Tr
      key={pool.id}
      className="provider-admin-external-networks-hub__pool-row provider-admin-external-networks-hub__pool-row--creating"
    >
      <Td colSpan={6} dataLabel="Creating">
        <div className="provider-admin-external-networks-hub__creating-row">
          <Spinner size="md" aria-label={`Creating ${pool.name}`} />
          <span>Creating external IP pool…</span>
        </div>
      </Td>
    </Tr>
  )
}

export function ProviderAdminExternalNetworksPage({
  tenantSlug,
  readOnly = false,
  scopeOrganization = null,
}: {
  tenantSlug?: string
  readOnly?: boolean
  scopeOrganization?: RegisteredOrganization | null
} = {}) {
  const inventory = useMemo(() => resolveNetworkInventoryScope(tenantSlug), [tenantSlug])
  const isTenantScope = inventory.mode === 'tenant'
  const canManagePools = !readOnly
  const [pools, setPools] = useState<ExternalIpPool[]>(() => inventory.getExternalIpPools())
  const [virtualNetworks, setVirtualNetworks] = useState(() => inventory.getVirtualNetworks())
  const [organizations, setOrganizations] = useState<RegisteredOrganization[]>(() =>
    getProviderRegisteredOrganizations(),
  )
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ExternalNetworkStatusFilter>('all')
  const [selectedResource, setSelectedResource] = useState<ExternalNetworkResourceFilter>('all')
  const resourceFilter: ExternalNetworkResourceFilter = isTenantScope ? selectedResource : 'all'
  const [viewMode, setViewMode] = useState<ViewMode>(() => getNetworkingViewMode())
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)
  const [selectedPool, setSelectedPool] = useState<ExternalIpPool | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [poolPendingDelete, setPoolPendingDelete] = useState<ExternalIpPool | null>(null)
  const [expandedPoolIds, setExpandedPoolIds] = useState<Set<string>>(() => new Set())
  const [creatingPoolId, setCreatingPoolId] = useState<string | null>(null)
  const [creatingCardHeightPx, setCreatingCardHeightPx] = useState<number | null>(null)
  const createRevealTimeoutRef = useRef<number | null>(null)
  const poolCardGridRef = useRef<HTMLDivElement | null>(null)
  const poolDisplayOrderRef = useRef<string[] | null>(null)

  const poolGroups = useMemo(
    () => groupExternalIpsByPool(pools, virtualNetworks),
    [pools, virtualNetworks],
  )

  const orderedPoolGroups = useMemo(
    () => orderPoolGroupsForDisplay(poolGroups, poolDisplayOrderRef),
    [poolGroups],
  )

  const filteredGroups = useMemo(
    () =>
      filterExternalNetworkGroups(
        orderedPoolGroups,
        searchValue,
        selectedStatus,
        resourceFilter,
      ),
    [orderedPoolGroups, searchValue, selectedStatus, resourceFilter],
  )

  const filterDescriptionParts = useMemo(
    () => buildExternalNetworkFilterParts(searchValue, selectedStatus, resourceFilter),
    [searchValue, selectedStatus, resourceFilter],
  )

  const hasActiveFilters =
    Boolean(searchValue.trim()) || selectedStatus !== 'all' || resourceFilter !== 'all'

  const resultCountLabel = useMemo(() => {
    const poolLabel = hasActiveFilters
      ? `${filteredGroups.length} of ${orderedPoolGroups.length} pools`
      : `${orderedPoolGroups.length} pools`

    if (!isTenantScope) {
      return poolLabel
    }

    const addressCapacity = (hasActiveFilters ? filteredGroups : orderedPoolGroups).reduce(
      (sum, { pool }) => sum + getExternalIpPoolTotalAddresses(pool),
      0,
    )

    return `${poolLabel} · ${formatSummaryAddressCount(addressCapacity)}`
  }, [filteredGroups, hasActiveFilters, isTenantScope, orderedPoolGroups])

  const filterDescription = buildFilterDescription(filterDescriptionParts)

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedStatus('all')
    setSelectedResource('all')
  }

  const listRows = useMemo(
    () =>
      isTenantScope
        ? buildExternalNetworkListRows(filteredGroups, resourceFilter, expandedPoolIds)
        : [],
    [expandedPoolIds, filteredGroups, isTenantScope, resourceFilter],
  )

  useEffect(() => {
    return () => {
      if (createRevealTimeoutRef.current !== null) {
        window.clearTimeout(createRevealTimeoutRef.current)
      }
    }
  }, [])

  const beginPoolCreateReveal = (poolId: string) => {
    if (createRevealTimeoutRef.current !== null) {
      window.clearTimeout(createRevealTimeoutRef.current)
    }

    setCreatingCardHeightPx(null)
    setCreatingPoolId(poolId)
    createRevealTimeoutRef.current = window.setTimeout(() => {
      setCreatingPoolId((current) => (current === poolId ? null : current))
      setCreatingCardHeightPx(null)
      createRevealTimeoutRef.current = null
    }, EXTERNAL_IP_POOL_CREATE_REVEAL_MS)
  }

  useLayoutEffect(() => {
    if (!creatingPoolId || viewMode !== 'grid') {
      setCreatingCardHeightPx(null)
      return
    }

    const grid = poolCardGridRef.current
    if (!grid) {
      return
    }

    const referenceCard = Array.from(
      grid.querySelectorAll<HTMLElement>('.provider-admin-external-networks-hub__card'),
    ).find((card) => !card.classList.contains('provider-admin-catalog-items__card--creating'))

    if (!referenceCard) {
      setCreatingCardHeightPx(null)
      return
    }

    setCreatingCardHeightPx(Math.round(referenceCard.getBoundingClientRect().height))
  }, [creatingPoolId, filteredGroups, viewMode])

  useEffect(() => {
    if (!isTenantScope) {
      return
    }

    const autoExpanded = getAutoExpandedPoolIds(filteredGroups, searchValue, resourceFilter)
    const poolsWithIps = filteredGroups
      .filter(({ ips }) => ips.length > 0)
      .map(({ pool }) => pool.id)

    setExpandedPoolIds((current) => {
      const next = new Set([...current, ...autoExpanded, ...poolsWithIps])
      if (next.size === current.size && [...next].every((id) => current.has(id))) {
        return current
      }
      return next
    })
  }, [filteredGroups, isTenantScope, searchValue, resourceFilter])

  const togglePoolExpanded = (poolId: string) => {
    setExpandedPoolIds((current) => {
      const next = new Set(current)
      if (next.has(poolId)) {
        next.delete(poolId)
      } else {
        next.add(poolId)
      }
      return next
    })
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setNetworkingViewMode(mode)
  }

  const closeWizard = () => {
    setIsCreateWizardOpen(false)
  }

  const openDelete = (pool: ExternalIpPool) => {
    setPoolPendingDelete(pool)
  }

  const closeDelete = () => {
    setPoolPendingDelete(null)
  }

  const handleConfirmDelete = () => {
    if (!poolPendingDelete) {
      return
    }

    inventory.deleteExternalIpPool(poolPendingDelete.id)
    refreshData()
    if (selectedPool?.id === poolPendingDelete.id) {
      closeDetails()
    }
    closeDelete()
  }

  const refreshData = () => {
    setPools(inventory.getExternalIpPools())
    setVirtualNetworks(inventory.getVirtualNetworks())
    if (!isTenantScope) {
      setOrganizations(getProviderRegisteredOrganizations())
    }
  }

  const openDetails = (pool: ExternalIpPool) => {
    setSelectedPool(pool)
    setIsDetailsOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsOpen(false)
    setSelectedPool(null)
  }

  const detailsOrganization = useMemo(() => {
    if (!selectedPool?.assignedOrganizationId) {
      return null
    }

    return (
      organizations.find(
        (organization) => organization.id === selectedPool.assignedOrganizationId,
      ) ?? null
    )
  }, [selectedPool, organizations])

  const selectedPoolInUseCount = useMemo(() => {
    if (!selectedPool) {
      return 0
    }

    return (
      poolGroups.find((group) => group.pool.id === selectedPool.id)?.ips.filter(
        (ip) => ip.status === 'In use',
      ).length ?? 0
    )
  }, [poolGroups, selectedPool])

  const deleteConfirmModal = (
    <Modal
      variant={ModalVariant.small}
      isOpen={poolPendingDelete !== null}
      onClose={closeDelete}
      aria-labelledby="delete-external-ip-pool-title"
      aria-describedby="delete-external-ip-pool-description"
    >
      <ModalHeader
        title="Delete IP pool?"
        titleIconVariant="warning"
        labelId="delete-external-ip-pool-title"
      />
      <ModalBody>
        <Content component="p" id="delete-external-ip-pool-description">
          {poolPendingDelete ? (
            <>
              <strong>{poolPendingDelete.name}</strong> will be permanently removed. This cannot be
              undone.
            </>
          ) : (
            'This IP pool will be permanently removed. This cannot be undone.'
          )}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" onClick={handleConfirmDelete}>
          Delete
        </Button>
        <Button variant="link" onClick={closeDelete}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )

  if (isCreateWizardOpen && canManagePools) {
    return (
      <CreateExternalIpPoolWizard
        isOpen
        tenantSlug={tenantSlug}
        organizations={organizations}
        parentLabel={isTenantScope ? 'External networks' : PROVIDER_ADMIN_NETWORKING_NAV_LABEL}
        onClose={closeWizard}
        onCreated={(pool) => {
          closeWizard()
          refreshData()
          setSearchValue('')
          setSelectedStatus('all')
          setSelectedResource('all')
          beginPoolCreateReveal(pool.id)
        }}
      />
    )
  }

  if (isDetailsOpen && selectedPool) {
    return (
      <>
        <ExternalIpPoolDetailsPage
          pool={selectedPool}
          organization={detailsOrganization}
          inUseAddressCount={selectedPoolInUseCount}
          onBack={closeDetails}
          readOnly={!canManagePools}
          scopeOrganization={isTenantScope ? scopeOrganization : null}
          onDelete={canManagePools ? () => openDelete(selectedPool) : undefined}
        />
        {deleteConfirmModal}
      </>
    )
  }

  return (
    <>
      <div className="provider-admin-workspace-page provider-admin-external-networks-hub">
        <ProviderAdminWorkspacePageHeader
          kicker={isTenantScope ? 'Networking' : undefined}
          title={isTenantScope ? 'External networks' : PROVIDER_ADMIN_NETWORKING_NAV_LABEL}
          lede={
            isTenantScope
              ? 'IP pools with nested address allocations for tenant edge exposure.'
              : 'Manage routable address pools and review capacity assigned to each tenant.'
          }
          action={
            canManagePools ? (
              <Button
                variant="primary"
                icon={<PlusIcon />}
                className="provider-admin-workspace-page__action"
                onClick={() => setIsCreateWizardOpen(true)}
              >
                Create external IP pool
              </Button>
            ) : undefined
          }
        />

        <div className="catalog-view-toolbar">
          <div className="catalog-view-toolbar__start">
            {isTenantScope ? (
              <FormSelect
                className="catalog-status-filter"
                id="external-networks-resource-filter"
                value={selectedResource}
                onChange={(_event, value) =>
                  setSelectedResource(value as ExternalNetworkResourceFilter)
                }
                aria-label="Filter external networks by resource type"
              >
                <FormSelectOption value="all" label="All resources" />
                <FormSelectOption value="ip-pool" label="IP pools" />
                <FormSelectOption value="ip" label="IPs" />
              </FormSelect>
            ) : null}
            <FormSelect
              className="catalog-status-filter"
              id="external-networks-status-filter"
              value={selectedStatus}
              onChange={(_event, value) =>
                setSelectedStatus(value as ExternalNetworkStatusFilter)
              }
              aria-label="Filter external networks by status"
            >
              <FormSelectOption value="all" label="All statuses" />
              {EXTERNAL_NETWORK_STATUS_FILTERS.map((status) => (
                <FormSelectOption key={status} value={status} label={status} />
              ))}
            </FormSelect>
            <SearchInput
              className="catalog-search"
              placeholder="Search external networks"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search external networks"
            />
            </div>
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              idPrefix="external-networks-view"
              ariaLabel="External networks view"
            />
          </div>

          {filteredGroups.length === 0 ? (
          hasActiveFilters || orderedPoolGroups.length > 0 ? (
            <CatalogFilterEmptyState
              title="No external network resources match your filters"
              description={
                isTenantScope
                  ? 'Try a different resource type, status, or search term.'
                  : 'Try a different status or search term.'
              }
              onClearFilters={clearAllFilters}
            />
          ) : (
            <EmptyState>
              <Title headingLevel="h2" size="lg">
                No external network resources yet
              </Title>
              <EmptyStateBody>
                {isTenantScope
                  ? canManagePools
                    ? 'Create an IP pool to define routable address ranges for tenant workloads.'
                    : 'Your provider has not published any external network resources for this tenant yet.'
                  : 'Create an IP pool to define routable address ranges for tenant edge exposure.'}
              </EmptyStateBody>
            </EmptyState>
          )
          ) : viewMode === 'grid' ? (
            <>
              <Content component="p" className="catalog-filter-results">
                <span className="catalog-filter-results__count-value">{resultCountLabel}</span>
                {filterDescription ? (
                  <>
                    <span className="catalog-filter-results__separator" aria-hidden>
                      {' '}
                      ·{' '}
                    </span>
                    <span className="catalog-filter-results__description">{filterDescription}</span>
                  </>
                ) : null}
                {hasActiveFilters ? (
                  <>
                    {' '}
                    <Button
                      variant="link"
                      isInline
                      className="catalog-filter-results__clear"
                      onClick={clearAllFilters}
                    >
                      Clear all filters
                    </Button>
                  </>
                ) : null}
              </Content>
              <div
                ref={poolCardGridRef}
                className="catalog-card-grid catalog-card-grid--stable provider-admin-external-networks-hub__grid"
              >
                {filteredGroups.map(({ pool, ips }) => {
                  const poolStatus = getExternalIpPoolStatus(pool)
                  const showPoolHeader = resourceFilter !== 'ip'
                  const isCreating = creatingPoolId === pool.id

                  return (
                    <Card
                      key={pool.id}
                      isCompact={false}
                      className={[
                        'provider-admin-catalog-items__card',
                        'provider-admin-external-networks-hub__card',
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
                          <Spinner size="lg" aria-label={`Creating ${pool.name}`} />
                          <Content
                            component="p"
                            className="provider-admin-catalog-items__creating-kicker"
                          >
                            Creating external IP pool…
                          </Content>
                        </CardBody>
                      ) : (
                      <CardBody>
                        <div className="provider-admin-catalog-items__card-header">
                          <span className="provider-admin-catalog-items__card-icon" aria-hidden>
                            {renderInventoryCardIcon(EXTERNAL_NETWORK_CARD_ICON)}
                          </span>
                          {showPoolHeader ? (
                            <div className="provider-admin-catalog-items__card-header-actions">
                              <Label
                                color={getExternalIpPoolStatusLabelColor(poolStatus)}
                                isCompact
                                className="provider-admin-catalog-items__card-label"
                              >
                                {poolStatus}
                              </Label>
                              <ActionsColumn
                                items={getExternalIpPoolActions(
                                  pool,
                                  openDetails,
                                  openDelete,
                                  canManagePools,
                                )}
                              />
                            </div>
                          ) : null}
                        </div>
                        <Content
                          component="p"
                          className="provider-admin-catalog-items__primary-cell"
                        >
                          {showPoolHeader ? (
                            <Button
                              variant="link"
                              isInline
                              className="provider-admin-catalog-items__name-link catalog-item-name-link"
                              onClick={() => openDetails(pool)}
                            >
                              {pool.name}
                            </Button>
                          ) : (
                            pool.name
                          )}
                        </Content>
                        {showPoolHeader ? (
                          <>
                            <ExternalIpPoolHubCardSpecs pool={pool} />
                            <ExternalIpPoolHubCardCapacityFooter
                              pool={pool}
                              inUseCount={getPoolInUseCount(ips)}
                            />
                          </>
                        ) : null}
                      </CardBody>
                      )}
                    </Card>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="catalog-table-panel">
            <Content component="p" className="catalog-filter-results">
              <span className="catalog-filter-results__count-value">{resultCountLabel}</span>
              {filterDescription ? (
                <>
                  <span className="catalog-filter-results__separator" aria-hidden>
                    {' '}
                    ·{' '}
                  </span>
                  <span className="catalog-filter-results__description">{filterDescription}</span>
                </>
              ) : null}
              {hasActiveFilters ? (
                <>
                  {' '}
                  <Button
                    variant="link"
                    isInline
                    className="catalog-filter-results__clear"
                    onClick={clearAllFilters}
                  >
                    Clear all filters
                  </Button>
                </>
              ) : null}
            </Content>

            <Table
              aria-label="External networks"
              className="catalog-data-table provider-admin-external-ip-pools__table provider-admin-external-networks-hub__table"
            >
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>CIDR</Th>
                  <Th>Tenant</Th>
                  <Th>Capacity</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {isTenantScope
                  ? listRows.map((row) => {
                      if (row.kind === 'pool') {
                        const { pool, ips, hasNestedIps, isExpanded } = row
                        if (creatingPoolId === pool.id) {
                          return renderExternalIpPoolCreatingTableRow(pool)
                        }
                        const poolStatus = getExternalIpPoolStatus(pool)

                        return (
                          <Tr
                            key={pool.id}
                            className="provider-admin-external-networks-hub__pool-row"
                          >
                            <Td dataLabel="Name">
                              <div
                                className="provider-admin-external-networks-hub__tree-row"
                                style={
                                  {
                                    '--external-network-tree-depth': 0,
                                  } as CSSProperties
                                }
                              >
                                <div className="provider-admin-external-networks-hub__name-cell">
                                  {hasNestedIps ? (
                                    <Button
                                      variant="plain"
                                      className="provider-admin-external-networks-hub__tree-toggle"
                                      aria-label={
                                        isExpanded
                                          ? `Collapse IP addresses for ${pool.name}`
                                          : `Expand IP addresses for ${pool.name}`
                                      }
                                      aria-expanded={isExpanded}
                                      onClick={() => togglePoolExpanded(pool.id)}
                                    >
                                      {isExpanded ? (
                                        <AngleDownIcon aria-hidden />
                                      ) : (
                                        <AngleRightIcon aria-hidden />
                                      )}
                                    </Button>
                                  ) : (
                                    <span
                                      className="provider-admin-external-networks-hub__tree-spacer"
                                      aria-hidden
                                    />
                                  )}
                                  <div className="provider-admin-external-networks-hub__pool-name">
                                    <Button
                                      variant="link"
                                      isInline
                                      className="catalog-table-name-link"
                                      onClick={() => openDetails(pool)}
                                    >
                                      {pool.name}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Td>
                            <Td dataLabel="Status">
                              <Label
                                color={getExternalIpPoolStatusLabelColor(poolStatus)}
                                isCompact
                              >
                                {poolStatus}
                              </Label>
                            </Td>
                            <Td dataLabel="CIDR">
                              <code>{pool.cidr}</code>
                            </Td>
                            <Td dataLabel="Tenant">
                              {pool.assignedOrganizationName ?? '—'}
                            </Td>
                            <Td dataLabel="Capacity">
                              {formatExternalIpPoolCapacitySummary(pool, getPoolInUseCount(ips))}
                            </Td>
                            <Td isActionCell>
                              <ActionsColumn
                                items={getExternalIpPoolActions(
                                  pool,
                                  openDetails,
                                  openDelete,
                                  canManagePools,
                                )}
                              />
                            </Td>
                          </Tr>
                        )
                      }

                      if (row.kind === 'ip-empty') {
                        return (
                          <Tr
                            key={`${row.pool.id}-empty`}
                            className="provider-admin-external-networks-hub__ip-row"
                          >
                            <Td colSpan={6} dataLabel="IPs">
                              <div
                                className="provider-admin-external-networks-hub__tree-row"
                                style={
                                  {
                                    '--external-network-tree-depth': 1,
                                  } as CSSProperties
                                }
                              >
                                <div className="provider-admin-external-networks-hub__name-cell">
                                  <span
                                    className="provider-admin-external-networks-hub__tree-spacer"
                                    aria-hidden
                                  />
                                  <span className="provider-admin-external-networks-hub__ip-empty">
                                    No IPs match the current filters in this pool.
                                  </span>
                                </div>
                              </div>
                            </Td>
                          </Tr>
                        )
                      }

                      const { pool, ip, showPoolName } = row

                      return (
                        <Tr
                          key={ip.id}
                          className="provider-admin-external-networks-hub__ip-row"
                        >
                          <Td dataLabel="Name">
                            <div
                              className="provider-admin-external-networks-hub__tree-row"
                              style={
                                {
                                  '--external-network-tree-depth': showPoolName ? 0 : 1,
                                } as CSSProperties
                              }
                            >
                              <div className="provider-admin-external-networks-hub__name-cell">
                                <span
                                  className="provider-admin-external-networks-hub__tree-spacer"
                                  aria-hidden
                                />
                                <div className="provider-admin-external-networks-hub__ip-summary">
                                  <Label
                                    color="grey"
                                    isCompact
                                    className="provider-admin-external-networks-hub__nested-badge"
                                  >
                                    IP
                                  </Label>
                                  {showPoolName ? (
                                    <span className="provider-admin-external-networks-hub__ip-pool-meta">
                                      {pool.name}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </Td>
                          <Td dataLabel="Status">
                            <Label color={getExternalIpStatusLabelColor(ip.status)} isCompact>
                              {ip.status}
                            </Label>
                          </Td>
                          <Td dataLabel="Address">
                            <code>{ip.address}</code>
                            {ip.attachedTo ? (
                              <span className="provider-admin-external-networks-hub__ip-attached-meta">
                                {ip.attachedTo}
                              </span>
                            ) : null}
                          </Td>
                          <Td dataLabel="Tenant">—</Td>
                          <Td dataLabel="Capacity">—</Td>
                          <Td isActionCell />
                        </Tr>
                      )
                    })
                  : filteredGroups.map(({ pool, ips }) => {
                      if (creatingPoolId === pool.id) {
                        return renderExternalIpPoolCreatingTableRow(pool)
                      }

                      const poolStatus = getExternalIpPoolStatus(pool)

                      return (
                        <Tr
                          key={pool.id}
                          className="provider-admin-external-networks-hub__pool-row"
                        >
                          <Td dataLabel="Name">
                            <Button
                              variant="link"
                              isInline
                              className="catalog-table-name-link"
                              onClick={() => openDetails(pool)}
                            >
                              {pool.name}
                            </Button>
                          </Td>
                          <Td dataLabel="Status">
                            <Label
                              color={getExternalIpPoolStatusLabelColor(poolStatus)}
                              isCompact
                            >
                              {poolStatus}
                            </Label>
                          </Td>
                          <Td dataLabel="CIDR">
                            <code>{pool.cidr}</code>
                          </Td>
                          <Td dataLabel="Tenant">{pool.assignedOrganizationName ?? '—'}</Td>
                          <Td dataLabel="Capacity">
                            {formatExternalIpPoolCapacitySummary(pool, getPoolInUseCount(ips))}
                          </Td>
                          <Td isActionCell>
                            <ActionsColumn
                              items={getExternalIpPoolActions(
                                pool,
                                openDetails,
                                openDelete,
                                canManagePools,
                              )}
                            />
                          </Td>
                        </Tr>
                      )
                    })}
              </Tbody>
                  </Table>
          </div>
        )}
      </div>
      {deleteConfirmModal}
    </>
  )
}

/** @deprecated Use ProviderAdminExternalNetworksPage */
export const ProviderAdminExternalIpPoolsPage = ProviderAdminExternalNetworksPage

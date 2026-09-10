import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  ExternalIpPoolHubCardIps,
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
import { CreateExternalIpWizard } from '../../components/networking/CreateExternalIpWizard'
import { ExternalIpPoolDetailsPage } from '../../components/provider-admin/ExternalIpPoolDetailsPage'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { buildFilterDescription, buildInventoryFilterParts } from '../../catalog/catalogFilterSummary'
import {
  getExternalIpPoolCidrs,
  getExternalIpPoolLifecycleStatus,
  getExternalIpPoolLifecycleStatusLabelColor,
  getExternalIpPoolsAssignedToOrganization,
  type ExternalIpPool,
} from '../../providerAdmin/externalIpPools'
import {
  getExternalIpAttachmentLabel,
  getExternalIpStatusLabelColor,
  getUsedExternalIpAddresses,
  groupExternalIpsByPool,
  groupTenantExternalIpsByPool,
  type ExternalIp,
  type ExternalIpPoolGroup,
} from '../../providerAdmin/externalIps'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { getProviderRegisteredOrganizations, getProviderExternalIpPools } from '../../providerSetup/storage'
import { getTenantExternalIps } from '../../tenantAdmin/networkInventoryStorage'
import { TENANT_EXTERNAL_IPS_PAGE_LABEL } from '../../tenantAdmin/constants'
import { PROVIDER_ADMIN_NETWORKING_NAV_LABEL } from '../../providerAdmin/constants'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'

const PROVIDER_EXTERNAL_IP_POOL_STATUS_FILTERS = ['Ready', 'Unassigned'] as const
const TENANT_EXTERNAL_IP_STATUS_FILTERS = ['In use', 'Available'] as const

type ExternalIpPoolLifecycleStatus = 'Unassigned' | 'Ready'
type ExternalNetworkStatusFilter =
  | 'all'
  | (typeof PROVIDER_EXTERNAL_IP_POOL_STATUS_FILTERS)[number]
  | (typeof TENANT_EXTERNAL_IP_STATUS_FILTERS)[number]

type FilteredExternalNetworkGroup = ExternalIpPoolGroup & {
  visibleIps: ExternalIp[]
}

/** Intentional create latency before revealing the new external IP pool card or row. */
const EXTERNAL_IP_POOL_CREATE_REVEAL_MS = 1600
const EXTERNAL_IP_CREATE_REVEAL_MS = 1600

function loadScopedExternalIpPools(
  inventory: ReturnType<typeof resolveNetworkInventoryScope>,
  scopeOrganization: RegisteredOrganization | null,
): ExternalIpPool[] {
  if (inventory.mode === 'tenant' && scopeOrganization) {
    return getExternalIpPoolsAssignedToOrganization(
      getProviderExternalIpPools(),
      scopeOrganization.id,
    )
  }

  return inventory.getExternalIpPools()
}

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

function getExternalIpPoolStatus(pool: ExternalIpPool): ExternalIpPoolLifecycleStatus {
  return getExternalIpPoolLifecycleStatus(pool)
}

function getExternalIpPoolStatusLabelColor(status: ExternalIpPoolLifecycleStatus): 'blue' | 'green' {
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

    if (selectedStatus === 'Unassigned' && poolStatus !== 'Unassigned') {
      return []
    }

    if (selectedStatus === 'In use' && visibleIps.length === 0) {
      return []
    }

    if (selectedStatus === 'Available' && visibleIps.length === 0) {
      return []
    }

    if (query && !poolMatchesQuery && visibleIps.length === 0) {
      return []
    }

    return [{ pool, ips, visibleIps }]
  })
}

function getPoolInUseCount(ips: readonly ExternalIp[]): number {
  return ips.filter((ip) => ip.status === 'In use').length
}

function getPoolCapacitySummary(
  pool: ExternalIpPool,
  ips: readonly ExternalIp[],
  isTenantScope: boolean,
): string {
  return formatExternalIpPoolCapacitySummary(
    pool,
    getPoolInUseCount(ips),
    isTenantScope ? ips.length : undefined,
  )
}

function buildExternalNetworkFilterParts(
  searchValue: string,
  selectedStatus: ExternalNetworkStatusFilter,
): string[] {
  const parts: string[] = []

  parts.push(...buildInventoryFilterParts(searchValue, selectedStatus))

  return parts
}

function getExternalIpPoolActions(
  pool: ExternalIpPool,
  onViewDetails: (pool: ExternalIpPool) => void,
  options: {
    onCreateIp?: (pool: ExternalIpPool) => void
    onDelete?: (pool: ExternalIpPool) => void
  } = {},
): IAction[] {
  const actions: IAction[] = [
    { title: 'View details', onClick: () => onViewDetails(pool) },
  ]

  if (options.onCreateIp) {
    actions.push(
      { isSeparator: true },
      { title: 'Create external IP', onClick: () => options.onCreateIp!(pool) },
    )
  }

  if (options.onDelete) {
    actions.push(
      { isSeparator: true },
      { title: 'Delete', isDanger: true, onClick: () => options.onDelete!(pool) },
    )
  }

  return actions
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
      kind: 'ip-group'
      pool: ExternalIpPool
      visibleIps: ExternalIp[]
    }
  | {
      kind: 'ip-empty'
      pool: ExternalIpPool
    }

function getAutoExpandedPoolIds(
  filteredGroups: readonly FilteredExternalNetworkGroup[],
  searchValue: string,
): Set<string> {
  const expanded = new Set<string>()

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
  expandedPoolIds: ReadonlySet<string>,
): ExternalNetworkListRow[] {
  const rows: ExternalNetworkListRow[] = []

  for (const group of filteredGroups) {
    const { pool, ips, visibleIps } = group
    const hasNestedIps = ips.length > 0
    const isExpanded = expandedPoolIds.has(pool.id)

    rows.push({
      kind: 'pool',
      pool,
      ips,
      visibleIps,
      hasNestedIps,
      isExpanded,
    })

    if (!hasNestedIps || !isExpanded) {
      continue
    }

    if (visibleIps.length === 0) {
      rows.push({ kind: 'ip-empty', pool })
      continue
    }

    rows.push({ kind: 'ip-group', pool, visibleIps })
  }

  return rows
}

function renderExternalIpPoolCreatingTableRow(pool: ExternalIpPool, colSpan = 6) {
  return (
    <Tr
      key={pool.id}
      className="provider-admin-external-networks-hub__pool-row provider-admin-external-networks-hub__pool-row--creating"
    >
      <Td colSpan={colSpan} dataLabel="Creating">
        <div className="provider-admin-external-networks-hub__creating-row">
          <Spinner size="md" aria-label={`Creating ${pool.name}`} />
          <span>Creating external IP pool…</span>
        </div>
      </Td>
    </Tr>
  )
}

function renderTenantNestedIpGroupRow(
  pool: ExternalIpPool,
  visibleIps: readonly ExternalIp[],
  creatingIpId: string | null,
) {
  return (
    <Tr
      key={`${pool.id}-ips`}
      className="provider-admin-external-networks-hub__ip-group-row"
    >
      <Td
        colSpan={4}
        dataLabel="IPs"
        className="provider-admin-external-networks-hub__nested-ips-cell"
      >
        <div className="provider-admin-external-networks-hub__nested-ips">
          <ul className="provider-admin-external-networks-hub__nested-ips-list">
            {visibleIps.map((ip) => {
              const attachmentLabel = getExternalIpAttachmentLabel(ip)

              return (
              <li key={ip.id} className="provider-admin-external-networks-hub__nested-ip-item">
                {creatingIpId === ip.id ? (
                  <div className="provider-admin-external-networks-hub__creating-row">
                    <Spinner size="md" aria-label={`Creating ${ip.address}`} />
                    <span>Creating external IP…</span>
                  </div>
                ) : (
                  <>
                    <div className="provider-admin-external-networks-hub__ip-summary">
                      <code>{ip.address}</code>
                      <Label color={getExternalIpStatusLabelColor(ip.status)} isCompact>
                        {ip.status}
                      </Label>
                    </div>
                    {attachmentLabel ? (
                      <Content
                        component="p"
                        className="provider-admin-external-networks-hub__nested-ip-meta"
                      >
                        {attachmentLabel}
                      </Content>
                    ) : null}
                  </>
                )}
              </li>
              )
            })}
          </ul>
        </div>
      </Td>
      <Td isActionCell />
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
  const canManagePools = !isTenantScope && !readOnly
  const canManageIps = isTenantScope && !readOnly
  const [pools, setPools] = useState<ExternalIpPool[]>(() =>
    loadScopedExternalIpPools(inventory, scopeOrganization),
  )
  const [virtualNetworks, setVirtualNetworks] = useState(() => inventory.getVirtualNetworks())
  const [persistedIps, setPersistedIps] = useState<ExternalIp[]>(() =>
    isTenantScope && tenantSlug ? getTenantExternalIps(tenantSlug) : [],
  )
  const [organizations, setOrganizations] = useState<RegisteredOrganization[]>(() =>
    getProviderRegisteredOrganizations(),
  )
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ExternalNetworkStatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getNetworkingViewMode())
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)
  const [isCreateIpWizardOpen, setIsCreateIpWizardOpen] = useState(false)
  const [createIpWizardPoolId, setCreateIpWizardPoolId] = useState<string | null>(null)
  const [selectedPool, setSelectedPool] = useState<ExternalIpPool | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [poolPendingDelete, setPoolPendingDelete] = useState<ExternalIpPool | null>(null)
  const [expandedPoolIds, setExpandedPoolIds] = useState<Set<string>>(() => new Set())
  const [creatingPoolId, setCreatingPoolId] = useState<string | null>(null)
  const [creatingIpId, setCreatingIpId] = useState<string | null>(null)
  const [creatingCardHeightPx, setCreatingCardHeightPx] = useState<number | null>(null)
  const createRevealTimeoutRef = useRef<number | null>(null)
  const createIpRevealTimeoutRef = useRef<number | null>(null)
  const poolCardGridRef = useRef<HTMLDivElement | null>(null)
  const poolDisplayOrderRef = useRef<string[] | null>(null)

  useEffect(() => {
    setPools(loadScopedExternalIpPools(inventory, scopeOrganization))
    if (isTenantScope && tenantSlug) {
      setPersistedIps(getTenantExternalIps(tenantSlug))
    }
  }, [inventory, isTenantScope, scopeOrganization, tenantSlug])

  const poolGroups = useMemo(
    () =>
      isTenantScope
        ? groupTenantExternalIpsByPool(pools, persistedIps)
        : groupExternalIpsByPool(pools, virtualNetworks, persistedIps),
    [isTenantScope, pools, virtualNetworks, persistedIps],
  )

  const usedExternalIpAddresses = useMemo(
    () => getUsedExternalIpAddresses(poolGroups.flatMap(({ ips }) => ips)),
    [poolGroups],
  )

  const orderedPoolGroups = useMemo(
    () => orderPoolGroupsForDisplay(poolGroups, poolDisplayOrderRef),
    [poolGroups],
  )

  const statusFilterOptions = isTenantScope
    ? TENANT_EXTERNAL_IP_STATUS_FILTERS
    : PROVIDER_EXTERNAL_IP_POOL_STATUS_FILTERS

  const filteredGroups = useMemo(
    () =>
      filterExternalNetworkGroups(orderedPoolGroups, searchValue, selectedStatus),
    [orderedPoolGroups, searchValue, selectedStatus],
  )

  const filterDescriptionParts = useMemo(
    () => buildExternalNetworkFilterParts(searchValue, selectedStatus),
    [searchValue, selectedStatus],
  )

  const hasActiveFilters = Boolean(searchValue.trim()) || selectedStatus !== 'all'

  const resultCountLabel = useMemo(() => {
    return hasActiveFilters
      ? `${filteredGroups.length} of ${orderedPoolGroups.length} pools`
      : `${orderedPoolGroups.length} pools`
  }, [filteredGroups.length, hasActiveFilters, orderedPoolGroups.length])

  const filterDescription = buildFilterDescription(filterDescriptionParts)

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedStatus('all')
  }

  const listRows = useMemo(
    () => (isTenantScope ? buildExternalNetworkListRows(filteredGroups, expandedPoolIds) : []),
    [expandedPoolIds, filteredGroups, isTenantScope],
  )

  useEffect(() => {
    return () => {
      if (createRevealTimeoutRef.current !== null) {
        window.clearTimeout(createRevealTimeoutRef.current)
      }
      if (createIpRevealTimeoutRef.current !== null) {
        window.clearTimeout(createIpRevealTimeoutRef.current)
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

  const beginIpCreateReveal = (poolId: string, ipId: string) => {
    if (createIpRevealTimeoutRef.current !== null) {
      window.clearTimeout(createIpRevealTimeoutRef.current)
    }

    setExpandedPoolIds((current) => new Set([...current, poolId]))
    setCreatingIpId(ipId)
    createIpRevealTimeoutRef.current = window.setTimeout(() => {
      setCreatingIpId((current) => (current === ipId ? null : current))
      createIpRevealTimeoutRef.current = null
    }, EXTERNAL_IP_CREATE_REVEAL_MS)
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

    const autoExpanded = getAutoExpandedPoolIds(filteredGroups, searchValue)
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
  }, [filteredGroups, isTenantScope, searchValue])

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

  const closeIpWizard = () => {
    setIsCreateIpWizardOpen(false)
    setCreateIpWizardPoolId(null)
  }

  const openCreateIpWizard = (poolId?: string) => {
    setCreateIpWizardPoolId(poolId ?? null)
    setIsCreateIpWizardOpen(true)
  }

  const openDelete = (pool: ExternalIpPool) => {
    setPoolPendingDelete(pool)
  }

  const externalIpPoolRowActions = {
    onCreateIp: canManageIps
      ? (pool: ExternalIpPool) => openCreateIpWizard(pool.id)
      : undefined,
    onDelete: canManagePools ? openDelete : undefined,
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
    setPools(loadScopedExternalIpPools(inventory, scopeOrganization))
    setVirtualNetworks(inventory.getVirtualNetworks())
    if (isTenantScope && tenantSlug) {
      setPersistedIps(getTenantExternalIps(tenantSlug))
    }
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

  const selectedPoolIps = useMemo(() => {
    if (!selectedPool) {
      return []
    }

    return poolGroups.find((group) => group.pool.id === selectedPool.id)?.ips ?? []
  }, [poolGroups, selectedPool])

  const selectedPoolAllocatedCount = isTenantScope ? selectedPoolIps.length : undefined

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

  if (isCreateIpWizardOpen && canManageIps && tenantSlug) {
    return (
      <CreateExternalIpWizard
        isOpen
        tenantSlug={tenantSlug}
        pools={pools}
        usedAddresses={usedExternalIpAddresses}
        initialPoolId={createIpWizardPoolId}
        parentLabel={TENANT_EXTERNAL_IPS_PAGE_LABEL}
        onClose={closeIpWizard}
        onCreated={(ip) => {
          closeIpWizard()
          refreshData()
          setSearchValue('')
          setSelectedStatus('all')
          if (ip.poolId) {
            beginIpCreateReveal(ip.poolId, ip.id)
          }
        }}
      />
    )
  }

  if (isCreateWizardOpen && canManagePools) {
    return (
      <CreateExternalIpPoolWizard
        isOpen
        tenantSlug={tenantSlug}
        organizations={organizations}
        parentLabel={isTenantScope ? TENANT_EXTERNAL_IPS_PAGE_LABEL : PROVIDER_ADMIN_NETWORKING_NAV_LABEL}
        onClose={closeWizard}
        onCreated={(pool) => {
          closeWizard()
          refreshData()
          setSearchValue('')
          setSelectedStatus('all')
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
          allocatedAddressCount={selectedPoolAllocatedCount}
          ips={selectedPoolIps}
          onCreateExternalIp={
            canManageIps ? () => openCreateIpWizard(selectedPool.id) : undefined
          }
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
          title={isTenantScope ? TENANT_EXTERNAL_IPS_PAGE_LABEL : PROVIDER_ADMIN_NETWORKING_NAV_LABEL}
          lede={
            isTenantScope
              ? 'Review provider-assigned IP pools and allocate external addresses for edge exposure.'
              : 'Manage routable address pools and review capacity assigned to each tenant.'
          }
          action={
            canManageIps ? (
              <Button
                variant="primary"
                icon={<PlusIcon />}
                className="provider-admin-workspace-page__action"
                onClick={() => openCreateIpWizard()}
                isDisabled={pools.length === 0}
              >
                Create external IP
              </Button>
            ) : canManagePools ? (
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
            <FormSelect
              className="catalog-status-filter"
              id="external-networks-status-filter"
              value={selectedStatus}
              onChange={(_event, value) =>
                setSelectedStatus(value as ExternalNetworkStatusFilter)
              }
              aria-label={isTenantScope ? 'Filter external IPs by status' : 'Filter external networks by status'}
            >
              <FormSelectOption value="all" label="All statuses" />
              {statusFilterOptions.map((status) => (
                <FormSelectOption key={status} value={status} label={status} />
              ))}
            </FormSelect>
            <SearchInput
              className="catalog-search"
              placeholder={isTenantScope ? 'Search external IPs' : 'Search external networks'}
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label={isTenantScope ? 'Search external IPs' : 'Search external networks'}
            />
            </div>
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              idPrefix="external-networks-view"
              ariaLabel={isTenantScope ? 'External IPs view' : 'External networks view'}
            />
          </div>

          {filteredGroups.length === 0 ? (
          hasActiveFilters || orderedPoolGroups.length > 0 ? (
            <CatalogFilterEmptyState
              title={
                isTenantScope
                  ? 'No external IPs match your filters'
                  : 'No external network resources match your filters'
              }
              description="Try a different status or search term."
              onClearFilters={clearAllFilters}
            />
          ) : (
            <EmptyState>
              <Title headingLevel="h2" size="lg">
                {isTenantScope ? 'No external IPs yet' : 'No external network resources yet'}
              </Title>
              <EmptyStateBody>
                {isTenantScope
                  ? canManageIps
                    ? pools.length > 0
                      ? 'Create an external IP from an assigned pool to expose workloads.'
                      : 'Your provider has not assigned any external IP pools yet.'
                    : 'Your provider has not assigned any external IP pools yet.'
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
                {filteredGroups.map(({ pool, ips, visibleIps }) => {
                  const poolStatus = getExternalIpPoolStatus(pool)
                  const isCreating = creatingPoolId === pool.id
                  const cardIps = isTenantScope ? visibleIps : ips

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
                                  externalIpPoolRowActions,
                                )}
                              />
                            </div>
                        </div>
                        <Content
                          component="p"
                          className="provider-admin-catalog-items__primary-cell"
                        >
                          <Button
                            variant="link"
                            isInline
                            className="provider-admin-catalog-items__name-link catalog-item-name-link"
                            onClick={() => openDetails(pool)}
                          >
                            {pool.name}
                          </Button>
                        </Content>
                        <ExternalIpPoolHubCardSpecs
                          pool={pool}
                          hideTenant={isTenantScope}
                          showManagedBy={isTenantScope}
                        />
                        <ExternalIpPoolHubCardCapacityFooter
                          pool={pool}
                          inUseCount={getPoolInUseCount(ips)}
                          allocatedCount={isTenantScope ? ips.length : undefined}
                        />
                        {isTenantScope ? (
                          <ExternalIpPoolHubCardIps
                            ips={cardIps}
                            creatingIpId={creatingIpId}
                          />
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
              aria-label={isTenantScope ? TENANT_EXTERNAL_IPS_PAGE_LABEL : 'External networks'}
              className={[
                'catalog-data-table',
                'provider-admin-external-ip-pools__table',
                'provider-admin-external-networks-hub__table',
                isTenantScope
                  ? 'provider-admin-external-networks-hub__table--tenant'
                  : 'provider-admin-external-networks-hub__table--provider',
              ].join(' ')}
            >
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  {isTenantScope ? (
                    <>
                      <Th>CIDR</Th>
                      <Th>Capacity</Th>
                    </>
                  ) : (
                    <>
                      <Th>CIDR</Th>
                      <Th>Tenant</Th>
                      <Th>Capacity</Th>
                    </>
                  )}
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {isTenantScope
                  ? listRows.map((row) => {
                      if (row.kind === 'pool') {
                        const { pool, ips, hasNestedIps, isExpanded } = row
                        if (creatingPoolId === pool.id) {
                          return renderExternalIpPoolCreatingTableRow(pool, 5)
                        }
                        const poolStatus = getExternalIpPoolStatus(pool)

                        return (
                          <Tr
                            key={pool.id}
                            className="provider-admin-external-networks-hub__pool-row"
                          >
                            <Td dataLabel="Name">
                              <div className="provider-admin-external-networks-hub__tree-row">
                                <div className="provider-admin-external-networks-hub__name-cell">
                                  <div className="provider-admin-external-networks-hub__tree-toggle-slot">
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
                                    ) : null}
                                  </div>
                                  <div className="provider-admin-external-networks-hub__name-cell-content provider-admin-external-networks-hub__pool-name">
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
                            <Td dataLabel="Capacity">
                              {getPoolCapacitySummary(pool, ips, isTenantScope)}
                            </Td>
                            <Td isActionCell>
                              <ActionsColumn
                                items={getExternalIpPoolActions(
                                  pool,
                                  openDetails,
                                  externalIpPoolRowActions,
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
                            className="provider-admin-external-networks-hub__ip-group-row"
                          >
                            <Td
                              colSpan={4}
                              dataLabel="IPs"
                              className="provider-admin-external-networks-hub__nested-ips-cell"
                            >
                              <div className="provider-admin-external-networks-hub__nested-ips provider-admin-external-networks-hub__nested-ips--empty">
                                <span className="provider-admin-external-networks-hub__ip-empty">
                                  No IPs match the current filters in this pool.
                                </span>
                              </div>
                            </Td>
                            <Td isActionCell />
                          </Tr>
                        )
                      }

                      if (row.kind === 'ip-group') {
                        return renderTenantNestedIpGroupRow(
                          row.pool,
                          row.visibleIps,
                          creatingIpId,
                        )
                      }

                      return null
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
                                externalIpPoolRowActions,
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

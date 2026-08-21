import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  FormSelect,
  FormSelectOption,
  Label,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { buildInventoryFilterParts } from '../../catalog/catalogFilterSummary'
import { CreateExternalIpPoolWizard } from '../../components/networking/CreateExternalIpPoolWizard'
import { ExternalIpPoolDetailsPage } from '../../components/provider-admin/ExternalIpPoolDetailsPage'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { getProviderRegisteredOrganizations } from '../../providerSetup/storage'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'

const EXTERNAL_IP_POOL_STATUSES = ['Available', 'Assigned'] as const

type ExternalIpPoolStatus = (typeof EXTERNAL_IP_POOL_STATUSES)[number]

function getExternalIpPoolStatus(pool: ExternalIpPool): ExternalIpPoolStatus {
  return pool.assignedOrganizationId !== null ? 'Assigned' : 'Available'
}

function getExternalIpPoolActions(
  pool: ExternalIpPool,
  onViewDetails: (pool: ExternalIpPool) => void,
  onEdit: (pool: ExternalIpPool) => void,
): IAction[] {
  return [
    {
      title: 'View details',
      onClick: () => onViewDetails(pool),
    },
    {
      title: 'Edit',
      onClick: () => onEdit(pool),
    },
    {
      isSeparator: true,
    },
    {
      title: 'Delete',
      isDanger: true,
      onClick: () => {
        /* demo */
      },
    },
  ]
}

export function ProviderAdminExternalIpPoolsPage({
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
  const canManagePools = !readOnly && !isTenantScope
  const [pools, setPools] = useState<ExternalIpPool[]>(() => inventory.getExternalIpPools())
  const [organizations, setOrganizations] = useState<RegisteredOrganization[]>(() =>
    getProviderRegisteredOrganizations(),
  )
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | ExternalIpPoolStatus>('all')
  const [selectedPool, setSelectedPool] = useState<ExternalIpPool | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editingPool, setEditingPool] = useState<ExternalIpPool | null>(null)

  const closeWizard = () => {
    setIsCreateWizardOpen(false)
    setEditingPool(null)
  }

  const openEdit = (pool: ExternalIpPool) => {
    setIsDetailsOpen(false)
    setEditingPool(pool)
  }

  const refreshData = () => {
    setPools(inventory.getExternalIpPools())
    if (!isTenantScope) {
      setOrganizations(getProviderRegisteredOrganizations())
    }
  }

  const filteredPools = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return pools.filter((pool) => {
      const status = getExternalIpPoolStatus(pool)
      if (selectedStatus !== 'all' && status !== selectedStatus) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        pool.name.toLowerCase().includes(query) ||
        pool.id.toLowerCase().includes(query) ||
        pool.cidr.toLowerCase().includes(query) ||
        pool.dataCenter.toLowerCase().includes(query) ||
        pool.totalAddresses.toLocaleString().toLowerCase().includes(query) ||
        (pool.assignedOrganizationName?.toLowerCase().includes(query) ?? false) ||
        (pool.assignedOrganizationId?.toLowerCase().includes(query) ?? false) ||
        status.toLowerCase().includes(query)
      )
    })
  }, [pools, searchValue, selectedStatus])

  const hasActiveFilters = Boolean(searchValue.trim()) || selectedStatus !== 'all'

  const filterDescriptionParts = useMemo(
    () => buildInventoryFilterParts(searchValue, selectedStatus),
    [searchValue, selectedStatus],
  )

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedStatus('all')
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

  if ((isCreateWizardOpen || editingPool) && canManagePools) {
    return (
      <CreateExternalIpPoolWizard
        isOpen
        tenantSlug={tenantSlug}
        organizations={organizations}
        resource={editingPool}
        onClose={closeWizard}
        onCreated={() => {
          refreshData()
          closeWizard()
        }}
      />
    )
  }

  if (isDetailsOpen && selectedPool) {
    return (
      <ExternalIpPoolDetailsPage
        pool={selectedPool}
        organization={detailsOrganization}
        onBack={closeDetails}
        readOnly={!canManagePools}
        scopeOrganization={isTenantScope ? scopeOrganization : null}
        onEdit={canManagePools ? () => openEdit(selectedPool) : undefined}
        onDelete={() => undefined}
      />
    )
  }

  return (
    <div className="provider-admin-workspace-page provider-admin-external-ip-pools">
      <ProviderAdminWorkspacePageHeader
        kicker="Networking"
        title="External IP pools"
        lede={
          isTenantScope
            ? 'External IP pools available for workloads that need public addressing in your tenant.'
            : 'Define routable address pools for tenant edge exposure and assign them during creation.'
        }
        action={
          canManagePools ? (
          <Button
            variant="primary"
            icon={<PlusIcon />}
            className="provider-admin-workspace-page__action"
            onClick={() => setIsCreateWizardOpen(true)}
          >
            Create pool
          </Button>
          ) : undefined
        }
      />

      <div className="catalog-view-toolbar">
        <div className="catalog-view-toolbar__start">
          <FormSelect
            className="catalog-status-filter"
            id="external-ip-pools-status-filter"
            value={selectedStatus}
            onChange={(_event, value) =>
              setSelectedStatus(value as 'all' | ExternalIpPoolStatus)
            }
            aria-label="Filter external IP pools by status"
          >
            <FormSelectOption value="all" label="All statuses" />
            {EXTERNAL_IP_POOL_STATUSES.map((status) => (
              <FormSelectOption key={status} value={status} label={status} />
            ))}
          </FormSelect>
          <SearchInput
            className="catalog-search"
            placeholder="Search external IP pools"
            value={searchValue}
            onChange={(_event, value) => setSearchValue(value)}
            onClear={() => setSearchValue('')}
            aria-label="Search external IP pools"
          />
        </div>
      </div>

      {filteredPools.length === 0 ? (
        hasActiveFilters ? (
          <CatalogFilterEmptyState
            title="No external IP pools match your filters"
            description="Try a different status or search term."
            onClearFilters={clearAllFilters}
          />
        ) : (
        <EmptyState>
          <Title headingLevel="h2" size="lg">
            No external IP pools yet
          </Title>
          <EmptyStateBody>
            {isTenantScope
              ? 'Your provider has not published any external IP pools for this tenant yet.'
              : 'Create a pool to define routable address ranges for tenant edge exposure.'}
          </EmptyStateBody>
        </EmptyState>
        )
      ) : (
        <div className="catalog-table-panel">
          <CatalogFilterResultsSummary
            filteredCount={filteredPools.length}
            totalCount={pools.length}
            singular="external IP pool"
            filterParts={filterDescriptionParts}
            onClearFilters={clearAllFilters}
          />
          <Table
            aria-label="External IP pools"
            className="catalog-data-table provider-admin-external-ip-pools__table"
          >
            <Thead>
              <Tr>
                <Th>Pool</Th>
                <Th>Status</Th>
                <Th>CIDR</Th>
                <Th>Data center</Th>
                <Th>Capacity</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {filteredPools.map((pool) => {
                const status = getExternalIpPoolStatus(pool)
                return (
                  <Tr key={pool.id}>
                    <Td dataLabel="Pool">
                      <Content
                        component="p"
                        className="provider-admin-external-ip-pools__primary-cell"
                      >
                        <Button
                          variant="link"
                          isInline
                          className="catalog-table-name-link"
                          onClick={() => openDetails(pool)}
                        >
                          {pool.name}
                        </Button>
                      </Content>
                      <Content
                        component="p"
                        className="provider-admin-external-ip-pools__meta-cell"
                      >
                        <code>{pool.id}</code>
                      </Content>
                    </Td>
                    <Td dataLabel="Status">
                      <Label color={status === 'Assigned' ? 'blue' : 'green'} isCompact>
                        {status}
                      </Label>
                    </Td>
                    <Td dataLabel="CIDR">
                      <code>{pool.cidr}</code>
                    </Td>
                    <Td dataLabel="Data center">{pool.dataCenter}</Td>
                    <Td dataLabel="Capacity">
                      {pool.totalAddresses.toLocaleString()} addresses
                    </Td>
                    <Td isActionCell>
                      <ActionsColumn
                        items={
                          isTenantScope
                            ? [{ title: 'View details', onClick: () => openDetails(pool) }]
                            : getExternalIpPoolActions(pool, openDetails, openEdit)
                        }
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
  )
}

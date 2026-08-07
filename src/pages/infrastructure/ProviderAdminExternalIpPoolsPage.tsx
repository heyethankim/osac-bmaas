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
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import { AssignExternalIpPoolModal } from '../../components/provider-admin/AssignExternalIpPoolModal'
import { CreateExternalIpPoolModal } from '../../components/provider-admin/CreateExternalIpPoolModal'
import { ExternalIpPoolDetailsPage } from '../../components/provider-admin/ExternalIpPoolDetailsPage'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  assignExternalIpPoolToRegisteredOrganization,
  getProviderExternalIpPools,
  getProviderRegisteredOrganizations,
} from '../../providerSetup/storage'

const EXTERNAL_IP_POOL_STATUSES = ['Available', 'Assigned'] as const

type ExternalIpPoolStatus = (typeof EXTERNAL_IP_POOL_STATUSES)[number]

function getExternalIpPoolStatus(pool: ExternalIpPool): ExternalIpPoolStatus {
  return pool.assignedOrganizationId !== null ? 'Assigned' : 'Available'
}

function getExternalIpPoolActions(
  pool: ExternalIpPool,
  onViewDetails: (pool: ExternalIpPool) => void,
  onAssign: (pool: ExternalIpPool) => void,
): IAction[] {
  const isAssigned = pool.assignedOrganizationId !== null

  return [
    {
      title: 'View details',
      onClick: () => onViewDetails(pool),
    },
    {
      title: 'Assign to organization',
      isAriaDisabled: isAssigned,
      onClick: () => {
        if (!isAssigned) {
          onAssign(pool)
        }
      },
    },
    {
      title: 'Edit pool',
      isAriaDisabled: isAssigned,
      onClick: () => {
        /* demo */
      },
    },
    {
      isSeparator: true,
    },
    {
      title: 'Delete pool',
      isAriaDisabled: isAssigned,
      onClick: () => {
        /* demo */
      },
    },
  ]
}

export function ProviderAdminExternalIpPoolsPage() {
  const [pools, setPools] = useState<ExternalIpPool[]>(() => getProviderExternalIpPools())
  const [organizations, setOrganizations] = useState<RegisteredOrganization[]>(() =>
    getProviderRegisteredOrganizations(),
  )
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | ExternalIpPoolStatus>('all')
  const [selectedPool, setSelectedPool] = useState<ExternalIpPool | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [assignPool, setAssignPool] = useState<ExternalIpPool | null>(null)

  const refreshData = () => {
    setPools(getProviderExternalIpPools())
    setOrganizations(getProviderRegisteredOrganizations())
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

  const handleAssignPool = (organizationId: string) => {
    if (!assignPool) {
      return
    }

    assignExternalIpPoolToRegisteredOrganization(assignPool.id, organizationId)
    refreshData()
    const updatedPools = getProviderExternalIpPools()
    const updated = updatedPools.find((pool) => pool.id === assignPool.id) ?? null
    setAssignPool(null)
    if (updated && isDetailsOpen && selectedPool?.id === updated.id) {
      setSelectedPool(updated)
    }
  }

  if (isDetailsOpen && selectedPool) {
    return (
      <ExternalIpPoolDetailsPage
        pool={selectedPool}
        organization={detailsOrganization}
        onBack={closeDetails}
        onAssign={
          selectedPool.assignedOrganizationId === null
            ? () => {
                setAssignPool(selectedPool)
              }
            : undefined
        }
      />
    )
  }

  return (
    <div className="provider-admin-workspace-page provider-admin-external-ip-pools">
      <ProviderAdminWorkspacePageHeader
        kicker="Networking"
        title="External IP pools"
        lede="Define routable address pools for tenant edge exposure and assign them to tenant organizations."
        action={
          <Button
            variant="primary"
            icon={<PlusIcon />}
            className="provider-admin-workspace-page__action"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create pool
          </Button>
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
        <EmptyState>
          <Title headingLevel="h2" size="lg">
            {hasActiveFilters
              ? 'No external IP pools match your filters'
              : 'No external IP pools yet'}
          </Title>
          <EmptyStateBody>
            {hasActiveFilters
              ? 'Try a different status, search term, or clear filters.'
              : 'Create a pool to define routable address ranges for tenant edge exposure.'}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <div className="catalog-table-panel">
          <Content component="p" className="catalog-table-result-count">
            {formatCatalogTableResultCount(filteredPools.length, 'external IP pool')}
          </Content>
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
                        items={getExternalIpPoolActions(pool, openDetails, setAssignPool)}
                      />
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </div>
      )}

      <CreateExternalIpPoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => refreshData()}
      />

      <AssignExternalIpPoolModal
        pool={assignPool}
        organizations={organizations}
        onClose={() => setAssignPool(null)}
        onAssign={handleAssignPool}
      />
    </div>
  )
}

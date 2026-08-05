import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button, Content, EmptyState, EmptyStateBody, Label } from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import { AssignExternalIpPoolModal } from '../../components/provider-admin/AssignExternalIpPoolModal'
import { CreateExternalIpPoolModal } from '../../components/provider-admin/CreateExternalIpPoolModal'
import { ExternalIpPoolDetailsDrawer } from '../../components/provider-admin/ExternalIpPoolDetailsDrawer'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  assignExternalIpPoolToRegisteredOrganization,
  getProviderExternalIpPools,
  getProviderRegisteredOrganizations,
} from '../../providerSetup/storage'

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
  const [selectedPool, setSelectedPool] = useState<ExternalIpPool | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [assignPool, setAssignPool] = useState<ExternalIpPool | null>(null)

  const refreshData = () => {
    setPools(getProviderExternalIpPools())
    setOrganizations(getProviderRegisteredOrganizations())
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

  return (
    <ExternalIpPoolDetailsDrawer
      isExpanded={isDetailsOpen}
      pool={selectedPool}
      organization={detailsOrganization}
      onClose={closeDetails}
      onAssign={
        selectedPool && selectedPool.assignedOrganizationId === null
          ? () => {
              setAssignPool(selectedPool)
            }
          : undefined
      }
    >
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

        {pools.length === 0 ? (
          <EmptyState titleText="No external IP pools yet" headingLevel="h2">
            <EmptyStateBody>
              Create a pool to define routable address ranges for tenant edge exposure.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <div className="catalog-table-panel">
            <Content component="p" className="catalog-table-result-count">
              {formatCatalogTableResultCount(pools.length, 'external IP pool')}
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
                {pools.map((pool) => (
                  <Tr key={pool.id}>
                    <Td dataLabel="Pool">
                      <Content component="p" className="provider-admin-external-ip-pools__primary-cell">
                        <Button
                          variant="link"
                          isInline
                          className="catalog-table-name-link"
                          onClick={() => openDetails(pool)}
                        >
                          {pool.name}
                        </Button>
                      </Content>
                      <Content component="p" className="provider-admin-external-ip-pools__meta-cell">
                        <code>{pool.id}</code>
                      </Content>
                    </Td>
                    <Td dataLabel="Status">
                      {pool.assignedOrganizationName ? (
                        <Label color="blue" isCompact>
                          Assigned
                        </Label>
                      ) : (
                        <Label color="green" isCompact>
                          Available
                        </Label>
                      )}
                    </Td>
                    <Td dataLabel="CIDR">
                      <code>{pool.cidr}</code>
                    </Td>
                    <Td dataLabel="Data center">{pool.dataCenter}</Td>
                    <Td dataLabel="Capacity">{pool.totalAddresses.toLocaleString()} addresses</Td>
                    <Td isActionCell>
                      <ActionsColumn
                        items={getExternalIpPoolActions(pool, openDetails, setAssignPool)}
                      />
                    </Td>
                  </Tr>
                ))}
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
    </ExternalIpPoolDetailsDrawer>
  )
}

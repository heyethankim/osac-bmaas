import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button, Content, Label } from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { AssignExternalIpPoolModal } from '../../components/provider-admin/AssignExternalIpPoolModal'
import { CreateExternalIpPoolModal } from '../../components/provider-admin/CreateExternalIpPoolModal'
import { ExternalIpPoolDetailsModal } from '../../components/provider-admin/ExternalIpPoolDetailsModal'
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
  onViewAssignment: (pool: ExternalIpPool) => void,
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
      title: 'View assignment',
      isAriaDisabled: !isAssigned,
      onClick: () => {
        if (isAssigned) {
          onViewAssignment(pool)
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
  const [detailsPool, setDetailsPool] = useState<ExternalIpPool | null>(null)
  const [assignPool, setAssignPool] = useState<ExternalIpPool | null>(null)
  const [assignmentPool, setAssignmentPool] = useState<ExternalIpPool | null>(null)

  const refreshData = () => {
    setPools(getProviderExternalIpPools())
    setOrganizations(getProviderRegisteredOrganizations())
  }

  const assignmentOrganization = useMemo(() => {
    if (!assignmentPool?.assignedOrganizationId) {
      return null
    }

    return (
      organizations.find(
        (organization) => organization.id === assignmentPool.assignedOrganizationId,
      ) ?? null
    )
  }, [assignmentPool, organizations])

  const handleAssignPool = (organizationId: string) => {
    if (!assignPool) {
      return
    }

    assignExternalIpPoolToRegisteredOrganization(assignPool.id, organizationId)
    refreshData()
    setAssignPool(null)
  }

  return (
    <div className="provider-admin-workspace-page provider-admin-external-ip-pools">
      <ProviderAdminWorkspacePageHeader
        kicker="Infrastructure"
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

      <Table
        aria-label="External IP pools"
        variant="compact"
        borders={false}
        className="provider-admin-external-ip-pools__table"
      >
        <Thead>
          <Tr>
            <Th modifier="wrap">Pool</Th>
            <Th modifier="wrap">Status</Th>
            <Th modifier="wrap">CIDR</Th>
            <Th modifier="wrap">Data center</Th>
            <Th modifier="wrap">Capacity</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {pools.map((pool) => (
            <Tr key={pool.id}>
              <Td dataLabel="Pool">
                <Content component="p" className="provider-admin-external-ip-pools__primary-cell">
                  {pool.name}
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
                  items={getExternalIpPoolActions(
                    pool,
                    setDetailsPool,
                    setAssignPool,
                    setAssignmentPool,
                  )}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

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

      <ExternalIpPoolDetailsModal
        pool={detailsPool}
        organization={null}
        onClose={() => setDetailsPool(null)}
      />

      <ExternalIpPoolDetailsModal
        pool={assignmentPool}
        organization={assignmentOrganization}
        onClose={() => setAssignmentPool(null)}
      />
    </div>
  )
}

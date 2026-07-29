import { useEffect, useMemo, useState } from 'react'
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
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CreateSecurityGroupModal } from '../../components/provider-admin/CreateSecurityGroupModal'
import { SecurityGroupDetailsDrawer } from '../../components/provider-admin/SecurityGroupDetailsDrawer'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import type {
  NetworkInventoryStatus,
  ProviderSecurityGroup,
} from '../../providerAdmin/networkInventory'
import {
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  NETWORK_INVENTORY_STATUSES,
} from '../../providerAdmin/networkInventory'
import { getProviderSecurityGroups, getProviderVirtualNetworks } from '../../providerSetup/storage'

type ProviderAdminSecurityGroupsPageProps = {
  openSecurityGroupId?: string | null
  onOpenSecurityGroupConsumed?: () => void
  onNavigateToVirtualNetwork?: (virtualNetworkId: string) => void
}

export function ProviderAdminSecurityGroupsPage({
  openSecurityGroupId = null,
  onOpenSecurityGroupConsumed,
  onNavigateToVirtualNetwork,
}: ProviderAdminSecurityGroupsPageProps = {}) {
  const [groups, setGroups] = useState(() => getProviderSecurityGroups())
  const [virtualNetworks, setVirtualNetworks] = useState(() => getProviderVirtualNetworks())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | NetworkInventoryStatus>('all')
  const [selectedGroup, setSelectedGroup] = useState<ProviderSecurityGroup | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const getVirtualNetwork = (virtualNetworkId: string) =>
    virtualNetworks.find((item) => item.id === virtualNetworkId)

  const filteredGroups = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return groups.filter((group) => {
      const status = getNetworkInventoryStatus(group)
      if (selectedStatus !== 'all' && status !== selectedStatus) {
        return false
      }

      if (!query) {
        return true
      }

      const network = getVirtualNetwork(group.virtualNetworkId)
      return (
        group.name.toLowerCase().includes(query) ||
        group.detail.toLowerCase().includes(query) ||
        group.id.toLowerCase().includes(query) ||
        group.inboundRules.toLowerCase().includes(query) ||
        group.outboundRules.toLowerCase().includes(query) ||
        (network?.name.toLowerCase().includes(query) ?? false) ||
        (network?.cidr.toLowerCase().includes(query) ?? false) ||
        group.virtualNetworkId.toLowerCase().includes(query) ||
        status.toLowerCase().includes(query)
      )
    })
  }, [groups, searchValue, selectedStatus, virtualNetworks])

  const hasActiveFilters = Boolean(searchValue.trim()) || selectedStatus !== 'all'

  const openCreateModal = () => {
    setVirtualNetworks(getProviderVirtualNetworks())
    setIsCreateModalOpen(true)
  }

  const openDetails = (group: ProviderSecurityGroup) => {
    setSelectedGroup(group)
    setIsDetailsOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsOpen(false)
  }

  useEffect(() => {
    if (!openSecurityGroupId) {
      return
    }

    const match = groups.find((group) => group.id === openSecurityGroupId) ?? null
    if (match) {
      setSelectedGroup(match)
      setIsDetailsOpen(true)
    }
    onOpenSecurityGroupConsumed?.()
  }, [openSecurityGroupId, groups, onOpenSecurityGroupConsumed])

  const selectedVirtualNetwork = selectedGroup
    ? getVirtualNetwork(selectedGroup.virtualNetworkId)
    : undefined

  return (
    <SecurityGroupDetailsDrawer
      isExpanded={isDetailsOpen}
      group={selectedGroup}
      virtualNetworkName={selectedVirtualNetwork?.name ?? selectedGroup?.virtualNetworkId ?? ''}
      virtualNetworkCidr={selectedVirtualNetwork?.cidr ?? ''}
      onClose={closeDetails}
      onEdit={() => undefined}
      onDelete={() => undefined}
      onNavigateToVirtualNetwork={
        selectedGroup && onNavigateToVirtualNetwork
          ? () => onNavigateToVirtualNetwork(selectedGroup.virtualNetworkId)
          : undefined
      }
    >
      <div className="provider-admin-workspace-page provider-admin-network-inventory">
        <ProviderAdminWorkspacePageHeader
          kicker="Networking"
          title="Security groups"
          lede="Manage security groups that catalog offerings can lock or expose to tenant admins."
          action={
            <Button
              variant="primary"
              icon={<PlusIcon />}
              className="provider-admin-workspace-page__action"
              onClick={openCreateModal}
            >
              Create security group
            </Button>
          }
        />

        <div className="catalog-view-toolbar">
          <div className="catalog-view-toolbar__start">
            <FormSelect
              className="catalog-status-filter"
              id="security-groups-status-filter"
              value={selectedStatus}
              onChange={(_event, value) =>
                setSelectedStatus(value as 'all' | NetworkInventoryStatus)
              }
              aria-label="Filter security groups by status"
            >
              <FormSelectOption value="all" label="All statuses" />
              {NETWORK_INVENTORY_STATUSES.map((status) => (
                <FormSelectOption key={status} value={status} label={status} />
              ))}
            </FormSelect>
            <SearchInput
              className="catalog-search"
              placeholder="Search security groups"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search security groups"
            />
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <EmptyState>
            <Title headingLevel="h2" size="lg">
              {hasActiveFilters
                ? 'No security groups match your filters'
                : 'No security groups yet'}
            </Title>
            <EmptyStateBody>
              {hasActiveFilters
                ? 'Try a different status, search term, or clear filters.'
                : 'Create a security group to get started.'}
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <div className="catalog-table-panel">
            <Content component="p" className="catalog-table-result-count">
              {formatCatalogTableResultCount(filteredGroups.length, 'security group')}
            </Content>
            <Table
              aria-label="Security groups"
              className="catalog-data-table provider-admin-network-inventory__table"
            >
              <Thead>
                <Tr>
                  <Th className="provider-admin-network-inventory__col-name">Name</Th>
                  <Th className="provider-admin-network-inventory__col-status">Status</Th>
                  <Th width={25}>Virtual network</Th>
                  <Th width={15}>Inbound rules</Th>
                  <Th width={15}>Outbound rules</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {filteredGroups.map((group) => {
                  const status = getNetworkInventoryStatus(group)
                  return (
                    <Tr key={group.id}>
                      <Td
                        dataLabel="Name"
                        className="provider-admin-network-inventory__col-name"
                      >
                        <Content
                          component="p"
                          className="provider-admin-network-inventory__primary-cell"
                        >
                          <Button
                            variant="link"
                            isInline
                            className="catalog-table-name-link"
                            onClick={() => openDetails(group)}
                          >
                            {group.name}
                          </Button>
                        </Content>
                        <Content component="p" className="provider-admin-network-inventory__meta-cell">
                          <code>{group.id}</code>
                        </Content>
                      </Td>
                      <Td
                        dataLabel="Status"
                        className="provider-admin-network-inventory__col-status"
                      >
                        <Label color={getNetworkInventoryStatusLabelColor(status)} isCompact>
                          {status}
                        </Label>
                      </Td>
                      <Td dataLabel="Virtual network">
                        {(() => {
                          const network = getVirtualNetwork(group.virtualNetworkId)
                          const name = network?.name ?? group.virtualNetworkId
                          const cidr = network?.cidr
                          return (
                            <>
                              <Content
                                component="p"
                                className="provider-admin-network-inventory__primary-cell"
                              >
                                {onNavigateToVirtualNetwork ? (
                                  <Button
                                    variant="link"
                                    isInline
                                    className="provider-admin-network-inventory__related-link"
                                    onClick={() =>
                                      onNavigateToVirtualNetwork(group.virtualNetworkId)
                                    }
                                  >
                                    {name}
                                  </Button>
                                ) : (
                                  name
                                )}
                              </Content>
                              {cidr ? (
                                <Content
                                  component="p"
                                  className="provider-admin-network-inventory__meta-cell"
                                >
                                  <code>{cidr}</code>
                                </Content>
                              ) : null}
                            </>
                          )
                        })()}
                      </Td>
                      <Td dataLabel="Inbound rules">{group.inboundRules}</Td>
                      <Td dataLabel="Outbound rules">{group.outboundRules}</Td>
                      <Td isActionCell>
                        <ActionsColumn
                          items={[
                            { title: 'View details', onClick: () => openDetails(group) },
                            { title: 'Edit', onClick: () => undefined },
                            { isSeparator: true },
                            { title: 'Delete', isDanger: true, onClick: () => undefined },
                          ]}
                        />
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </div>
        )}

        <CreateSecurityGroupModal
          isOpen={isCreateModalOpen}
          virtualNetworks={virtualNetworks}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => setGroups(getProviderSecurityGroups())}
        />
      </div>
    </SecurityGroupDetailsDrawer>
  )
}

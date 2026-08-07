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
import { CreateSubnetModal } from '../../components/provider-admin/CreateSubnetModal'
import { SubnetDetailsPage } from '../../components/provider-admin/SubnetDetailsPage'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import type { NetworkInventoryStatus, ProviderSubnet } from '../../providerAdmin/networkInventory'
import {
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  NETWORK_INVENTORY_STATUSES,
} from '../../providerAdmin/networkInventory'
import { getProviderSubnets, getProviderVirtualNetworks } from '../../providerSetup/storage'

type ProviderAdminSubnetsPageProps = {
  openSubnetId?: string | null
  onOpenSubnetConsumed?: () => void
  onNavigateToVirtualNetwork?: (virtualNetworkId: string) => void
}

export function ProviderAdminSubnetsPage({
  openSubnetId = null,
  onOpenSubnetConsumed,
  onNavigateToVirtualNetwork,
}: ProviderAdminSubnetsPageProps = {}) {
  const [subnets, setSubnets] = useState(() => getProviderSubnets())
  const [virtualNetworks, setVirtualNetworks] = useState(() => getProviderVirtualNetworks())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | NetworkInventoryStatus>('all')
  const [selectedSubnet, setSelectedSubnet] = useState<ProviderSubnet | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const refresh = () => {
    setSubnets(getProviderSubnets())
    setVirtualNetworks(getProviderVirtualNetworks())
  }

  const getVirtualNetwork = (virtualNetworkId: string) =>
    virtualNetworks.find((item) => item.id === virtualNetworkId)

  const filteredSubnets = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return subnets.filter((subnet) => {
      const status = getNetworkInventoryStatus(subnet)
      if (selectedStatus !== 'all' && status !== selectedStatus) {
        return false
      }

      if (!query) {
        return true
      }

      const network = getVirtualNetwork(subnet.virtualNetworkId)
      return (
        subnet.name.toLowerCase().includes(query) ||
        subnet.detail.toLowerCase().includes(query) ||
        subnet.id.toLowerCase().includes(query) ||
        subnet.cidr.toLowerCase().includes(query) ||
        subnet.vlan.toLowerCase().includes(query) ||
        (network?.name.toLowerCase().includes(query) ?? false) ||
        (network?.cidr.toLowerCase().includes(query) ?? false) ||
        subnet.virtualNetworkId.toLowerCase().includes(query) ||
        status.toLowerCase().includes(query)
      )
    })
  }, [subnets, searchValue, selectedStatus, virtualNetworks])

  const hasActiveFilters = Boolean(searchValue.trim()) || selectedStatus !== 'all'

  const openDetails = (subnet: ProviderSubnet) => {
    setSelectedSubnet(subnet)
    setIsDetailsOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsOpen(false)
  }

  useEffect(() => {
    if (!openSubnetId) {
      return
    }

    const match = subnets.find((subnet) => subnet.id === openSubnetId) ?? null
    if (match) {
      setSelectedSubnet(match)
      setIsDetailsOpen(true)
    }
    onOpenSubnetConsumed?.()
  }, [openSubnetId, subnets, onOpenSubnetConsumed])

  const selectedVirtualNetwork = selectedSubnet
    ? getVirtualNetwork(selectedSubnet.virtualNetworkId)
    : undefined

  if (isDetailsOpen && selectedSubnet) {
    return (
      <SubnetDetailsPage
        subnet={selectedSubnet}
        virtualNetworkName={selectedVirtualNetwork?.name ?? selectedSubnet.virtualNetworkId}
        virtualNetworkCidr={selectedVirtualNetwork?.cidr ?? ''}
        onBack={closeDetails}
        onEdit={() => undefined}
        onDelete={() => undefined}
        onNavigateToVirtualNetwork={
          onNavigateToVirtualNetwork
            ? () => onNavigateToVirtualNetwork(selectedSubnet.virtualNetworkId)
            : undefined
        }
      />
    )
  }

  return (
    <div className="provider-admin-workspace-page provider-admin-network-inventory">
      <ProviderAdminWorkspacePageHeader
        kicker="Networking"
        title="Subnets"
        lede="Define subnets within virtual networks for catalog defaults and tenant selection."
        action={
          <Button
            variant="primary"
            icon={<PlusIcon />}
            className="provider-admin-workspace-page__action"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create subnet
          </Button>
        }
      />

      <div className="catalog-view-toolbar">
        <div className="catalog-view-toolbar__start">
          <FormSelect
            className="catalog-status-filter"
            id="subnets-status-filter"
            value={selectedStatus}
            onChange={(_event, value) =>
              setSelectedStatus(value as 'all' | NetworkInventoryStatus)
            }
            aria-label="Filter subnets by status"
          >
            <FormSelectOption value="all" label="All statuses" />
            {NETWORK_INVENTORY_STATUSES.map((status) => (
              <FormSelectOption key={status} value={status} label={status} />
            ))}
          </FormSelect>
          <SearchInput
            className="catalog-search"
            placeholder="Search subnets"
            value={searchValue}
            onChange={(_event, value) => setSearchValue(value)}
            onClear={() => setSearchValue('')}
            aria-label="Search subnets"
          />
        </div>
      </div>

      {filteredSubnets.length === 0 ? (
        <EmptyState>
          <Title headingLevel="h2" size="lg">
            {hasActiveFilters ? 'No subnets match your filters' : 'No subnets yet'}
          </Title>
          <EmptyStateBody>
            {hasActiveFilters
              ? 'Try a different status, search term, or clear filters.'
              : 'Create a subnet to get started.'}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <div className="catalog-table-panel">
          <Content component="p" className="catalog-table-result-count">
            {formatCatalogTableResultCount(filteredSubnets.length, 'subnet')}
          </Content>
          <Table
            aria-label="Subnets"
            className="catalog-data-table provider-admin-network-inventory__table"
          >
            <Thead>
              <Tr>
                <Th className="provider-admin-network-inventory__col-name">Name</Th>
                <Th className="provider-admin-network-inventory__col-status">Status</Th>
                <Th width={25}>Virtual network</Th>
                <Th width={15}>CIDR</Th>
                <Th width={10}>VLAN</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {filteredSubnets.map((subnet) => {
                const status = getNetworkInventoryStatus(subnet)
                return (
                  <Tr key={subnet.id}>
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
                          onClick={() => openDetails(subnet)}
                        >
                          {subnet.name}
                        </Button>
                      </Content>
                      <Content component="p" className="provider-admin-network-inventory__meta-cell">
                        <code>{subnet.id}</code>
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
                        const network = getVirtualNetwork(subnet.virtualNetworkId)
                        const name = network?.name ?? subnet.virtualNetworkId
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
                                    onNavigateToVirtualNetwork(subnet.virtualNetworkId)
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
                    <Td dataLabel="CIDR">
                      <code>{subnet.cidr}</code>
                    </Td>
                    <Td dataLabel="VLAN">{subnet.vlan}</Td>
                    <Td isActionCell>
                      <ActionsColumn
                        items={[
                          { title: 'View details', onClick: () => openDetails(subnet) },
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

      <CreateSubnetModal
        isOpen={isCreateModalOpen}
        virtualNetworks={virtualNetworks}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  )
}

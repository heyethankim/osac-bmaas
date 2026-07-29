import { useEffect, useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CreateVirtualNetworkModal } from '../../components/provider-admin/CreateVirtualNetworkModal'
import { VirtualNetworkDetailsDrawer } from '../../components/provider-admin/VirtualNetworkDetailsDrawer'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import type { ProviderVirtualNetwork } from '../../providerAdmin/networkInventory'
import { getProviderVirtualNetworks } from '../../providerSetup/storage'

type ProviderAdminVirtualNetworksPageProps = {
  openVirtualNetworkId?: string | null
  onOpenVirtualNetworkConsumed?: () => void
}

export function ProviderAdminVirtualNetworksPage({
  openVirtualNetworkId = null,
  onOpenVirtualNetworkConsumed,
}: ProviderAdminVirtualNetworksPageProps = {}) {
  const [networks, setNetworks] = useState(() => getProviderVirtualNetworks())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState<ProviderVirtualNetwork | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const filteredNetworks = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return networks
    }

    return networks.filter(
      (network) =>
        network.name.toLowerCase().includes(query) ||
        network.detail.toLowerCase().includes(query) ||
        network.id.toLowerCase().includes(query) ||
        network.cidr.toLowerCase().includes(query) ||
        (network.ipv6Cidr?.toLowerCase().includes(query) ?? false),
    )
  }, [networks, searchValue])

  const openDetails = (network: ProviderVirtualNetwork) => {
    setSelectedNetwork(network)
    setIsDetailsOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsOpen(false)
  }

  useEffect(() => {
    if (!openVirtualNetworkId) {
      return
    }

    const match = networks.find((network) => network.id === openVirtualNetworkId) ?? null
    if (match) {
      setSelectedNetwork(match)
      setIsDetailsOpen(true)
    }
    onOpenVirtualNetworkConsumed?.()
  }, [openVirtualNetworkId, networks, onOpenVirtualNetworkConsumed])

  return (
    <VirtualNetworkDetailsDrawer
      isExpanded={isDetailsOpen}
      network={selectedNetwork}
      onClose={closeDetails}
      onEdit={() => undefined}
      onDelete={() => undefined}
    >
      <div className="provider-admin-workspace-page provider-admin-network-inventory">
        <ProviderAdminWorkspacePageHeader
          kicker="Networking"
          title="Virtual networks"
          lede="Define and manage virtual networks used for tenant workloads, shared services, and catalog networking."
          action={
            <Button
              variant="primary"
              icon={<PlusIcon />}
              className="provider-admin-workspace-page__action"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create virtual network
            </Button>
          }
        />

        <div className="catalog-view-toolbar">
          <div className="catalog-view-toolbar__start">
            <SearchInput
              className="catalog-search"
              placeholder="Search virtual networks"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search virtual networks"
            />
          </div>
        </div>

        {filteredNetworks.length === 0 ? (
          <EmptyState>
            <Title headingLevel="h2" size="lg">
              {searchValue.trim()
                ? 'No virtual networks match your search'
                : 'No virtual networks yet'}
            </Title>
            <EmptyStateBody>
              {searchValue.trim()
                ? 'Try a different search term or clear the search field.'
                : 'Create a virtual network to get started.'}
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <div className="catalog-table-panel">
            <Content component="p" className="catalog-table-result-count">
              {formatCatalogTableResultCount(filteredNetworks.length, 'virtual network')}
            </Content>
            <Table
              aria-label="Virtual networks"
              className="catalog-data-table provider-admin-network-inventory__table"
            >
              <Thead>
                <Tr>
                  <Th className="provider-admin-network-inventory__col-name">Name</Th>
                  <Th className="provider-admin-network-inventory__col-status">Status</Th>
                  <Th width={25}>IPv4 CIDR</Th>
                  <Th width={25}>IPv6 CIDR</Th>
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {filteredNetworks.map((network) => (
                  <Tr key={network.id}>
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
                          onClick={() => openDetails(network)}
                        >
                          {network.name}
                        </Button>
                      </Content>
                      <Content component="p" className="provider-admin-network-inventory__meta-cell">
                        <code>{network.id}</code>
                      </Content>
                    </Td>
                    <Td
                      dataLabel="Status"
                      className="provider-admin-network-inventory__col-status"
                    >
                      <Label color="green" isCompact>
                        Ready
                      </Label>
                    </Td>
                    <Td dataLabel="IPv4 CIDR">
                      <code>{network.cidr}</code>
                    </Td>
                    <Td dataLabel="IPv6 CIDR">
                      <code>{network.ipv6Cidr?.trim() ? network.ipv6Cidr : '—'}</code>
                    </Td>
                    <Td isActionCell>
                      <ActionsColumn
                        items={[
                          { title: 'View details', onClick: () => openDetails(network) },
                          { title: 'Edit', onClick: () => undefined },
                          { isSeparator: true },
                          { title: 'Delete', isDanger: true, onClick: () => undefined },
                        ]}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}

        <CreateVirtualNetworkModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => setNetworks(getProviderVirtualNetworks())}
        />
      </div>
    </VirtualNetworkDetailsDrawer>
  )
}

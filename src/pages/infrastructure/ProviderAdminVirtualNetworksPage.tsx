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
import { CreateVirtualNetworkWizard } from '../../components/networking/CreateVirtualNetworkWizard'
import { VirtualNetworkDetailsPage } from '../../components/provider-admin/VirtualNetworkDetailsPage'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { buildInventoryFilterParts } from '../../catalog/catalogFilterSummary'
import type {
  NetworkInventoryStatus,
  ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import {
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  NETWORK_INVENTORY_STATUSES,
} from '../../providerAdmin/networkInventory'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'

type ProviderAdminVirtualNetworksPageProps = {
  openVirtualNetworkId?: string | null
  onOpenVirtualNetworkConsumed?: () => void
  onNavigateToSubnet?: (subnetId: string) => void
  onNavigateToSecurityGroup?: (securityGroupId: string) => void
  /** When set, reads and writes tenant-scoped inventory instead of provider global. */
  tenantSlug?: string
  /** Hide create actions (tenant user read-only view). */
  readOnly?: boolean
}

export function ProviderAdminVirtualNetworksPage({
  openVirtualNetworkId = null,
  onOpenVirtualNetworkConsumed,
  onNavigateToSubnet,
  onNavigateToSecurityGroup,
  tenantSlug,
  readOnly = false,
}: ProviderAdminVirtualNetworksPageProps = {}) {
  const inventory = useMemo(() => resolveNetworkInventoryScope(tenantSlug), [tenantSlug])
  const [networks, setNetworks] = useState(() => inventory.getVirtualNetworks())
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | NetworkInventoryStatus>('all')
  const [selectedNetwork, setSelectedNetwork] = useState<ProviderVirtualNetwork | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<ProviderVirtualNetwork | null>(null)

  const closeWizard = () => {
    setIsCreateWizardOpen(false)
    setEditingNetwork(null)
  }

  const openEdit = (network: ProviderVirtualNetwork) => {
    setIsDetailsOpen(false)
    setEditingNetwork(network)
  }

  const filteredNetworks = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return networks.filter((network) => {
      const status = getNetworkInventoryStatus(network)
      if (selectedStatus !== 'all' && status !== selectedStatus) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        network.name.toLowerCase().includes(query) ||
        network.detail.toLowerCase().includes(query) ||
        network.id.toLowerCase().includes(query) ||
        network.cidr.toLowerCase().includes(query) ||
        (network.ipv6Cidr?.toLowerCase().includes(query) ?? false) ||
        status.toLowerCase().includes(query)
      )
    })
  }, [networks, searchValue, selectedStatus])

  const hasActiveFilters = Boolean(searchValue.trim()) || selectedStatus !== 'all'

  const filterDescriptionParts = useMemo(
    () => buildInventoryFilterParts(searchValue, selectedStatus),
    [searchValue, selectedStatus],
  )

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedStatus('all')
  }

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

  if ((isCreateWizardOpen || editingNetwork) && !readOnly) {
    return (
      <CreateVirtualNetworkWizard
        isOpen
        tenantSlug={tenantSlug}
        resource={editingNetwork}
        onClose={closeWizard}
        onCreated={() => {
          setNetworks(inventory.getVirtualNetworks())
          closeWizard()
        }}
      />
    )
  }

  if (isDetailsOpen && selectedNetwork) {
    return (
      <VirtualNetworkDetailsPage
        network={selectedNetwork}
        tenantSlug={tenantSlug}
        onBack={closeDetails}
        onEdit={readOnly ? undefined : () => openEdit(selectedNetwork)}
        onDelete={() => undefined}
        onNavigateToSubnet={onNavigateToSubnet}
        onNavigateToSecurityGroup={onNavigateToSecurityGroup}
      />
    )
  }

  return (
    <div className="provider-admin-workspace-page provider-admin-network-inventory">
      <ProviderAdminWorkspacePageHeader
        kicker="Networking"
        title="Virtual networks"
        lede={
          tenantSlug
            ? 'Virtual networks your tenant uses for workloads and catalog networking.'
            : 'Define and manage virtual networks used for tenant workloads, shared services, and catalog networking.'
        }
        action={
          readOnly ? undefined : (
          <Button
            variant="primary"
            icon={<PlusIcon />}
            className="provider-admin-workspace-page__action"
            onClick={() => setIsCreateWizardOpen(true)}
          >
            Create virtual network
          </Button>
          )
        }
      />

      <div className="catalog-view-toolbar">
        <div className="catalog-view-toolbar__start">
          <FormSelect
            className="catalog-status-filter"
            id="virtual-networks-status-filter"
            value={selectedStatus}
            onChange={(_event, value) =>
              setSelectedStatus(value as 'all' | NetworkInventoryStatus)
            }
            aria-label="Filter virtual networks by status"
          >
            <FormSelectOption value="all" label="All statuses" />
            {NETWORK_INVENTORY_STATUSES.map((status) => (
              <FormSelectOption key={status} value={status} label={status} />
            ))}
          </FormSelect>
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
        hasActiveFilters ? (
          <CatalogFilterEmptyState
            title="No virtual networks match your filters"
            description="Try a different status or search term."
            onClearFilters={clearAllFilters}
          />
        ) : (
        <EmptyState>
          <Title headingLevel="h2" size="lg">
            No virtual networks yet
          </Title>
          <EmptyStateBody>Create a virtual network to get started.</EmptyStateBody>
        </EmptyState>
        )
      ) : (
        <div className="catalog-table-panel">
          <CatalogFilterResultsSummary
            filteredCount={filteredNetworks.length}
            totalCount={networks.length}
            singular="virtual network"
            filterParts={filterDescriptionParts}
            onClearFilters={clearAllFilters}
          />
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
              {filteredNetworks.map((network) => {
                const status = getNetworkInventoryStatus(network)
                return (
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
                    </Td>
                    <Td
                      dataLabel="Status"
                      className="provider-admin-network-inventory__col-status"
                    >
                      <Label color={getNetworkInventoryStatusLabelColor(status)} isCompact>
                        {status}
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
                          { title: 'Edit', onClick: () => openEdit(network) },
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

    </div>
  )
}

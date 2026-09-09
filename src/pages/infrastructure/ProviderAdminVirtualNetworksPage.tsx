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
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { AttachNatGatewayModal } from '../../components/networking/AttachNatGatewayModal'
import { DetachNatGatewayModal } from '../../components/networking/DetachNatGatewayModal'
import { NetworkInventoryDeleteModal } from '../../components/networking/NetworkInventoryDeleteModal'
import { CreateSecurityGroupWizard } from '../../components/networking/CreateSecurityGroupWizard'
import { CreateSubnetWizard } from '../../components/networking/CreateSubnetWizard'
import { CreateVirtualNetworkWizard } from '../../components/networking/CreateVirtualNetworkWizard'
import { SecurityGroupDetailsPage } from '../../components/provider-admin/SecurityGroupDetailsPage'
import { SubnetDetailsPage } from '../../components/provider-admin/SubnetDetailsPage'
import { VirtualNetworkDetailsPage } from '../../components/provider-admin/VirtualNetworkDetailsPage'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { buildInventoryFilterParts } from '../../catalog/catalogFilterSummary'
import type {
  NatGatewayProfile,
  NetworkInventoryStatus,
  ProviderSecurityGroup,
  ProviderSubnet,
  ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import {
  attachNatGatewayProfileToVirtualNetwork,
  detachNatGatewayFromVirtualNetwork,
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  hasVirtualNetworkNatGateway,
  isNetworkInventoryResourceDeletable,
  NETWORK_INVENTORY_STATUSES,
  updateNatGatewayProfileOnVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'

type ProviderAdminVirtualNetworksPageProps = {
  openVirtualNetworkId?: string | null
  openSubnetId?: string | null
  openSecurityGroupId?: string | null
  onOpenVirtualNetworkConsumed?: () => void
  onOpenSubnetConsumed?: () => void
  onOpenSecurityGroupConsumed?: () => void
  /** When set, reads and writes tenant-scoped inventory instead of provider global. */
  tenantSlug?: string
  /** Hide create actions (tenant user read-only view). */
  readOnly?: boolean
}

type NetworkDetailView = 'network' | 'subnet' | 'security-group'

type NatGatewayModalState = {
  network: ProviderVirtualNetwork
  mode: 'attach' | 'edit'
}

function getVirtualNetworkActions(
  network: ProviderVirtualNetwork,
  options: {
    readOnly: boolean
    onViewDetails: (network: ProviderVirtualNetwork) => void
    onEdit: (network: ProviderVirtualNetwork) => void
  },
): IAction[] {
  const actions: IAction[] = [
    {
      title: 'View details',
      onClick: () => options.onViewDetails(network),
    },
  ]

  if (options.readOnly) {
    return actions
  }

  actions.push({
    title: 'Edit',
    onClick: () => options.onEdit(network),
  })

  actions.push(
    { isSeparator: true },
    {
      title: 'Delete',
      isDanger: true,
      onClick: () => undefined,
    },
  )

  return actions
}

export function ProviderAdminVirtualNetworksPage({
  openVirtualNetworkId = null,
  openSubnetId = null,
  openSecurityGroupId = null,
  onOpenVirtualNetworkConsumed,
  onOpenSubnetConsumed,
  onOpenSecurityGroupConsumed,
  tenantSlug,
  readOnly = false,
}: ProviderAdminVirtualNetworksPageProps = {}) {
  const inventory = useMemo(() => resolveNetworkInventoryScope(tenantSlug), [tenantSlug])
  const [networks, setNetworks] = useState(() => inventory.getVirtualNetworks())
  const [virtualNetworks, setVirtualNetworks] = useState(() => inventory.getVirtualNetworks())
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | NetworkInventoryStatus>('all')
  const [selectedNetwork, setSelectedNetwork] = useState<ProviderVirtualNetwork | null>(null)
  const [selectedSubnet, setSelectedSubnet] = useState<ProviderSubnet | null>(null)
  const [selectedSecurityGroup, setSelectedSecurityGroup] = useState<ProviderSecurityGroup | null>(
    null,
  )
  const [detailView, setDetailView] = useState<NetworkDetailView>('network')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<ProviderVirtualNetwork | null>(null)
  const [editingSubnet, setEditingSubnet] = useState<ProviderSubnet | null>(null)
  const [editingSecurityGroup, setEditingSecurityGroup] = useState<ProviderSecurityGroup | null>(
    null,
  )
  const [isCreateSubnetWizardOpen, setIsCreateSubnetWizardOpen] = useState(false)
  const [isCreateSecurityGroupWizardOpen, setIsCreateSecurityGroupWizardOpen] = useState(false)
  const [createSubnetNetworkId, setCreateSubnetNetworkId] = useState<string | undefined>()
  const [createSecurityGroupNetworkId, setCreateSecurityGroupNetworkId] = useState<
    string | undefined
  >()
  const [natGatewayModal, setNatGatewayModal] = useState<NatGatewayModalState | null>(null)
  const [networkPendingNatDetach, setNetworkPendingNatDetach] =
    useState<ProviderVirtualNetwork | null>(null)
  const [subnetPendingDelete, setSubnetPendingDelete] = useState<ProviderSubnet | null>(null)
  const [securityGroupPendingDelete, setSecurityGroupPendingDelete] =
    useState<ProviderSecurityGroup | null>(null)

  const refreshInventory = () => {
    const nextNetworks = inventory.getVirtualNetworks()
    setNetworks(nextNetworks)
    setVirtualNetworks(nextNetworks)
    syncSelectedNetwork(nextNetworks)
    syncSelectedSubnet()
    syncSelectedSecurityGroup()
  }

  const syncSelectedSubnet = () => {
    if (!selectedSubnet) {
      return
    }

    const match =
      inventory.getSubnets().find((subnet) => subnet.id === selectedSubnet.id) ?? null
    if (match) {
      setSelectedSubnet(match)
    }
  }

  const syncSelectedSecurityGroup = () => {
    if (!selectedSecurityGroup) {
      return
    }

    const match =
      inventory.getSecurityGroups().find((group) => group.id === selectedSecurityGroup.id) ??
      null
    if (match) {
      setSelectedSecurityGroup(match)
    }
  }

  const syncSelectedNetwork = (nextNetworks: ProviderVirtualNetwork[]) => {
    if (!selectedNetwork) {
      return
    }

    const match = nextNetworks.find((network) => network.id === selectedNetwork.id) ?? null
    if (match) {
      setSelectedNetwork(match)
    }
  }

  const closeWizard = () => {
    setIsCreateWizardOpen(false)
    setEditingNetwork(null)
  }

  const closeSubnetWizard = () => {
    setIsCreateSubnetWizardOpen(false)
    setEditingSubnet(null)
    setCreateSubnetNetworkId(undefined)
  }

  const closeSecurityGroupWizard = () => {
    setIsCreateSecurityGroupWizardOpen(false)
    setEditingSecurityGroup(null)
    setCreateSecurityGroupNetworkId(undefined)
  }

  const openEdit = (network: ProviderVirtualNetwork) => {
    setIsDetailsOpen(false)
    setDetailView('network')
    setSelectedSubnet(null)
    setSelectedSecurityGroup(null)
    setEditingNetwork(network)
  }

  const openEditSubnet = (subnet: ProviderSubnet) => {
    setVirtualNetworks(inventory.getVirtualNetworks())
    setDetailView('network')
    setEditingSubnet(subnet)
    setCreateSubnetNetworkId(subnet.virtualNetworkId)
  }

  const openEditSecurityGroup = (group: ProviderSecurityGroup) => {
    setVirtualNetworks(inventory.getVirtualNetworks())
    setDetailView('network')
    setEditingSecurityGroup(group)
    setCreateSecurityGroupNetworkId(group.virtualNetworkId)
  }

  const openAttachNatGateway = (network: ProviderVirtualNetwork) => {
    setNatGatewayModal({ network, mode: 'attach' })
  }

  const openEditNatGateway = (network: ProviderVirtualNetwork) => {
    setNatGatewayModal({ network, mode: 'edit' })
  }

  const closeNatGatewayModal = () => {
    setNatGatewayModal(null)
  }

  const openDetachNatGateway = (network: ProviderVirtualNetwork) => {
    setNetworkPendingNatDetach(network)
  }

  const closeDetachNatGateway = () => {
    setNetworkPendingNatDetach(null)
  }

  const handleConfirmDetachNatGateway = () => {
    if (!networkPendingNatDetach) {
      return
    }

    inventory.updateVirtualNetwork(detachNatGatewayFromVirtualNetwork(networkPendingNatDetach))
    refreshInventory()
    closeDetachNatGateway()
  }

  const openDeleteSubnet = (subnetId: string) => {
    const subnet = inventory.getSubnets().find((entry) => entry.id === subnetId) ?? null
    if (!subnet || !isNetworkInventoryResourceDeletable(subnet)) {
      return
    }
    setSubnetPendingDelete(subnet)
  }

  const closeDeleteSubnet = () => {
    setSubnetPendingDelete(null)
  }

  const handleConfirmDeleteSubnet = () => {
    if (!subnetPendingDelete) {
      return
    }

    inventory.deleteSubnet(subnetPendingDelete.id)
    if (selectedSubnet?.id === subnetPendingDelete.id) {
      closeSubnetDetails()
    }
    refreshInventory()
    closeDeleteSubnet()
  }

  const openDeleteSecurityGroup = (securityGroupId: string) => {
    const group =
      inventory.getSecurityGroups().find((entry) => entry.id === securityGroupId) ?? null
    if (!group || !isNetworkInventoryResourceDeletable(group)) {
      return
    }
    setSecurityGroupPendingDelete(group)
  }

  const closeDeleteSecurityGroup = () => {
    setSecurityGroupPendingDelete(null)
  }

  const handleConfirmDeleteSecurityGroup = () => {
    if (!securityGroupPendingDelete) {
      return
    }

    inventory.deleteSecurityGroup(securityGroupPendingDelete.id)
    if (selectedSecurityGroup?.id === securityGroupPendingDelete.id) {
      closeSecurityGroupDetails()
    }
    refreshInventory()
    closeDeleteSecurityGroup()
  }

  const handleEditSubnet = (subnetId: string) => {
    const subnet = inventory.getSubnets().find((entry) => entry.id === subnetId) ?? null
    if (!subnet) {
      return
    }
    openEditSubnet(subnet)
  }

  const handleEditSecurityGroup = (securityGroupId: string) => {
    const group =
      inventory.getSecurityGroups().find((entry) => entry.id === securityGroupId) ?? null
    if (!group) {
      return
    }
    openEditSecurityGroup(group)
  }

  const handleNatGatewaySubmit = (
    network: ProviderVirtualNetwork,
    profile: NatGatewayProfile,
  ) => {
    const updatedNetwork =
      natGatewayModal?.mode === 'edit'
        ? updateNatGatewayProfileOnVirtualNetwork(network, profile)
        : attachNatGatewayProfileToVirtualNetwork(network, profile)
    inventory.updateVirtualNetwork(updatedNetwork)
    refreshInventory()
    closeNatGatewayModal()
  }

  const networkInventoryModals = (
    <>
      <AttachNatGatewayModal
        network={natGatewayModal?.network ?? null}
        mode={natGatewayModal?.mode ?? 'attach'}
        isOpen={natGatewayModal !== null}
        onClose={closeNatGatewayModal}
        onAttach={handleNatGatewaySubmit}
      />
      <DetachNatGatewayModal
        network={networkPendingNatDetach}
        isOpen={networkPendingNatDetach !== null}
        onClose={closeDetachNatGateway}
        onConfirm={handleConfirmDetachNatGateway}
      />
      <NetworkInventoryDeleteModal
        isOpen={subnetPendingDelete !== null}
        title="Delete subnet?"
        resourceName={subnetPendingDelete?.name ?? ''}
        impactMessage="will be permanently removed. Workloads using this subnet may lose network connectivity."
        onClose={closeDeleteSubnet}
        onConfirm={handleConfirmDeleteSubnet}
      />
      <NetworkInventoryDeleteModal
        isOpen={securityGroupPendingDelete !== null}
        title="Delete security group?"
        resourceName={securityGroupPendingDelete?.name ?? ''}
        impactMessage="will be permanently removed. Workloads using this security group may lose network access."
        onClose={closeDeleteSecurityGroup}
        onConfirm={handleConfirmDeleteSecurityGroup}
      />
    </>
  )

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
        (network.natGateway?.name.toLowerCase().includes(query) ?? false) ||
        (network.natGateway?.publicIp.toLowerCase().includes(query) ?? false) ||
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
    setSelectedSubnet(null)
    setSelectedSecurityGroup(null)
    setDetailView('network')
    setIsDetailsOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsOpen(false)
    setSelectedNetwork(null)
    setSelectedSubnet(null)
    setSelectedSecurityGroup(null)
    setDetailView('network')
  }

  const openSubnetDetails = (subnetId: string) => {
    const subnet = inventory.getSubnets().find((entry) => entry.id === subnetId) ?? null
    if (!subnet) {
      return
    }

    const network =
      inventory.getVirtualNetworks().find((entry) => entry.id === subnet.virtualNetworkId) ??
      selectedNetwork
    if (network) {
      setSelectedNetwork(network)
      setIsDetailsOpen(true)
    }
    setSelectedSubnet(subnet)
    setDetailView('subnet')
  }

  const closeSubnetDetails = () => {
    setSelectedSubnet(null)
    setDetailView('network')
  }

  const openSecurityGroupDetails = (securityGroupId: string) => {
    const group =
      inventory.getSecurityGroups().find((entry) => entry.id === securityGroupId) ?? null
    if (!group) {
      return
    }

    const network =
      inventory.getVirtualNetworks().find((entry) => entry.id === group.virtualNetworkId) ??
      selectedNetwork
    if (network) {
      setSelectedNetwork(network)
      setIsDetailsOpen(true)
    }
    setSelectedSecurityGroup(group)
    setDetailView('security-group')
  }

  const closeSecurityGroupDetails = () => {
    setSelectedSecurityGroup(null)
    setDetailView('network')
  }

  const openCreateSubnetWizard = (virtualNetworkId: string) => {
    setVirtualNetworks(inventory.getVirtualNetworks())
    setCreateSubnetNetworkId(virtualNetworkId)
    setIsCreateSubnetWizardOpen(true)
  }

  const openCreateSecurityGroupWizard = (virtualNetworkId: string) => {
    setVirtualNetworks(inventory.getVirtualNetworks())
    setCreateSecurityGroupNetworkId(virtualNetworkId)
    setIsCreateSecurityGroupWizardOpen(true)
  }

  useEffect(() => {
    if (!openVirtualNetworkId) {
      return
    }

    const match = networks.find((network) => network.id === openVirtualNetworkId) ?? null
    if (match) {
      openDetails(match)
    }
    onOpenVirtualNetworkConsumed?.()
  }, [openVirtualNetworkId, networks, onOpenVirtualNetworkConsumed])

  useEffect(() => {
    if (!openSubnetId) {
      return
    }

    openSubnetDetails(openSubnetId)
    onOpenSubnetConsumed?.()
  }, [openSubnetId, onOpenSubnetConsumed])

  useEffect(() => {
    if (!openSecurityGroupId) {
      return
    }

    openSecurityGroupDetails(openSecurityGroupId)
    onOpenSecurityGroupConsumed?.()
  }, [openSecurityGroupId, onOpenSecurityGroupConsumed])

  if ((isCreateWizardOpen || editingNetwork) && !readOnly) {
    return (
      <CreateVirtualNetworkWizard
        isOpen
        tenantSlug={tenantSlug}
        resource={editingNetwork}
        onClose={closeWizard}
        onCreated={() => {
          refreshInventory()
          closeWizard()
        }}
      />
    )
  }

  if ((isCreateSubnetWizardOpen || editingSubnet) && !readOnly) {
    return (
      <CreateSubnetWizard
        isOpen
        tenantSlug={tenantSlug}
        virtualNetworks={virtualNetworks}
        defaultVirtualNetworkId={createSubnetNetworkId}
        resource={editingSubnet}
        parentLabel={selectedNetwork?.name ?? 'Virtual networks'}
        onClose={closeSubnetWizard}
        onCreated={() => {
          refreshInventory()
          closeSubnetWizard()
          if (selectedNetwork) {
            setIsDetailsOpen(true)
            setDetailView('network')
          }
        }}
      />
    )
  }

  if ((isCreateSecurityGroupWizardOpen || editingSecurityGroup) && !readOnly) {
    return (
      <CreateSecurityGroupWizard
        isOpen
        tenantSlug={tenantSlug}
        virtualNetworks={virtualNetworks}
        defaultVirtualNetworkId={createSecurityGroupNetworkId}
        resource={editingSecurityGroup}
        parentLabel={selectedNetwork?.name ?? 'Virtual networks'}
        onClose={closeSecurityGroupWizard}
        onCreated={() => {
          refreshInventory()
          closeSecurityGroupWizard()
          if (selectedNetwork) {
            setIsDetailsOpen(true)
            setDetailView('network')
          }
        }}
      />
    )
  }

  if (isDetailsOpen && selectedNetwork && detailView === 'subnet' && selectedSubnet) {
    const parentNetwork =
      virtualNetworks.find((network) => network.id === selectedSubnet.virtualNetworkId) ??
      selectedNetwork

    return (
      <SubnetDetailsPage
        subnet={selectedSubnet}
        virtualNetworkName={parentNetwork.name}
        virtualNetworkCidr={parentNetwork.cidr}
        onBack={closeDetails}
        onEdit={readOnly ? undefined : () => openEditSubnet(selectedSubnet)}
        onDelete={() => undefined}
        onNavigateToVirtualNetwork={closeSubnetDetails}
      />
    )
  }

  if (
    isDetailsOpen &&
    selectedNetwork &&
    detailView === 'security-group' &&
    selectedSecurityGroup
  ) {
    const parentNetwork =
      virtualNetworks.find((network) => network.id === selectedSecurityGroup.virtualNetworkId) ??
      selectedNetwork

    return (
      <SecurityGroupDetailsPage
        group={selectedSecurityGroup}
        virtualNetworkName={parentNetwork.name}
        virtualNetworkCidr={parentNetwork.cidr}
        onBack={closeDetails}
        onEdit={readOnly ? undefined : () => openEditSecurityGroup(selectedSecurityGroup)}
        onDelete={() => undefined}
        onNavigateToVirtualNetwork={closeSecurityGroupDetails}
      />
    )
  }

  if (isDetailsOpen && selectedNetwork && detailView === 'network') {
    return (
      <>
        <VirtualNetworkDetailsPage
          network={selectedNetwork}
          tenantSlug={tenantSlug}
          onBack={closeDetails}
          onEdit={readOnly ? undefined : () => openEdit(selectedNetwork)}
          onDelete={() => undefined}
          onAttachNatGateway={
            readOnly ? undefined : () => openAttachNatGateway(selectedNetwork)
          }
          onEditNatGateway={
            readOnly || !hasVirtualNetworkNatGateway(selectedNetwork)
              ? undefined
              : () => openEditNatGateway(selectedNetwork)
          }
          onDetachNatGateway={
            readOnly || !hasVirtualNetworkNatGateway(selectedNetwork)
              ? undefined
              : () => openDetachNatGateway(selectedNetwork)
          }
          onNavigateToSubnet={openSubnetDetails}
          onNavigateToSecurityGroup={openSecurityGroupDetails}
          onAddSubnet={
            readOnly ? undefined : () => openCreateSubnetWizard(selectedNetwork.id)
          }
          onAddSecurityGroup={
            readOnly ? undefined : () => openCreateSecurityGroupWizard(selectedNetwork.id)
          }
          onEditSubnet={readOnly ? undefined : handleEditSubnet}
          onDeleteSubnet={readOnly ? undefined : openDeleteSubnet}
          onEditSecurityGroup={readOnly ? undefined : handleEditSecurityGroup}
          onDeleteSecurityGroup={readOnly ? undefined : openDeleteSecurityGroup}
        />
        {networkInventoryModals}
      </>
    )
  }

  return (
    <>
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
                <Th width={20}>IPv4 CIDR</Th>
                <Th width={20}>IPv6 CIDR</Th>
                <Th width={20}>NAT gateway</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {filteredNetworks.map((network) => {
                const status = getNetworkInventoryStatus(network)
                const natGateway = hasVirtualNetworkNatGateway(network) ? network.natGateway : null
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
                    <Td dataLabel="NAT gateway">
                      {natGateway ? (
                        <>
                          <Content
                            component="p"
                            className="provider-admin-network-inventory__primary-cell"
                          >
                            {natGateway.name}
                          </Content>
                          <Content
                            component="p"
                            className="provider-admin-network-inventory__meta-cell"
                          >
                            <code>{natGateway.publicIp}</code>
                          </Content>
                        </>
                      ) : (
                        <Content
                          component="p"
                          className="provider-admin-network-inventory__meta-cell"
                        >
                          —
                        </Content>
                      )}
                    </Td>
                    <Td isActionCell>
                      <ActionsColumn
                        items={getVirtualNetworkActions(network, {
                          readOnly,
                          onViewDetails: openDetails,
                          onEdit: openEdit,
                        })}
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
    {networkInventoryModals}
    </>
  )
}

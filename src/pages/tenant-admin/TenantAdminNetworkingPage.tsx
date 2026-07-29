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
import { SecurityGroupDetailsDrawer } from '../../components/provider-admin/SecurityGroupDetailsDrawer'
import { SubnetDetailsDrawer } from '../../components/provider-admin/SubnetDetailsDrawer'
import { VirtualNetworkDetailsDrawer } from '../../components/provider-admin/VirtualNetworkDetailsDrawer'
import { TenantAdminWorkspacePageHeader } from '../../components/tenant-admin/TenantAdminWorkspacePageHeader'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import type {
  ProviderSecurityGroup,
  ProviderSubnet,
  ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  getProviderSecurityGroups,
  getProviderSubnets,
  getProviderVirtualNetworks,
} from '../../providerSetup/storage'
import {
  getTenantNetworkResourceMeta,
  type TenantNetworkResourceKind,
} from '../../tenantAdmin/networking'

type TenantAdminNetworkingPageProps = {
  tenantSlug: string
  organization: RegisteredOrganization
  catalogDraft: ProviderCatalogDraft | null
  kind: TenantNetworkResourceKind
  openVirtualNetworkId?: string | null
  onOpenVirtualNetworkConsumed?: () => void
  openSubnetId?: string | null
  onOpenSubnetConsumed?: () => void
  openSecurityGroupId?: string | null
  onOpenSecurityGroupConsumed?: () => void
  onNavigateToVirtualNetwork?: (virtualNetworkId: string) => void
  onNavigateToSubnet?: (subnetId: string) => void
  onNavigateToSecurityGroup?: (securityGroupId: string) => void
}

export function TenantAdminNetworkingPage({
  kind,
  openVirtualNetworkId = null,
  onOpenVirtualNetworkConsumed,
  openSubnetId = null,
  onOpenSubnetConsumed,
  openSecurityGroupId = null,
  onOpenSecurityGroupConsumed,
  onNavigateToVirtualNetwork,
  onNavigateToSubnet,
  onNavigateToSecurityGroup,
}: TenantAdminNetworkingPageProps) {
  const meta = useMemo(() => getTenantNetworkResourceMeta(kind), [kind])
  const [networks, setNetworks] = useState(() => getProviderVirtualNetworks())
  const [subnets, setSubnets] = useState(() => getProviderSubnets())
  const [securityGroups, setSecurityGroups] = useState(() => getProviderSecurityGroups())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState<ProviderVirtualNetwork | null>(null)
  const [selectedSubnet, setSelectedSubnet] = useState<ProviderSubnet | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<ProviderSecurityGroup | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    setSearchValue('')
    setIsDetailsOpen(false)
    setSelectedNetwork(null)
    setSelectedSubnet(null)
    setSelectedGroup(null)
  }, [kind])

  useEffect(() => {
    if (kind !== 'virtual-network' || !openVirtualNetworkId) {
      return
    }

    const match = networks.find((network) => network.id === openVirtualNetworkId) ?? null
    if (match) {
      setSelectedNetwork(match)
      setIsDetailsOpen(true)
    }
    onOpenVirtualNetworkConsumed?.()
  }, [kind, openVirtualNetworkId, networks, onOpenVirtualNetworkConsumed])

  useEffect(() => {
    if (kind !== 'subnet' || !openSubnetId) {
      return
    }

    const match = subnets.find((subnet) => subnet.id === openSubnetId) ?? null
    if (match) {
      setSelectedSubnet(match)
      setIsDetailsOpen(true)
    }
    onOpenSubnetConsumed?.()
  }, [kind, openSubnetId, subnets, onOpenSubnetConsumed])

  useEffect(() => {
    if (kind !== 'security-group' || !openSecurityGroupId) {
      return
    }

    const match = securityGroups.find((group) => group.id === openSecurityGroupId) ?? null
    if (match) {
      setSelectedGroup(match)
      setIsDetailsOpen(true)
    }
    onOpenSecurityGroupConsumed?.()
  }, [kind, openSecurityGroupId, securityGroups, onOpenSecurityGroupConsumed])

  const getVirtualNetwork = (virtualNetworkId: string) =>
    networks.find((item) => item.id === virtualNetworkId)

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

  const filteredSubnets = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return subnets
    }

    return subnets.filter((subnet) => {
      const network = getVirtualNetwork(subnet.virtualNetworkId)
      return (
        subnet.name.toLowerCase().includes(query) ||
        subnet.detail.toLowerCase().includes(query) ||
        subnet.id.toLowerCase().includes(query) ||
        subnet.cidr.toLowerCase().includes(query) ||
        subnet.vlan.toLowerCase().includes(query) ||
        (network?.name.toLowerCase().includes(query) ?? false) ||
        (network?.cidr.toLowerCase().includes(query) ?? false) ||
        subnet.virtualNetworkId.toLowerCase().includes(query)
      )
    })
  }, [subnets, searchValue, networks])

  const filteredSecurityGroups = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return securityGroups
    }

    return securityGroups.filter((group) => {
      const network = getVirtualNetwork(group.virtualNetworkId)
      return (
        group.name.toLowerCase().includes(query) ||
        group.detail.toLowerCase().includes(query) ||
        group.id.toLowerCase().includes(query) ||
        group.inboundRules.toLowerCase().includes(query) ||
        group.outboundRules.toLowerCase().includes(query) ||
        (network?.name.toLowerCase().includes(query) ?? false) ||
        (network?.cidr.toLowerCase().includes(query) ?? false) ||
        group.virtualNetworkId.toLowerCase().includes(query)
      )
    })
  }, [securityGroups, searchValue, networks])

  const searchPlaceholder =
    kind === 'virtual-network'
      ? 'Search virtual networks'
      : kind === 'subnet'
        ? 'Search subnets'
        : 'Search security groups'

  const toolbar = (
    <div className="catalog-view-toolbar">
      <div className="catalog-view-toolbar__start">
        <SearchInput
          className="catalog-search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(_event, value) => setSearchValue(value)}
          onClear={() => setSearchValue('')}
          aria-label={searchPlaceholder}
        />
      </div>
    </div>
  )

  if (kind === 'subnet') {
    const selectedVirtualNetwork = selectedSubnet
      ? getVirtualNetwork(selectedSubnet.virtualNetworkId)
      : undefined

    return (
      <SubnetDetailsDrawer
        isExpanded={isDetailsOpen}
        subnet={selectedSubnet}
        virtualNetworkName={
          selectedVirtualNetwork?.name ?? selectedSubnet?.virtualNetworkId ?? ''
        }
        virtualNetworkCidr={selectedVirtualNetwork?.cidr ?? ''}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={() => undefined}
        onDelete={() => undefined}
        onNavigateToVirtualNetwork={
          selectedSubnet && onNavigateToVirtualNetwork
            ? () => onNavigateToVirtualNetwork(selectedSubnet.virtualNetworkId)
            : undefined
        }
      >
        <div className="tenant-admin-workspace-page tenant-admin-networking">
          <TenantAdminWorkspacePageHeader
            kicker="Networking"
            title={meta.title}
            lede={meta.lede}
          />
          {toolbar}
          {filteredSubnets.length === 0 ? (
            <EmptyState>
              <Title headingLevel="h2" size="lg">
                {searchValue.trim() ? 'No subnets match your search' : 'No subnets yet'}
              </Title>
              <EmptyStateBody>
                {searchValue.trim()
                  ? 'Try a different search term or clear the search field.'
                  : 'Subnets will appear here when available to your organization.'}
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <div className="catalog-table-panel">
              <Content component="p" className="catalog-table-result-count">
                {formatCatalogTableResultCount(filteredSubnets.length, 'subnet')}
              </Content>
              <Table
                aria-label="Subnets"
                className="catalog-data-table tenant-admin-networking__table"
              >
                <Thead>
                  <Tr>
                    <Th className="provider-admin-network-inventory__col-name">Name</Th>
                    <Th className="provider-admin-network-inventory__col-status">Status</Th>
                    <Th width={25}>Virtual network</Th>
                    <Th width={15}>CIDR</Th>
                    <Th width={10}>VLAN</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSubnets.map((subnet) => (
                    <Tr key={subnet.id}>
                      <Td
                        dataLabel="Name"
                        className="provider-admin-network-inventory__col-name"
                      >
                        <Content component="p" className="tenant-admin-networking__primary-cell">
                          <Button
                            variant="link"
                            isInline
                            className="catalog-table-name-link"
                            onClick={() => {
                              setSelectedSubnet(subnet)
                              setIsDetailsOpen(true)
                            }}
                          >
                            {subnet.name}
                          </Button>
                        </Content>
                        <Content component="p" className="tenant-admin-networking__meta-cell">
                          <code>{subnet.id}</code>
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
                      <Td dataLabel="Virtual network">
                        {(() => {
                          const network = getVirtualNetwork(subnet.virtualNetworkId)
                          const name = network?.name ?? subnet.virtualNetworkId
                          const cidr = network?.cidr
                          return (
                            <>
                              <Content
                                component="p"
                                className="tenant-admin-networking__primary-cell"
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
                                  className="tenant-admin-networking__meta-cell"
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
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </div>
      </SubnetDetailsDrawer>
    )
  }

  if (kind === 'security-group') {
    const selectedVirtualNetwork = selectedGroup
      ? getVirtualNetwork(selectedGroup.virtualNetworkId)
      : undefined

    return (
      <SecurityGroupDetailsDrawer
        isExpanded={isDetailsOpen}
        group={selectedGroup}
        virtualNetworkName={
          selectedVirtualNetwork?.name ?? selectedGroup?.virtualNetworkId ?? ''
        }
        virtualNetworkCidr={selectedVirtualNetwork?.cidr ?? ''}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={() => undefined}
        onDelete={() => undefined}
        onNavigateToVirtualNetwork={
          selectedGroup && onNavigateToVirtualNetwork
            ? () => onNavigateToVirtualNetwork(selectedGroup.virtualNetworkId)
            : undefined
        }
      >
        <div className="tenant-admin-workspace-page tenant-admin-networking">
          <TenantAdminWorkspacePageHeader
            kicker="Networking"
            title={meta.title}
            lede={meta.lede}
          />
          {toolbar}
          {filteredSecurityGroups.length === 0 ? (
            <EmptyState>
              <Title headingLevel="h2" size="lg">
                {searchValue.trim()
                  ? 'No security groups match your search'
                  : 'No security groups yet'}
              </Title>
              <EmptyStateBody>
                {searchValue.trim()
                  ? 'Try a different search term or clear the search field.'
                  : 'Security groups will appear here when available to your organization.'}
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <div className="catalog-table-panel">
              <Content component="p" className="catalog-table-result-count">
                {formatCatalogTableResultCount(filteredSecurityGroups.length, 'security group')}
              </Content>
              <Table
                aria-label="Security groups"
                className="catalog-data-table tenant-admin-networking__table"
              >
                <Thead>
                  <Tr>
                    <Th className="provider-admin-network-inventory__col-name">Name</Th>
                    <Th className="provider-admin-network-inventory__col-status">Status</Th>
                    <Th width={25}>Virtual network</Th>
                    <Th width={15}>Inbound rules</Th>
                    <Th width={15}>Outbound rules</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSecurityGroups.map((group) => (
                    <Tr key={group.id}>
                      <Td
                        dataLabel="Name"
                        className="provider-admin-network-inventory__col-name"
                      >
                        <Content component="p" className="tenant-admin-networking__primary-cell">
                          <Button
                            variant="link"
                            isInline
                            className="catalog-table-name-link"
                            onClick={() => {
                              setSelectedGroup(group)
                              setIsDetailsOpen(true)
                            }}
                          >
                            {group.name}
                          </Button>
                        </Content>
                        <Content component="p" className="tenant-admin-networking__meta-cell">
                          <code>{group.id}</code>
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
                      <Td dataLabel="Virtual network">
                        {(() => {
                          const network = getVirtualNetwork(group.virtualNetworkId)
                          const name = network?.name ?? group.virtualNetworkId
                          const cidr = network?.cidr
                          return (
                            <>
                              <Content
                                component="p"
                                className="tenant-admin-networking__primary-cell"
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
                                  className="tenant-admin-networking__meta-cell"
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
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </div>
      </SecurityGroupDetailsDrawer>
    )
  }

  return (
    <VirtualNetworkDetailsDrawer
      isExpanded={isDetailsOpen}
      network={selectedNetwork}
      onClose={() => setIsDetailsOpen(false)}
      onEdit={() => undefined}
      onDelete={() => undefined}
      onNavigateToSubnet={onNavigateToSubnet}
      onNavigateToSecurityGroup={onNavigateToSecurityGroup}
    >
      <div className="tenant-admin-workspace-page tenant-admin-networking">
        <TenantAdminWorkspacePageHeader
          kicker="Networking"
          title={meta.title}
          lede={meta.lede}
          action={
            <Button
              variant="primary"
              icon={<PlusIcon />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create virtual network
            </Button>
          }
        />

        {toolbar}

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
              className="catalog-data-table tenant-admin-networking__table"
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
                      <Content component="p" className="tenant-admin-networking__primary-cell">
                        <Button
                          variant="link"
                          isInline
                          className="catalog-table-name-link"
                          onClick={() => {
                            setSelectedNetwork(network)
                            setIsDetailsOpen(true)
                          }}
                        >
                          {network.name}
                        </Button>
                      </Content>
                      <Content component="p" className="tenant-admin-networking__meta-cell">
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
                          {
                            title: 'View details',
                            onClick: () => {
                              setSelectedNetwork(network)
                              setIsDetailsOpen(true)
                            },
                          },
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
          onCreated={() => {
            setNetworks(getProviderVirtualNetworks())
            setSubnets(getProviderSubnets())
            setSecurityGroups(getProviderSecurityGroups())
          }}
        />
      </div>
    </VirtualNetworkDetailsDrawer>
  )
}

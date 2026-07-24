import { useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button, Content } from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CreateSubnetModal } from '../../components/provider-admin/CreateSubnetModal'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { getProviderSubnets, getProviderVirtualNetworks } from '../../providerSetup/storage'

export function ProviderAdminSubnetsPage() {
  const [subnets, setSubnets] = useState(() => getProviderSubnets())
  const [virtualNetworks, setVirtualNetworks] = useState(() => getProviderVirtualNetworks())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const refresh = () => {
    setSubnets(getProviderSubnets())
    setVirtualNetworks(getProviderVirtualNetworks())
  }

  const getVirtualNetworkName = (virtualNetworkId: string) =>
    virtualNetworks.find((network) => network.id === virtualNetworkId)?.name ?? virtualNetworkId

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

      <Table
        aria-label="Subnets"
        variant="compact"
        borders={false}
        className="provider-admin-network-inventory__table"
      >
        <Thead>
          <Tr>
            <Th modifier="wrap">Subnet</Th>
            <Th modifier="wrap">CIDR</Th>
            <Th modifier="wrap">VLAN</Th>
            <Th modifier="wrap">Virtual network</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {subnets.map((subnet) => (
            <Tr key={subnet.id}>
              <Td dataLabel="Subnet">
                <Content component="p" className="provider-admin-network-inventory__primary-cell">
                  {subnet.name}
                </Content>
                <Content component="p" className="provider-admin-network-inventory__meta-cell">
                  {subnet.detail}
                </Content>
              </Td>
              <Td dataLabel="CIDR">
                <code>{subnet.cidr}</code>
              </Td>
              <Td dataLabel="VLAN">{subnet.vlan}</Td>
              <Td dataLabel="Virtual network">{getVirtualNetworkName(subnet.virtualNetworkId)}</Td>
              <Td isActionCell>
                <ActionsColumn
                  items={[
                    { title: 'Edit subnet', onClick: () => undefined },
                    { isSeparator: true },
                    { title: 'Delete subnet', onClick: () => undefined },
                  ]}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <CreateSubnetModal
        isOpen={isCreateModalOpen}
        virtualNetworks={virtualNetworks}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  )
}

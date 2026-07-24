import { useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button, Content } from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CreateVirtualNetworkModal } from '../../components/provider-admin/CreateVirtualNetworkModal'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { getProviderVirtualNetworks } from '../../providerSetup/storage'

export function ProviderAdminVirtualNetworksPage() {
  const [networks, setNetworks] = useState(() => getProviderVirtualNetworks())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <div className="provider-admin-workspace-page provider-admin-network-inventory">
      <ProviderAdminWorkspacePageHeader
        kicker="Networking"
        title="Virtual networks"
        lede="Manage provider virtual networks that catalog offerings can use as defaults."
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

      <Table
        aria-label="Virtual networks"
        variant="compact"
        borders={false}
        className="provider-admin-network-inventory__table"
      >
        <Thead>
          <Tr>
            <Th modifier="wrap">Network</Th>
            <Th modifier="wrap">CIDR</Th>
            <Th modifier="wrap">Data center</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {networks.map((network) => (
            <Tr key={network.id}>
              <Td dataLabel="Network">
                <Content component="p" className="provider-admin-network-inventory__primary-cell">
                  {network.name}
                </Content>
                <Content component="p" className="provider-admin-network-inventory__meta-cell">
                  {network.detail}
                </Content>
              </Td>
              <Td dataLabel="CIDR">
                <code>{network.cidr}</code>
              </Td>
              <Td dataLabel="Data center">{network.dataCenter}</Td>
              <Td isActionCell>
                <ActionsColumn
                  items={[
                    { title: 'Edit network', onClick: () => undefined },
                    { isSeparator: true },
                    { title: 'Delete network', onClick: () => undefined },
                  ]}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <CreateVirtualNetworkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => setNetworks(getProviderVirtualNetworks())}
      />
    </div>
  )
}

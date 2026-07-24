import { useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button, Content } from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CreateSecurityGroupModal } from '../../components/provider-admin/CreateSecurityGroupModal'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { getProviderSecurityGroups } from '../../providerSetup/storage'

export function ProviderAdminSecurityGroupsPage() {
  const [groups, setGroups] = useState(() => getProviderSecurityGroups())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
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
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create security group
          </Button>
        }
      />

      <Table
        aria-label="Security groups"
        variant="compact"
        borders={false}
        className="provider-admin-network-inventory__table"
      >
        <Thead>
          <Tr>
            <Th modifier="wrap">Security group</Th>
            <Th modifier="wrap">Description</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {groups.map((group) => (
            <Tr key={group.id}>
              <Td dataLabel="Security group">
                <Content component="p" className="provider-admin-network-inventory__primary-cell">
                  {group.name}
                </Content>
                <Content component="p" className="provider-admin-network-inventory__meta-cell">
                  <code>{group.id}</code>
                </Content>
              </Td>
              <Td dataLabel="Description">{group.detail}</Td>
              <Td isActionCell>
                <ActionsColumn
                  items={[
                    { title: 'Edit security group', onClick: () => undefined },
                    { isSeparator: true },
                    { title: 'Delete security group', onClick: () => undefined },
                  ]}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <CreateSecurityGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => setGroups(getProviderSecurityGroups())}
      />
    </div>
  )
}

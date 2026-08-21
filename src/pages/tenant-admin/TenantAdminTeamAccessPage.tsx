import { Button, Content } from '@patternfly/react-core'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { TenantAdminWorkspacePageHeader } from '../../components/tenant-admin/TenantAdminWorkspacePageHeader'
import type { TenantTeamMember } from '../../tenantAdmin/storage'

type TenantAdminTeamAccessPageProps = {
  teamMembers: TenantTeamMember[]
}

export function TenantAdminTeamAccessPage({ teamMembers }: TenantAdminTeamAccessPageProps) {
  return (
    <div className="tenant-admin-workspace-page tenant-admin-team-access">
      <TenantAdminWorkspacePageHeader
        kicker="Tenant"
        title="Team access"
        lede="Manage tenant users who can sign in and provision from your assigned catalog."
        action={
          <Button variant="primary" icon={<PlusIcon />} isDisabled>
            Invite team member
          </Button>
        }
      />

      {teamMembers.length > 0 ? (
        <Table
          aria-label="Team members"
          variant="compact"
          borders={false}
          className="tenant-admin-team-access__table"
        >
          <Thead>
            <Tr>
              <Th modifier="wrap">Name</Th>
              <Th modifier="wrap">Email</Th>
              <Th modifier="wrap">Role</Th>
            </Tr>
          </Thead>
          <Tbody>
            {teamMembers.map((member) => (
              <Tr key={member.id}>
                <Td dataLabel="Name">{member.name}</Td>
                <Td dataLabel="Email">{member.email}</Td>
                <Td dataLabel="Role">{member.role}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Content component="p" className="tenant-admin-team-access__empty">
          No team members invited yet. Add users during onboarding or invite them here.
        </Content>
      )}
    </div>
  )
}

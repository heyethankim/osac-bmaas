import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { AddTenantAdministratorWizard } from '../../components/tenant-admin/AddTenantAdministratorWizard'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  listTenantAdministrators,
  removeAdditionalTenantAdministrator,
  TENANT_ADMINISTRATORS_DEMO,
  type TenantAdministrator,
} from '../../tenantAdmin/administrators'

type AdministratorRoleFilter = 'all' | 'primary' | 'additional'

type TenantAdminAdministratorsPageProps = {
  organization: RegisteredOrganization
  onOrganizationChange: (organization: RegisteredOrganization) => void
}

export function TenantAdminAdministratorsPage({
  organization,
  onOrganizationChange,
}: TenantAdminAdministratorsPageProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedRole, setSelectedRole] = useState<AdministratorRoleFilter>('all')
  const [administratorPendingRemove, setAdministratorPendingRemove] =
    useState<TenantAdministrator | null>(null)
  const administrators = listTenantAdministrators(organization)

  const filteredAdministrators = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return administrators.filter((admin) => {
      if (selectedRole === 'primary' && !admin.isPrimary) {
        return false
      }

      if (selectedRole === 'additional' && admin.isPrimary) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        admin.name.toLowerCase().includes(query) || admin.email.toLowerCase().includes(query)
      )
    })
  }, [administrators, searchValue, selectedRole])

  const closeRemoveAdministrator = () => {
    setAdministratorPendingRemove(null)
  }

  const handleConfirmRemoveAdministrator = () => {
    if (!administratorPendingRemove) {
      return
    }

    const updated = removeAdditionalTenantAdministrator(
      organization,
      administratorPendingRemove.email,
    )
    if (updated) {
      onOrganizationChange(updated)
    }
    setAdministratorPendingRemove(null)
  }

  const removeAdministratorModal = (
    <Modal
      variant={ModalVariant.small}
      isOpen={administratorPendingRemove !== null}
      onClose={closeRemoveAdministrator}
      aria-labelledby="remove-administrator-title"
      aria-describedby="remove-administrator-description"
    >
      <ModalHeader
        title="Are you sure?"
        titleIconVariant="warning"
        labelId="remove-administrator-title"
      />
      <ModalBody>
        <Content component="p" id="remove-administrator-description">
          {administratorPendingRemove ? (
            <>
              <strong>{administratorPendingRemove.name}</strong> will lose tenant admin access to
              this organization. This cannot be undone.
            </>
          ) : (
            'This administrator will lose tenant admin access to this organization.'
          )}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" onClick={handleConfirmRemoveAdministrator}>
          Remove
        </Button>
        <Button variant="link" onClick={closeRemoveAdministrator}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )

  if (isWizardOpen) {
    return (
      <>
        <AddTenantAdministratorWizard
          isOpen
          organization={organization}
          onClose={() => setIsWizardOpen(false)}
          onAdded={onOrganizationChange}
        />
        {removeAdministratorModal}
      </>
    )
  }

  return (
    <div className="provider-admin-workspace-page tenant-admin-administration">
      <ProviderAdminWorkspacePageHeader
        kicker="Organization"
        title={TENANT_ADMINISTRATORS_DEMO.title}
        lede={TENANT_ADMINISTRATORS_DEMO.lede}
        action={
          <Button
            variant="primary"
            icon={<PlusIcon />}
            className="provider-admin-workspace-page__action"
            onClick={() => setIsWizardOpen(true)}
          >
            {TENANT_ADMINISTRATORS_DEMO.addAdministratorLabel}
          </Button>
        }
      />

      <div className="catalog-view-toolbar">
        <div className="catalog-view-toolbar__start">
          <FormSelect
            className="catalog-status-filter"
            id="tenant-administration-role-filter"
            value={selectedRole}
            onChange={(_event, value) => setSelectedRole(value as AdministratorRoleFilter)}
            aria-label="Filter administrators by role"
          >
            <FormSelectOption value="all" label="All roles" />
            <FormSelectOption
              value="primary"
              label={TENANT_ADMINISTRATORS_DEMO.primaryRoleLabel}
            />
            <FormSelectOption
              value="additional"
              label={TENANT_ADMINISTRATORS_DEMO.additionalRoleLabel}
            />
          </FormSelect>
          <SearchInput
            className="catalog-search"
            placeholder="Search administrators"
            value={searchValue}
            onChange={(_event, value) => setSearchValue(value)}
            onClear={() => setSearchValue('')}
            aria-label="Search administrators"
          />
        </div>
      </div>

      {filteredAdministrators.length === 0 ? (
        <EmptyState>
          <Title headingLevel="h2" size="lg">
            {TENANT_ADMINISTRATORS_DEMO.emptyTitle}
          </Title>
          <EmptyStateBody>{TENANT_ADMINISTRATORS_DEMO.emptyBody}</EmptyStateBody>
        </EmptyState>
      ) : (
        <div className="catalog-table-panel">
          <Content component="p" className="catalog-table-result-count">
            {formatCatalogTableResultCount(filteredAdministrators.length, 'administrator')}
          </Content>
          <Table
            aria-label="Tenant administrators"
            className="catalog-data-table tenant-admin-administration__table"
          >
            <Thead>
              <Tr>
                <Th className="tenant-admin-administration__col-name">Name</Th>
                <Th className="tenant-admin-administration__col-role">Role</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {filteredAdministrators.map((admin) => (
                <AdministratorRow
                  key={admin.email}
                  admin={admin}
                  onRequestRemove={setAdministratorPendingRemove}
                />
              ))}
            </Tbody>
          </Table>
        </div>
      )}
      {removeAdministratorModal}
    </div>
  )
}

type AdministratorRowProps = {
  admin: TenantAdministrator
  onRequestRemove: (admin: TenantAdministrator) => void
}

function AdministratorRow({ admin, onRequestRemove }: AdministratorRowProps) {
  return (
    <Tr>
      <Td dataLabel="Name" className="tenant-admin-administration__col-name">
        <Content component="p" className="tenant-admin-administration__primary-cell">
          {admin.name}
        </Content>
        <Content component="p" className="tenant-admin-administration__meta-cell">
          {admin.email}
        </Content>
      </Td>
      <Td dataLabel="Role" className="tenant-admin-administration__col-role">
        <Label color={admin.isPrimary ? 'blue' : 'grey'} isCompact>
          {admin.isPrimary
            ? TENANT_ADMINISTRATORS_DEMO.primaryRoleLabel
            : TENANT_ADMINISTRATORS_DEMO.additionalRoleLabel}
        </Label>
      </Td>
      <Td isActionCell>
        {admin.isPrimary ? null : (
          <ActionsColumn
            items={[
              {
                title: 'Remove',
                isDanger: true,
                onClick: () => onRequestRemove(admin),
              },
            ]}
          />
        )}
      </Td>
    </Tr>
  )
}

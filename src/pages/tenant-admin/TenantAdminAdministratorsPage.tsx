import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
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
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { AddTenantAdministratorWizard } from '../../components/tenant-admin/AddTenantAdministratorWizard'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  ASSIGNABLE_TENANT_ROLES,
  buildAdministratorFilterParts,
  getAssignableTenantRole,
  listRoleAssignments,
  listTenantAdministrators,
  removeAdditionalTenantAdministrator,
  removeRoleAssignment,
  TENANT_ADMINISTRATORS_DEMO,
  type AdministratorRoleFilter,
  type AdministratorStatusFilter,
  type TenantAdministrator,
} from '../../tenantAdmin/administrators'

type TenantAdminAdministratorsPageProps = {
  organization: RegisteredOrganization
  onOrganizationChange: (organization: RegisteredOrganization) => void
  title?: string
  lede?: string
  addAdministratorLabel?: string
  wizardTitle?: string
  wizardSubmitLabel?: string
  emptyUnfilteredTitle?: string
  emptyUnfilteredBody?: string
  emptyFirstActionLabel?: string
  showAssignmentStatus?: boolean
  showRoleCatalog?: boolean
}

export function TenantAdminAdministratorsPage({
  organization,
  onOrganizationChange,
  title = TENANT_ADMINISTRATORS_DEMO.title,
  lede = TENANT_ADMINISTRATORS_DEMO.lede,
  addAdministratorLabel = TENANT_ADMINISTRATORS_DEMO.addAdministratorLabel,
  wizardTitle = 'Add tenant administrator',
  wizardSubmitLabel = TENANT_ADMINISTRATORS_DEMO.addAdministratorLabel,
  emptyUnfilteredTitle = 'No tenant administrators',
  emptyUnfilteredBody = TENANT_ADMINISTRATORS_DEMO.emptyOnlyPrimaryBody,
  emptyFirstActionLabel,
  showAssignmentStatus = false,
  showRoleCatalog = false,
}: TenantAdminAdministratorsPageProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedRole, setSelectedRole] = useState<AdministratorRoleFilter>('all')
  const [selectedStatus, setSelectedStatus] = useState<AdministratorStatusFilter>('all')
  const [administratorPendingRemove, setAdministratorPendingRemove] =
    useState<TenantAdministrator | null>(null)
  const administrators = showRoleCatalog
    ? listRoleAssignments(organization)
    : listTenantAdministrators(organization)
  const assignmentStatus = (organization.identityProviders?.length ?? 0) > 0 ? 'Active' : 'Pending'

  const filteredAdministrators = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return administrators.filter((admin) => {
      if (showAssignmentStatus && selectedStatus !== 'all' && assignmentStatus !== selectedStatus) {
        return false
      }

      if (selectedRole !== 'all' && admin.roleId !== selectedRole) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        admin.name.toLowerCase().includes(query) || admin.email.toLowerCase().includes(query)
      )
    })
  }, [
    administrators,
    assignmentStatus,
    searchValue,
    selectedRole,
    selectedStatus,
    showAssignmentStatus,
  ])

  const filterDescriptionParts = useMemo(
    () =>
      buildAdministratorFilterParts(
        searchValue,
        selectedRole,
        showAssignmentStatus ? selectedStatus : 'all',
      ),
    [searchValue, selectedRole, selectedStatus, showAssignmentStatus],
  )

  const isUnfilteredEmpty = administrators.length === 0
  const firstActionLabel = emptyFirstActionLabel ?? addAdministratorLabel

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedRole('all')
    setSelectedStatus('all')
  }

  const closeRemoveAdministrator = () => {
    setAdministratorPendingRemove(null)
  }

  const handleConfirmRemoveAdministrator = () => {
    if (!administratorPendingRemove) {
      return
    }

    const updated = showRoleCatalog
      ? removeRoleAssignment(organization, administratorPendingRemove.email)
      : removeAdditionalTenantAdministrator(organization, administratorPendingRemove.email)
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
              <strong>{administratorPendingRemove.name}</strong>{' '}
              {showRoleCatalog
                ? 'will lose this role assignment for this tenant.'
                : 'will lose tenant admin access to this tenant.'}{' '}
              This cannot be undone.
            </>
          ) : (
            'This administrator will lose tenant admin access to this tenant.'
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
          parentLabel={title}
          title={wizardTitle}
          submitLabel={wizardSubmitLabel}
          showRoleCatalog={showRoleCatalog}
        />
        {removeAdministratorModal}
      </>
    )
  }

  return (
    <div className="provider-admin-workspace-page tenant-admin-administration">
      <ProviderAdminWorkspacePageHeader
        kicker="Tenant"
        title={title}
        lede={lede}
        action={
          isUnfilteredEmpty ? undefined : (
            <Button
              variant="primary"
              icon={<PlusIcon />}
              className="provider-admin-workspace-page__action"
              onClick={() => setIsWizardOpen(true)}
            >
              {addAdministratorLabel}
            </Button>
          )
        }
      />

      {isUnfilteredEmpty ? (
        <EmptyState className="catalog-filter-empty provider-admin-organizations__empty">
          <Title headingLevel="h2" size="lg">
            {emptyUnfilteredTitle}
          </Title>
          <EmptyStateBody className="catalog-filter-empty__body">
            {emptyUnfilteredBody}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                icon={<PlusIcon />}
                onClick={() => setIsWizardOpen(true)}
              >
                {firstActionLabel}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <>
          <div className="catalog-view-toolbar">
            <div className="catalog-view-toolbar__start">
              {showAssignmentStatus ? (
                <FormSelect
                  className="catalog-status-filter"
                  id="tenant-administration-status-filter"
                  value={selectedStatus}
                  onChange={(_event, value) =>
                    setSelectedStatus(value as AdministratorStatusFilter)
                  }
                  aria-label="Filter by status"
                >
                  <FormSelectOption value="all" label="All Statuses" />
                  <FormSelectOption value="Pending" label="Pending" />
                  <FormSelectOption value="Active" label="Active" />
                </FormSelect>
              ) : null}
              <FormSelect
                className="catalog-status-filter"
                id="tenant-administration-role-filter"
                value={selectedRole}
                onChange={(_event, value) => setSelectedRole(value as AdministratorRoleFilter)}
                aria-label="Filter by role"
              >
                <FormSelectOption value="all" label="All Roles" />
                {(showRoleCatalog ? ASSIGNABLE_TENANT_ROLES : ASSIGNABLE_TENANT_ROLES.slice(0, 1)).map(
                  (role) => (
                    <FormSelectOption key={role.id} value={role.id} label={role.label} />
                  ),
                )}
              </FormSelect>
              <SearchInput
                className="catalog-search"
                placeholder={showRoleCatalog ? 'Search by name or email' : 'Search administrators'}
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search administrators"
              />
            </div>
          </div>

          {filteredAdministrators.length === 0 ? (
            <CatalogFilterEmptyState
              title={
                showRoleCatalog
                  ? 'No assignments match your filters'
                  : TENANT_ADMINISTRATORS_DEMO.emptyTitle
              }
              description={TENANT_ADMINISTRATORS_DEMO.emptyBody}
              onClearFilters={clearAllFilters}
            />
          ) : (
            <div className="catalog-table-panel">
              <CatalogFilterResultsSummary
                filteredCount={filteredAdministrators.length}
                totalCount={administrators.length}
                singular={showRoleCatalog ? 'assignment' : 'administrator'}
                filterParts={filterDescriptionParts}
                onClearFilters={clearAllFilters}
              />
              <Table
                aria-label="Tenant administrators"
                className={[
                  'catalog-data-table',
                  'tenant-admin-administration__table',
                  showAssignmentStatus
                    ? 'tenant-admin-administration__table--with-status'
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Thead>
                  <Tr>
                    <Th className="tenant-admin-administration__col-name">Name</Th>
                    {showAssignmentStatus ? (
                      <Th className="tenant-admin-administration__col-status">Status</Th>
                    ) : null}
                    <Th className="tenant-admin-administration__col-role">Role</Th>
                    {showAssignmentStatus ? (
                      <Th className="tenant-admin-administration__col-description">Description</Th>
                    ) : null}
                    <Th screenReaderText="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredAdministrators.map((admin) => (
                    <AdministratorRow
                      key={`${admin.roleId}:${admin.email}`}
                      admin={admin}
                      assignmentStatus={showAssignmentStatus ? assignmentStatus : null}
                      allowRemovePrimary={showRoleCatalog}
                      onRequestRemove={setAdministratorPendingRemove}
                    />
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </>
      )}
      {removeAdministratorModal}
    </div>
  )
}

type AdministratorAssignmentStatus = 'Pending' | 'Active'

type AdministratorRowProps = {
  admin: TenantAdministrator
  assignmentStatus: AdministratorAssignmentStatus | null
  allowRemovePrimary?: boolean
  onRequestRemove: (admin: TenantAdministrator) => void
}

function AdministratorRow({
  admin,
  assignmentStatus,
  allowRemovePrimary = false,
  onRequestRemove,
}: AdministratorRowProps) {
  const role = getAssignableTenantRole(admin.roleId)

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
      {assignmentStatus ? (
        <Td dataLabel="Status" className="tenant-admin-administration__col-status">
          <Label color={assignmentStatus === 'Active' ? 'green' : 'orange'} isCompact>
            {assignmentStatus}
          </Label>
        </Td>
      ) : null}
      <Td dataLabel="Role" className="tenant-admin-administration__col-role">
        <Label color={role.color} isCompact>
          {role.label}
        </Label>
      </Td>
      {assignmentStatus ? (
        <Td
          dataLabel="Description"
          className="tenant-admin-administration__col-description"
          modifier="nowrap"
        >
          {role.description}
        </Td>
      ) : null}
      <Td isActionCell>
        {admin.isPrimary && !allowRemovePrimary ? null : (
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

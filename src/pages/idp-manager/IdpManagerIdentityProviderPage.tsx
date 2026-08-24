import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
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
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { ConnectIdentityProviderWizard } from '../../components/idp-manager/ConnectIdentityProviderWizard'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { IDP_MANAGER_IDENTITY_PROVIDER_COPY } from '../../idpManager/constants'
import {
  buildIdentityProviderFilterParts,
  removeOrganizationIdentityProvider,
  type IdentityProviderProtocolFilter,
  type IdentityProviderStatusFilter,
} from '../../idpManager/identityProviders'
import {
  identityProviderProtocolLabel,
  resolveOrganizationIdentityProviders,
  type OrganizationIdentityProvider,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'

type IdpManagerIdentityProviderPageProps = {
  organization: RegisteredOrganization
  onOrganizationChange: (organization: RegisteredOrganization) => void
  onBackToTenants?: () => void
  onBackToTenantDetails?: () => void
}

export function IdpManagerIdentityProviderPage({
  organization,
  onOrganizationChange,
  onBackToTenants,
  onBackToTenantDetails,
}: IdpManagerIdentityProviderPageProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<OrganizationIdentityProvider | null>(
    null,
  )
  const [providerPendingRemove, setProviderPendingRemove] =
    useState<OrganizationIdentityProvider | null>(null)
  const [providerPendingView, setProviderPendingView] =
    useState<OrganizationIdentityProvider | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedProtocol, setSelectedProtocol] =
    useState<IdentityProviderProtocolFilter>('all')
  const [selectedStatus, setSelectedStatus] = useState<IdentityProviderStatusFilter>('all')
  const providers = resolveOrganizationIdentityProviders(organization)

  const filteredProviders = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return providers.filter((provider) => {
      if (selectedProtocol !== 'all' && provider.protocol !== selectedProtocol) {
        return false
      }

      if (selectedStatus !== 'all' && selectedStatus !== 'Connected') {
        return false
      }

      if (!query) {
        return true
      }

      return (
        provider.displayName.toLowerCase().includes(query) ||
        provider.clientId.toLowerCase().includes(query) ||
        provider.issuerUrl.toLowerCase().includes(query) ||
        identityProviderProtocolLabel(provider.protocol).toLowerCase().includes(query)
      )
    })
  }, [providers, searchValue, selectedProtocol, selectedStatus])

  const filterDescriptionParts = useMemo(
    () => buildIdentityProviderFilterParts(searchValue, selectedProtocol, selectedStatus),
    [searchValue, selectedProtocol, selectedStatus],
  )

  const hasActiveFilters =
    Boolean(searchValue.trim()) || selectedProtocol !== 'all' || selectedStatus !== 'all'

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedProtocol('all')
    setSelectedStatus('all')
  }

  const openCreateWizard = () => {
    setEditingProvider(null)
    setIsWizardOpen(true)
  }

  const openEditWizard = (provider: OrganizationIdentityProvider) => {
    setEditingProvider(provider)
    setIsWizardOpen(true)
  }

  const closeWizard = () => {
    setIsWizardOpen(false)
    setEditingProvider(null)
  }

  const handleConfirmRemove = () => {
    if (!providerPendingRemove) {
      return
    }
    const updated = removeOrganizationIdentityProvider(organization, providerPendingRemove.id)
    if (updated) {
      onOrganizationChange(updated)
    }
    setProviderPendingRemove(null)
  }

  const getProviderActions = (provider: OrganizationIdentityProvider): IAction[] => [
    {
      title: 'View IdP information',
      onClick: () => setProviderPendingView(provider),
    },
    {
      title: 'Edit',
      onClick: () => openEditWizard(provider),
    },
    {
      isSeparator: true,
    },
    {
      title: 'Remove',
      isDanger: true,
      onClick: () => setProviderPendingRemove(provider),
    },
  ]

  if (isWizardOpen) {
    return (
      <ConnectIdentityProviderWizard
        isOpen
        organization={organization}
        editingProvider={editingProvider}
        breadcrumbAncestors={
          onBackToTenants
            ? [
                { label: 'Tenants', onNavigate: onBackToTenants },
                {
                  label: organization.name,
                  onNavigate: onBackToTenantDetails,
                },
              ]
            : undefined
        }
        onClose={closeWizard}
        onSaved={onOrganizationChange}
      />
    )
  }

  return (
    <div className="provider-admin-workspace-page tenant-admin-administration idp-manager-identity-provider">
      {onBackToTenants ? (
        <Breadcrumb
          className="idp-manager-identity-provider__breadcrumb"
          aria-label="Identity providers breadcrumb"
        >
          <BreadcrumbItem
            to="#"
            onClick={(event) => {
              event.preventDefault()
              onBackToTenants()
            }}
          >
            Tenants
          </BreadcrumbItem>
          <BreadcrumbItem
            to={onBackToTenantDetails ? '#' : undefined}
            onClick={
              onBackToTenantDetails
                ? (event) => {
                    event.preventDefault()
                    onBackToTenantDetails()
                  }
                : undefined
            }
            isActive={!onBackToTenantDetails}
          >
            {organization.name}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{IDP_MANAGER_IDENTITY_PROVIDER_COPY.title}</BreadcrumbItem>
        </Breadcrumb>
      ) : null}
      <ProviderAdminWorkspacePageHeader
        title={IDP_MANAGER_IDENTITY_PROVIDER_COPY.title}
        lede={IDP_MANAGER_IDENTITY_PROVIDER_COPY.lede}
        action={
          providers.length > 0 ? (
            <Button
              variant="primary"
              icon={<PlusIcon />}
              className="provider-admin-workspace-page__action"
              onClick={openCreateWizard}
            >
              {IDP_MANAGER_IDENTITY_PROVIDER_COPY.addLabel}
            </Button>
          ) : undefined
        }
      />

      {providers.length === 0 ? (
        <EmptyState className="catalog-filter-empty provider-admin-organizations__empty">
          <Title headingLevel="h2" size="lg">
            {IDP_MANAGER_IDENTITY_PROVIDER_COPY.emptyTitle}
          </Title>
          <EmptyStateBody className="catalog-filter-empty__body">
            {IDP_MANAGER_IDENTITY_PROVIDER_COPY.emptyBody}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" icon={<PlusIcon />} onClick={openCreateWizard}>
                {IDP_MANAGER_IDENTITY_PROVIDER_COPY.connectFirstLabel}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <>
          <div className="catalog-view-toolbar">
            <div className="catalog-view-toolbar__start">
              <FormSelect
                className="catalog-status-filter"
                id="idp-manager-status-filter"
                value={selectedStatus}
                onChange={(_event, value) =>
                  setSelectedStatus(value as IdentityProviderStatusFilter)
                }
                aria-label="Filter by status"
              >
                <FormSelectOption value="all" label="All Statuses" />
                <FormSelectOption value="Connected" label="Connected" />
              </FormSelect>
              <FormSelect
                className="catalog-status-filter"
                id="idp-manager-protocol-filter"
                value={selectedProtocol}
                onChange={(_event, value) =>
                  setSelectedProtocol(value as IdentityProviderProtocolFilter)
                }
                aria-label="Filter by protocol"
              >
                <FormSelectOption value="all" label="All protocols" />
                <FormSelectOption value="OIDC" label="OIDC" />
                <FormSelectOption value="SAML" label="SAML" />
              </FormSelect>
              <SearchInput
                className="catalog-search"
                placeholder="Search identity providers"
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search identity providers"
              />
            </div>
          </div>

          {filteredProviders.length === 0 ? (
            <CatalogFilterEmptyState
              title={IDP_MANAGER_IDENTITY_PROVIDER_COPY.filterEmptyTitle}
              description={IDP_MANAGER_IDENTITY_PROVIDER_COPY.filterEmptyBody}
              onClearFilters={clearAllFilters}
            />
          ) : (
            <div className="catalog-table-panel">
              <CatalogFilterResultsSummary
                filteredCount={filteredProviders.length}
                totalCount={providers.length}
                singular="identity provider"
                filterParts={filterDescriptionParts}
                onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
              />
              <Table
                aria-label="Identity providers"
                className="catalog-data-table tenant-admin-administration__table idp-manager-identity-provider__table"
              >
                <Thead>
                  <Tr>
                    <Th className="tenant-admin-administration__col-name">Display name</Th>
                    <Th className="tenant-admin-administration__col-status">Status</Th>
                    <Th className="tenant-admin-administration__col-role">Protocol</Th>
                    <Th className="idp-manager-identity-provider__col-issuer">Issuer URL</Th>
                    <Th screenReaderText="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredProviders.map((provider) => (
                    <Tr key={provider.id}>
                      <Td
                        dataLabel="Display name"
                        className="tenant-admin-administration__col-name"
                      >
                        <Content
                          component="p"
                          className="tenant-admin-administration__primary-cell"
                        >
                          {provider.displayName}
                        </Content>
                        <Content
                          component="p"
                          className="tenant-admin-administration__meta-cell"
                        >
                          {provider.clientId}
                        </Content>
                      </Td>
                      <Td
                        dataLabel="Status"
                        className="tenant-admin-administration__col-status"
                      >
                        <Label color="green" isCompact>
                          Connected
                        </Label>
                      </Td>
                      <Td
                        dataLabel="Protocol"
                        className="tenant-admin-administration__col-role"
                      >
                        <Label color="grey" isCompact>
                          {identityProviderProtocolLabel(provider.protocol)}
                        </Label>
                      </Td>
                      <Td
                        dataLabel="Issuer URL"
                        className="idp-manager-identity-provider__col-issuer"
                        modifier="nowrap"
                      >
                        {provider.issuerUrl}
                      </Td>
                      <Td isActionCell>
                        <ActionsColumn items={getProviderActions(provider)} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </>
      )}

      <Modal
        variant={ModalVariant.medium}
        isOpen={providerPendingView !== null}
        onClose={() => setProviderPendingView(null)}
        aria-labelledby="identity-provider-information-title"
        aria-describedby="identity-provider-information-description"
      >
        <ModalHeader
          title="IdP information"
          labelId="identity-provider-information-title"
        />
        <ModalBody>
          {providerPendingView ? (
            <DescriptionList
              isCompact
              className="idp-manager-identity-provider__details"
              aria-labelledby="identity-provider-information-title"
              id="identity-provider-information-description"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Display name</DescriptionListTerm>
                <DescriptionListDescription>
                  {providerPendingView.displayName}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Status</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label color="green" isCompact>
                    Connected
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Protocol</DescriptionListTerm>
                <DescriptionListDescription>
                  {identityProviderProtocolLabel(providerPendingView.protocol)}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  {providerPendingView.protocol === 'SAML' ? 'Metadata URL' : 'Issuer URL'}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {providerPendingView.issuerUrl}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  {providerPendingView.protocol === 'SAML' ? 'Entity ID' : 'Client ID'}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {providerPendingView.clientId}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={() => setProviderPendingView(null)}>
            Close
          </Button>
          <Button
            variant="link"
            onClick={() => {
              if (!providerPendingView) {
                return
              }
              const provider = providerPendingView
              setProviderPendingView(null)
              openEditWizard(provider)
            }}
          >
            Edit
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant={ModalVariant.small}
        isOpen={providerPendingRemove !== null}
        onClose={() => setProviderPendingRemove(null)}
        aria-labelledby="remove-identity-provider-title"
        aria-describedby="remove-identity-provider-description"
      >
        <ModalHeader
          title="Are you sure?"
          titleIconVariant="warning"
          labelId="remove-identity-provider-title"
        />
        <ModalBody>
          <Content component="p" id="remove-identity-provider-description">
            {providerPendingRemove ? (
              <>
                <strong>{providerPendingRemove.displayName}</strong> will be disconnected. Users
                who authenticate through this identity provider will no longer be able to sign in.
              </>
            ) : (
              'This identity provider will be disconnected.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleConfirmRemove}>
            Remove
          </Button>
          <Button variant="link" onClick={() => setProviderPendingRemove(null)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

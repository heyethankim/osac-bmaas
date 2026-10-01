import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
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
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import {
  IDENTITY_PROVIDER_CARD_ICON,
  renderInventoryCardIcon,
} from '../../components/catalog/inventoryCardIcons'
import { ConnectIdentityProviderWizard } from '../../components/idp-manager/ConnectIdentityProviderWizard'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import {
  getAdministrationViewMode,
  setAdministrationViewMode,
  type ViewMode,
} from '../../catalog/viewMode'
import { IDP_MANAGER_IDENTITY_PROVIDER_COPY } from '../../idpManager/constants'
import {
  WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER,
  getWorkspaceActionParam,
  syncWorkspaceActionParam,
} from '../../shared/workspaceNavUrl'
import {
  buildIdentityProviderFilterParts,
  removeOrganizationIdentityProvider,
  type IdentityProviderProtocolFilter,
  type IdentityProviderStatusFilter,
} from '../../idpManager/identityProviders'
import {
  identityProviderProtocolLabel,
  resolveOrganizationIdentityProviders,
  type IdentityProviderConnectedBy,
  type OrganizationIdentityProvider,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'

type IdpManagerIdentityProviderPageProps = {
  organization: RegisteredOrganization
  onOrganizationChange: (organization: RegisteredOrganization) => void
  onBackToTenants?: () => void
  onBackToTenantDetails?: () => void
  identityProviderConnectedBy: IdentityProviderConnectedBy
}

export function IdpManagerIdentityProviderPage({
  organization,
  onOrganizationChange,
  onBackToTenants,
  onBackToTenantDetails,
  identityProviderConnectedBy,
}: IdpManagerIdentityProviderPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<OrganizationIdentityProvider | null>(
    null,
  )
  const [providerPendingRemove, setProviderPendingRemove] =
    useState<OrganizationIdentityProvider | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedProtocol, setSelectedProtocol] =
    useState<IdentityProviderProtocolFilter>('all')
  const [selectedStatus, setSelectedStatus] = useState<IdentityProviderStatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getAdministrationViewMode())
  const providers = resolveOrganizationIdentityProviders(organization)

  useEffect(() => {
    const isCreateAction =
      getWorkspaceActionParam(searchParams) === WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER
    if (isCreateAction) {
      setEditingProvider(null)
      setIsWizardOpen(true)
      return
    }
    if (!editingProvider) {
      setIsWizardOpen(false)
    }
  }, [editingProvider, searchParams])

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

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setAdministrationViewMode(mode)
  }

  const openCreateWizard = () => {
    setEditingProvider(null)
    syncWorkspaceActionParam(setSearchParams, WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER)
  }

  const openEditWizard = (provider: OrganizationIdentityProvider) => {
    setEditingProvider(provider)
    setIsWizardOpen(true)
  }

  const closeWizard = () => {
    setEditingProvider(null)
    if (getWorkspaceActionParam(searchParams) === WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER) {
      syncWorkspaceActionParam(setSearchParams, null, { replace: true })
    } else {
      setIsWizardOpen(false)
    }
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
        connectedBy={identityProviderConnectedBy}
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
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              idPrefix="identity-provider-view"
              ariaLabel="Identity providers view"
            />
          </div>

          {filteredProviders.length === 0 ? (
            <CatalogFilterEmptyState
              title={IDP_MANAGER_IDENTITY_PROVIDER_COPY.filterEmptyTitle}
              description={IDP_MANAGER_IDENTITY_PROVIDER_COPY.filterEmptyBody}
              onClearFilters={clearAllFilters}
            />
          ) : viewMode === 'grid' ? (
            <>
              <CatalogFilterResultsSummary
                filteredCount={filteredProviders.length}
                totalCount={providers.length}
                singular="identity provider"
                filterParts={filterDescriptionParts}
                onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
              />
              <div className="catalog-card-grid catalog-card-grid--stable tenant-admin-administration__grid">
                {filteredProviders.map((provider) => (
                  <Card
                    key={provider.id}
                    isCompact={false}
                    className="tenant-admin-administration__card"
                  >
                    <CardBody>
                      <div className="tenant-admin-administration__card-header">
                        <span className="tenant-admin-administration__card-icon" aria-hidden>
                          {renderInventoryCardIcon(IDENTITY_PROVIDER_CARD_ICON)}
                        </span>
                        <div className="tenant-admin-administration__card-header-actions">
                          <Label
                            color="green"
                            isCompact
                            className="tenant-admin-administration__card-label"
                          >
                            Connected
                          </Label>
                          <ActionsColumn items={getProviderActions(provider)} />
                        </div>
                      </div>
                      <Content
                        component="p"
                        className="tenant-admin-administration__name-cell"
                      >
                        {provider.displayName}
                      </Content>
                      <div className="idp-manager-identity-provider__card-identity">
                        <Content
                          component="p"
                          className="tenant-admin-administration__meta-cell tenant-admin-administration__card-email"
                        >
                          {provider.clientId}
                        </Content>
                      </div>
                      <CatalogSpecRowsList
                        rows={[
                          {
                            label: 'Protocol',
                            value: identityProviderProtocolLabel(provider.protocol),
                          },
                          { label: 'Issuer URL', value: provider.issuerUrl },
                        ]}
                        className="tenant-admin-administration__specs-list"
                        rowClassName="tenant-admin-administration__spec-row idp-manager-identity-provider__card-spec-row"
                        labelClassName="tenant-admin-administration__spec-label"
                        valueClassName="tenant-admin-administration__spec-value idp-manager-identity-provider__card-spec-value"
                      />
                    </CardBody>
                  </Card>
                ))}
              </div>
            </>
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
                        {identityProviderProtocolLabel(provider.protocol)}
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

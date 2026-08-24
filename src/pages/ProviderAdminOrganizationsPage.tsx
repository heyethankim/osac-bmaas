import { useEffect, useMemo, useRef, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { CatalogFilterEmptyState } from '../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../components/catalog/CatalogFilterResultsSummary'
import { OrganizationDetailsPage } from '../components/provider-admin/OrganizationDetailsPage'
import { RegisterOrganizationWizard } from '../components/provider-admin/RegisterOrganizationWizard'
import { SetupIdentityProviderWizard } from '../components/provider-admin/SetupIdentityProviderWizard'
import { AddTenantAdministratorWizard } from '../components/tenant-admin/AddTenantAdministratorWizard'
import { IdpManagerIdentityProviderPage } from './idp-manager/IdpManagerIdentityProviderPage'
import { IDP_MANAGER_ROLES_COPY } from '../idpManager/constants'
import {
  getOrganizationSetupNextAction,
  getOrganizationSetupSignal,
  buildOrganizationFilterParts,
  matchesOrganizationSetupFilter,
  ORGANIZATION_SETUP_FILTER_OPTIONS,
  organizationMatchesSearch,
  PROVIDER_ORGANIZATIONS_DEMO,
  type OrganizationSetupFilter,
  type OrganizationSetupNextAction,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import {
  addProviderRegisteredOrganization,
  assignCatalogToRegisteredOrganization,
  assignExternalIpPoolToRegisteredOrganization,
  consumeProviderOpenRegisterOrgWizard,
  ensureProviderDemoOrganizations,
  getProviderCatalogDraft,
  getProviderRegisteredOrganizations,
  peekProviderVipCatalogResumeIntent,
  removeProviderRegisteredOrganization,
  updateProviderRegisteredOrganization,
} from '../providerSetup/storage'
import type { ProviderAdminNavId } from '../providerAdmin/constants'

function formatRegisteredAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getOrganizationActions(
  organization: RegisteredOrganization,
  onViewDetails: (organization: RegisteredOrganization) => void,
  onEdit: (organization: RegisteredOrganization) => void,
  onRemove: (organization: RegisteredOrganization) => void,
  onOpenIdpInformation: (organization: RegisteredOrganization) => void,
): IAction[] {
  return [
    {
      title: 'View details',
      onClick: () => onViewDetails(organization),
    },
    {
      title: 'Edit',
      onClick: () => onEdit(organization),
    },
    ...(organization.identityProviderConnected
      ? [
          {
            title: 'View IdP information',
            onClick: () => onOpenIdpInformation(organization),
          },
        ]
      : []),
    {
      isSeparator: true,
    },
    {
      title: 'Remove',
      isDanger: true,
      onClick: () => onRemove(organization),
    },
  ]
}

export function ProviderAdminOrganizationsPage({
  onNavigate,
}: {
  onNavigate?: (navId: ProviderAdminNavId) => void
}) {
  const [organizations, setOrganizations] = useState<RegisteredOrganization[]>(() =>
    ensureProviderDemoOrganizations(),
  )
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState<RegisteredOrganization | null>(
    null,
  )
  const [editReturnToDetails, setEditReturnToDetails] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<RegisteredOrganization | null>(
    null,
  )
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [idpDelegationOrganization, setIdpDelegationOrganization] =
    useState<RegisteredOrganization | null>(null)
  const [idpDirectoryOrganization, setIdpDirectoryOrganization] =
    useState<RegisteredOrganization | null>(null)
  const [rolesOrganization, setRolesOrganization] = useState<RegisteredOrganization | null>(null)
  const [organizationPendingRemove, setOrganizationPendingRemove] =
    useState<RegisteredOrganization | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | RegisteredOrganization['status']>(
    'all',
  )
  const [selectedSetup, setSelectedSetup] = useState<OrganizationSetupFilter>('all')
  const [registeringOrganizationId, setRegisteringOrganizationId] = useState<string | null>(null)
  const registeringTimerRef = useRef<number | null>(null)
  const [activatingOrganizationId, setActivatingOrganizationId] = useState<string | null>(null)
  const activatingTimerRef = useRef<number | null>(null)
  const pendingActivationAfterIdpCloseRef = useRef<string | null>(null)
  const catalogDraft = getProviderCatalogDraft()

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((organization) => {
      if (selectedStatus !== 'all' && organization.status !== selectedStatus) {
        return false
      }

      if (!matchesOrganizationSetupFilter(organization, selectedSetup)) {
        return false
      }

      return organizationMatchesSearch(organization, searchValue)
    })
  }, [organizations, searchValue, selectedSetup, selectedStatus])

  const filterDescriptionParts = useMemo(
    () => buildOrganizationFilterParts(searchValue, selectedStatus, selectedSetup),
    [searchValue, selectedSetup, selectedStatus],
  )

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedStatus('all')
    setSelectedSetup('all')
  }

  const clearRegisteringTimer = () => {
    if (registeringTimerRef.current !== null) {
      window.clearTimeout(registeringTimerRef.current)
      registeringTimerRef.current = null
    }
  }

  const clearActivatingTimer = () => {
    if (activatingTimerRef.current !== null) {
      window.clearTimeout(activatingTimerRef.current)
      activatingTimerRef.current = null
    }
  }

  useEffect(() => {
    if (consumeProviderOpenRegisterOrgWizard()) {
      setEditingOrganization(null)
      setEditReturnToDetails(false)
      setIsWizardOpen(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      clearRegisteringTimer()
      clearActivatingTimer()
    }
  }, [])

  const refreshOrganizations = (nextSelectedId?: string | null) => {
    const next = getProviderRegisteredOrganizations()
    setOrganizations(next)

    setIdpDirectoryOrganization((current) => {
      if (!current) {
        return current
      }
      return next.find((organization) => organization.id === current.id) ?? null
    })

    if (nextSelectedId) {
      setSelectedOrganization(next.find((organization) => organization.id === nextSelectedId) ?? null)
      return
    }

    if (selectedOrganization) {
      const refreshed =
        next.find((organization) => organization.id === selectedOrganization.id) ?? null
      setSelectedOrganization(refreshed)
      if (!refreshed) {
        setIsDetailsOpen(false)
      }
    }
  }

  const startOrganizationActivation = (organizationId: string) => {
    clearActivatingTimer()
    setActivatingOrganizationId(organizationId)
    activatingTimerRef.current = window.setTimeout(() => {
      updateProviderRegisteredOrganization(organizationId, { status: 'Active' })
      refreshOrganizations(organizationId)
      setActivatingOrganizationId(null)
      activatingTimerRef.current = null
    }, 1500)
  }

  const handleIdpModalClose = () => {
    setIdpDelegationOrganization(null)
    const organizationId = pendingActivationAfterIdpCloseRef.current
    if (!organizationId) {
      return
    }
    pendingActivationAfterIdpCloseRef.current = null
    startOrganizationActivation(organizationId)
  }

  const openIdpDirectory = (organization: RegisteredOrganization) => {
    setSelectedOrganization(organization)
    setIdpDirectoryOrganization(organization)
  }

  const closeIdpDirectoryToTenants = () => {
    setIdpDirectoryOrganization(null)
    setIsDetailsOpen(false)
  }

  const closeIdpDirectoryToTenantDetails = () => {
    setIdpDirectoryOrganization(null)
    setIsDetailsOpen(true)
  }

  const openRegisterWizard = () => {
    setEditingOrganization(null)
    setEditReturnToDetails(false)
    setIsWizardOpen(true)
  }

  const openEdit = (organization: RegisteredOrganization, returnToDetails = false) => {
    setSelectedOrganization(organization)
    setEditingOrganization(organization)
    setEditReturnToDetails(returnToDetails)
    setIsDetailsOpen(false)
    setIsWizardOpen(true)
  }

  const closeWizard = () => {
    setIsWizardOpen(false)
    setEditingOrganization(null)
    if (editReturnToDetails && selectedOrganization) {
      setIsDetailsOpen(true)
    }
    setEditReturnToDetails(false)
  }

  const openDetails = (organization: RegisteredOrganization) => {
    setSelectedOrganization(organization)
    setIsDetailsOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsOpen(false)
  }

  const openRemove = (organization: RegisteredOrganization) => {
    setOrganizationPendingRemove(organization)
  }

  const handleConfirmRemove = () => {
    if (!organizationPendingRemove) {
      return
    }

    const removedId = organizationPendingRemove.id
    const removed = removeProviderRegisteredOrganization(removedId)
    if (removed) {
      if (selectedOrganization?.id === removedId) {
        setIsDetailsOpen(false)
        setSelectedOrganization(null)
      }
      if (idpDelegationOrganization?.id === removedId) {
        setIdpDelegationOrganization(null)
      }
      if (idpDirectoryOrganization?.id === removedId) {
        setIdpDirectoryOrganization(null)
      }
      if (rolesOrganization?.id === removedId) {
        setRolesOrganization(null)
      }
      setOrganizations(getProviderRegisteredOrganizations())
    }
    setOrganizationPendingRemove(null)
  }

  const handleRegister = (organization: RegisteredOrganization) => {
    addProviderRegisteredOrganization(organization)
    if (organization.externalIpPoolId) {
      assignExternalIpPoolToRegisteredOrganization(organization.externalIpPoolId, organization.id)
    }
    if (organization.catalogItemId && catalogDraft) {
      assignCatalogToRegisteredOrganization(organization.id, catalogDraft)
    }
    setOrganizations(getProviderRegisteredOrganizations())
    closeWizard()

    if (peekProviderVipCatalogResumeIntent()) {
      onNavigate?.('catalog')
      return
    }

    clearRegisteringTimer()
    setRegisteringOrganizationId(organization.id)
    registeringTimerRef.current = window.setTimeout(() => {
      setRegisteringOrganizationId(null)
      registeringTimerRef.current = null
    }, 1500)
  }

  const handleSave = (organization: RegisteredOrganization) => {
    updateProviderRegisteredOrganization(organization.id, {
      name: organization.name,
      slug: organization.slug,
      primaryDomain: organization.primaryDomain,
      additionalDomains: organization.additionalDomains,
      billingAccountName: organization.billingAccountName,
      logoSrc: organization.logoSrc,
      logoFileName: organization.logoFileName,
    })
    refreshOrganizations(organization.id)
    closeWizard()
  }

  const handleSetupNextAction = (
    organization: RegisteredOrganization,
    action: OrganizationSetupNextAction,
  ) => {
    if (action === 'idp') {
      if (organization.identityProviderConnected) {
        openIdpDirectory(organization)
        return
      }
      setIdpDelegationOrganization(organization)
      return
    }

    setRolesOrganization(organization)
  }

  const handleIdentityProviderConnected = (organization: RegisteredOrganization) => {
    refreshOrganizations(organization.id)
    // Keep the setup wizard mounted so working → success can play; it closes via onClose.
    // Activate (Active + Needs roles) only after the modal closes, with a short spinner.
    if (
      organization.identityProviderConnected &&
      organization.status === 'Pending activation'
    ) {
      pendingActivationAfterIdpCloseRef.current = organization.id
    }
    setIdpDelegationOrganization((current) =>
      current != null && current.id === organization.id ? organization : current,
    )
    setIdpDirectoryOrganization((current) =>
      current != null && current.id === organization.id ? organization : current,
    )
  }

  const handleIdpSetupUpdated = (organization: RegisteredOrganization) => {
    refreshOrganizations(organization.id)
    setIdpDelegationOrganization(organization)
  }

  const handleRolesConfigured = (organization: RegisteredOrganization) => {
    refreshOrganizations(organization.id)
  }

  return (
    <>
      {rolesOrganization !== null ? (
        <AddTenantAdministratorWizard
          isOpen
          organization={rolesOrganization}
          parentLabel="Tenants"
          title={IDP_MANAGER_ROLES_COPY.wizardTitle}
          submitLabel={IDP_MANAGER_ROLES_COPY.wizardSubmitLabel}
          showRoleCatalog
          onClose={() => setRolesOrganization(null)}
          onAdded={(organization) => {
            handleRolesConfigured(organization)
            setRolesOrganization(null)
          }}
        />
      ) : isWizardOpen ? (
        <RegisterOrganizationWizard
          key={editingOrganization?.id ?? 'register-tenant'}
          presentation="page"
          isOpen={isWizardOpen}
          catalogDraft={catalogDraft}
          editingOrganization={editingOrganization}
          onClose={closeWizard}
          onRegister={handleRegister}
          onSave={handleSave}
        />
      ) : idpDelegationOrganization !== null ? (
        <SetupIdentityProviderWizard
          presentation="page"
          isOpen
          organization={idpDelegationOrganization}
          onClose={handleIdpModalClose}
          onUpdated={handleIdpSetupUpdated}
          onConnected={handleIdentityProviderConnected}
        />
      ) : idpDirectoryOrganization !== null ? (
        <IdpManagerIdentityProviderPage
          organization={idpDirectoryOrganization}
          onOrganizationChange={(organization) => {
            refreshOrganizations(organization.id)
            setIdpDirectoryOrganization(organization)
            setSelectedOrganization((current) =>
              current?.id === organization.id ? organization : current,
            )
          }}
          onBackToTenants={closeIdpDirectoryToTenants}
          onBackToTenantDetails={closeIdpDirectoryToTenantDetails}
        />
      ) : isDetailsOpen && selectedOrganization ? (
        <OrganizationDetailsPage
          organization={selectedOrganization}
          onBack={closeDetails}
          onEdit={() => openEdit(selectedOrganization, true)}
          onRemove={() => openRemove(selectedOrganization)}
          onReviewIdentityProvider={(organization) => {
            if (organization.identityProviderConnected) {
              openIdpDirectory(organization)
              return
            }
            setIdpDelegationOrganization(organization)
          }}
          onReviewRoles={(organization) => setRolesOrganization(organization)}
          onOrganizationChange={(organization) => refreshOrganizations(organization.id)}
        />
      ) : (
      <div className="provider-admin-workspace-page provider-admin-organizations">
        {organizations.length > 0 ? (
          <Flex
            className="provider-admin-organizations__header"
            alignItems={{ default: 'alignItemsFlexStart' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            gap={{ default: 'gapMd' }}
          >
            <FlexItem>
              <Title headingLevel="h1" size="3xl" className="provider-admin-organizations__title">
                Tenants
              </Title>
              <Content component="p" className="provider-admin-organizations__lede">
                {PROVIDER_ORGANIZATIONS_DEMO.lede}
              </Content>
            </FlexItem>
            <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
              <Button variant="primary" icon={<PlusIcon />} onClick={openRegisterWizard}>
                {PROVIDER_ORGANIZATIONS_DEMO.registerOrganizationLabel}
              </Button>
            </FlexItem>
          </Flex>
        ) : (
          <>
            <Title headingLevel="h1" size="3xl" className="provider-admin-organizations__title">
              Tenants
            </Title>
            <Content component="p" className="provider-admin-organizations__lede">
              {PROVIDER_ORGANIZATIONS_DEMO.lede}
            </Content>
          </>
        )}

        {organizations.length > 0 ? (
          <div className="catalog-view-toolbar">
            <div className="catalog-view-toolbar__start">
              <FormSelect
                className="catalog-status-filter"
                id="tenants-status-filter"
                value={selectedStatus}
                onChange={(_event, value) =>
                  setSelectedStatus(value as 'all' | RegisteredOrganization['status'])
                }
                aria-label="Filter tenants by status"
              >
                <FormSelectOption value="all" label="All statuses" />
                <FormSelectOption value="Active" label="Active" />
                <FormSelectOption value="Pending activation" label="Pending activation" />
              </FormSelect>
              <FormSelect
                className="catalog-status-filter"
                id="tenants-setup-filter"
                value={selectedSetup}
                onChange={(_event, value) =>
                  setSelectedSetup(value as OrganizationSetupFilter)
                }
                aria-label="Filter tenants by setup state"
              >
                {ORGANIZATION_SETUP_FILTER_OPTIONS.map((option) => (
                  <FormSelectOption key={option.value} value={option.value} label={option.label} />
                ))}
              </FormSelect>
              <SearchInput
                className="catalog-search"
                placeholder="Search tenants"
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search tenants"
              />
            </div>
          </div>
        ) : null}

        {organizations.length === 0 ? (
          <EmptyState className="catalog-filter-empty provider-admin-organizations__empty">
            <Title headingLevel="h2" size="lg">
              {PROVIDER_ORGANIZATIONS_DEMO.emptyTitle}
            </Title>
            <EmptyStateBody className="catalog-filter-empty__body">
              {PROVIDER_ORGANIZATIONS_DEMO.emptyBody}
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" icon={<PlusIcon />} onClick={openRegisterWizard}>
                  {PROVIDER_ORGANIZATIONS_DEMO.registerFirstOrganizationLabel}
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        ) : filteredOrganizations.length === 0 ? (
          <CatalogFilterEmptyState
            title="No tenants match your filters"
            description="Try a different status, setup state, or search term."
            onClearFilters={clearAllFilters}
          />
        ) : (
          <div className="catalog-table-panel">
            <CatalogFilterResultsSummary
              filteredCount={filteredOrganizations.length}
              totalCount={organizations.length}
              singular="tenant"
              filterParts={filterDescriptionParts}
              onClearFilters={clearAllFilters}
            />
          <Table
            aria-label="Tenants"
            borders={false}
            className="provider-admin-organizations__table catalog-data-table"
          >
            <Thead>
              <Tr>
                <Th>Tenant</Th>
                <Th>Status</Th>
                <Th>Primary domain</Th>
                <Th>Billing account</Th>
                <Th>Registered</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {filteredOrganizations.map((org) => {
                const isRegistering = registeringOrganizationId === org.id
                const isActivating = activatingOrganizationId === org.id
                const isStatusPending = isRegistering || isActivating
                const setupSignal = isStatusPending ? null : getOrganizationSetupSignal(org)
                const nextAction = isStatusPending ? null : getOrganizationSetupNextAction(org)

                return (
                  <Tr
                    key={org.id}
                    className={
                      isStatusPending
                        ? 'provider-admin-organizations__row--registering'
                        : undefined
                    }
                  >
                    <Td modifier="wrap" dataLabel="Tenant">
                      <Content component="p" className="provider-admin-organizations__primary-cell">
                        <Button
                          variant="link"
                          isInline
                          className="catalog-table-name-link"
                          onClick={() => openDetails(org)}
                        >
                          {org.name}
                        </Button>
                      </Content>
                      <Content component="p" className="provider-admin-organizations__secondary-cell">
                        <code>{org.tenantId}</code>
                      </Content>
                    </Td>
                    <Td modifier="wrap" dataLabel="Status">
                      <div className="provider-admin-organizations__status-cell">
                        {isActivating ? (
                          <span className="provider-admin-organizations__registering-status">
                            <Spinner size="sm" aria-label={`Activating ${org.name}`} />
                            <span className="pf-v6-screen-reader">Activating tenant</span>
                          </span>
                        ) : (
                          <Label
                            color={org.status === 'Active' ? 'green' : 'orange'}
                            isCompact
                            className="provider-admin-organizations__status"
                          >
                            {org.status}
                          </Label>
                        )}
                        {isRegistering ? (
                          <span className="provider-admin-organizations__registering-status">
                            <Spinner
                              size="sm"
                              aria-label={`Registering ${org.name}`}
                            />
                            <span className="pf-v6-screen-reader">Registering tenant</span>
                          </span>
                        ) : null}
                        {setupSignal && nextAction ? (
                          <Button
                            variant="link"
                            isInline
                            className="provider-admin-organizations__setup-signal-link"
                            onClick={() => handleSetupNextAction(org, nextAction)}
                          >
                            {setupSignal}
                          </Button>
                        ) : null}
                        {setupSignal && !nextAction ? (
                          <Content
                            component="p"
                            className="provider-admin-organizations__setup-signal"
                          >
                            {setupSignal}
                          </Content>
                        ) : null}
                      </div>
                    </Td>
                    <Td modifier="wrap" dataLabel="Primary domain">
                      <Content component="p" className="provider-admin-organizations__primary-cell">
                        {org.primaryDomain || '—'}
                      </Content>
                    </Td>
                    <Td modifier="wrap" dataLabel="Billing account">
                      <Content component="p" className="provider-admin-organizations__primary-cell">
                        {org.billingAccountName}
                      </Content>
                      <Content component="p" className="provider-admin-organizations__secondary-cell">
                        <code>{org.billingAccountId}</code>
                      </Content>
                    </Td>
                    <Td modifier="wrap" dataLabel="Registered">
                      {formatRegisteredAt(org.createdAt)}
                    </Td>
                    <Td isActionCell>
                      <ActionsColumn
                        items={getOrganizationActions(
                          org,
                          openDetails,
                          openEdit,
                          openRemove,
                          (organization) => openIdpDirectory(organization),
                        )}
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
      )}

      <Modal
        variant={ModalVariant.small}
        isOpen={organizationPendingRemove !== null}
        onClose={() => setOrganizationPendingRemove(null)}
        aria-labelledby="remove-organization-title"
        aria-describedby="remove-organization-description"
      >
        <ModalHeader
          title="Remove tenant?"
          titleIconVariant="warning"
          labelId="remove-organization-title"
        />
        <ModalBody>
          <Content component="p" id="remove-organization-description">
            {organizationPendingRemove ? (
              <>
                <strong>{organizationPendingRemove.name}</strong> will be permanently removed from
                provider administration. This cannot be undone.
              </>
            ) : (
              'This tenant will be permanently removed from provider administration. This cannot be undone.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleConfirmRemove}>
            Remove
          </Button>
          <Button variant="link" onClick={() => setOrganizationPendingRemove(null)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

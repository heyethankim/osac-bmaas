import { useEffect, useRef, useState } from 'react'
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
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { ConnectOrganizationIdentityProviderModal } from '../components/provider-admin/ConnectOrganizationIdentityProviderModal'
import { DefineOrganizationRolesModal } from '../components/provider-admin/DefineOrganizationRolesModal'
import { OrganizationDetailsDrawer } from '../components/provider-admin/OrganizationDetailsDrawer'
import { RegisterOrganizationWizard } from '../components/provider-admin/RegisterOrganizationWizard'
import { SetupIdentityProviderWizard } from '../components/provider-admin/SetupIdentityProviderWizard'
import {
  getOrganizationSetupNextAction,
  getOrganizationSetupSignal,
  hasPendingIdpInvite,
  PROVIDER_ORGANIZATIONS_DEMO,
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
  onIdentityProvider: (organization: RegisteredOrganization) => void,
  onRoles: (organization: RegisteredOrganization) => void,
  onRemove: (organization: RegisteredOrganization) => void,
): IAction[] {
  const idpActionTitle = organization.identityProviderConnected
    ? 'View identity provider'
    : hasPendingIdpInvite(organization)
      ? 'Manage IdP invitation'
      : 'Set up identity provider'

  return [
    {
      title: 'View details',
      onClick: () => onViewDetails(organization),
    },
    {
      title: idpActionTitle,
      onClick: () => onIdentityProvider(organization),
    },
    {
      title: organization.rbacConfigured ? 'View roles' : 'Define roles',
      isAriaDisabled: !organization.identityProviderConnected,
      onClick: () => {
        if (organization.identityProviderConnected) {
          onRoles(organization)
        }
      },
    },
    {
      title: 'Edit',
      onClick: () => {
        /* demo */
      },
    },
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
  const [selectedOrganization, setSelectedOrganization] = useState<RegisteredOrganization | null>(
    null,
  )
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [idpOrganization, setIdpOrganization] = useState<RegisteredOrganization | null>(null)
  const [idpDelegationOrganization, setIdpDelegationOrganization] =
    useState<RegisteredOrganization | null>(null)
  const [rolesOrganization, setRolesOrganization] = useState<RegisteredOrganization | null>(null)
  const [organizationPendingRemove, setOrganizationPendingRemove] =
    useState<RegisteredOrganization | null>(null)
  const [registeringOrganizationId, setRegisteringOrganizationId] = useState<string | null>(null)
  const registeringTimerRef = useRef<number | null>(null)
  const [activatingOrganizationId, setActivatingOrganizationId] = useState<string | null>(null)
  const activatingTimerRef = useRef<number | null>(null)
  const pendingActivationAfterIdpCloseRef = useRef<string | null>(null)
  const catalogDraft = getProviderCatalogDraft()

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
    setIdpOrganization(null)
    const organizationId = pendingActivationAfterIdpCloseRef.current
    if (!organizationId) {
      return
    }
    pendingActivationAfterIdpCloseRef.current = null
    startOrganizationActivation(organizationId)
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
      if (idpOrganization?.id === removedId) {
        setIdpOrganization(null)
      }
      if (idpDelegationOrganization?.id === removedId) {
        setIdpDelegationOrganization(null)
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
    setIsWizardOpen(false)

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

  const handleSetupNextAction = (
    organization: RegisteredOrganization,
    action: OrganizationSetupNextAction,
  ) => {
    if (action === 'idp') {
      if (organization.identityProviderConnected) {
        setIdpOrganization(organization)
        return
      }
      setIdpDelegationOrganization(organization)
      return
    }

    setRolesOrganization(organization)
  }

  const openIdentityProvider = (organization: RegisteredOrganization) => {
    if (organization.identityProviderConnected) {
      setIdpOrganization(organization)
      return
    }
    setIdpDelegationOrganization(organization)
  }

  const openRoles = (organization: RegisteredOrganization) => {
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
    setIdpOrganization((current) =>
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
    <OrganizationDetailsDrawer
      isExpanded={isDetailsOpen}
      organization={selectedOrganization}
      onClose={closeDetails}
      onEdit={() => undefined}
      onRemove={selectedOrganization ? () => openRemove(selectedOrganization) : undefined}
      onReviewIdentityProvider={(organization) => {
        if (organization.identityProviderConnected) {
          setIdpOrganization(organization)
          return
        }
        setIdpDelegationOrganization(organization)
      }}
      onReviewRoles={(organization) => setRolesOrganization(organization)}
    >
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
                Organizations
              </Title>
              <Content component="p" className="provider-admin-organizations__lede">
                {PROVIDER_ORGANIZATIONS_DEMO.lede}
              </Content>
            </FlexItem>
            <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
              <Button variant="primary" icon={<PlusIcon />} onClick={() => setIsWizardOpen(true)}>
                {PROVIDER_ORGANIZATIONS_DEMO.registerOrganizationLabel}
              </Button>
            </FlexItem>
          </Flex>
        ) : (
          <>
            <Title headingLevel="h1" size="3xl" className="provider-admin-organizations__title">
              Organizations
            </Title>
            <Content component="p" className="provider-admin-organizations__lede">
              {PROVIDER_ORGANIZATIONS_DEMO.lede}
            </Content>
          </>
        )}

        {organizations.length === 0 ? (
          <EmptyState className="provider-admin-organizations__empty">
            <Title headingLevel="h2" size="lg">
              {PROVIDER_ORGANIZATIONS_DEMO.emptyTitle}
            </Title>
            <EmptyStateBody className="provider-admin-organizations__empty-body">
              {PROVIDER_ORGANIZATIONS_DEMO.emptyBody}
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" icon={<PlusIcon />} onClick={() => setIsWizardOpen(true)}>
                  {PROVIDER_ORGANIZATIONS_DEMO.registerFirstOrganizationLabel}
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        ) : (
          <Table
            aria-label="Organizations"
            borders={false}
            className="provider-admin-organizations__table catalog-data-table"
          >
            <Thead>
              <Tr>
                <Th>Organization</Th>
                <Th>Status</Th>
                <Th>Primary domain</Th>
                <Th>Billing account</Th>
                <Th>Registered</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {organizations.map((org) => {
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
                    <Td modifier="wrap" dataLabel="Organization">
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
                            <span className="pf-v6-screen-reader">Activating organization</span>
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
                            <span className="pf-v6-screen-reader">Registering organization</span>
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
                          openIdentityProvider,
                          openRoles,
                          openRemove,
                        )}
                      />
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        )}

        <RegisterOrganizationWizard
          isOpen={isWizardOpen}
          catalogDraft={catalogDraft}
          onClose={() => setIsWizardOpen(false)}
          onRegister={handleRegister}
        />
        <SetupIdentityProviderWizard
          isOpen={idpDelegationOrganization !== null}
          organization={idpDelegationOrganization}
          onClose={handleIdpModalClose}
          onUpdated={handleIdpSetupUpdated}
          onConnected={handleIdentityProviderConnected}
        />
        <ConnectOrganizationIdentityProviderModal
          isOpen={idpOrganization !== null}
          organization={idpOrganization}
          onClose={handleIdpModalClose}
          onConnected={handleIdentityProviderConnected}
        />
        <DefineOrganizationRolesModal
          isOpen={rolesOrganization !== null}
          organization={rolesOrganization}
          onClose={() => setRolesOrganization(null)}
          onConfigured={handleRolesConfigured}
        />
        <Modal
          variant={ModalVariant.small}
          isOpen={organizationPendingRemove !== null}
          onClose={() => setOrganizationPendingRemove(null)}
          aria-labelledby="remove-organization-title"
          aria-describedby="remove-organization-description"
        >
          <ModalHeader
            title="Remove organization?"
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
                'This organization will be permanently removed from provider administration. This cannot be undone.'
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
      </div>
    </OrganizationDetailsDrawer>
  )
}

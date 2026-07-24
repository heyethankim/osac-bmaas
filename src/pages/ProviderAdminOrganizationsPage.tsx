import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { OrganizationDetailsModal } from '../components/provider-admin/OrganizationDetailsModal'
import { AssignCatalogToOrganizationModal } from '../components/provider-admin/AssignCatalogToOrganizationModal'
import { RegisterOrganizationWizard } from '../components/provider-admin/RegisterOrganizationWizard'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import { PROVIDER_ORGANIZATIONS_DEMO } from '../providerAdmin/organizations'
import { openAsTenantUser } from '../providerAdmin/openAsTenantUser'
import {
  addProviderRegisteredOrganization,
  assignCatalogToRegisteredOrganization,
  assignExternalIpPoolToRegisteredOrganization,
  consumeProviderOpenRegisterOrgWizard,
  getProviderCatalogDraft,
  getProviderRegisteredOrganizations,
  peekProviderVipCatalogResumeIntent,
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
  onAssignCatalog: (organization: RegisteredOrganization) => void,
  onOpenAsTenantUser: (organization: RegisteredOrganization) => void,
): IAction[] {
  return [
    {
      title: 'View details',
      onClick: () => onViewDetails(organization),
    },
    {
      title: 'Open as tenant user',
      onClick: () => onOpenAsTenantUser(organization),
    },
    {
      title: 'Assign catalog item',
      isAriaDisabled: organization.catalogItemId !== null,
      onClick: () => {
        if (!organization.catalogItemId) {
          onAssignCatalog(organization)
        }
      },
    },
    {
      title: 'Edit billing account',
      onClick: () => {
        /* demo */
      },
    },
    {
      title: 'Resend tenant admin invite',
      onClick: () => {
        /* demo */
      },
    },
    {
      isSeparator: true,
    },
    {
      title: 'Remove organization',
      onClick: () => {
        /* demo */
      },
    },
  ]
}

export function ProviderAdminOrganizationsPage({
  onNavigate,
}: {
  onNavigate?: (navId: ProviderAdminNavId) => void
}) {
  const navigate = useNavigate()
  const [organizations, setOrganizations] = useState<RegisteredOrganization[]>(() =>
    getProviderRegisteredOrganizations(),
  )
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [detailsOrganization, setDetailsOrganization] = useState<RegisteredOrganization | null>(
    null,
  )
  const [assignCatalogOrganization, setAssignCatalogOrganization] =
    useState<RegisteredOrganization | null>(null)
  const catalogDraft = getProviderCatalogDraft()

  useEffect(() => {
    if (consumeProviderOpenRegisterOrgWizard()) {
      setIsWizardOpen(true)
    }
  }, [])

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
    }
  }

  const handleAssignCatalog = (organizationId: string) => {
    if (!catalogDraft) {
      return
    }

    assignCatalogToRegisteredOrganization(organizationId, catalogDraft)
    setOrganizations(getProviderRegisteredOrganizations())
    setAssignCatalogOrganization(null)
  }

  const handleOpenAsTenantUser = (organization: RegisteredOrganization) => {
    navigate(openAsTenantUser(organization))
  }

  return (
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
          variant="compact"
          borders={false}
          className="provider-admin-organizations__table"
        >
          <Thead>
            <Tr>
              <Th>Organization</Th>
              <Th>Status</Th>
              <Th>Tenant admin</Th>
              <Th>Billing account</Th>
              <Th>Catalog access</Th>
              <Th>Instance quota</Th>
              <Th>Registered</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {organizations.map((org) => (
              <Tr key={org.id}>
                <Td modifier="wrap" dataLabel="Organization">
                  <Content component="p" className="provider-admin-organizations__primary-cell">
                    {org.name}
                  </Content>
                  <Content component="p" className="provider-admin-organizations__secondary-cell">
                    <code>{org.tenantId}</code>
                  </Content>
                  <Button
                    variant="link"
                    isInline
                    className="provider-admin-organizations__open-as-user"
                    onClick={() => handleOpenAsTenantUser(org)}
                  >
                    Open as tenant user
                  </Button>
                </Td>
                <Td modifier="wrap" dataLabel="Status">
                  <Label
                    color={org.status === 'Active' ? 'green' : 'orange'}
                    isCompact
                    className="provider-admin-organizations__status"
                  >
                    {org.status}
                  </Label>
                </Td>
                <Td modifier="wrap" dataLabel="Tenant admin">
                  <Content component="p" className="provider-admin-organizations__primary-cell">
                    {org.tenantAdminName}
                  </Content>
                  <Content component="p" className="provider-admin-organizations__secondary-cell">
                    {org.tenantAdminEmail}
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
                <Td modifier="wrap" dataLabel="Catalog access">
                  {org.catalogDisplayName ? (
                    <>
                      <Content component="p" className="provider-admin-organizations__primary-cell">
                        {org.catalogDisplayName}
                      </Content>
                      <Content component="p" className="provider-admin-organizations__secondary-cell">
                        <code>{org.catalogItemId}</code>
                      </Content>
                    </>
                  ) : (
                    'Not assigned'
                  )}
                </Td>
                <Td modifier="wrap" dataLabel="Instance quota">
                  {org.maxInstances} BMaaS instances
                </Td>
                <Td modifier="wrap" dataLabel="Registered">
                  {formatRegisteredAt(org.createdAt)}
                </Td>
                <Td isActionCell>
                  <ActionsColumn
                    items={getOrganizationActions(
                      org,
                      setDetailsOrganization,
                      setAssignCatalogOrganization,
                      handleOpenAsTenantUser,
                    )}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <OrganizationDetailsModal
        organization={detailsOrganization}
        onClose={() => setDetailsOrganization(null)}
        onOpenAsTenantUser={handleOpenAsTenantUser}
      />

      <RegisterOrganizationWizard
        isOpen={isWizardOpen}
        catalogDraft={catalogDraft}
        onClose={() => setIsWizardOpen(false)}
        onRegister={handleRegister}
      />

      <AssignCatalogToOrganizationModal
        catalog={assignCatalogOrganization && catalogDraft ? catalogDraft : null}
        organizations={organizations}
        defaultOrganizationId={assignCatalogOrganization?.id ?? null}
        onClose={() => setAssignCatalogOrganization(null)}
        onAssign={handleAssignCatalog}
      />
    </div>
  )
}

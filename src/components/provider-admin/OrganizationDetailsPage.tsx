import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { PendingIcon } from '@patternfly/react-icons/dist/esm/icons/pending-icon'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from '@patternfly/react-core'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import {
  formatOrganizationRolesAssignmentSummary,
  getOrganizationActivationSteps,
  hasPendingIdpInvite,
  isOrganizationReadyForLogin,
  type OrganizationActivationStep,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { OrganizationReadyForLoginLinks } from './OrganizationReadyForLoginLinks'

type OrganizationDetailsPageProps = {
  organization: RegisteredOrganization
  onBack: () => void
  onEdit?: () => void
  onRemove?: () => void
  onReviewIdentityProvider?: (organization: RegisteredOrganization) => void
  onReviewRoles?: (organization: RegisteredOrganization) => void
}

function formatRegisteredAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getIdentityProviderStepMeta(organization: RegisteredOrganization): string | null {
  if (!organization.identityProviderConnected) {
    if (hasPendingIdpInvite(organization) && organization.idpManagerEmail) {
      return `Invite sent to ${organization.idpManagerEmail}`
    }
    return null
  }

  const parts = [
    organization.identityProviderProtocol,
    organization.identityProviderDisplayName || organization.identityProviderName,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : organization.identityProviderName
}

function PersonField({
  name,
  email,
}: {
  name: string
  email: string
}) {
  return (
    <>
      <Content component="p" className="provider-admin-organizations__primary-cell">
        {name}
      </Content>
      <Content component="p" className="provider-admin-organizations__secondary-cell">
        <code>{email}</code>
      </Content>
    </>
  )
}

function ActivationStepRow({
  step,
  organization,
  onReviewIdentityProvider,
  onReviewRoles,
}: {
  step: OrganizationActivationStep
  organization: RegisteredOrganization
  onReviewIdentityProvider?: (organization: RegisteredOrganization) => void
  onReviewRoles?: (organization: RegisteredOrganization) => void
}) {
  const idpMeta = step.id === 'idp' ? getIdentityProviderStepMeta(organization) : null
  const rolesMeta =
    step.id === 'rbac' && step.complete
      ? formatOrganizationRolesAssignmentSummary(organization)
      : null
  const showLoginPaths =
    step.id === 'ready' && step.complete && organization.identityProviderConnected
  const canReviewIdp = step.id === 'idp' && typeof onReviewIdentityProvider === 'function'
  const canReviewRoles = step.id === 'rbac' && typeof onReviewRoles === 'function'

  return (
    <li
      className={[
        'provider-admin-organizations__status-step',
        step.complete
          ? 'provider-admin-organizations__status-step--complete'
          : 'provider-admin-organizations__status-step--pending',
      ].join(' ')}
    >
      <span className="provider-admin-organizations__status-step-icon" aria-hidden>
        {step.complete ? (
          <CheckCircleIcon className="provider-admin-organizations__status-step-check" />
        ) : (
          <PendingIcon className="provider-admin-organizations__status-step-pending" />
        )}
      </span>
      <div className="provider-admin-organizations__status-step-content">
        {canReviewIdp ? (
          <Button
            variant="link"
            isInline
            className="provider-admin-organizations__status-step-link"
            onClick={() => onReviewIdentityProvider(organization)}
          >
            {step.label}
          </Button>
        ) : null}
        {canReviewRoles ? (
          <Button
            variant="link"
            isInline
            className="provider-admin-organizations__status-step-link"
            onClick={() => onReviewRoles(organization)}
          >
            {step.label}
          </Button>
        ) : null}
        {!canReviewIdp && !canReviewRoles ? (
          <span className="provider-admin-organizations__status-step-label">{step.label}</span>
        ) : null}
        <span className="pf-v6-screen-reader">
          {step.complete ? ', complete' : ', not complete'}
        </span>
        {idpMeta ? (
          <Content component="p" className="provider-admin-organizations__status-step-meta">
            {organization.identityProviderConnected ? <code>{idpMeta}</code> : idpMeta}
          </Content>
        ) : null}
        {rolesMeta ? (
          <Content component="p" className="provider-admin-organizations__status-step-meta">
            {rolesMeta}
          </Content>
        ) : null}
        {showLoginPaths ? (
          <OrganizationReadyForLoginLinks organization={organization} showHeading={false} />
        ) : null}
      </div>
    </li>
  )
}

export function OrganizationDetailsPage({
  organization,
  onBack,
  onEdit,
  onRemove,
  onReviewIdentityProvider,
  onReviewRoles,
}: OrganizationDetailsPageProps) {
  const activationSteps = getOrganizationActivationSteps(organization)
  const additionalAdmins = organization.additionalTenantAdmins
  const invitedUsers = organization.invitedTenantUserEmails

  return (
    <EntityDetailsPageShell
      parentLabel="Organizations"
      onBack={onBack}
      title={organization.name}
      titleId="organization-details-title"
      description="Tenant organization details for billing, identity domain, and workspace access."
      actions={
        onEdit || onRemove ? (
          <>
            {onEdit ? (
              <Button variant="secondary" onClick={onEdit}>
                Edit
              </Button>
            ) : null}
            {onRemove ? (
              <Button variant="secondary" isDanger onClick={onRemove}>
                Remove
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      <div className="entity-details-page__columns entity-details-page__columns--with-rail">
        <div className="entity-details-page__main-stack">
          <div className="entity-details-page__columns entity-details-page__columns--2">
            <div className="entity-details-page__column">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Overview
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Organization overview"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color={organization.status === 'Active' ? 'green' : 'orange'} isCompact>
                      {organization.status}
                    </Label>
                    {organization.status === 'Pending activation' &&
                    isOrganizationReadyForLogin(organization) ? (
                      <Content
                        component="p"
                        className="provider-admin-organizations__setup-signal provider-admin-organizations__drawer-ready-signal"
                      >
                        Ready for login
                      </Content>
                    ) : null}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Tenant ID</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{organization.tenantId}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Primary email domain</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{organization.primaryDomain || '—'}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Billing account</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Content component="p" className="provider-admin-organizations__primary-cell">
                      {organization.billingAccountName}
                    </Content>
                    <Content component="p" className="provider-admin-organizations__secondary-cell">
                      <code>{organization.billingAccountId}</code>
                    </Content>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Registered</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatRegisteredAt(organization.createdAt)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>

            <div className="entity-details-page__column">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Accounts
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Organization accounts"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>First tenant admin</DescriptionListTerm>
                  <DescriptionListDescription>
                    {organization.rbacConfigured ? (
                      <PersonField
                        name={organization.tenantAdminName}
                        email={organization.tenantAdminEmail}
                      />
                    ) : (
                      '—'
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Additional tenant admins</DescriptionListTerm>
                  <DescriptionListDescription>
                    {organization.rbacConfigured && additionalAdmins.length > 0 ? (
                      <ul className="provider-admin-organizations__account-list">
                        {additionalAdmins.map((admin) => (
                          <li key={`${admin.email}-${admin.name}`}>
                            <PersonField name={admin.name} email={admin.email} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      '—'
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Break-glass account</DescriptionListTerm>
                  <DescriptionListDescription>
                    {organization.rbacConfigured && organization.breakGlassEmail ? (
                      <PersonField
                        name={organization.breakGlassName || '—'}
                        email={organization.breakGlassEmail}
                      />
                    ) : (
                      '—'
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Invited tenant users</DescriptionListTerm>
                  <DescriptionListDescription>
                    {organization.rbacConfigured && invitedUsers.length > 0 ? (
                      <ul className="provider-admin-organizations__account-list">
                        {invitedUsers.map((email) => (
                          <li key={email}>
                            <Content
                              component="p"
                              className="provider-admin-organizations__secondary-cell"
                            >
                              <code>{email}</code>
                            </Content>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      '—'
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </div>

          <div className="entity-details-page__column">
            <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
              Resources
            </Title>
            <DescriptionList
              isCompact
              className="entity-details-page__dl"
              aria-label="Organization resources"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Catalog item</DescriptionListTerm>
                <DescriptionListDescription>
                  {organization.catalogDisplayName ? (
                    <>
                      <Content component="p" className="provider-admin-organizations__primary-cell">
                        {organization.catalogDisplayName}
                      </Content>
                      {organization.catalogItemId ? (
                        <Content
                          component="p"
                          className="provider-admin-organizations__secondary-cell"
                        >
                          <code>{organization.catalogItemId}</code>
                        </Content>
                      ) : null}
                    </>
                  ) : (
                    '—'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>External IP pool</DescriptionListTerm>
                <DescriptionListDescription>
                  {organization.externalIpPoolName ? (
                    <>
                      <Content component="p" className="provider-admin-organizations__primary-cell">
                        {organization.externalIpPoolName}
                      </Content>
                      <Content
                        component="p"
                        className="provider-admin-organizations__secondary-cell"
                      >
                        <code>
                          {organization.externalIpPoolCidr || organization.externalIpPoolId || '—'}
                        </code>
                      </Content>
                    </>
                  ) : (
                    '—'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Max instances</DescriptionListTerm>
                <DescriptionListDescription>
                  {organization.maxInstances.toLocaleString()}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>
        </div>

        <div className="entity-details-page__rail-stack">
          <div className="entity-details-page__column entity-details-page__column--config">
            <Title
              headingLevel="h2"
              size="md"
              className="entity-details-page__section-title entity-details-page__section-title--config"
            >
              Activation status
            </Title>
            <ol
              className="provider-admin-organizations__status-steps"
              aria-label="Activation progress"
            >
              {activationSteps.map((step) => (
                <ActivationStepRow
                  key={step.id}
                  step={step}
                  organization={organization}
                  onReviewIdentityProvider={onReviewIdentityProvider}
                  onReviewRoles={onReviewRoles}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </EntityDetailsPageShell>
  )
}

import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { PendingIcon } from '@patternfly/react-icons/dist/esm/icons/pending-icon'
import { EllipsisVIcon } from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { useState } from 'react'
import {
  Button,
  ClipboardCopy,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Title,
} from '@patternfly/react-core'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import { EntityDetailsActionsDropdown } from '../shared/EntityDetailsActionsDropdown'
import {
  formatOrganizationRolesAssignmentSummary,
  getOrganizationActivationSteps,
  hasBreakGlassAccount,
  hasPendingIdpInvite,
  isOrganizationReadyForLogin,
  resolveBreakGlassUsername,
  type OrganizationActivationStep,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { OrganizationReadyForLoginLinks } from './OrganizationReadyForLoginLinks'
import { AdditionalEmailDomainsValue } from './AdditionalEmailDomainsField'
import { AddTenantAdministratorWizard } from '../tenant-admin/AddTenantAdministratorWizard'
import { OrganizationResourceUsageSection } from './OrganizationResourceUsageSection'
import { IDP_MANAGER_ROLES_COPY } from '../../idpManager/constants'
import {
  getAssignableTenantRole,
  listRoleAssignments,
  removeRoleAssignment,
  type TenantAdministrator,
} from '../../tenantAdmin/administrators'

type OrganizationDetailsPageProps = {
  organization: RegisteredOrganization
  onBack: () => void
  onEdit?: () => void
  onRemove?: () => void
  onReviewIdentityProvider?: (organization: RegisteredOrganization) => void
  onReviewRoles?: (organization: RegisteredOrganization) => void
  onOrganizationChange?: (organization: RegisteredOrganization) => void
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

function AccountPersonRow({
  admin,
  onRequestRemove,
}: {
  admin: TenantAdministrator
  onRequestRemove: (admin: TenantAdministrator) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <li className="provider-admin-organizations__account-person">
      <div className="provider-admin-organizations__account-person-main">
        <Content component="p" className="provider-admin-organizations__primary-cell">
          {admin.name}
        </Content>
        <Content component="p" className="provider-admin-organizations__secondary-cell">
          {admin.email}
        </Content>
        <Label
          color={getAssignableTenantRole(admin.roleId).color}
          isCompact
          className="provider-admin-organizations__account-person-role"
        >
          {getAssignableTenantRole(admin.roleId).label}
        </Label>
      </div>
      {admin.isPrimary ? null : (
        <Dropdown
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          onSelect={() => setIsOpen(false)}
          popperProps={{ position: 'right' }}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              variant="plain"
              isExpanded={isOpen}
              onClick={() => setIsOpen((open) => !open)}
              icon={<EllipsisVIcon />}
              aria-label={`Actions for ${admin.name}`}
            />
          )}
        >
          <DropdownList>
            <DropdownItem
              value="remove"
              isDanger
              onClick={() => onRequestRemove(admin)}
            >
              Remove
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      )}
    </li>
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
  const canReviewRoles =
    step.id === 'rbac' &&
    !step.complete &&
    typeof onReviewRoles === 'function' &&
    organization.identityProviderConnected

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
  onReviewRoles: _onReviewRoles,
  onOrganizationChange,
}: OrganizationDetailsPageProps) {
  const activationSteps = getOrganizationActivationSteps(organization)
  const roleAssignments = listRoleAssignments(organization)
  const [isAddRolesOpen, setIsAddRolesOpen] = useState(false)
  const [administratorPendingRemove, setAdministratorPendingRemove] =
    useState<TenantAdministrator | null>(null)
  const canAddRoles = organization.identityProviderConnected

  const handleAddRoles = () => {
    if (!canAddRoles) {
      return
    }
    setIsAddRolesOpen(true)
  }

  const handleRoleAssigned = (updated: RegisteredOrganization) => {
    onOrganizationChange?.(updated)
    setIsAddRolesOpen(false)
  }

  const handleConfirmRemoveAdministrator = () => {
    if (!administratorPendingRemove) {
      return
    }

    const updated = removeRoleAssignment(organization, administratorPendingRemove.email)
    if (updated) {
      onOrganizationChange?.(updated)
    }
    setAdministratorPendingRemove(null)
  }

  if (isAddRolesOpen) {
    return (
      <AddTenantAdministratorWizard
        isOpen
        organization={organization}
        parentLabel={organization.name}
        title={IDP_MANAGER_ROLES_COPY.wizardTitle}
        submitLabel={IDP_MANAGER_ROLES_COPY.wizardSubmitLabel}
        showRoleCatalog
        onClose={() => setIsAddRolesOpen(false)}
        onAdded={handleRoleAssigned}
      />
    )
  }

  return (
    <>
    <EntityDetailsPageShell
      parentLabel="Tenants"
      onBack={onBack}
      title={organization.name}
      titleId="tenant-details-title"
      description="Tenant details for billing, identity domain, and workspace access."
      actions={
        onEdit || onRemove ? (
          <EntityDetailsActionsDropdown onEdit={onEdit} onRemove={onRemove} removeLabel="Remove" />
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
                aria-label="Tenant overview"
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
                  <DescriptionListTerm>Primary email domain</DescriptionListTerm>
                  <DescriptionListDescription>
                    {organization.primaryDomain || '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Additional email domains</DescriptionListTerm>
                  <DescriptionListDescription>
                    <AdditionalEmailDomainsValue domains={organization.additionalDomains ?? []} />
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
                    onReviewRoles={canAddRoles ? () => handleAddRoles() : undefined}
                  />
                ))}
              </ol>
            </div>
          </div>

          <div className="entity-details-page__column">
            <OrganizationResourceUsageSection organization={organization} />
          </div>
        </div>

        <div className="entity-details-page__rail-stack">
          <div className="entity-details-page__column entity-details-page__column--config">
            <div className="entity-details-page__column-block">
              <div className="entity-details-page__section-header entity-details-page__section-header--config provider-admin-organizations__accounts-header">
                <Title
                  headingLevel="h2"
                  size="md"
                  className="entity-details-page__section-title entity-details-page__section-title--config"
                >
                  Roles
                </Title>
                {canAddRoles ? (
                  <Button
                    variant="link"
                    isInline
                    icon={<PlusCircleIcon />}
                    className="provider-admin-organizations__accounts-add"
                    onClick={handleAddRoles}
                  >
                    Add roles
                  </Button>
                ) : null}
              </div>
              {roleAssignments.length === 0 ? (
                <Content component="p" className="provider-admin-organizations__secondary-cell">
                  {canAddRoles
                    ? IDP_MANAGER_ROLES_COPY.emptyBody
                    : 'Connect the identity provider before adding roles.'}
                </Content>
              ) : (
                <ul
                  className="provider-admin-organizations__account-people"
                  aria-label="Assigned roles"
                >
                  {roleAssignments.map((admin) => (
                    <AccountPersonRow
                      key={admin.email}
                      admin={admin}
                      onRequestRemove={setAdministratorPendingRemove}
                    />
                  ))}
                </ul>
              )}
            </div>
            <div className="entity-details-page__column-block">
              <Title
                headingLevel="h2"
                size="md"
                className="entity-details-page__section-title entity-details-page__section-title--config"
              >
                Break-glass account
              </Title>
              {hasBreakGlassAccount(organization) ? (
                <div className="provider-admin-organizations__break-glass">
                  <ClipboardCopy
                    isReadOnly
                    isCode
                    hoverTip="Copy username"
                    clickTip="Username copied"
                    textAriaLabel="Break-glass username"
                  >
                    {resolveBreakGlassUsername(organization)}
                  </ClipboardCopy>
                  <Content
                    component="p"
                    className="provider-admin-organizations__secondary-cell"
                  >
                    Custodian:{' '}
                    {organization.breakGlassName || 'IdP manager'}
                    {organization.breakGlassEmail
                      ? ` · ${organization.breakGlassEmail}`
                      : ''}
                  </Content>
                  <Content
                    component="p"
                    className="provider-admin-organizations__secondary-cell"
                  >
                    Local login. Does not use the tenant IdP.
                  </Content>
                </div>
              ) : organization.breakGlassEmail ? (
                <PersonField
                  name={organization.breakGlassName || '—'}
                  email={organization.breakGlassEmail}
                />
              ) : (
                <Content component="p" className="provider-admin-organizations__secondary-cell">
                  —
                </Content>
              )}
            </div>
          </div>
        </div>
      </div>
    </EntityDetailsPageShell>
    <Modal
      variant={ModalVariant.small}
      isOpen={administratorPendingRemove !== null}
      onClose={() => setAdministratorPendingRemove(null)}
      aria-labelledby="remove-organization-administrator-title"
      aria-describedby="remove-organization-administrator-description"
    >
      <ModalHeader
        title="Are you sure?"
        titleIconVariant="warning"
        labelId="remove-organization-administrator-title"
      />
      <ModalBody>
        <Content component="p" id="remove-organization-administrator-description">
          {administratorPendingRemove ? (
            <>
              <strong>{administratorPendingRemove.name}</strong> will lose their assigned role on
              this tenant. This cannot be undone.
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
        <Button variant="link" onClick={() => setAdministratorPendingRemove(null)}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
    </>
  )
}

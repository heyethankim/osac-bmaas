import type { ReactNode } from 'react'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { PendingIcon } from '@patternfly/react-icons/dist/esm/icons/pending-icon'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Label,
  Title,
} from '@patternfly/react-core'
import {
  formatOrganizationRolesAssignmentSummary,
  getOrganizationActivationSteps,
  hasPendingIdpInvite,
  isOrganizationReadyForLogin,
  type OrganizationActivationStep,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { OrganizationReadyForLoginLinks } from './OrganizationReadyForLoginLinks'

type OrganizationDetailsDrawerProps = {
  isExpanded: boolean
  organization: RegisteredOrganization | null
  onClose: () => void
  onEdit?: () => void
  onRemove?: () => void
  onReviewIdentityProvider?: (organization: RegisteredOrganization) => void
  onReviewRoles?: (organization: RegisteredOrganization) => void
  children: ReactNode
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
    step.id === 'ready' &&
    step.complete &&
    organization.identityProviderConnected &&
    organization.rbacConfigured
  const canReviewIdp = step.id === 'idp' && typeof onReviewIdentityProvider === 'function'
  const canReviewRoles =
    step.id === 'rbac' && step.complete && typeof onReviewRoles === 'function'

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

export function OrganizationDetailsDrawer({
  isExpanded,
  organization,
  onClose,
  onEdit,
  onRemove,
  onReviewIdentityProvider,
  onReviewRoles,
  children,
}: OrganizationDetailsDrawerProps) {
  const activationSteps = organization ? getOrganizationActivationSteps(organization) : []

  const panelContent = organization ? (
    <DrawerPanelContent
      className="provider-admin-organizations__drawer-panel"
      defaultSize="28rem"
      minSize="22rem"
      focusTrap={{ enabled: true }}
    >
      <DrawerHead>
        <Title
          headingLevel="h2"
          size="xl"
          id="organization-details-title"
          className="provider-admin-organizations__drawer-title"
        >
          {organization.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="provider-admin-organizations__drawer-body">
        <Content component="p" className="provider-admin-organizations__drawer-lede">
          Tenant organization details for billing, identity domain, and workspace access.
        </Content>

        {onEdit || onRemove ? (
          <div className="provider-admin-organizations__drawer-actions">
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
          </div>
        ) : null}

        <Divider className="provider-admin-organizations__drawer-divider" />

        <DescriptionList
          isCompact
          className="provider-admin-organizations__drawer-dl"
          aria-label="Organization details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color={organization.status === 'Active' ? 'green' : 'orange'} isCompact>
                {organization.status}
              </Label>
              {isOrganizationReadyForLogin(organization) ? (
                <Content
                  component="p"
                  className="provider-admin-organizations__setup-signal provider-admin-organizations__drawer-ready-signal"
                >
                  Ready for login
                </Content>
              ) : null}
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
            </DescriptionListDescription>
          </DescriptionListGroup>
          <Divider className="provider-admin-organizations__drawer-section-divider" />
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
          {organization.rbacConfigured ? (
            <DescriptionListGroup>
              <DescriptionListTerm>First tenant admin</DescriptionListTerm>
              <DescriptionListDescription>
                <Content component="p" className="provider-admin-organizations__primary-cell">
                  {organization.tenantAdminName}
                </Content>
                <Content component="p" className="provider-admin-organizations__secondary-cell">
                  <code>{organization.tenantAdminEmail}</code>
                </Content>
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
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
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer
      isExpanded={isExpanded && organization !== null}
      position="end"
      onExpand={() => undefined}
      className="provider-admin-organizations__drawer"
    >
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  )
}

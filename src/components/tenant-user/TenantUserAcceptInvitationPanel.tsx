import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { ShieldAltIcon } from '@patternfly/react-icons/dist/esm/icons/shield-alt-icon'
import {
  Alert,
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { TENANT_USER_ACCEPT_INVITATION_INTRO } from '../../tenantUser/constants'
import type { TenantUserProjectInvitation } from '../../tenantUser/invitation'

type TenantUserAcceptInvitationPanelProps = {
  invitation: TenantUserProjectInvitation
  onAccept: () => void
}

export function TenantUserAcceptInvitationPanel({
  invitation,
  onAccept,
}: TenantUserAcceptInvitationPanelProps) {
  const isOrganizationScope = invitation.scopeKind === 'organization'
  const title = isOrganizationScope
    ? TENANT_USER_ACCEPT_INVITATION_INTRO.organizationTitle
    : TENANT_USER_ACCEPT_INVITATION_INTRO.projectTitle
  const lede = isOrganizationScope
    ? `${invitation.invitedByName} has granted you access to the ${invitation.workspaceName} workspace.`
    : `${invitation.invitedByName} has granted you access to the ${invitation.scopeLabel} project on the ${invitation.workspaceName} workspace.`

  return (
    <Stack hasGutter className="tenant-user-onboarding">
      <StackItem className="tenant-user-onboarding__intro">
        <Label color="blue">{TENANT_USER_ACCEPT_INVITATION_INTRO.badge}</Label>
        <Title headingLevel="h1" size="3xl">
          {title}
        </Title>
        <Content component="p" className="tenant-user-onboarding__lede">
          {lede}
        </Content>
      </StackItem>

      <StackItem>
        <Card isCompact={false} className="tenant-user-onboarding__body-card">
          <CardBody>
            <Alert
              variant="info"
              isInline
              title={isOrganizationScope ? 'Organization permissions' : 'Project permissions'}
              className="tenant-user-onboarding__permissions-alert"
              customIcon={<ShieldAltIcon />}
            >
              <Content component="p">{invitation.permissionsSummary}</Content>
            </Alert>

            <DescriptionList isCompact className="tenant-user-onboarding__invite-summary">
              <DescriptionListGroup>
                <DescriptionListTerm>Your role</DescriptionListTerm>
                <DescriptionListDescription>
                  <div className="tenant-user-onboarding__detail-value">
                    <span>{invitation.role}</span>
                    <span className="tenant-user-onboarding__detail-secondary">
                      {invitation.roleDescription}
                    </span>
                  </div>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Invited by</DescriptionListTerm>
                <DescriptionListDescription>
                  <div className="tenant-user-onboarding__detail-value">
                    <span>{invitation.invitedByName}</span>
                    <span className="tenant-user-onboarding__detail-secondary">
                      <code>{invitation.invitedByEmail}</code>
                    </span>
                  </div>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Instance quota</DescriptionListTerm>
                <DescriptionListDescription>
                  {invitation.instanceQuota} instances
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Resources</DescriptionListTerm>
                <DescriptionListDescription>{invitation.resourcesLabel}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>IP pool</DescriptionListTerm>
                <DescriptionListDescription>
                  <div className="tenant-user-onboarding__detail-value">
                    <span>
                      <code>{invitation.ipPoolCidr}</code>
                    </span>
                    <span className="tenant-user-onboarding__detail-secondary">
                      {invitation.ipPoolName}
                    </span>
                  </div>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            <div className="tenant-user-onboarding__step-actions">
              <Button variant="primary" onClick={onAccept}>
                Accept invitation
                <ArrowRightIcon style={{ marginInlineStart: '0.5rem' }} aria-hidden />
              </Button>
              <Content component="p" className="tenant-user-onboarding__scope-note">
                <span>{invitation.scopeNote}</span>
              </Content>
            </div>
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  )
}

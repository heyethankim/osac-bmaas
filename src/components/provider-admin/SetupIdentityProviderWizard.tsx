import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { UserCogIcon } from '@patternfly/react-icons/dist/esm/icons/user-cog-icon'
import { UserPlusIcon } from '@patternfly/react-icons/dist/esm/icons/user-plus-icon'
import {
  Alert,
  Button,
  Card,
  CardBody,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Icon,
  Label,
  Modal,
  ModalVariant,
  TextInput,
  Title,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import {
  buildDemoIdentityProviderName,
  createIdpInviteTimestamps,
  generateIdpInviteToken,
  getIdpManagerSetupPath,
  hasPendingIdpInvite,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { updateProviderRegisteredOrganization } from '../../providerSetup/storage'
import {
  ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS,
  ORGANIZATION_ACTION_WORKING_MS,
  OrganizationActionSuccessState,
  OrganizationActionWorkingState,
  type OrganizationActionCompletionPhase,
} from './OrganizationActionSuccessState'
import { ResourceCreatePageShell } from '../shared/ResourceCreatePageShell'
import { useWizardLeaveConfirm } from '../shared/useWizardLeaveConfirm'

type SetupIdentityProviderWizardProps = {
  isOpen: boolean
  /** `page` replaces the organizations landing (breadcrumb back). Default `modal`. */
  presentation?: 'modal' | 'page'
  organization: RegisteredOrganization | null
  onClose: () => void
  onUpdated: (organization: RegisteredOrganization) => void
  onConnected: (organization: RegisteredOrganization) => void
}

type SetupPath = 'myself' | 'invite'

type IdentityProviderProtocol = 'OIDC' | 'SAML'

type ConnectForm = {
  protocol: IdentityProviderProtocol
  displayName: string
  issuerUrl: string
  clientId: string
}

const STEP_CHOICE = 'setup-idp-choice'
const STEP_CONNECT = 'setup-idp-connect'
const STEP_INVITE = 'setup-idp-invite'
const STEP_REVIEW = 'setup-idp-review'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function buildDefaultManagerEmail(organization: RegisteredOrganization): string {
  if (organization.idpManagerEmail?.trim()) {
    return organization.idpManagerEmail.trim().toLowerCase()
  }
  const domain = organization.primaryDomain?.trim().toLowerCase() || 'example.com'
  return `idp-admin@${domain}`
}

function buildDefaultConnectForm(organization: RegisteredOrganization): ConnectForm {
  const domain = organization.primaryDomain || 'example.com'
  return {
    protocol: 'OIDC',
    displayName: `${organization.name}-idp`,
    issuerUrl: `https://login.${domain}/oauth2`,
    clientId: `bmaas-${organization.slug || 'tenant'}`,
  }
}

/** PatternFly wizard for IdP choice, self-serve connect, and IdP manager invite. */
export function SetupIdentityProviderWizard({
  isOpen,
  presentation = 'modal',
  organization,
  onClose,
  onUpdated,
  onConnected,
}: SetupIdentityProviderWizardProps) {
  const [setupPath, setSetupPath] = useState<SetupPath | null>(null)
  const [managerEmail, setManagerEmail] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [justSent, setJustSent] = useState(false)
  const [connectForm, setConnectForm] = useState<ConnectForm>({
    protocol: 'OIDC',
    displayName: '',
    issuerUrl: '',
    clientId: '',
  })
  const [completionPhase, setCompletionPhase] =
    useState<OrganizationActionCompletionPhase>('idle')
  const [wizardKey, setWizardKey] = useState(0)
  const [startIndex, setStartIndex] = useState(1)
  const completionTimersRef = useRef<number[]>([])
  const organizationIdRef = useRef<string | null>(null)

  const clearCompletionTimers = () => {
    completionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    completionTimersRef.current = []
  }

  useEffect(() => {
    return () => {
      clearCompletionTimers()
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !organization) {
      organizationIdRef.current = null
      return
    }

    // Keep live org updates (e.g. after send) without remounting mid-flow.
    if (organizationIdRef.current === organization.id) {
      return
    }

    organizationIdRef.current = organization.id
    clearCompletionTimers()
    setCompletionPhase('idle')
    setCopyState('idle')
    setJustSent(false)
    setManagerEmail(buildDefaultManagerEmail(organization))
    setConnectForm(buildDefaultConnectForm(organization))

    const pending = hasPendingIdpInvite(organization)
    setSetupPath(pending ? 'invite' : null)
    // choice=1, connect=2, invite=3, review=4 (hidden steps still count toward startIndex)
    setStartIndex(pending ? 4 : 1)
    setWizardKey((current) => current + 1)
  }, [isOpen, organization])

  if (!organization) {
    return null
  }

  const invitePath =
    organization.idpInviteToken != null
      ? getIdpManagerSetupPath(organization.idpInviteToken)
      : null
  const inviteAbsoluteUrl =
    invitePath != null && typeof window !== 'undefined'
      ? `${window.location.origin}${invitePath}`
      : invitePath

  const canSendInvite = isValidEmail(managerEmail)
  const isConnectDisabled =
    !connectForm.displayName.trim() ||
    !connectForm.issuerUrl.trim() ||
    !connectForm.clientId.trim()
  const isCompleting = completionPhase !== 'idle'
  const issuerLabel = connectForm.protocol === 'SAML' ? 'Metadata URL' : 'Issuer URL'
  const clientLabel = connectForm.protocol === 'SAML' ? 'Entity ID' : 'Client ID'
  const showInviteReview = justSent || hasPendingIdpInvite(organization)

  const persistInvite = (email: string, options?: { rotateToken?: boolean }) => {
    const timestamps = createIdpInviteTimestamps()
    const shouldRotateToken = options?.rotateToken === true || !organization.idpInviteToken
    const updated = updateProviderRegisteredOrganization(organization.id, {
      idpManagerEmail: email.trim().toLowerCase(),
      idpInviteToken: shouldRotateToken
        ? generateIdpInviteToken()
        : organization.idpInviteToken,
      idpInviteStatus: 'pending',
      ...timestamps,
    })

    if (!updated) {
      return null
    }

    onUpdated(updated)
    return updated
  }

  const handleSendInvite = () => {
    if (!canSendInvite) {
      return
    }

    // First send creates a token; later sends from review reuse it so copied links stay valid.
    const updated = persistInvite(managerEmail, {
      rotateToken: !organization.idpInviteToken,
    })
    if (!updated) {
      return
    }

    setJustSent(true)
    setCopyState('idle')
  }

  const handleResend = () => {
    const email = organization.idpManagerEmail || managerEmail
    if (!isValidEmail(email)) {
      return
    }

    // Keep the same invite token so existing Copy / landing links still work.
    const updated = persistInvite(email, { rotateToken: false })
    if (!updated) {
      return
    }

    setJustSent(true)
    setCopyState('idle')
  }

  const handleCopyLink = async () => {
    if (!inviteAbsoluteUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(inviteAbsoluteUrl)
      setCopyState('copied')
    } catch {
      setCopyState('idle')
    }
  }

  const handleConnectSave = () => {
    if (isConnectDisabled) {
      return
    }

    const updated = updateProviderRegisteredOrganization(organization.id, {
      identityProviderConnected: true,
      identityProviderName: buildDemoIdentityProviderName(
        connectForm.protocol,
        organization.primaryDomain,
      ),
      identityProviderDisplayName: connectForm.displayName.trim(),
      identityProviderProtocol: connectForm.protocol,
      identityProviderIssuerUrl: connectForm.issuerUrl.trim(),
      identityProviderClientId: connectForm.clientId.trim(),
      idpInviteStatus: organization.idpInviteToken ? 'accepted' : 'none',
      idpInviteToken: null,
      idpInviteSentAt: null,
      idpInviteExpiresAt: null,
    })

    if (!updated) {
      return
    }

    clearCompletionTimers()
    setCompletionPhase('working')
    onConnected(updated)
    const successTimer = window.setTimeout(() => {
      setCompletionPhase('success')
      const closeTimer = window.setTimeout(() => {
        setCompletionPhase('idle')
        onClose()
      }, ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS)
      completionTimersRef.current.push(closeTimer)
    }, ORGANIZATION_ACTION_WORKING_MS)
    completionTimersRef.current.push(successTimer)
  }

  const handleClose = () => {
    clearCompletionTimers()
    setCompletionPhase('idle')
    organizationIdRef.current = null
    onClose()
  }

  const { requestClose: showLeaveConfirm, leaveConfirmModal, wrapStepFooter } =
    useWizardLeaveConfirm({
      onLeave: handleClose,
      isLeaveDisabled: isCompleting,
      primaryActionLabel: 'Leave',
      titleId: 'setup-idp-leave-confirm',
    })

  const requestClose = isCompleting ? handleClose : showLeaveConfirm

  const selectPath = (path: SetupPath) => {
    setSetupPath(path)
    if (path === 'invite') {
      setManagerEmail(buildDefaultManagerEmail(organization))
    }
  }

  const wizardTitle = 'Set up identity provider'
  const isPage = presentation === 'page'

  const completionContent = (
    <div className="provider-admin-organizations__idp-wizard-completion">
      {completionPhase === 'working' ? (
        <OrganizationActionWorkingState
          title="Connecting identity provider"
          body="Validating configuration and mapping the primary domain…"
        />
      ) : (
        <OrganizationActionSuccessState
          title="Identity provider connected"
          body="This organization is now active. You can define roles anytime."
        />
      )}
    </div>
  )

  const wizard = (
    <Wizard
      key={`setup-idp-wizard-${organization.id}-${wizardKey}`}
      className={[
        'provider-admin-organizations__wizard',
        isPage ? 'catalog-wizard-page__wizard' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      height={isPage ? '100%' : '40rem'}
      isPlain={isPage}
      startIndex={startIndex}
      isVisitRequired
      onClose={isPage ? undefined : requestClose}
      header={
        isPage ? undefined : (
          <WizardHeader
            title={wizardTitle}
            titleId="setup-idp-wizard-title"
            onClose={requestClose}
            closeButtonAriaLabel="Close set up identity provider wizard"
          />
        )
      }
    >
      <WizardStep
        id={STEP_CHOICE}
        name="Choose method"
        footer={wrapStepFooter({
          isNextDisabled: setupPath === null,
        })}
      >
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          Choose how to connect the identity provider for {organization.name}.
        </Content>
        <div
          className="provider-setup-template__service-cards"
          role="radiogroup"
          aria-label="Identity provider setup method"
        >
          <Card
            isSelectable
            isSelected={setupPath === 'myself'}
            className="provider-setup-template__service-card"
            aria-labelledby="setup-idp-path-myself-title"
            onClick={() => selectPath('myself')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                selectPath('myself')
              }
            }}
          >
            <CardBody className="provider-setup-template__service-card-body">
              {setupPath === 'myself' ? (
                <Label
                  color="grey"
                  isCompact
                  className="provider-setup-template__service-card-badge"
                >
                  Selected
                </Label>
              ) : null}
              <div className="provider-setup-template__service-card-icon-wrap provider-admin-organizations__idp-path-icon-wrap">
                <Icon size="lg">
                  <UserCogIcon />
                </Icon>
              </div>
              <Title
                id="setup-idp-path-myself-title"
                headingLevel="h3"
                size="md"
                className="provider-setup-template__service-card-title"
              >
                Configure IdP myself
              </Title>
              <Content
                component="p"
                className="provider-setup-template__service-card-description"
              >
                Enter OIDC or SAML settings now. Best when you already have issuer and client
                details.
              </Content>
            </CardBody>
          </Card>
          <Card
            isSelectable
            isSelected={setupPath === 'invite'}
            className="provider-setup-template__service-card"
            aria-labelledby="setup-idp-path-invite-title"
            onClick={() => selectPath('invite')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                selectPath('invite')
              }
            }}
          >
            <CardBody className="provider-setup-template__service-card-body">
              {setupPath === 'invite' ? (
                <Label
                  color="grey"
                  isCompact
                  className="provider-setup-template__service-card-badge"
                >
                  Selected
                </Label>
              ) : null}
              <div className="provider-setup-template__service-card-icon-wrap provider-admin-organizations__idp-path-icon-wrap">
                <Icon size="lg">
                  <UserPlusIcon />
                </Icon>
              </div>
              <Title
                id="setup-idp-path-invite-title"
                headingLevel="h3"
                size="md"
                className="provider-setup-template__service-card-title"
              >
                Invite IdP manager
              </Title>
              <Content
                component="p"
                className="provider-setup-template__service-card-description"
              >
                Email a secure, single-use link so their IdP admin can complete federation.
              </Content>
            </CardBody>
          </Card>
        </div>
      </WizardStep>

      <WizardStep
        id={STEP_CONNECT}
        name="Connect identity provider"
        isHidden={setupPath !== 'myself'}
        footer={wrapStepFooter({
          nextButtonText: 'Connect identity provider',
          isNextDisabled: isConnectDisabled,
          onNext: handleConnectSave,
        })}
      >
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          Connect the IdP for this organization’s primary email domain.
        </Content>
        <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
          <FormGroup label="Primary email domain" fieldId="setup-idp-domain">
            <TextInput
              id="setup-idp-domain"
              value={organization.primaryDomain || '—'}
              readOnlyVariant="default"
              aria-readonly="true"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Only identities from this domain can join this organization.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Protocol" fieldId="setup-idp-protocol" isRequired>
            <FormSelect
              id="setup-idp-protocol"
              value={connectForm.protocol}
              onChange={(_event, value) =>
                setConnectForm((current) => ({
                  ...current,
                  protocol: value as IdentityProviderProtocol,
                }))
              }
              aria-label="Identity provider protocol"
            >
              <FormSelectOption value="OIDC" label="OpenID Connect (OIDC)" />
              <FormSelectOption value="SAML" label="SAML 2.0" />
            </FormSelect>
          </FormGroup>
          <FormGroup label="Display name" fieldId="setup-idp-display-name" isRequired>
            <TextInput
              id="setup-idp-display-name"
              value={connectForm.displayName}
              onChange={(_event, value) =>
                setConnectForm((current) => ({ ...current, displayName: value }))
              }
            />
          </FormGroup>
          <FormGroup label={issuerLabel} fieldId="setup-idp-issuer" isRequired>
            <TextInput
              id="setup-idp-issuer"
              value={connectForm.issuerUrl}
              onChange={(_event, value) =>
                setConnectForm((current) => ({ ...current, issuerUrl: value }))
              }
            />
          </FormGroup>
          <FormGroup label={clientLabel} fieldId="setup-idp-client-id" isRequired>
            <TextInput
              id="setup-idp-client-id"
              value={connectForm.clientId}
              onChange={(_event, value) =>
                setConnectForm((current) => ({ ...current, clientId: value }))
              }
            />
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep
        id={STEP_INVITE}
        name="Invite IdP manager"
        isHidden={setupPath !== 'invite'}
        footer={wrapStepFooter({
          isNextDisabled: !canSendInvite,
        })}
      >
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          Send a single-use setup link to the person who manages federation for this
          organization.
        </Content>
        <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
          <FormGroup label="IdP manager email" fieldId="idp-manager-email" isRequired>
            <TextInput
              id="idp-manager-email"
              type="email"
              value={managerEmail}
              onChange={(_event, value) => setManagerEmail(value)}
              placeholder={`e.g. idp-admin@${organization.primaryDomain || 'example.com'}`}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  After you send, open IdP manager under Provider Admin on the landing page to
                  continue as the invitee.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep
        id={STEP_REVIEW}
        name="Review"
        isHidden={setupPath !== 'invite'}
        footer={wrapStepFooter(
          showInviteReview
            ? {
                nextButtonText: 'Done',
                onNext: handleClose,
              }
            : {
                nextButtonText: 'Send invitation',
                isNextDisabled: !canSendInvite,
                onNext: handleSendInvite,
              },
        )}
      >
        {showInviteReview ? (
          <div className="provider-admin-organizations__idp-pending">
            {justSent ? (
              <Alert
                variant="success"
                isInline
                title="Invitation email sent"
                className="provider-admin-organizations__idp-pending-alert"
              >
                Open the landing page and choose IdP manager under Provider Admin to continue as
                the invitee.
              </Alert>
            ) : (
              <Alert
                variant="info"
                isInline
                title="Invitation pending"
                className="provider-admin-organizations__idp-pending-alert"
              >
                The IdP manager can open the setup link until it expires or is used.
              </Alert>
            )}

            <DescriptionBlock
              label="IdP manager"
              value={organization.idpManagerEmail || managerEmail || '—'}
            />
            <DescriptionBlock label="Organization" value={organization.name} />
            {inviteAbsoluteUrl ? (
              <FormGroup label="Invite link" fieldId="idp-invite-link">
                <div className="provider-admin-organizations__idp-invite-link-row">
                  <TextInput
                    id="idp-invite-link"
                    value={inviteAbsoluteUrl}
                    readOnly
                    aria-label="IdP manager invite link"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => void handleCopyLink()}
                    icon={copyState === 'copied' ? <CheckIcon /> : undefined}
                  >
                    {copyState === 'copied' ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="secondary" onClick={handleResend}>
                    Resend
                  </Button>
                </div>
              </FormGroup>
            ) : null}
          </div>
        ) : (
          <>
            <Content component="p" className="provider-admin-organizations__wizard-lede">
              Confirm the invite details, then send the single-use setup link.
            </Content>
            <DescriptionBlock label="Organization" value={organization.name} />
            <DescriptionBlock label="IdP manager email" value={managerEmail || '—'} />
            <DescriptionBlock
              label="Primary email domain"
              value={organization.primaryDomain || '—'}
            />
          </>
        )}
      </WizardStep>
    </Wizard>
  )

  if (isPage) {
    if (!isOpen) {
      return null
    }
    return (
      <ResourceCreatePageShell
        parentLabel="Organizations"
        title={wizardTitle}
        titleId="setup-idp-wizard-title"
        onBack={requestClose}
      >
        {isCompleting ? completionContent : wizard}
        {leaveConfirmModal}
      </ResourceCreatePageShell>
    )
  }

  return (
    <>
      <Modal
        variant={ModalVariant.medium}
        width="64rem"
        maxWidth="64rem"
        isOpen={isOpen}
        onEscapePress={requestClose}
        aria-labelledby="setup-idp-wizard-title"
        className="provider-admin-organizations__wizard-modal"
      >
        {isOpen && isCompleting ? (
          <>
            <WizardHeader
              title=""
              titleId="setup-idp-wizard-title"
              onClose={requestClose}
              closeButtonAriaLabel="Close set up identity provider wizard"
            />
            {completionContent}
          </>
        ) : null}

        {isOpen && !isCompleting ? wizard : null}
      </Modal>
      {leaveConfirmModal}
    </>
  )
}

function DescriptionBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="provider-admin-organizations__idp-pending-field">
      <Content component="p" className="provider-admin-organizations__idp-pending-label">
        {label}
      </Content>
      <Content component="p" className="provider-admin-organizations__idp-pending-value">
        {value}
      </Content>
    </div>
  )
}

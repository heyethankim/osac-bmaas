import { useEffect, useRef, useState } from 'react'
import { UserCogIcon } from '@patternfly/react-icons/dist/esm/icons/user-cog-icon'
import { UserPlusIcon } from '@patternfly/react-icons/dist/esm/icons/user-plus-icon'
import {
  Alert,
  Button,
  Card,
  CardBody,
  ClipboardCopy,
  Content,
  Divider,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
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
  areAdditionalDomainsValid,
  buildBreakGlassIssuePatch,
  buildDefaultAdditionalDomains,
  buildDefaultIdentityProviderClientId,
  buildDemoIdentityProviderName,
  createIdpInviteTimestamps,
  generateIdpInviteToken,
  getIdpManagerSetupPath,
  getTakenEmailDomains,
  hasBreakGlassAccount,
  hasPendingIdpInvite,
  normalizeAdditionalDomains,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { getProviderRegisteredOrganizations, updateProviderRegisteredOrganization } from '../../providerSetup/storage'
import { identityProviderFromDraft } from '../../idpManager/identityProviders'
import {
  ORGANIZATION_ACTION_WORKING_MS,
  OrganizationActionSuccessState,
  OrganizationActionWorkingState,
  type OrganizationActionCompletionPhase,
} from './OrganizationActionSuccessState'
import { ResourceCreatePageShell } from '../shared/ResourceCreatePageShell'
import { useWizardLeaveConfirm } from '../shared/useWizardLeaveConfirm'
import { AdditionalEmailDomainsField } from './AdditionalEmailDomainsField'
import {
  BreakGlassCredentialsPanel,
  issuedBreakGlassFromOrganization,
  type IssuedBreakGlass,
} from './BreakGlassCredentialsPanel'

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
const STEP_REVIEW = 'setup-idp-review'

function buildIdpManagerHandoffText(
  link: string | null,
  credentials: IssuedBreakGlass | null,
): string {
  const lines: string[] = []
  if (link) {
    lines.push(`OSAC link: ${link}`)
  }
  if (credentials) {
    lines.push(`Username: ${credentials.username}`, `Password: ${credentials.password}`)
  }
  return lines.join('\n')
}

function buildDefaultConnectForm(organization: RegisteredOrganization): ConnectForm {
  const domain = organization.primaryDomain || 'example.com'
  return {
    protocol: 'OIDC',
    displayName: `${organization.name}-idp`,
    issuerUrl: `https://login.${domain}/oauth2`,
    clientId: buildDefaultIdentityProviderClientId(organization),
  }
}

/** PatternFly wizard for IdP choice: provider connects, or hands off an OSAC link. */
export function SetupIdentityProviderWizard({
  isOpen,
  presentation = 'modal',
  organization,
  onClose,
  onUpdated,
  onConnected,
}: SetupIdentityProviderWizardProps) {
  const [setupPath, setSetupPath] = useState<SetupPath | null>(null)
  const [issuedBreakGlass, setIssuedBreakGlass] = useState<IssuedBreakGlass | null>(null)
  const [copyAllState, setCopyAllState] = useState<'idle' | 'copied'>('idle')
  const [justSent, setJustSent] = useState(false)
  const [connectForm, setConnectForm] = useState<ConnectForm>({
    protocol: 'OIDC',
    displayName: '',
    issuerUrl: '',
    clientId: '',
  })
  const [additionalDomains, setAdditionalDomains] = useState<string[]>([])
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

    if (organizationIdRef.current === organization.id) {
      setIssuedBreakGlass(issuedBreakGlassFromOrganization(organization))
      return
    }

    organizationIdRef.current = organization.id
    clearCompletionTimers()
    setCompletionPhase('idle')
    setCopyAllState('idle')
    setJustSent(false)
    setIssuedBreakGlass(issuedBreakGlassFromOrganization(organization))
    setConnectForm(buildDefaultConnectForm(organization))
    setAdditionalDomains(buildDefaultAdditionalDomains(organization))

    const pending = hasPendingIdpInvite(organization)
    setSetupPath(pending ? 'invite' : null)
    // Invite path omits Connect, so Review is step 2.
    setStartIndex(pending ? 2 : 1)
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

  const takenEmailDomains = getTakenEmailDomains(
    getProviderRegisteredOrganizations(),
    organization.id,
  )
  const additionalDomainsValid = areAdditionalDomainsValid(
    additionalDomains,
    organization.primaryDomain,
    takenEmailDomains,
  )
  const isConnectDisabled =
    !connectForm.displayName.trim() ||
    !connectForm.issuerUrl.trim() ||
    !connectForm.clientId.trim() ||
    !additionalDomainsValid
  const isCompleting = completionPhase !== 'idle'
  const issuerLabel = connectForm.protocol === 'SAML' ? 'Metadata URL' : 'Issuer URL'
  const clientLabel = connectForm.protocol === 'SAML' ? 'Entity ID' : 'Client ID'
  const showInviteReview = justSent || hasPendingIdpInvite(organization)

  const persistInvite = (options?: { rotateToken?: boolean }) => {
    const timestamps = createIdpInviteTimestamps()
    const shouldRotateToken = options?.rotateToken === true || !organization.idpInviteToken
    const breakGlass = hasBreakGlassAccount(organization)
      ? {}
      : buildBreakGlassIssuePatch(organization)
    const updated = updateProviderRegisteredOrganization(organization.id, {
      idpInviteToken: shouldRotateToken
        ? generateIdpInviteToken()
        : organization.idpInviteToken,
      idpInviteStatus: 'pending',
      ...timestamps,
      ...breakGlass,
    })

    if (!updated) {
      return null
    }

    setIssuedBreakGlass(issuedBreakGlassFromOrganization(updated))
    setJustSent(true)
    setCopyAllState('idle')
    onUpdated(updated)
    return updated
  }

  const handleCopyAll = async () => {
    const text = buildIdpManagerHandoffText(inviteAbsoluteUrl, issuedBreakGlass)
    if (!text) {
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopyAllState('copied')
    } catch {
      setCopyAllState('idle')
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
      identityProviders: [
        identityProviderFromDraft(
          {
            displayName: connectForm.displayName.trim(),
            protocol: connectForm.protocol === 'SAML' ? 'SAML' : 'OIDC',
            issuerUrl: connectForm.issuerUrl.trim(),
            clientId: connectForm.clientId.trim(),
          },
          organization.primaryDomain,
        ),
      ],
      additionalDomains: normalizeAdditionalDomains(
        additionalDomains,
        organization.primaryDomain,
      ),
      idpInviteStatus: 'none',
      idpInviteToken: null,
      idpInviteSentAt: null,
      idpInviteExpiresAt: null,
    })

    if (!updated) {
      return
    }

    setIssuedBreakGlass(issuedBreakGlassFromOrganization(updated))
    clearCompletionTimers()
    setCompletionPhase('working')
    onConnected(updated)
    const successTimer = window.setTimeout(() => {
      setCompletionPhase('success')
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

  const persistInviteIfNeeded = () => {
    if (hasPendingIdpInvite(organization) && organization.idpInviteToken) {
      return organization
    }
    return persistInvite({ rotateToken: !organization.idpInviteToken })
  }

  const wizardTitle = 'Set up identity provider'
  const isPage = presentation === 'page'

  const completionContent = (
    <div className="provider-admin-organizations__idp-wizard-completion">
      {completionPhase === 'working' ? (
        <OrganizationActionWorkingState
          title="Connecting identity provider"
          body="Validating configuration…"
        />
      ) : (
        <>
          <OrganizationActionSuccessState
            title="Identity provider connected"
            body="This tenant can use the connected identity provider for sign-in."
          />
          <div className="provider-admin-organizations__idp-break-glass-done">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </>
      )}
    </div>
  )

  const wizard = (
    <Wizard
      key={`setup-idp-wizard-${organization.id}-${wizardKey}-${setupPath ?? 'none'}`}
      className="provider-admin-organizations__wizard"
      height={isPage ? '100%' : '40rem'}
      isPlain={isPage}
      startIndex={startIndex}
      isVisitRequired
      onStepChange={(_event, currentStep) => {
        if (String(currentStep.id) === STEP_REVIEW && setupPath === 'invite') {
          persistInviteIfNeeded()
        }
      }}
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
          Connect the IdP for {organization.name} yourself, or copy an OSAC link for the IdP
          manager.
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
            onClick={() => setSetupPath('myself')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSetupPath('myself')
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
                Enter OIDC or SAML settings for this tenant.
              </Content>
            </CardBody>
          </Card>
          <Card
            isSelectable
            isSelected={setupPath === 'invite'}
            className="provider-setup-template__service-card"
            aria-labelledby="setup-idp-path-invite-title"
            onClick={() => setSetupPath('invite')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSetupPath('invite')
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
                Have IdP manager connect
              </Title>
              <Content
                component="p"
                className="provider-setup-template__service-card-description"
              >
                Copy an OSAC URL and a local login for the IdP manager.
              </Content>
            </CardBody>
          </Card>
        </div>
      </WizardStep>

      {setupPath === 'myself' ? (
      <WizardStep
        id={STEP_CONNECT}
        name="Connect identity provider"
        footer={wrapStepFooter({
          isNextDisabled: isConnectDisabled,
        })}
      >
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          Connect the IdP that issues tokens for this tenant.
        </Content>
        <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
          <FormGroup label="Primary email domain" fieldId="setup-idp-domain">
            <TextInput
              id="setup-idp-domain"
              value={organization.primaryDomain || '—'}
              readOnlyVariant="default"
              aria-readonly="true"
            />
          </FormGroup>
          <AdditionalEmailDomainsField
            idPrefix="setup-idp-additional-domain"
            primaryDomain={organization.primaryDomain}
            domains={additionalDomains}
            onChange={setAdditionalDomains}
            takenDomains={takenEmailDomains}
          />
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
      ) : null}

      <WizardStep
        id={STEP_REVIEW}
        name="Review"
        isHidden={setupPath === null}
        footer={wrapStepFooter(
          setupPath === 'myself'
            ? {
                nextButtonText: 'Connect identity provider',
                isNextDisabled: isConnectDisabled,
                onNext: handleConnectSave,
              }
            : {
                nextButtonText: 'Done',
                onNext: () => {
                  persistInviteIfNeeded()
                  handleClose()
                },
              },
        )}
      >
        {setupPath === 'myself' ? (
          <>
            <Content component="p" className="provider-admin-organizations__wizard-lede">
              Confirm the identity provider for this tenant.
            </Content>
            <DescriptionBlock label="Tenant" value={organization.name} />
            <DescriptionBlock label="Protocol" value={connectForm.protocol} />
            <DescriptionBlock
              label="Display name"
              value={connectForm.displayName.trim() || '—'}
            />
            <DescriptionBlock
              label="Primary email domain"
              value={organization.primaryDomain || '—'}
            />
            <DescriptionBlock
              label="Additional email domains"
              value={
                normalizeAdditionalDomains(additionalDomains, organization.primaryDomain).join(
                  ', ',
                ) || 'None'
              }
            />
            <DescriptionBlock label={issuerLabel} value={connectForm.issuerUrl.trim() || '—'} />
          </>
        ) : (
          <div className="provider-admin-organizations__idp-pending">
            {justSent || showInviteReview ? (
              <Alert
                variant={justSent ? 'success' : 'info'}
                isInline
                title={justSent ? 'OSAC link ready' : 'Waiting on IdP manager'}
                className="provider-admin-organizations__idp-pending-alert"
              >
                Send the OSAC URL, username, and password to the IdP manager. OSAC does not
                email them.
              </Alert>
            ) : (
              <Alert
                variant="info"
                isInline
                title="Copy the handoff for the IdP manager"
                className="provider-admin-organizations__idp-pending-alert"
              >
                The IdP manager signs in with the break-glass account created at registration.
              </Alert>
            )}

            <DescriptionBlock label="Tenant" value={organization.name} />
            <div className="provider-admin-organizations__idp-handoff">
              <Divider className="provider-admin-organizations__idp-handoff-divider" />
              <Button
                variant="secondary"
                className="provider-admin-organizations__idp-copy-all"
                isDisabled={!inviteAbsoluteUrl && !issuedBreakGlass}
                onClick={() => void handleCopyAll()}
              >
                {copyAllState === 'copied' ? 'Copied' : 'Copy all'}
              </Button>
              {inviteAbsoluteUrl ? (
                <FormGroup
                  label="OSAC link"
                  fieldId="idp-invite-link"
                  className="provider-admin-organizations__idp-pending-field"
                >
                  <ClipboardCopy
                    id="idp-invite-link"
                    isReadOnly
                    hoverTip="Copy OSAC link"
                    clickTip="OSAC link copied"
                    textAriaLabel="OSAC link for IdP manager"
                  >
                    {inviteAbsoluteUrl}
                  </ClipboardCopy>
                </FormGroup>
              ) : null}
              {issuedBreakGlass ? (
                <BreakGlassCredentialsPanel credentials={issuedBreakGlass} />
              ) : (
                <Content component="p" className="provider-admin-organizations__roles-section-help">
                  No break-glass account is stored on this tenant yet.
                </Content>
              )}
            </div>
          </div>
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
        parentLabel="Tenants"
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

import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { UserCogIcon } from '@patternfly/react-icons/dist/esm/icons/user-cog-icon'
import { UserPlusIcon } from '@patternfly/react-icons/dist/esm/icons/user-plus-icon'
import {
  Alert,
  Button,
  Card,
  CardBody,
  ClipboardCopy,
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
import {
  ORGANIZATION_ACTION_WORKING_MS,
  OrganizationActionSuccessState,
  OrganizationActionWorkingState,
  type OrganizationActionCompletionPhase,
} from './OrganizationActionSuccessState'
import { ResourceCreatePageShell } from '../shared/ResourceCreatePageShell'
import { useWizardLeaveConfirm } from '../shared/useWizardLeaveConfirm'
import { AdditionalEmailDomainsField } from './AdditionalEmailDomainsField'

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
const STEP_BREAK_GLASS = 'setup-idp-break-glass'
const STEP_INVITE = 'setup-idp-invite'
const STEP_REVIEW = 'setup-idp-review'

type IssuedBreakGlass = {
  username: string
  password: string
  custodianName: string
  custodianEmail: string
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function buildDefaultManagerEmail(organization: RegisteredOrganization): string {
  if (organization.idpManagerEmail?.trim()) {
    return organization.idpManagerEmail.trim().toLowerCase()
  }
  if (organization.breakGlassEmail?.trim()) {
    return organization.breakGlassEmail.trim().toLowerCase()
  }
  const domain = organization.primaryDomain?.trim().toLowerCase() || 'example.com'
  return `idp-admin@${domain}`
}

function buildDefaultCustodian(organization: RegisteredOrganization): {
  name: string
  email: string
} {
  const domain = organization.primaryDomain?.trim().toLowerCase() || 'example.com'
  return {
    name: organization.breakGlassName?.trim() || 'IdP recovery officer',
    email: organization.breakGlassEmail?.trim() || `idp-admin@${domain}`,
  }
}

function toIssuedBreakGlass(organization: RegisteredOrganization): IssuedBreakGlass | null {
  if (!hasBreakGlassAccount(organization) || !organization.breakGlassEmail) {
    return null
  }

  return {
    username: organization.breakGlassUsername as string,
    password: organization.breakGlassPassword as string,
    custodianName: organization.breakGlassName?.trim() || 'IdP manager',
    custodianEmail: organization.breakGlassEmail,
  }
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

/** PatternFly wizard for IdP choice: provider connects, or hands off credentials. */
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
  const [custodianName, setCustodianName] = useState('')
  const [custodianEmail, setCustodianEmail] = useState('')
  const [issuedBreakGlass, setIssuedBreakGlass] = useState<IssuedBreakGlass | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
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

    // Keep live org updates (e.g. after send) without remounting mid-flow.
    if (organizationIdRef.current === organization.id) {
      return
    }

    organizationIdRef.current = organization.id
    clearCompletionTimers()
    setCompletionPhase('idle')
    setCopyState('idle')
    setJustSent(false)
    setIssuedBreakGlass(toIssuedBreakGlass(organization))
    setManagerEmail(buildDefaultManagerEmail(organization))
    const custodian = buildDefaultCustodian(organization)
    setCustodianName(custodian.name)
    setCustodianEmail(custodian.email)
    setConnectForm(buildDefaultConnectForm(organization))
    setAdditionalDomains(buildDefaultAdditionalDomains(organization))

    const pending = hasPendingIdpInvite(organization)
    setSetupPath(pending ? 'invite' : null)
    // choice=1, connect=2, break-glass=3, invite=4, review=5 (hidden steps still count)
    setStartIndex(pending ? 5 : 1)
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
  const canContinueBreakGlass =
    Boolean(custodianName.trim()) && isValidEmail(custodianEmail)
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

  const persistInvite = (email: string, options?: { rotateToken?: boolean }) => {
    const timestamps = createIdpInviteTimestamps()
    const shouldRotateToken = options?.rotateToken === true || !organization.idpInviteToken
    const breakGlass = buildBreakGlassIssuePatch(organization, {
      name: organization.breakGlassName?.trim() || 'IdP manager',
      email,
    })
    const updated = updateProviderRegisteredOrganization(organization.id, {
      idpManagerEmail: email.trim().toLowerCase(),
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

    setIssuedBreakGlass(toIssuedBreakGlass(updated))
    onUpdated(updated)
    return updated
  }

  const handleCreateCredentials = () => {
    if (!canSendInvite) {
      return
    }

    const updated = persistInvite(managerEmail, {
      rotateToken: !organization.idpInviteToken,
    })
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

    const breakGlass = buildBreakGlassIssuePatch(organization, {
      name: custodianName,
      email: custodianEmail,
    })
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
      additionalDomains: normalizeAdditionalDomains(
        additionalDomains,
        organization.primaryDomain,
      ),
      idpInviteStatus: organization.idpInviteToken ? 'accepted' : 'none',
      idpInviteToken: null,
      idpInviteSentAt: null,
      idpInviteExpiresAt: null,
      ...breakGlass,
    })

    if (!updated) {
      return
    }

    setIssuedBreakGlass(toIssuedBreakGlass(updated))
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
          body="Validating configuration and issuing a break-glass account…"
        />
      ) : (
        <>
          <OrganizationActionSuccessState
            title="Identity provider connected"
            body="A platform break-glass account was sent to the custodian. Store these credentials in their vault."
          />
          {issuedBreakGlass ? (
            <BreakGlassCredentialsPanel
              credentials={issuedBreakGlass}
              sentLabel={`Sent to ${issuedBreakGlass.custodianEmail}`}
            />
          ) : null}
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
      key={`setup-idp-wizard-${organization.id}-${wizardKey}`}
      className="provider-admin-organizations__wizard"
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
          Connect the IdP for {organization.name} yourself, or create credentials for the IdP
          manager to send yourself.
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
                Enter OIDC or SAML settings, then issue a break-glass account.
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
                Have IdP manager connect
              </Title>
              <Content
                component="p"
                className="provider-setup-template__service-card-description"
              >
                Create a break-glass account and copy an OSAC link to send yourself.
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
          isNextDisabled: isConnectDisabled,
        })}
      >
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          Connect the IdP that issues tokens for this organization.
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

      <WizardStep
        id={STEP_BREAK_GLASS}
        name="Break-glass recovery"
        isHidden={setupPath !== 'myself'}
        footer={wrapStepFooter({
          isNextDisabled: !canContinueBreakGlass,
        })}
      >
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          Create a platform-local emergency account and send it to a custodian. It still works if
          this identity provider is down.
        </Content>
        <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
          <FormGroup label="Custodian name" fieldId="setup-idp-break-glass-name" isRequired>
            <TextInput
              id="setup-idp-break-glass-name"
              value={custodianName}
              onChange={(_event, value) => setCustodianName(value)}
            />
          </FormGroup>
          <FormGroup label="Custodian email" fieldId="setup-idp-break-glass-email" isRequired>
            <TextInput
              id="setup-idp-break-glass-email"
              type="email"
              value={custodianEmail}
              onChange={(_event, value) => setCustodianEmail(value)}
              placeholder={`e.g. idp-admin@${organization.primaryDomain || 'example.com'}`}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Any mailbox can receive the credentials. This login does not use the organization
                  IdP.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep
        id={STEP_INVITE}
        name="Create credentials"
        isHidden={setupPath !== 'invite'}
        footer={wrapStepFooter({
          isNextDisabled: !canSendInvite,
        })}
      >
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          OSAC cannot send this. Create a break-glass account, then copy the username, password,
          and OSAC link to send to the IdP manager.
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
                  Who you will send these to. After you create credentials, copy them from the
                  next step.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep
        id={STEP_REVIEW}
        name="Review"
        isHidden={setupPath === null}
        footer={wrapStepFooter(
          setupPath === 'myself'
            ? {
                nextButtonText: 'Connect identity provider',
                isNextDisabled: isConnectDisabled || !canContinueBreakGlass,
                onNext: handleConnectSave,
              }
            : showInviteReview
              ? {
                  nextButtonText: 'Done',
                  onNext: handleClose,
                }
              : {
                  nextButtonText: 'Create credentials',
                  isNextDisabled: !canSendInvite,
                  onNext: handleCreateCredentials,
                },
        )}
      >
        {setupPath === 'myself' ? (
          <>
            <Content component="p" className="provider-admin-organizations__wizard-lede">
              Confirm the identity provider and who receives break-glass credentials.
            </Content>
            <DescriptionBlock label="Organization" value={organization.name} />
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
            <DescriptionBlock
              label={issuerLabel}
              value={connectForm.issuerUrl.trim() || '—'}
            />
            <DescriptionBlock
              label="Break-glass custodian"
              value={`${custodianName.trim() || '—'} · ${custodianEmail.trim() || '—'}`}
            />
          </>
        ) : showInviteReview ? (
          <div className="provider-admin-organizations__idp-pending">
            {justSent ? (
              <Alert
                variant="success"
                isInline
                title="Credentials created"
                className="provider-admin-organizations__idp-pending-alert"
              >
                Copy the OSAC link and break-glass account, then send them to the IdP manager.
                OSAC does not send this email. To continue as that person, open IdP manager
                under Provider Admin on the landing page.
              </Alert>
            ) : (
              <Alert
                variant="info"
                isInline
                title="Credentials ready to copy"
                className="provider-admin-organizations__idp-pending-alert"
              >
                Send the OSAC link and break-glass account to the IdP manager. OSAC does not
                send this email.
              </Alert>
            )}

            <DescriptionBlock
              label="IdP manager"
              value={organization.idpManagerEmail || managerEmail || '—'}
            />
            <DescriptionBlock label="Organization" value={organization.name} />
            {inviteAbsoluteUrl ? (
              <FormGroup label="OSAC link" fieldId="idp-invite-link">
                <div className="provider-admin-organizations__idp-invite-link-row">
                  <TextInput
                    id="idp-invite-link"
                    value={inviteAbsoluteUrl}
                    readOnly
                    aria-label="OSAC link for IdP manager"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => void handleCopyLink()}
                    icon={copyState === 'copied' ? <CheckIcon /> : undefined}
                  >
                    {copyState === 'copied' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </FormGroup>
            ) : null}
            {issuedBreakGlass ? (
              <BreakGlassCredentialsPanel
                credentials={issuedBreakGlass}
                sentLabel={`Send these with the OSAC link to ${issuedBreakGlass.custodianEmail}.`}
              />
            ) : null}
          </div>
        ) : (
          <>
            <Content component="p" className="provider-admin-organizations__wizard-lede">
              Confirm who you will send credentials to, then create them to copy.
            </Content>
            <DescriptionBlock label="Organization" value={organization.name} />
            <DescriptionBlock label="IdP manager email" value={managerEmail || '—'} />
            <DescriptionBlock
              label="Primary email domain"
              value={organization.primaryDomain || '—'}
            />
            <DescriptionBlock
              label="Break-glass"
              value="A local account and OSAC link will be created for you to copy and send."
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

function BreakGlassCredentialsPanel({
  credentials,
  sentLabel,
}: {
  credentials: IssuedBreakGlass
  sentLabel: string
}) {
  return (
    <div className="provider-admin-organizations__idp-break-glass">
      <Content component="p" className="provider-admin-organizations__idp-pending-label">
        Break-glass account
      </Content>
      <Content component="p" className="provider-admin-organizations__roles-section-help">
        {sentLabel} This local login does not use the organization IdP.
      </Content>
      <FormGroup label="Username" fieldId="break-glass-username">
        <ClipboardCopy
          id="break-glass-username"
          isReadOnly
          hoverTip="Copy username"
          clickTip="Username copied"
          textAriaLabel="Break-glass username"
        >
          {credentials.username}
        </ClipboardCopy>
      </FormGroup>
      <FormGroup label="Password" fieldId="break-glass-password">
        <ClipboardCopy
          id="break-glass-password"
          isReadOnly
          hoverTip="Copy password"
          clickTip="Password copied"
          textAriaLabel="Break-glass password"
        >
          {credentials.password}
        </ClipboardCopy>
      </FormGroup>
    </div>
  )
}

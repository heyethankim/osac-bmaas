import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  ClipboardCopy,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core'
import {
  getProviderRegisteredOrganizationByIdpInviteToken,
  getProviderRegisteredOrganizations,
  updateProviderRegisteredOrganization,
} from '../providerSetup/storage'
import {
  areAdditionalDomainsValid,
  buildDefaultAdditionalDomains,
  buildDemoIdentityProviderName,
  getIdpManagerSetupRoute,
  getPendingIdpManagerInvites,
  getTakenEmailDomains,
  hasBreakGlassAccount,
  hasPendingIdpInvite,
  isIdpInviteExpired,
  normalizeAdditionalDomains,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import {
  ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS,
  ORGANIZATION_ACTION_WORKING_MS,
  OrganizationActionSuccessState,
  OrganizationActionWorkingState,
  type OrganizationActionCompletionPhase,
} from '../components/provider-admin/OrganizationActionSuccessState'
import { RouterButton } from '../components/RouterButton'
import { AdditionalEmailDomainsField } from '../components/provider-admin/AdditionalEmailDomainsField'
import { BlueSolaceFinancialGroupLoginPage } from './BlueSolaceFinancialGroupLoginPage'
import { NorthstarBankLoginPage } from './NorthstarBankLoginPage'
import { OsacSignInPage } from './OsacSignInPage'

type IdentityProviderProtocol = 'OIDC' | 'SAML'

type IdpSetupForm = {
  protocol: IdentityProviderProtocol
  displayName: string
  issuerUrl: string
  clientId: string
}

type GateState = 'loading' | 'invalid' | 'expired' | 'used' | 'ready'
type AuthStep = 'osac' | 'institution'
type SetupView = 'invite' | 'connect' | 'complete'

const OSAC_CONTINUE_DELAY_MS = 1500

function buildDefaultForm(organization: RegisteredOrganization): IdpSetupForm {
  const domain = organization.primaryDomain || 'example.com'
  return {
    protocol: 'OIDC',
    displayName: `${organization.name}-idp`,
    issuerUrl: `https://login.${domain}/oauth2`,
    clientId: `bmaas-${organization.slug || 'tenant'}`,
  }
}

function usesNorthstarLogin(organization: RegisteredOrganization): boolean {
  const slug = organization.slug.toLowerCase()
  const domain = organization.primaryDomain.toLowerCase()
  const name = organization.name.toLowerCase()
  return (
    slug.includes('north-summit') ||
    slug.includes('northstar') ||
    domain.includes('northsummit') ||
    name.includes('north summit')
  )
}

/**
 * IdP manager experience from the OSAC link the provider admin sends:
 * OSAC sign-in → institution login → IdP setup.
 */
export function IdpManagerSetupPage() {
  const navigate = useNavigate()
  const { token = '' } = useParams<{ token: string }>()
  const [gateState, setGateState] = useState<GateState>('loading')
  const [authStep, setAuthStep] = useState<AuthStep>('osac')
  const [setupView, setSetupView] = useState<SetupView>('invite')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isOsacContinuing, setIsOsacContinuing] = useState(false)
  const [isInstitutionLoading, setIsInstitutionLoading] = useState(false)
  const [organization, setOrganization] = useState<RegisteredOrganization | null>(null)
  const [form, setForm] = useState<IdpSetupForm>({
    protocol: 'OIDC',
    displayName: '',
    issuerUrl: '',
    clientId: '',
  })
  const [additionalDomains, setAdditionalDomains] = useState<string[]>([])
  const [completionPhase, setCompletionPhase] =
    useState<OrganizationActionCompletionPhase>('idle')
  const completionTimersRef = useRef<number[]>([])

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
    clearCompletionTimers()
    setCompletionPhase('idle')
    setIsAuthenticated(false)
    setAuthStep('osac')
    setSetupView('invite')
    setIsOsacContinuing(false)
    setIsInstitutionLoading(false)

    // Do not call ensureProviderDemoOrganizations here — it replaces the North Summit
    // seed org and can wipe a pending invite token from session storage.
    const match = getProviderRegisteredOrganizationByIdpInviteToken(token)

    if (!match) {
      setOrganization(null)
      setGateState('invalid')
      return
    }

    setOrganization(match)

    if (match.identityProviderConnected || match.idpInviteStatus === 'accepted') {
      setGateState('used')
      return
    }

    if (match.idpInviteStatus === 'expired' || isIdpInviteExpired(match)) {
      if (match.idpInviteStatus !== 'expired') {
        updateProviderRegisteredOrganization(match.id, { idpInviteStatus: 'expired' })
      }
      setGateState('expired')
      return
    }

    if (!hasPendingIdpInvite(match)) {
      setGateState('invalid')
      return
    }

    setForm(buildDefaultForm(match))
    setAdditionalDomains(buildDefaultAdditionalDomains(match))
    setGateState('ready')
  }, [token])

  useEffect(() => {
    if (!isOsacContinuing) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsOsacContinuing(false)
      setAuthStep('institution')
    }, OSAC_CONTINUE_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isOsacContinuing])

  const takenEmailDomains = getTakenEmailDomains(
    getProviderRegisteredOrganizations(),
    organization?.id,
  )
  const additionalDomainsValid = areAdditionalDomainsValid(
    additionalDomains,
    organization?.primaryDomain ?? '',
    takenEmailDomains,
  )
  const isFormDisabled = useMemo(
    () =>
      !form.displayName.trim() ||
      !form.issuerUrl.trim() ||
      !form.clientId.trim() ||
      !additionalDomainsValid,
    [form, additionalDomainsValid],
  )

  const issuerLabel = form.protocol === 'SAML' ? 'Metadata URL' : 'Issuer URL'
  const clientLabel = form.protocol === 'SAML' ? 'Entity ID' : 'Client ID'
  const isCompleting = completionPhase !== 'idle'
  const signInEmail =
    organization?.idpManagerEmail?.trim() ||
    (organization
      ? `idp-admin@${organization.primaryDomain || 'example.com'}`
      : '')

  const handleConnect = () => {
    if (!organization || isFormDisabled || isCompleting) {
      return
    }

    clearCompletionTimers()
    setCompletionPhase('working')

    const successTimer = window.setTimeout(() => {
      const updated = updateProviderRegisteredOrganization(organization.id, {
        identityProviderConnected: true,
        identityProviderName: buildDemoIdentityProviderName(
          form.protocol,
          organization.primaryDomain,
        ),
        identityProviderDisplayName: form.displayName.trim(),
        identityProviderProtocol: form.protocol,
        identityProviderIssuerUrl: form.issuerUrl.trim(),
        identityProviderClientId: form.clientId.trim(),
        additionalDomains: normalizeAdditionalDomains(
          additionalDomains,
          organization.primaryDomain,
        ),
        idpInviteStatus: 'accepted',
        status: 'Active',
      })

      if (!updated) {
        setCompletionPhase('idle')
        return
      }

      setOrganization(updated)
      setCompletionPhase('success')
      const doneTimer = window.setTimeout(() => {
        setCompletionPhase('idle')
        setSetupView('complete')
      }, ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS)
      completionTimersRef.current.push(doneTimer)
    }, ORGANIZATION_ACTION_WORKING_MS)
    completionTimersRef.current.push(successTimer)
  }

  if (gateState === 'loading') {
    return (
      <div className="idp-manager-setup-page">
        <div className="idp-manager-setup-page__card">
          <div className="idp-manager-setup-page__loading">
            <Spinner size="lg" aria-label="Loading OSAC link" />
          </div>
        </div>
      </div>
    )
  }

  if (gateState === 'invalid' || gateState === 'expired' || gateState === 'used') {
    const currentInvites = getPendingIdpManagerInvites(getProviderRegisteredOrganizations())
    const recoverableInvite =
      gateState === 'invalid' && currentInvites.length === 1 ? currentInvites[0] : null

    if (recoverableInvite) {
      return <Navigate to={getIdpManagerSetupRoute(recoverableInvite.token)} replace />
    }

    return (
      <div className="idp-manager-setup-page">
        <div className="idp-manager-setup-page__card">
          <Content component="p" className="idp-manager-setup-page__kicker">
            Vertexa Cloud · IdP manager
          </Content>
          <Title headingLevel="h1" size="2xl" className="idp-manager-setup-page__title">
            IdP manager
          </Title>
          {gateState === 'invalid' ? (
            <Alert variant="danger" isInline title="OSAC link not found">
              This link is invalid or no longer available. Ask the provider admin to create
              credentials again.
            </Alert>
          ) : null}
          {gateState === 'expired' ? (
            <Alert variant="warning" isInline title="OSAC link expired">
              Ask the provider admin for {organization?.name ?? 'this organization'} to create a
              new break-glass account and OSAC link.
            </Alert>
          ) : null}
          {gateState === 'used' ? (
            <Alert variant="info" isInline title="Already connected">
              The identity provider for {organization?.name ?? 'this organization'} is already
              connected.
            </Alert>
          ) : null}
          {gateState === 'invalid' && currentInvites.length > 1 ? (
            <div className="idp-manager-setup-page__actions">
              {currentInvites.map((invite) => (
                <RouterButton
                  key={invite.token}
                  to={getIdpManagerSetupRoute(invite.token)}
                  variant="primary"
                >
                  Open OSAC link for {invite.organization.name}
                </RouterButton>
              ))}
            </div>
          ) : (
            <div className="idp-manager-setup-page__actions">
              <RouterButton to="/" variant="secondary">
                Return to home
              </RouterButton>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!organization) {
    return null
  }

  if (!isAuthenticated) {
    if (authStep === 'osac') {
      return (
        <OsacSignInPage
          defaultEmail={signInEmail}
          isContinuing={isOsacContinuing}
          onNext={() => setIsOsacContinuing(true)}
        />
      )
    }

    if (usesNorthstarLogin(organization)) {
      return (
        <NorthstarBankLoginPage
          defaultUsername={signInEmail}
          isLandingPageLoading={isInstitutionLoading}
          onChooseAnotherInstitution={() => navigate('/')}
          onLoginSuccess={() => {
            setIsInstitutionLoading(true)
            window.setTimeout(() => {
              setIsInstitutionLoading(false)
              setIsAuthenticated(true)
            }, 600)
          }}
        />
      )
    }

    return (
      <BlueSolaceFinancialGroupLoginPage
        defaultEmail={signInEmail}
        isLandingPageLoading={isInstitutionLoading}
        onChooseAnotherInstitution={() => navigate('/')}
        onLoginSuccess={() => {
          setIsInstitutionLoading(true)
          window.setTimeout(() => {
            setIsInstitutionLoading(false)
            setIsAuthenticated(true)
          }, 600)
        }}
      />
    )
  }

  const title =
    setupView === 'complete' || completionPhase === 'success'
      ? 'Identity provider connected'
      : completionPhase === 'working'
        ? 'Connecting identity provider'
        : setupView === 'connect'
          ? 'Connect identity provider'
          : "Sign in to OSAC"

  return (
    <div className="idp-manager-setup-page">
      <div className="idp-manager-setup-page__card">
        <Content component="p" className="idp-manager-setup-page__kicker">
          Vertexa Cloud · IdP manager
        </Content>
        <Title headingLevel="h1" size="2xl" className="idp-manager-setup-page__title">
          {title}
        </Title>

        {isCompleting ? (
          <div className="idp-manager-setup-page__completion">
            {completionPhase === 'working' ? (
              <OrganizationActionWorkingState
                title="Connecting identity provider"
                body="Validating configuration and mapping the primary domain…"
              />
            ) : (
              <OrganizationActionSuccessState
                title="Identity provider connected"
                body="The provider admin can continue with roles for this organization."
              />
            )}
          </div>
        ) : null}

        {!isCompleting && setupView === 'invite' ? (
          <>
            <Content component="p" className="idp-manager-setup-page__lede">
              The provider admin sent you a break-glass account and this OSAC link. Connect the
              IdP for <strong>{organization.name}</strong>, then return the flow to the provider
              admin.
            </Content>

            {hasBreakGlassAccount(organization) ? (
              <div className="idp-manager-setup-page__email" aria-label="Break-glass account">
                <Content component="p" className="idp-manager-setup-page__email-label">
                  Break-glass account
                </Content>
                <Content component="p" className="idp-manager-setup-page__email-body">
                  Use this local login for OSAC. It does not use the organization IdP.
                </Content>
                <FormGroup label="Username" fieldId="idp-manager-break-glass-username">
                  <ClipboardCopy
                    id="idp-manager-break-glass-username"
                    isReadOnly
                    hoverTip="Copy username"
                    clickTip="Username copied"
                    textAriaLabel="Break-glass username"
                  >
                    {organization.breakGlassUsername as string}
                  </ClipboardCopy>
                </FormGroup>
                <FormGroup label="Password" fieldId="idp-manager-break-glass-password">
                  <ClipboardCopy
                    id="idp-manager-break-glass-password"
                    isReadOnly
                    hoverTip="Copy password"
                    clickTip="Password copied"
                    textAriaLabel="Break-glass password"
                  >
                    {organization.breakGlassPassword as string}
                  </ClipboardCopy>
                </FormGroup>
              </div>
            ) : null}

            <ol className="idp-manager-setup-page__steps" aria-label="What you'll do">
              <li>Confirm the organization and primary email domain.</li>
              <li>Enter OIDC or SAML settings for your IdP.</li>
              <li>Connect — then the provider admin continues with roles.</li>
            </ol>

            <div className="idp-manager-setup-page__actions">
              <Button variant="primary" onClick={() => setSetupView('connect')}>
                Continue to setup
              </Button>
              <RouterButton to="/" variant="link">
                Return to home
              </RouterButton>
            </div>
          </>
        ) : null}

        {!isCompleting && setupView === 'connect' ? (
          <>
            <Content component="p" className="idp-manager-setup-page__lede">
              Connect the IdP for <strong>{organization.name}</strong>.
            </Content>
            <Form autoComplete="off" className="idp-manager-setup-page__form">
              <FormGroup label="Primary email domain" fieldId="idp-setup-domain">
                <TextInput
                  id="idp-setup-domain"
                  value={organization.primaryDomain}
                  readOnlyVariant="default"
                  aria-readonly="true"
                />
              </FormGroup>
              <AdditionalEmailDomainsField
                idPrefix="idp-setup-additional-domain"
                primaryDomain={organization.primaryDomain}
                domains={additionalDomains}
                onChange={setAdditionalDomains}
                takenDomains={takenEmailDomains}
                isDisabled={isCompleting}
              />
              <FormGroup label="Protocol" fieldId="idp-setup-protocol" isRequired>
                <FormSelect
                  id="idp-setup-protocol"
                  value={form.protocol}
                  onChange={(_event, value) =>
                    setForm((current) => ({
                      ...current,
                      protocol: value as IdentityProviderProtocol,
                    }))
                  }
                  aria-label="Protocol"
                >
                  <FormSelectOption value="OIDC" label="OpenID Connect (OIDC)" />
                  <FormSelectOption value="SAML" label="SAML 2.0" />
                </FormSelect>
              </FormGroup>
              <FormGroup label="Display name" fieldId="idp-setup-display-name" isRequired>
                <TextInput
                  id="idp-setup-display-name"
                  value={form.displayName}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, displayName: value }))
                  }
                />
              </FormGroup>
              <FormGroup label={issuerLabel} fieldId="idp-setup-issuer" isRequired>
                <TextInput
                  id="idp-setup-issuer"
                  value={form.issuerUrl}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, issuerUrl: value }))
                  }
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Values are prefilled from the organization domain.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup label={clientLabel} fieldId="idp-setup-client" isRequired>
                <TextInput
                  id="idp-setup-client"
                  value={form.clientId}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, clientId: value }))
                  }
                />
              </FormGroup>
              <div className="idp-manager-setup-page__actions">
                <Button variant="primary" onClick={handleConnect} isDisabled={isFormDisabled}>
                  Connect identity provider
                </Button>
                <Button variant="secondary" onClick={() => setSetupView('invite')}>
                  Back
                </Button>
              </div>
            </Form>
          </>
        ) : null}

        {!isCompleting && setupView === 'complete' ? (
          <>
            <Alert variant="success" isInline title="Setup complete">
              {organization.name} is active and ready for tenant login.
            </Alert>
            <Content component="p" className="idp-manager-setup-page__lede">
              You can close this window or return home.
            </Content>
            <div className="idp-manager-setup-page__actions">
              <RouterButton to="/" variant="primary">
                Return to home
              </RouterButton>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

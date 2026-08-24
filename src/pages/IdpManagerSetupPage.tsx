import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, Content, Title } from '@patternfly/react-core'
import {
  ensureBlueSolaceOnboardingOrganization,
  ensureProviderDemoOrganizations,
  getProviderRegisteredOrganizationByIdpInviteToken,
  getProviderRegisteredOrganizations,
  updateProviderRegisteredOrganization,
} from '../providerSetup/storage'
import {
  findOrganizationForIdpManagerUrlSlug,
  getIdpManagerChangePasswordRoute,
  getIdpManagerPrototypeRoute,
  getIdpManagerUrlSlug,
  getIdpManagerWorkspaceRoute,
  getPendingIdpManagerInvites,
  hasBreakGlassAccount,
  isIdpInviteExpired,
  resolveBreakGlassUsername,
  resolveIdpManagerPrototypeOrganization,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import { RouterButton } from '../components/RouterButton'
import { OsacChangePasswordPage, OsacSignInPage } from './OsacSignInPage'

type GateState = 'invalid' | 'expired' | 'ready'
type IdpManagerPage = 'sign-in' | 'change-password'

const IDP_MANAGER_AUTH_DELAY_MS = 1500

function getIdpManagerPage(pathname: string): IdpManagerPage {
  if (pathname.endsWith('/change-password')) {
    return 'change-password'
  }
  return 'sign-in'
}

function findOrganizationBySlug(slug: string): RegisteredOrganization | null {
  return findOrganizationForIdpManagerUrlSlug(getProviderRegisteredOrganizations(), slug)
}

function buildNextBreakGlassPassword(currentPassword: string): string {
  const next = 'BG-bluesolace-financial-group-vault-2026'
  return currentPassword === next ? `${next}-rotated` : next
}

function credentialsMatch(
  organization: RegisteredOrganization,
  username: string,
  password: string,
): boolean {
  const entered = username.trim().toLowerCase()
  const expectedUsers = [
    resolveBreakGlassUsername(organization).toLowerCase(),
    organization.breakGlassUsername?.trim().toLowerCase() ?? '',
    organization.breakGlassEmail?.trim().toLowerCase() ?? '',
  ].filter(Boolean)
  const expectedPass = organization.breakGlassPassword ?? ''
  return expectedUsers.includes(entered) && password === expectedPass
}

function resolveIdpManagerGate(
  orgSlug: string | undefined,
  token: string | undefined,
): { gateState: GateState; organization: RegisteredOrganization | null } {
  if (token) {
    const match = getProviderRegisteredOrganizationByIdpInviteToken(token)
    if (!match) {
      return { gateState: 'invalid', organization: null }
    }

    if (match.idpInviteStatus === 'expired' || isIdpInviteExpired(match)) {
      return { gateState: 'expired', organization: match }
    }

    return { gateState: 'ready', organization: match }
  }

  ensureProviderDemoOrganizations()
  ensureBlueSolaceOnboardingOrganization()
  if (orgSlug?.trim()) {
    const slugOrg = findOrganizationBySlug(orgSlug)
    if (!slugOrg || !hasBreakGlassAccount(slugOrg)) {
      return { gateState: 'invalid', organization: null }
    }
    return { gateState: 'ready', organization: slugOrg }
  }

  const prototypeOrg = resolveIdpManagerPrototypeOrganization(
    getProviderRegisteredOrganizations(),
  )
  if (!prototypeOrg || !hasBreakGlassAccount(prototypeOrg)) {
    return { gateState: 'invalid', organization: null }
  }

  return { gateState: 'ready', organization: prototypeOrg }
}

export function IdpManagerSetupPage() {
  const { orgSlug, token } = useParams<{ orgSlug?: string; token?: string }>()
  const location = useLocation()
  const page = getIdpManagerPage(location.pathname)
  const canonicalSlug = orgSlug ? getIdpManagerUrlSlug(orgSlug) : undefined

  if (orgSlug && canonicalSlug && canonicalSlug !== orgSlug) {
    return (
      <Navigate
        to={
          page === 'change-password'
            ? getIdpManagerChangePasswordRoute(canonicalSlug)
            : getIdpManagerPrototypeRoute(canonicalSlug)
        }
        replace
      />
    )
  }

  return (
    <IdpManagerSetupSession
      key={token ?? canonicalSlug ?? orgSlug ?? 'idp-manager'}
      orgSlug={canonicalSlug ?? orgSlug}
      token={token}
    />
  )
}

function IdpManagerSetupSession({
  orgSlug,
  token,
}: {
  orgSlug?: string
  token?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const page = getIdpManagerPage(location.pathname)
  const resolved = resolveIdpManagerGate(orgSlug, token)
  const [organization, setOrganization] = useState<RegisteredOrganization | null>(
    resolved.organization,
  )
  const [signInError, setSignInError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const gateState = resolved.gateState
  const gateOrganization = organization ?? resolved.organization

  useEffect(() => {
    if (gateState !== 'expired' || !resolved.organization) {
      return
    }
    if (resolved.organization.idpInviteStatus === 'expired') {
      return
    }
    updateProviderRegisteredOrganization(resolved.organization.id, {
      idpInviteStatus: 'expired',
    })
  }, [gateState, resolved.organization])

  const handleSignIn = (username: string, password: string) => {
    if (!gateOrganization || isSigningIn) {
      return
    }
    if (!credentialsMatch(gateOrganization, username, password)) {
      setSignInError('Username or password is incorrect.')
      return
    }

    setSignInError(null)
    setIsSigningIn(true)
    const nextRoute = getIdpManagerChangePasswordRoute(gateOrganization.slug)
    window.setTimeout(() => {
      navigate(nextRoute)
    }, IDP_MANAGER_AUTH_DELAY_MS)
  }

  const handleChangePassword = (currentPassword: string, newPassword: string) => {
    if (!gateOrganization || isSavingPassword) {
      return
    }
    if (currentPassword !== gateOrganization.breakGlassPassword) {
      setPasswordError('Current password is incorrect.')
      return
    }

    const updated = updateProviderRegisteredOrganization(gateOrganization.id, {
      breakGlassPassword: newPassword,
    })
    if (!updated) {
      setPasswordError('Could not save the new password.')
      return
    }

    setPasswordError(null)
    setOrganization(updated)
    setIsSavingPassword(true)
    const nextRoute = getIdpManagerWorkspaceRoute(updated.slug)
    window.setTimeout(() => {
      navigate(nextRoute)
    }, IDP_MANAGER_AUTH_DELAY_MS)
  }

  if (gateState === 'invalid' || gateState === 'expired') {
    const currentInvites = getPendingIdpManagerInvites(getProviderRegisteredOrganizations())

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
            <Alert variant="danger" isInline title="Break-glass account not found">
              Ask the provider admin to create a break-glass account, then sign in with that
              username and password.
            </Alert>
          ) : (
            <Alert variant="warning" isInline title="OSAC link expired">
              Ask the provider admin for {gateOrganization?.name ?? 'this tenant'} to create
              a new break-glass account.
            </Alert>
          )}
          {gateState === 'invalid' && currentInvites.length > 0 ? (
            <Content component="p" className="idp-manager-setup-page__lede">
              A pending tenant is waiting on IdP setup. Return home and open IdP manager
              again, or use the OSAC link the provider admin sent.
            </Content>
          ) : null}
          <div className="idp-manager-setup-page__actions">
            <RouterButton to="/" variant="secondary">
              Return to home
            </RouterButton>
          </div>
        </div>
      </div>
    )
  }

  if (!gateOrganization) {
    return null
  }

  if (token) {
    return <Navigate to={getIdpManagerPrototypeRoute(gateOrganization.slug)} replace />
  }

  if (!orgSlug) {
    return <Navigate to={getIdpManagerPrototypeRoute(gateOrganization.slug)} replace />
  }

  if (page === 'change-password') {
    return (
      <OsacChangePasswordPage
        defaultCurrentPassword={gateOrganization.breakGlassPassword ?? ''}
        defaultNewPassword={buildNextBreakGlassPassword(gateOrganization.breakGlassPassword ?? '')}
        requireDifferentFromCurrent={false}
        errorMessage={passwordError ?? undefined}
        isWorking={isSavingPassword}
        onSubmit={handleChangePassword}
      />
    )
  }

  return (
    <OsacSignInPage
      variant="local-account"
      defaultUsername={resolveBreakGlassUsername(gateOrganization)}
      defaultPassword={gateOrganization.breakGlassPassword ?? ''}
      helperText="Break-glass local login. Not the tenant IdP."
      errorMessage={signInError ?? undefined}
      isContinuing={isSigningIn}
      onNext={() => undefined}
      onSubmitLocalAccount={handleSignIn}
    />
  )
}

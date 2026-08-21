import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, Content, Title } from '@patternfly/react-core'
import {
  ensureProviderDemoOrganizations,
  getProviderRegisteredOrganizationByIdpInviteToken,
  getProviderRegisteredOrganizations,
  updateProviderRegisteredOrganization,
} from '../providerSetup/storage'
import {
  getIdpManagerChangePasswordRoute,
  getIdpManagerPrototypeRoute,
  getIdpManagerWorkspaceRoute,
  getPendingIdpManagerInvites,
  hasBreakGlassAccount,
  isIdpInviteExpired,
  resolveIdpManagerPrototypeOrganization,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import { RouterButton } from '../components/RouterButton'
import { OsacChangePasswordPage, OsacSignInPage } from './OsacSignInPage'

type GateState = 'invalid' | 'expired' | 'ready'
type IdpManagerPage = 'sign-in' | 'change-password'

function getIdpManagerPage(pathname: string): IdpManagerPage {
  if (pathname.endsWith('/change-password')) {
    return 'change-password'
  }
  return 'sign-in'
}

function findOrganizationBySlug(slug: string): RegisteredOrganization | null {
  const normalized = slug.trim().toLowerCase()
  return (
    getProviderRegisteredOrganizations().find(
      (organization) => organization.slug.toLowerCase() === normalized,
    ) ?? null
  )
}

function buildNextBreakGlassPassword(_currentPassword: string): string {
  return 'BG-bluesolace-financial-group-vault-2026'
}

function credentialsMatch(
  organization: RegisteredOrganization,
  username: string,
  password: string,
): boolean {
  const entered = username.trim().toLowerCase()
  const expectedUsers = [
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
  return (
    <IdpManagerSetupSession
      key={token ?? orgSlug ?? 'idp-manager'}
      orgSlug={orgSlug}
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
    if (!gateOrganization) {
      return
    }
    if (!credentialsMatch(gateOrganization, username, password)) {
      setSignInError('Username or password is incorrect.')
      return
    }

    setSignInError(null)
    setIsSigningIn(true)
    window.setTimeout(() => {
      setIsSigningIn(false)
      navigate(getIdpManagerChangePasswordRoute(gateOrganization.slug))
    }, 600)
  }

  const handleChangePassword = (currentPassword: string, newPassword: string) => {
    if (!gateOrganization) {
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
    navigate(getIdpManagerWorkspaceRoute(updated.slug))
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
        errorMessage={passwordError ?? undefined}
        onSubmit={handleChangePassword}
      />
    )
  }

  return (
    <OsacSignInPage
      variant="local-account"
      defaultUsername={gateOrganization.breakGlassUsername ?? ''}
      defaultPassword={gateOrganization.breakGlassPassword ?? ''}
      helperText="Break-glass local login. Not the tenant IdP."
      errorMessage={signInError ?? undefined}
      isContinuing={isSigningIn}
      onNext={() => undefined}
      onSubmitLocalAccount={handleSignIn}
    />
  )
}

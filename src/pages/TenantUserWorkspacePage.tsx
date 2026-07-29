import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, AlertActionLink } from '@patternfly/react-core'
import { TenantShell } from '../components/tenant/TenantShell'
import { DEMO_TENANT_DISPLAY_USER, isDemoTenantId } from '../demoTenant'
import {
  getDemoTenantUserOrganization,
  getProviderViewingAsTenantUser,
  returnFromTenantUserPreview,
} from '../providerAdmin/openAsTenantUser'
import { getProviderRegisteredOrganizations, activateProviderRegisteredOrganizationBySlug } from '../providerSetup/storage'
import { getProviderCatalogDraft, getProviderCatalogItems } from '../providerSetup/storage'
import { getRegisteredOrganizationBySlug } from '../tenantAdmin/organizations'
import { getTenantUserProjectInvitation } from '../tenantUser/invitation'
import type { TenantInstance } from '../tenantUser/instances'
import { LAUNCH_INSTANCE_PROVISIONING_DURATION_MS } from '../tenantUser/launchInstanceWizard'
import {
  addTenantUserInstance,
  getTenantUserActiveNav,
  getTenantUserInstances,
  setTenantUserActiveNav,
  setTenantUserOnboardingComplete,
  updateTenantUserInstance,
  type TenantUserNavId,
} from '../tenantUser/storage'
import { TENANT_USER_NAV_ITEMS } from '../tenantShell/constants'
import { TenantUserActivityLogPage } from './tenant-user/TenantUserActivityLogPage'
import { TenantUserCatalogPage } from './tenant-user/TenantUserCatalogPage'
import { TenantUserInstancesPage } from './tenant-user/TenantUserInstancesPage'

function isTenantUserNavId(value: string | null): value is TenantUserNavId {
  return value === 'catalog' || value === 'my-instances' || value === 'activity-log'
}

/** Seeds post-onboarding Tenant User state so landing-page prototype links can open finished screens. */
function ensureTenantUserPostOnboardingPrototype(tenantSlug: string, navId: TenantUserNavId) {
  setTenantUserOnboardingComplete(tenantSlug)
  setTenantUserActiveNav(tenantSlug, navId)
  activateProviderRegisteredOrganizationBySlug(tenantSlug)
}

function readInitialTenantUserNav(
  tenantSlug: string,
  searchParams: URLSearchParams,
): TenantUserNavId {
  const requestedNav = searchParams.get('nav')
  if (isTenantUserNavId(requestedNav)) {
    ensureTenantUserPostOnboardingPrototype(tenantSlug, requestedNav)
    return requestedNav
  }

  return getTenantUserActiveNav(tenantSlug)
}

export function TenantUserWorkspacePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tenant } = useParams<{ tenant: string }>()
  const tenantSlug =
    tenant && isDemoTenantId(tenant) && tenant === 'northstar' ? tenant : 'northstar'
  const isValidTenant = Boolean(tenant && isDemoTenantId(tenant) && tenant === 'northstar')

  const [previewSession] = useState(() => getProviderViewingAsTenantUser())
  const [activeNavId, setActiveNavId] = useState<TenantUserNavId>(() =>
    isValidTenant ? readInitialTenantUserNav(tenantSlug, searchParams) : 'catalog',
  )
  const [instances, setInstances] = useState<TenantInstance[]>(() =>
    isValidTenant ? getTenantUserInstances(tenantSlug) : [],
  )
  const [showBackgroundProvisioningNotice, setShowBackgroundProvisioningNotice] = useState(false)
  const provisioningTimersRef = useRef<Map<string, number>>(new Map())

  const hasProvisioningInstances = instances.some(
    (instance) => instance.status === 'provisioning',
  )

  useEffect(() => {
    if (!hasProvisioningInstances) {
      setShowBackgroundProvisioningNotice(false)
    }
  }, [hasProvisioningInstances])

  const clearProvisioningTimer = useCallback((instanceId: string) => {
    const timeoutId = provisioningTimersRef.current.get(instanceId)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      provisioningTimersRef.current.delete(instanceId)
    }
  }, [])

  const markInstanceRunning = useCallback(
    (instanceId: string) => {
      clearProvisioningTimer(instanceId)
      setInstances(
        updateTenantUserInstance(tenantSlug, instanceId, {
          status: 'running',
          provisionedAt: new Date().toISOString(),
        }),
      )
      setShowBackgroundProvisioningNotice(false)
    },
    [clearProvisioningTimer, tenantSlug],
  )

  const scheduleProvisioningCompletion = useCallback(
    (instanceId: string, delayMs: number) => {
      clearProvisioningTimer(instanceId)
      const timeoutId = window.setTimeout(() => {
        markInstanceRunning(instanceId)
      }, Math.max(0, delayMs))
      provisioningTimersRef.current.set(instanceId, timeoutId)
    },
    [clearProvisioningTimer, markInstanceRunning],
  )

  useEffect(() => {
    if (!isValidTenant) {
      return
    }

    const now = Date.now()
    for (const instance of getTenantUserInstances(tenantSlug)) {
      if (instance.status !== 'provisioning') {
        continue
      }
      const elapsedMs = now - new Date(instance.createdAt).getTime()
      scheduleProvisioningCompletion(
        instance.id,
        LAUNCH_INSTANCE_PROVISIONING_DURATION_MS - elapsedMs,
      )
    }

    return () => {
      for (const timeoutId of provisioningTimersRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      provisioningTimersRef.current.clear()
    }
  }, [isValidTenant, scheduleProvisioningCompletion, tenantSlug])

  useLayoutEffect(() => {
    if (!isValidTenant) {
      return
    }

    setTenantUserOnboardingComplete(tenantSlug)
    activateProviderRegisteredOrganizationBySlug(tenantSlug)

    const requestedNav = searchParams.get('nav')
    if (!isTenantUserNavId(requestedNav)) {
      return
    }

    ensureTenantUserPostOnboardingPrototype(tenantSlug, requestedNav)
    setActiveNavId(requestedNav)
  }, [isValidTenant, searchParams, tenantSlug])

  const handleNavChange = useCallback(
    (navId: string) => {
      const nextNavId = navId as TenantUserNavId
      setActiveNavId(nextNavId)
      setTenantUserActiveNav(tenantSlug, nextNavId)

      if (nextNavId !== 'my-instances') {
        setShowBackgroundProvisioningNotice(false)
      }
    },
    [tenantSlug],
  )

  const handleNavigateToInstances = useCallback(
    (options?: { showBackgroundProvisioningNotice?: boolean }) => {
      setShowBackgroundProvisioningNotice(Boolean(options?.showBackgroundProvisioningNotice))
      handleNavChange('my-instances')
    },
    [handleNavChange],
  )

  const handleProvisioningStarted = useCallback(
    (instance: TenantInstance) => {
      setInstances(addTenantUserInstance(tenantSlug, instance))
      scheduleProvisioningCompletion(instance.id, LAUNCH_INSTANCE_PROVISIONING_DURATION_MS)
    },
    [scheduleProvisioningCompletion, tenantSlug],
  )

  const handleDismissDuringProvisioning = useCallback(
    (_instanceId: string) => {
      handleNavigateToInstances({ showBackgroundProvisioningNotice: true })
    },
    [handleNavigateToInstances],
  )

  const handleWizardFinished = useCallback(
    (instanceId: string) => {
      markInstanceRunning(instanceId)
      handleNavigateToInstances()
    },
    [handleNavigateToInstances, markInstanceRunning],
  )

  if (!isValidTenant) {
    return <Navigate to="/" replace />
  }

  const isPreviewSession = previewSession !== null && previewSession.tenantSlug === tenantSlug
  const organizationFromSlug = getRegisteredOrganizationBySlug(tenantSlug)
  const organization =
    (isPreviewSession &&
      previewSession &&
      getProviderRegisteredOrganizations().find(
        (item) => item.id === previewSession.organizationId,
      )) ||
    organizationFromSlug ||
    (isPreviewSession ? getDemoTenantUserOrganization() : null)
  const defaultCatalogDraft = getProviderCatalogDraft()
  const focusedCatalogDraft =
    isPreviewSession && previewSession?.catalogItemId
      ? (getProviderCatalogItems().find(
          (item) => item.catalogItemId === previewSession.catalogItemId,
        ) ?? defaultCatalogDraft)
      : defaultCatalogDraft
  const catalogDraft = focusedCatalogDraft
  const invitation = getTenantUserProjectInvitation(tenantSlug, organization)
  const displayName = DEMO_TENANT_DISPLAY_USER[tenantSlug]

  const handleReturnFromPreview = () => {
    navigate(returnFromTenantUserPreview())
  }

  const returnActionLabel =
    previewSession?.source === 'tenant-admin' ? 'Return to Tenant Admin' : 'Return to Provider Admin'

  const renderWorkspaceContent = () => {
    switch (activeNavId) {
      case 'my-instances':
        return (
          <TenantUserInstancesPage
            tenantSlug={tenantSlug}
            instances={instances}
            onInstancesChange={setInstances}
            defaultScopeFieldLabel={invitation.scopeFieldLabel}
            showBackgroundProvisioningNotice={
              showBackgroundProvisioningNotice && hasProvisioningInstances
            }
            onDismissBackgroundProvisioningNotice={() =>
              setShowBackgroundProvisioningNotice(false)
            }
          />
        )
      case 'activity-log':
        return <TenantUserActivityLogPage />
      case 'catalog':
      default:
        return (
          <TenantUserCatalogPage
            organization={organization}
            catalogDraft={catalogDraft}
            scopeKind={invitation.scopeKind}
            scopeLabel={invitation.scopeLabel}
            scopeFieldLabel={invitation.scopeFieldLabel}
            preferCatalogDraft={Boolean(previewSession?.catalogItemId)}
            autoOpenLaunchWizard={Boolean(previewSession?.autoLaunch && previewSession.catalogItemId)}
            existingInstanceNames={instances.map((instance) => instance.name)}
            onProvisioningStarted={handleProvisioningStarted}
            onDismissDuringProvisioning={handleDismissDuringProvisioning}
            onWizardFinished={handleWizardFinished}
          />
        )
    }
  }

  return (
    <TenantShell
      role="tenant-user"
      displayName={displayName}
      navItems={TENANT_USER_NAV_ITEMS}
      showNavigation
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
    >
      {isPreviewSession && previewSession ? (
        <Alert
          variant="info"
          isInline
          title="Viewing as tenant user"
          className="tenant-user-provider-preview-banner"
          actionLinks={
            <AlertActionLink component="button" onClick={handleReturnFromPreview}>
              {returnActionLabel}
            </AlertActionLink>
          }
        >
          You are previewing {previewSession.organizationName} as a tenant user
          {previewSession.catalogDisplayName
            ? ` for “${previewSession.catalogDisplayName}”`
            : ' to browse the catalog'}
          .
        </Alert>
      ) : null}
      {renderWorkspaceContent()}
    </TenantShell>
  )
}

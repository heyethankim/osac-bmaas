import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom'
import type { CatalogServiceId } from '../providerSetup/templateDemo'

/** Query key for an open catalog item detail page (display name or catalog item id). */
export const WORKSPACE_CATALOG_ITEM_PARAM = 'item'

/** Query key for an open service instance detail page (instance name or id). */
export const WORKSPACE_INSTANCE_PARAM = 'instance'

/** Query key for an open tenant detail page on Administration → Tenants. */
export const WORKSPACE_ORGANIZATION_PARAM = 'tenant'

/** Query key for a workspace create/register wizard flow. */
export const WORKSPACE_ACTION_PARAM = 'action'

/** Query key for the selected catalog service in create-catalog-item. */
export const WORKSPACE_SERVICE_PARAM = 'service'

/** Query key for the active step in a create/register wizard (`?step=hardware`). */
export const WORKSPACE_STEP_PARAM = 'step'

export const WORKSPACE_ACTION_CREATE_CATALOG_ITEM = 'create-catalog-item'
export const WORKSPACE_ACTION_REGISTER_TENANT = 'register-tenant'
export const WORKSPACE_ACTION_CREATE_EXTERNAL_IP_POOL = 'create-external-ip-pool'
export const WORKSPACE_ACTION_CREATE_SECRET = 'create-secret'
export const WORKSPACE_ACTION_LAUNCH_INSTANCE = 'launch-instance'
export const WORKSPACE_ACTION_CREATE_PROJECT = 'create-project'
export const WORKSPACE_ACTION_ADD_TENANT_ADMINISTRATOR = 'add-tenant-administrator'
export const WORKSPACE_ACTION_CREATE_VIRTUAL_NETWORK = 'create-virtual-network'
export const WORKSPACE_ACTION_CREATE_SUBNET = 'create-subnet'
export const WORKSPACE_ACTION_CREATE_SECURITY_GROUP = 'create-security-group'
export const WORKSPACE_ACTION_CREATE_EXTERNAL_IP = 'create-external-ip'
export const WORKSPACE_ACTION_ATTACH_NAT_GATEWAY = 'attach-nat-gateway'
export const WORKSPACE_ACTION_SETUP_IDENTITY_PROVIDER = 'setup-identity-provider'
export const WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER = 'connect-identity-provider'

export type WorkspaceAction =
  | typeof WORKSPACE_ACTION_CREATE_CATALOG_ITEM
  | typeof WORKSPACE_ACTION_REGISTER_TENANT
  | typeof WORKSPACE_ACTION_CREATE_EXTERNAL_IP_POOL
  | typeof WORKSPACE_ACTION_CREATE_SECRET
  | typeof WORKSPACE_ACTION_LAUNCH_INSTANCE
  | typeof WORKSPACE_ACTION_CREATE_PROJECT
  | typeof WORKSPACE_ACTION_ADD_TENANT_ADMINISTRATOR
  | typeof WORKSPACE_ACTION_CREATE_VIRTUAL_NETWORK
  | typeof WORKSPACE_ACTION_CREATE_SUBNET
  | typeof WORKSPACE_ACTION_CREATE_SECURITY_GROUP
  | typeof WORKSPACE_ACTION_CREATE_EXTERNAL_IP
  | typeof WORKSPACE_ACTION_ATTACH_NAT_GATEWAY
  | typeof WORKSPACE_ACTION_SETUP_IDENTITY_PROVIDER
  | typeof WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER

const WORKSPACE_ACTIONS = new Set<WorkspaceAction>([
  WORKSPACE_ACTION_CREATE_CATALOG_ITEM,
  WORKSPACE_ACTION_REGISTER_TENANT,
  WORKSPACE_ACTION_CREATE_EXTERNAL_IP_POOL,
  WORKSPACE_ACTION_CREATE_SECRET,
  WORKSPACE_ACTION_LAUNCH_INSTANCE,
  WORKSPACE_ACTION_CREATE_PROJECT,
  WORKSPACE_ACTION_ADD_TENANT_ADMINISTRATOR,
  WORKSPACE_ACTION_CREATE_VIRTUAL_NETWORK,
  WORKSPACE_ACTION_CREATE_SUBNET,
  WORKSPACE_ACTION_CREATE_SECURITY_GROUP,
  WORKSPACE_ACTION_CREATE_EXTERNAL_IP,
  WORKSPACE_ACTION_ATTACH_NAT_GATEWAY,
  WORKSPACE_ACTION_SETUP_IDENTITY_PROVIDER,
  WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER,
])

const CATALOG_SERVICE_IDS = new Set<CatalogServiceId>([
  'baremetal',
  'cluster',
  'models',
  'virtual-machine',
])

export type SyncWorkspaceNavOptions = NavigateOptions & {
  /**
   * Left-nav landing navigation: always clear `?item=` so re-selecting Catalog
   * (or any section) returns to the list view instead of keeping a detail open.
   */
  showLanding?: boolean
}

function isWorkspaceAction(value: string | null | undefined): value is WorkspaceAction {
  return Boolean(value && WORKSPACE_ACTIONS.has(value as WorkspaceAction))
}

/** Nav ids where a given create/register action is valid (persona-aware). */
export function getWorkspaceActionNavs(action: WorkspaceAction): readonly string[] {
  switch (action) {
    case WORKSPACE_ACTION_CREATE_CATALOG_ITEM:
    case WORKSPACE_ACTION_LAUNCH_INSTANCE:
      return ['catalog']
    case WORKSPACE_ACTION_REGISTER_TENANT:
    case WORKSPACE_ACTION_SETUP_IDENTITY_PROVIDER:
      return ['administration-organizations']
    case WORKSPACE_ACTION_CREATE_EXTERNAL_IP_POOL:
      return ['networking']
    case WORKSPACE_ACTION_CREATE_SECRET:
      return ['secrets']
    case WORKSPACE_ACTION_CREATE_PROJECT:
      return ['projects-teams']
    case WORKSPACE_ACTION_ADD_TENANT_ADMINISTRATOR:
      return ['administration-roles', 'administration-organizations', 'roles']
    case WORKSPACE_ACTION_CREATE_VIRTUAL_NETWORK:
    case WORKSPACE_ACTION_CREATE_SUBNET:
    case WORKSPACE_ACTION_CREATE_SECURITY_GROUP:
    case WORKSPACE_ACTION_ATTACH_NAT_GATEWAY:
      return ['networking-virtual-networks']
    case WORKSPACE_ACTION_CREATE_EXTERNAL_IP:
      return ['networking-external-ip-pools']
    case WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER:
      return ['identity-provider', 'administration-identity-provider', 'administration-organizations']
  }
}

function getWorkspaceActionNav(action: WorkspaceAction): string {
  return getWorkspaceActionNavs(action)[0]!
}

function isWorkspaceActionAllowedOnNav(action: WorkspaceAction, navId: string): boolean {
  return getWorkspaceActionNavs(action).includes(navId)
}

function isCatalogServiceId(value: string | null | undefined): value is CatalogServiceId {
  return Boolean(value && CATALOG_SERVICE_IDS.has(value as CatalogServiceId))
}

export function getWorkspaceCatalogItemParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_CATALOG_ITEM_PARAM)?.trim()
  return value || null
}

export function getWorkspaceOrganizationParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_ORGANIZATION_PARAM)?.trim()
  return value || null
}

export function getWorkspaceInstanceParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_INSTANCE_PARAM)?.trim()
  return value || null
}

export function getWorkspaceActionParam(searchParams: URLSearchParams): WorkspaceAction | null {
  const value = searchParams.get(WORKSPACE_ACTION_PARAM)?.trim()
  return isWorkspaceAction(value) ? value : null
}

export function getWorkspaceCatalogServiceParam(
  searchParams: URLSearchParams,
): CatalogServiceId | null {
  const value = searchParams.get(WORKSPACE_SERVICE_PARAM)?.trim()
  return isCatalogServiceId(value) ? value : null
}

export function getWorkspaceStepParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_STEP_PARAM)?.trim()
  return value || null
}

/**
 * Resolve 1-based PatternFly Wizard `startIndex` from `?step=`.
 * Falls back to `fallbackIndex` (default 1) when missing or unknown.
 */
export function resolveWorkspaceWizardStartIndex(
  steps: readonly { id: string }[],
  stepParam: string | null | undefined,
  fallbackIndex = 1,
): number {
  if (!stepParam || steps.length === 0) {
    return fallbackIndex
  }

  const index = steps.findIndex((step) => step.id === stepParam)
  return index >= 0 ? index + 1 : fallbackIndex
}

export function isServicesWorkspaceNav(navId: string): boolean {
  return navId.startsWith('services-')
}

export function buildProviderOrganizationWorkspacePath(organizationId: string): string {
  const params = new URLSearchParams({
    nav: 'administration-organizations',
    [WORKSPACE_ORGANIZATION_PARAM]: organizationId,
  })

  return `/provider/workspace?${params.toString()}`
}

export function buildProviderCatalogItemWorkspacePath(itemKey: string): string {
  const params = new URLSearchParams({
    nav: 'catalog',
    [WORKSPACE_CATALOG_ITEM_PARAM]: itemKey.trim(),
  })

  return `/provider/workspace?${params.toString()}`
}

export function buildProviderCreateCatalogItemPath(
  serviceId: CatalogServiceId = 'baremetal',
): string {
  const params = new URLSearchParams({
    nav: 'catalog',
    [WORKSPACE_ACTION_PARAM]: WORKSPACE_ACTION_CREATE_CATALOG_ITEM,
    [WORKSPACE_SERVICE_PARAM]: serviceId,
  })

  return `/provider/workspace?${params.toString()}`
}

export function buildProviderRegisterTenantPath(): string {
  const params = new URLSearchParams({
    nav: 'administration-organizations',
    [WORKSPACE_ACTION_PARAM]: WORKSPACE_ACTION_REGISTER_TENANT,
  })

  return `/provider/workspace?${params.toString()}`
}

export function buildProviderCreateExternalIpPoolPath(): string {
  const params = new URLSearchParams({
    nav: 'networking',
    [WORKSPACE_ACTION_PARAM]: WORKSPACE_ACTION_CREATE_EXTERNAL_IP_POOL,
  })

  return `/provider/workspace?${params.toString()}`
}

export function buildProviderCreateSecretPath(): string {
  const params = new URLSearchParams({
    nav: 'secrets',
    [WORKSPACE_ACTION_PARAM]: WORKSPACE_ACTION_CREATE_SECRET,
  })

  return `/provider/workspace?${params.toString()}`
}

/**
 * Keep `?nav=` in sync with the active workspace page so every view is URL-addressable.
 * Clears `?item=` when leaving Catalog, `?instance=` when leaving Services, or whenever
 * `showLanding` is set (left-nav clicks).
 */
export function syncWorkspaceNavParam(
  setSearchParams: SetURLSearchParams,
  navId: string,
  options?: SyncWorkspaceNavOptions,
): void {
  const showLanding = options?.showLanding === true
  const { showLanding: _showLanding, ...navigateOptions } = options ?? {}

  setSearchParams((current) => {
    const navMatches = current.get('nav') === navId
    const hasItem = current.has(WORKSPACE_CATALOG_ITEM_PARAM)
    const hasInstance = current.has(WORKSPACE_INSTANCE_PARAM)
    const hasTenant = current.has(WORKSPACE_ORGANIZATION_PARAM)
    const action = getWorkspaceActionParam(current)
    const shouldClearItem = showLanding || navId !== 'catalog'
    const shouldClearInstance = showLanding || !isServicesWorkspaceNav(navId)
    const shouldClearTenant = showLanding || navId !== 'administration-organizations'
    const shouldClearAction =
      showLanding || (action !== null && !isWorkspaceActionAllowedOnNav(action, navId))
    const hasAction = Boolean(action)
    const hasService = current.has(WORKSPACE_SERVICE_PARAM)
    const hasStep = current.has(WORKSPACE_STEP_PARAM)
    const shouldClearService = shouldClearAction || navId !== 'catalog'
    const shouldClearStep = shouldClearAction

    if (
      navMatches &&
      !(shouldClearItem && hasItem) &&
      !(shouldClearInstance && hasInstance) &&
      !(shouldClearTenant && hasTenant) &&
      !(shouldClearAction && hasAction) &&
      !(shouldClearService && hasService) &&
      !(shouldClearStep && hasStep)
    ) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', navId)
    if (shouldClearItem) {
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
    }
    if (shouldClearInstance) {
      next.delete(WORKSPACE_INSTANCE_PARAM)
    }
    if (shouldClearTenant) {
      next.delete(WORKSPACE_ORGANIZATION_PARAM)
    }
    if (shouldClearAction) {
      next.delete(WORKSPACE_ACTION_PARAM)
    }
    if (shouldClearService) {
      next.delete(WORKSPACE_SERVICE_PARAM)
    }
    if (shouldClearStep) {
      next.delete(WORKSPACE_STEP_PARAM)
    }
    return next
  }, navigateOptions)
}

/** Open or close a catalog item detail via `?item=`. */
export function syncWorkspaceCatalogItemParam(
  setSearchParams: SetURLSearchParams,
  item: string | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentItem = current.get(WORKSPACE_CATALOG_ITEM_PARAM)
    const currentAction = getWorkspaceActionParam(current)
    if (!item) {
      if (!currentItem) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
      return next
    }

    if (
      currentItem === item &&
      currentAction !== WORKSPACE_ACTION_LAUNCH_INSTANCE &&
      currentAction !== WORKSPACE_ACTION_CREATE_CATALOG_ITEM
    ) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', 'catalog')
    next.set(WORKSPACE_CATALOG_ITEM_PARAM, item)
    next.delete(WORKSPACE_ACTION_PARAM)
    next.delete(WORKSPACE_SERVICE_PARAM)
    next.delete(WORKSPACE_STEP_PARAM)
    return next
  }, options)
}

/** Open or close a create/register wizard via `?action=`. */
export function syncWorkspaceActionParam(
  setSearchParams: SetURLSearchParams,
  action: WorkspaceAction | null,
  options?: NavigateOptions & { catalogItem?: string | null },
): void {
  const catalogItem = options?.catalogItem
  const { catalogItem: _catalogItem, ...navigateOptions } = options ?? {}

  setSearchParams((current) => {
    const currentAction = getWorkspaceActionParam(current)
    if (!action) {
      if (
        !currentAction &&
        !current.has(WORKSPACE_SERVICE_PARAM) &&
        !current.has(WORKSPACE_STEP_PARAM)
      ) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_ACTION_PARAM)
      next.delete(WORKSPACE_SERVICE_PARAM)
      next.delete(WORKSPACE_STEP_PARAM)
      if (currentAction === WORKSPACE_ACTION_LAUNCH_INSTANCE) {
        next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
      }
      return next
    }

    const allowedNavs = getWorkspaceActionNavs(action)
    const currentNav = current.get('nav')
    const expectedNav =
      currentNav && allowedNavs.includes(currentNav) ? currentNav : getWorkspaceActionNav(action)

    if (
      currentAction === action &&
      current.get('nav') === expectedNav &&
      (action !== WORKSPACE_ACTION_CREATE_CATALOG_ITEM ||
        getWorkspaceCatalogServiceParam(current)) &&
      (action !== WORKSPACE_ACTION_LAUNCH_INSTANCE ||
        (catalogItem === undefined
          ? current.has(WORKSPACE_CATALOG_ITEM_PARAM)
          : current.get(WORKSPACE_CATALOG_ITEM_PARAM) === catalogItem))
    ) {
      if (
        action === WORKSPACE_ACTION_CREATE_CATALOG_ITEM &&
        !getWorkspaceCatalogServiceParam(current)
      ) {
        const next = new URLSearchParams(current)
        next.set(WORKSPACE_SERVICE_PARAM, 'baremetal')
        return next
      }
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', expectedNav)
    next.set(WORKSPACE_ACTION_PARAM, action)
    // Wizard components set `?step=` after open; clear any stale step from a prior flow.
    next.delete(WORKSPACE_STEP_PARAM)

    if (action === WORKSPACE_ACTION_CREATE_CATALOG_ITEM) {
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
      if (!getWorkspaceCatalogServiceParam(next)) {
        next.set(WORKSPACE_SERVICE_PARAM, 'baremetal')
      }
    } else if (action === WORKSPACE_ACTION_LAUNCH_INSTANCE) {
      next.delete(WORKSPACE_SERVICE_PARAM)
      if (typeof catalogItem === 'string' && catalogItem.trim()) {
        next.set(WORKSPACE_CATALOG_ITEM_PARAM, catalogItem.trim())
      }
    } else {
      next.delete(WORKSPACE_SERVICE_PARAM)
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
    }

    if (action === WORKSPACE_ACTION_REGISTER_TENANT) {
      next.delete(WORKSPACE_ORGANIZATION_PARAM)
    }

    if (
      action === WORKSPACE_ACTION_CREATE_EXTERNAL_IP_POOL ||
      action === WORKSPACE_ACTION_CREATE_EXTERNAL_IP ||
      action === WORKSPACE_ACTION_CREATE_VIRTUAL_NETWORK ||
      action === WORKSPACE_ACTION_CREATE_SUBNET ||
      action === WORKSPACE_ACTION_CREATE_SECURITY_GROUP ||
      action === WORKSPACE_ACTION_ATTACH_NAT_GATEWAY
    ) {
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
      next.delete(WORKSPACE_ORGANIZATION_PARAM)
    }

    if (action === WORKSPACE_ACTION_CREATE_SECRET) {
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
      next.delete(WORKSPACE_ORGANIZATION_PARAM)
      next.delete(WORKSPACE_INSTANCE_PARAM)
    }

    if (
      action === WORKSPACE_ACTION_CREATE_PROJECT ||
      action === WORKSPACE_ACTION_ADD_TENANT_ADMINISTRATOR ||
      action === WORKSPACE_ACTION_SETUP_IDENTITY_PROVIDER ||
      action === WORKSPACE_ACTION_CONNECT_IDENTITY_PROVIDER
    ) {
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
      next.delete(WORKSPACE_INSTANCE_PARAM)
    }

    return next
  }, navigateOptions)
}

/** Keep `?step=` in sync with the active wizard step. */
export function syncWorkspaceStepParam(
  setSearchParams: SetURLSearchParams,
  stepId: string | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentStep = getWorkspaceStepParam(current)
    if (!stepId) {
      if (!currentStep) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_STEP_PARAM)
      return next
    }

    if (currentStep === stepId) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set(WORKSPACE_STEP_PARAM, stepId)
    return next
  }, options)
}

/** Keep `?service=` in sync with the create-catalog wizard selection. */
export function syncWorkspaceCatalogServiceParam(
  setSearchParams: SetURLSearchParams,
  serviceId: CatalogServiceId | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentService = getWorkspaceCatalogServiceParam(current)
    if (!serviceId) {
      if (!current.has(WORKSPACE_SERVICE_PARAM)) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_SERVICE_PARAM)
      return next
    }

    if (
      current.get('nav') === 'catalog' &&
      getWorkspaceActionParam(current) === WORKSPACE_ACTION_CREATE_CATALOG_ITEM &&
      currentService === serviceId
    ) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', 'catalog')
    next.set(WORKSPACE_ACTION_PARAM, WORKSPACE_ACTION_CREATE_CATALOG_ITEM)
    next.set(WORKSPACE_SERVICE_PARAM, serviceId)
    next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
    return next
  }, options)
}

/** Open or close a service instance detail via `?instance=`. */
export function syncWorkspaceInstanceParam(
  setSearchParams: SetURLSearchParams,
  instance: string | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentInstance = current.get(WORKSPACE_INSTANCE_PARAM)
    if (!instance) {
      if (!currentInstance) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_INSTANCE_PARAM)
      return next
    }

    if (currentInstance === instance) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set(WORKSPACE_INSTANCE_PARAM, instance)
    return next
  }, options)
}

/** Open or close a tenant detail page via `?tenant=` on Administration → Tenants. */
export function syncWorkspaceOrganizationParam(
  setSearchParams: SetURLSearchParams,
  organizationId: string | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentOrganizationId = current.get(WORKSPACE_ORGANIZATION_PARAM)
    if (!organizationId) {
      if (!currentOrganizationId) {
        return current
      }

      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_ORGANIZATION_PARAM)
      return next
    }

    if (
      current.get('nav') === 'administration-organizations' &&
      currentOrganizationId === organizationId
    ) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', 'administration-organizations')
    next.set(WORKSPACE_ORGANIZATION_PARAM, organizationId)
    next.delete(WORKSPACE_ACTION_PARAM)
    next.delete(WORKSPACE_STEP_PARAM)
    return next
  }, options)
}

export function findInstanceByWorkspaceParam<
  T extends { id: string; name: string },
>(instances: readonly T[], instanceParam: string | null | undefined): T | null {
  if (!instanceParam) {
    return null
  }

  const key = instanceParam.trim().toLowerCase()
  if (!key) {
    return null
  }

  return (
    instances.find((instance) => instance.id.toLowerCase() === key) ??
    instances.find((instance) => instance.name.toLowerCase() === key) ??
    instances.find((instance) => instance.name.toLowerCase().includes(key)) ??
    null
  )
}

export function findCatalogItemByWorkspaceParam<
  T extends { catalogItemId?: string; displayName: string },
>(items: readonly T[], itemParam: string | null | undefined): T | null {
  if (!itemParam) {
    return null
  }

  const key = itemParam.trim().toLowerCase()
  if (!key) {
    return null
  }

  return (
    items.find((item) => item.catalogItemId?.toLowerCase() === key) ??
    items.find((item) => item.displayName.toLowerCase() === key) ??
    items.find((item) => item.displayName.toLowerCase().includes(key)) ??
    null
  )
}

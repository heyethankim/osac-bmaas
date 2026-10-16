const SESSION_KEY = 'bmaas-demo-scenario-billing-not-linked'
export const BILLING_NOT_LINKED_SCENARIO_PARAM = 'billing-not-linked'
const NORTH_SUMMIT_TENANT_SLUG = 'northsummit'

/** Landing / workspace query value: `?scenario=billing-not-linked`. */
export function isBillingNotLinkedScenarioParam(value: string | null | undefined): boolean {
  return value?.trim() === BILLING_NOT_LINKED_SCENARIO_PARAM
}

export function isNorthSummitBillingNotLinkedScenarioActive(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/** Session demo: North Summit appears without a linked billing account. */
export function enableNorthSummitBillingNotLinkedScenario(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* private mode / denied storage */
  }
  // Mutually exclusive with billing-inactive demo.
  try {
    sessionStorage.removeItem('bmaas-demo-scenario-billing-inactive')
  } catch {
    /* private mode / denied storage */
  }
}

export function clearNorthSummitBillingNotLinkedScenario(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* private mode / denied storage */
  }
}

/**
 * Apply or clear the not-linked billing demo from the workspace URL.
 * Call when entering Tenant Admin so landing shortcuts stay consistent.
 */
export function syncNorthSummitBillingNotLinkedScenarioFromSearch(
  searchParams: URLSearchParams,
): boolean {
  if (isBillingNotLinkedScenarioParam(searchParams.get('scenario'))) {
    enableNorthSummitBillingNotLinkedScenario()
    return true
  }

  clearNorthSummitBillingNotLinkedScenario()
  return false
}

/**
 * In-memory overlay so the workspace treats North Summit as billing-not-linked
 * without rewriting provider org storage (which demo seeding would overwrite).
 */
export function applyBillingNotLinkedDemoOverlay<
  T extends {
    slug: string
    m360AccountId?: string
    billingAccountId: string
    billingAccountName: string
    billingAccountLinked?: boolean
    m360ConnectionStatus?: string
    tenantSetupStatus?: string
  },
>(organization: T): T {
  if (
    organization.slug !== NORTH_SUMMIT_TENANT_SLUG ||
    !isNorthSummitBillingNotLinkedScenarioActive()
  ) {
    return organization
  }

  return {
    ...organization,
    m360AccountId: '',
    billingAccountId: '',
    billingAccountName: '',
    billingAccountLinked: false,
    m360ConnectionStatus: 'pending',
    tenantSetupStatus: 'incomplete',
  }
}

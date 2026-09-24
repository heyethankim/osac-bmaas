import {
  setDemoM360AccountLifecycleStatus,
} from '../billing/m360Accounts'
import { PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAME } from '../providerSetup/templateDemo'
import { setTenantUserInstances } from '../tenantUser/storage'

const SESSION_KEY = 'bmaas-demo-scenario-billing-inactive'
export const BILLING_INACTIVE_SCENARIO_PARAM = 'billing-inactive'
export const BILLING_INACTIVE_DEMO_CATALOG_ITEM = PUBLISH_CATALOG_SUGGESTED_DISPLAY_NAME
const NORTH_SUMMIT_M360_ACCOUNT = 'north-summit-bank'
const NORTH_SUMMIT_TENANT_SLUG = 'northsummit'

/** Landing / workspace query value: `?scenario=billing-inactive`. */
export function isBillingInactiveScenarioParam(value: string | null | undefined): boolean {
  return value?.trim() === BILLING_INACTIVE_SCENARIO_PARAM
}

export function isNorthSummitBillingInactiveScenarioActive(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/** Services lists stay empty while this scenario is active (no demo BM/cluster rows). */
export function shouldHideDemoServicesInstances(tenantSlug: string): boolean {
  return (
    tenantSlug === NORTH_SUMMIT_TENANT_SLUG && isNorthSummitBillingInactiveScenarioActive()
  )
}

/** Make North Summit Bank's linked M360 account inactive for this browser session. */
export function enableNorthSummitBillingInactiveScenario(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* private mode / denied storage */
  }
  setDemoM360AccountLifecycleStatus(NORTH_SUMMIT_M360_ACCOUNT, 'Inactive', 'Draft')
  setTenantUserInstances(NORTH_SUMMIT_TENANT_SLUG, [])
}

/** Restore the default Active M360 account for North Summit Bank. */
export function clearNorthSummitBillingInactiveScenario(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* private mode / denied storage */
  }
  setDemoM360AccountLifecycleStatus(NORTH_SUMMIT_M360_ACCOUNT, 'Active', 'Approved')
}

/**
 * Apply or clear the inactive-billing demo based on the workspace URL.
 * Call when entering Tenant Admin so landing shortcuts stay consistent.
 */
export function syncNorthSummitBillingInactiveScenarioFromSearch(
  searchParams: URLSearchParams,
): boolean {
  if (isBillingInactiveScenarioParam(searchParams.get('scenario'))) {
    enableNorthSummitBillingInactiveScenario()
    return true
  }

  clearNorthSummitBillingInactiveScenario()
  return false
}

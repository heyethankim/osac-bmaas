import {
  DEFAULT_M360_RATE_CARD_ID,
  clusterComposedRateToRateCard,
  findM360RateLineForCatalogItem,
  formatBareMetalComposedRateSummary,
  formatM360RateLineSummary,
  listM360RateLineHeadlines,
  m360RateLineToRateCard,
  resolveBareMetalComposedRateEstimate,
  resolveClusterComposedRateEstimate,
} from './m360RateLines'
import {
  findM360AccountByReference,
  findM360AccountByTenantName,
  getM360AccountTenantName,
  listM360PortalAccounts,
  resolveM360AccountDetailPath,
} from './m360Accounts'
import {
  isTenantBillingConfigured,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import {
  DEFAULT_CLUSTER_HOST_TYPE_ID,
  DEFAULT_CLUSTER_NODE_SET_ID,
} from '../catalog/catalogPublishConfig'
import {
  getProviderCatalogItems,
  getProviderRegisteredOrganizations,
  type ProviderCatalogDraft,
} from '../providerSetup/storage'
import type { RateCard } from '../providerSetup/templateDemo'

export type M360ConnectionStatus = 'connected' | 'pending' | 'not_found'

export type M360RatePricingStatus = 'configured' | 'missing'

export type M360RatePricingReason =
  | 'configured'
  | 'tenant_billing_incomplete'
  | 'm360_account_inactive'
  | 'm360_rate_missing'

export type CatalogItemM360Pricing = {
  status: M360RatePricingStatus
  reason: M360RatePricingReason
  hourlyRate: number | null
  label: string
  summary?: string
  rateCard?: RateCard
  tenantName?: string
  rateCardId?: string
}

export type CatalogItemPricingInput = Pick<
  ProviderCatalogDraft,
  | 'catalogItemId'
  | 'rateCard'
  | 'scope'
  | 'enterpriseTenantId'
  | 'enterpriseTenantIds'
  | 'serviceId'
  | 'instanceTypeId'
  | 'diskImageId'
  | 'displayName'
  | 'nodeSetId'
  | 'hostTypeId'
>

const M360_CONFIGURED_RATES_STORAGE_KEY = 'osac-m360-configured-catalog-rates'

export const M360_RATE_CARD_PORTAL_URL = 'https://m360.example.com/rate-cards'

export const DEMO_PROJECT_BUDGET_REMAINING_USD = 53

export function getOrganizationDisplayName(organization: RegisteredOrganization): string {
  return organization.displayName?.trim() || organization.name
}

export function getOrganizationM360AccountId(organization: RegisteredOrganization): string {
  return getOrganizationM360TenantName(organization)
}

export function getOrganizationM360TenantName(organization: RegisteredOrganization): string {
  const reference =
    organization.m360AccountId?.trim() || organization.billingAccountId.trim()
  if (!reference) {
    return ''
  }

  const account = findM360AccountByReference(reference)
  return account ? getM360AccountTenantName(account) : reference
}

export function getOrganizationM360ConnectionStatus(
  organization: RegisteredOrganization,
): M360ConnectionStatus {
  if (organization.m360ConnectionStatus) {
    return organization.m360ConnectionStatus
  }

  return resolveM360ConnectionStatus(getOrganizationM360AccountId(organization))
}

export function resolveM360ConnectionStatus(tenantName: string): M360ConnectionStatus {
  const normalized = tenantName.trim()
  if (!normalized) {
    return 'pending'
  }

  if (findM360AccountByReference(normalized)) {
    return 'connected'
  }

  return 'not_found'
}

export function formatM360ConnectionStatusLabel(status: M360ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected'
    case 'pending':
      return 'Pending validation'
    case 'not_found':
      return 'Account not found'
  }
}

export function getM360ConnectionStatusColor(
  status: M360ConnectionStatus,
): 'green' | 'orange' | 'red' {
  switch (status) {
    case 'connected':
      return 'green'
    case 'pending':
      return 'orange'
    case 'not_found':
      return 'red'
  }
}

function readConfiguredCatalogRateIds(): Set<string> {
  try {
    const raw = localStorage.getItem(M360_CONFIGURED_RATES_STORAGE_KEY)
    if (!raw) {
      return new Set()
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return new Set()
    }

    return new Set(parsed.filter((value): value is string => typeof value === 'string'))
  } catch {
    return new Set()
  }
}

function writeConfiguredCatalogRateIds(ids: Set<string>): void {
  localStorage.setItem(M360_CONFIGURED_RATES_STORAGE_KEY, JSON.stringify(Array.from(ids)))
}

function resolveEnterpriseTenantIds(item: CatalogItemPricingInput): string[] {
  if (item.enterpriseTenantIds?.length) {
    return item.enterpriseTenantIds
  }

  if (item.enterpriseTenantId?.trim()) {
    return [item.enterpriseTenantId.trim()]
  }

  return []
}

function resolveTargetOrganization(tenantId: string): RegisteredOrganization | null {
  const normalized = tenantId.trim()
  if (!normalized) {
    return null
  }

  return (
    getProviderRegisteredOrganizations().find(
      (organization) =>
        organization.tenantId === normalized ||
        organization.name === normalized ||
        organization.slug === normalized,
    ) ?? null
  )
}

export function getCatalogItemBillingTargetOrganization(
  item: CatalogItemPricingInput,
): RegisteredOrganization | null {
  if (item.scope !== 'vip-enterprise') {
    return null
  }

  const tenantIds = resolveEnterpriseTenantIds(item)
  if (tenantIds.length === 0) {
    return null
  }

  return resolveTargetOrganization(tenantIds[0])
}

function resolveOrganizationM360Account(
  organization: RegisteredOrganization,
  accounts = listM360PortalAccounts(),
) {
  const linkedReference =
    organization.m360AccountId?.trim() || organization.billingAccountId.trim() || ''

  return (
    (linkedReference ? findM360AccountByReference(linkedReference, accounts) : null) ??
    findM360AccountByTenantName(organization.name, accounts) ??
    findM360AccountByTenantName(organization.tenantId, accounts)
  )
}

export function isOrganizationM360AccountInactive(
  organization: RegisteredOrganization,
): boolean {
  return resolveOrganizationM360Account(organization)?.accountStatus === 'Inactive'
}

export function getOrganizationM360AccountDetailPath(
  organization: RegisteredOrganization,
): string | null {
  if (!isOrganizationM360AccountInactive(organization)) {
    return null
  }

  const account = resolveOrganizationM360Account(organization)
  if (account) {
    return resolveM360AccountDetailPath(getM360AccountTenantName(account))
  }

  const linkedReference =
    organization.m360AccountId?.trim() || organization.billingAccountId.trim() || ''
  return linkedReference ? resolveM360AccountDetailPath(linkedReference) : null
}

export function getCatalogItemM360AccountDetailPath(
  item: CatalogItemPricingInput,
  pricing?: CatalogItemM360Pricing,
): string | null {
  const resolved = pricing ?? getCatalogItemM360Pricing(item)
  if (resolved.reason !== 'm360_account_inactive') {
    return null
  }

  const organization = getCatalogItemBillingTargetOrganization(item)
  const linkedReference =
    organization?.m360AccountId?.trim() ||
    organization?.billingAccountId.trim() ||
    resolved.tenantName?.trim() ||
    ''

  return linkedReference ? resolveM360AccountDetailPath(linkedReference) : null
}

function resolveBillingPricingBlocker(
  organization: RegisteredOrganization | null,
  tenantName: string,
): CatalogItemM360Pricing | null {
  const accounts = listM360PortalAccounts()
  const linkedReference =
    organization?.m360AccountId?.trim() || organization?.billingAccountId.trim() || ''
  const linkedAccount = linkedReference
    ? findM360AccountByReference(linkedReference, accounts)
    : null

  if (linkedAccount?.accountStatus === 'Inactive') {
    return {
      status: 'missing',
      reason: 'm360_account_inactive',
      hourlyRate: null,
      label: 'Billing account inactive',
      tenantName,
    }
  }

  if (!organization || !isTenantBillingConfigured(organization)) {
    return {
      status: 'missing',
      reason: 'tenant_billing_incomplete',
      hourlyRate: null,
      label: 'Billing pending',
      tenantName,
    }
  }

  return null
}

function resolveConfiguredPricingFromRateCard(
  rateCard: RateCard,
  rateCardId?: string,
): CatalogItemM360Pricing {
  const summary = `$${rateCard.hourlyRate.toFixed(2)}/hr · $${rateCard.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo per instance`

  return {
    status: 'configured',
    reason: 'configured',
    hourlyRate: rateCard.hourlyRate,
    label: `$${rateCard.hourlyRate.toFixed(2)}/hr`,
    summary,
    rateCard,
    rateCardId,
  }
}

function resolveOrganizationRateCardId(_organization: RegisteredOrganization | null): string {
  // MVP: one flat M360 rate card for all tenants (no tenant-specific pricing).
  return DEFAULT_M360_RATE_CARD_ID
}

function resolveCatalogItemRateCardId(
  item: CatalogItemPricingInput,
  organization: RegisteredOrganization | null,
): string {
  if (item.scope === 'vip-enterprise') {
    return resolveOrganizationRateCardId(organization)
  }

  return DEFAULT_M360_RATE_CARD_ID
}

function resolveMissingRatePricing(
  rateCardId: string,
  tenantName?: string,
): CatalogItemM360Pricing {
  return {
    status: 'missing',
    reason: 'm360_rate_missing',
    hourlyRate: null,
    label: 'Rate card line missing',
    tenantName,
    rateCardId,
  }
}

function resolveCatalogItemRateLinePricing(
  item: CatalogItemPricingInput,
  rateCardId: string,
  tenantName?: string,
): CatalogItemM360Pricing {
  if (item.serviceId === 'cluster') {
    const estimate = resolveClusterComposedRateEstimate(
      item.nodeSetId?.trim() || DEFAULT_CLUSTER_NODE_SET_ID,
      item.hostTypeId?.trim() || DEFAULT_CLUSTER_HOST_TYPE_ID,
      rateCardId,
    )
    if (!estimate) {
      return resolveMissingRatePricing(rateCardId, tenantName)
    }

    return {
      ...resolveConfiguredPricingFromRateCard(
        clusterComposedRateToRateCard(estimate),
        rateCardId,
      ),
      tenantName,
    }
  }

  if ((item.serviceId ?? 'baremetal') === 'baremetal') {
    const composed = resolveBareMetalComposedRateEstimate(
      item.instanceTypeId,
      item.diskImageId,
      rateCardId,
    )
    if (composed) {
      return {
        ...resolveConfiguredPricingFromRateCard(
          clusterComposedRateToRateCard(composed),
          rateCardId,
        ),
        summary: formatBareMetalComposedRateSummary(composed),
        tenantName,
      }
    }
  }

  const rateLine = findM360RateLineForCatalogItem(item, rateCardId)
  if (!rateLine) {
    return resolveMissingRatePricing(rateCardId, tenantName)
  }

  const rateCard = m360RateLineToRateCard(rateLine)
  return {
    ...resolveConfiguredPricingFromRateCard(rateCard, rateCardId),
    summary: formatM360RateLineSummary(rateLine),
    tenantName,
  }
}

export function getCatalogItemM360Pricing(item: CatalogItemPricingInput): CatalogItemM360Pricing {
  if (item.scope === 'vip-enterprise') {
    const tenantIds = resolveEnterpriseTenantIds(item)
    if (tenantIds.length > 0) {
      const tenantName = tenantIds[0]
      const organization = resolveTargetOrganization(tenantName)
      const billingBlocker = resolveBillingPricingBlocker(organization, tenantName)
      if (billingBlocker) {
        return billingBlocker
      }

      const rateCardId = resolveCatalogItemRateCardId(item, organization)
      return resolveCatalogItemRateLinePricing(item, rateCardId, tenantName)
    }
  }

  return resolveCatalogItemRateLinePricing(item, DEFAULT_M360_RATE_CARD_ID)
}

export function formatCatalogItemM360RateSummary(item: CatalogItemPricingInput): string | null {
  const pricing = getCatalogItemM360Pricing(item)
  if (pricing.status !== 'configured') {
    return null
  }

  return pricing.summary ?? pricing.label
}

export function getOrganizationM360RateCardHeadlines(
  organization: RegisteredOrganization,
  limit = 2,
): string[] {
  const rateCardId = resolveOrganizationRateCardId(organization)
  return listM360RateLineHeadlines(rateCardId, limit)
}

export function getCatalogItemM360PricingTooltip(pricing: CatalogItemM360Pricing): string {
  const accounts = listM360PortalAccounts()
  const prospectiveAccount = pricing.tenantName
    ? findM360AccountByTenantName(pricing.tenantName, accounts) ??
      findM360AccountByReference(pricing.tenantName, accounts)
    : null

  switch (pricing.reason) {
    case 'tenant_billing_incomplete':
      if (prospectiveAccount?.accountStatus === 'Inactive') {
        return 'Billing not linked. M360 account is inactive.'
      }
      return 'Finish tenant billing setup to publish.'
    case 'm360_account_inactive':
      return 'M360 billing account is inactive.'
    case 'm360_rate_missing':
      return 'Rate card missing in M360.'
    case 'configured':
      return 'Rate configured in M360.'
  }
}

export function isCatalogItemM360RateConfigured(catalogItemId: string): boolean {
  const item = getProviderCatalogItems().find((entry) => entry.catalogItemId === catalogItemId)
  if (!item) {
    return readConfiguredCatalogRateIds().has(catalogItemId)
  }

  return getCatalogItemM360Pricing(item).status === 'configured'
}

export function markCatalogItemM360RateConfigured(catalogItemId: string): void {
  const next = readConfiguredCatalogRateIds()
  next.add(catalogItemId)
  writeConfiguredCatalogRateIds(next)
}

export function canPublishCatalogItemToTenants(item: CatalogItemPricingInput): boolean {
  return getCatalogItemM360Pricing(item).status === 'configured'
}

export function getM360RateCardConfigureUrl(catalogItemId: string): string {
  return `${M360_RATE_CARD_PORTAL_URL}?sku=${encodeURIComponent(catalogItemId)}`
}

export function formatHourlyEstimate(rateCard: RateCard): string {
  return `$${rateCard.hourlyRate.toFixed(2)}/hr`
}

export function estimateLaunchHourlyCost(options: {
  catalogItem: CatalogItemPricingInput
  instanceType?: string
  bootDiskSizeGiB?: number
}): number | null {
  const pricing = getCatalogItemM360Pricing(options.catalogItem)
  if (pricing.status !== 'configured' || pricing.hourlyRate === null) {
    return null
  }

  let hourly = pricing.hourlyRate
  const bootDiskGiB = options.bootDiskSizeGiB ?? 0
  if (bootDiskGiB > 100) {
    hourly += ((bootDiskGiB - 100) / 100) * 0.05
  }

  const instanceType = options.instanceType?.toLowerCase() ?? ''
  if (instanceType.includes('gpu') || instanceType.includes('a100')) {
    hourly *= 1.08
  }

  return hourly
}

export function formatLaunchCostEstimate(hourly: number | null): string {
  if (hourly === null) {
    return 'Rate unavailable'
  }

  return `Est. ${formatHourlyEstimate({ hourlyRate: hourly, monthlyRate: 0, currency: 'USD', billingUnit: 'per-instance' })}`
}

export function listUnpricedCatalogItems(
  items: ProviderCatalogDraft[],
): ProviderCatalogDraft[] {
  return items.filter((item) => !canPublishCatalogItemToTenants(item))
}

/** Publish wizard guardrail for templates that map to demo VIP SKUs. */
export function isTemplateM360RateConfigured(templateRefId: string): boolean {
  if (templateRefId === 'bm-hpe-dl380-a100') {
    return isCatalogItemM360RateConfigured('cat-bm-dense-gpu')
  }

  return true
}

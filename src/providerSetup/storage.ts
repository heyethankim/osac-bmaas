import type { ProviderServiceId } from './constants'
import type { ProviderAdminNavId } from '../providerAdmin/constants'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import {
  createDemoNorthSummitBankOrganization,
  DEMO_NORTH_SUMMIT_BANK_ORG_ID,
  DEFAULT_REGISTER_ORGANIZATION_FORM,
} from '../providerAdmin/organizations'
import type { ComputeImage } from '../providerAdmin/computeImages'
import { DEFAULT_COMPUTE_IMAGES } from '../providerAdmin/computeImages'
import type { ExternalIpPool } from '../providerAdmin/externalIpPools'
import { DEFAULT_EXTERNAL_IP_POOLS, getExternalIpPoolById } from '../providerAdmin/externalIpPools'
import type {
  ProviderSecurityGroup,
  ProviderSubnet,
  ProviderVirtualNetwork,
} from '../providerAdmin/networkInventory'
import {
  DEFAULT_PROVIDER_SECURITY_GROUPS,
  DEFAULT_PROVIDER_SUBNETS,
  DEFAULT_PROVIDER_VIRTUAL_NETWORKS,
  getNetworkInventoryStatus,
  toCatalogNetworkOption,
} from '../providerAdmin/networkInventory'
import type { CatalogNetworkPolicy, CatalogNetworkResourceOption } from '../providerAdmin/catalogNetworkPolicy'
import {
  normalizeCatalogNetworkPolicy,
  resolveCatalogNetworkPolicy,
} from '../providerAdmin/catalogNetworkPolicy'
import type {
  CatalogServiceId,
  PublishCatalogScope,
  RateCard,
  SavedMasterTemplate,
} from './templateDemo'
import { DEFAULT_CATALOG_ITEM_DISPLAY_NAME, DEFAULT_RATE_CARD, generateCatalogItemId } from './templateDemo'

const PROVIDER_SETUP_COMPLETE_KEY = 'bmaas-provider-setup-complete'
const PROVIDER_SELECTED_SERVICES_KEY = 'bmaas-provider-selected-services'
const PROVIDER_ACTIVE_NAV_KEY = 'bmaas-provider-active-nav'
const PROVIDER_CATALOG_DRAFT_KEY = 'bmaas-provider-catalog-draft'
const PROVIDER_CATALOG_ITEMS_KEY = 'bmaas-provider-catalog-items'
const PROVIDER_SAVED_TEMPLATE_KEY = 'bmaas-provider-saved-template'
const PROVIDER_SAVED_TEMPLATES_KEY = 'bmaas-provider-saved-templates'
const PROVIDER_REGISTERED_ORGS_KEY = 'bmaas-provider-registered-orgs'
const PROVIDER_EXTERNAL_IP_POOLS_KEY = 'bmaas-provider-external-ip-pools'
const PROVIDER_VIRTUAL_NETWORKS_KEY = 'bmaas-provider-virtual-networks'
const PROVIDER_SUBNETS_KEY = 'bmaas-provider-subnets'
const PROVIDER_SECURITY_GROUPS_KEY = 'bmaas-provider-security-groups'
const PROVIDER_COMPUTE_IMAGES_KEY = 'bmaas-provider-compute-images'
const PROVIDER_OPEN_REGISTER_ORG_WIZARD_KEY = 'bmaas-provider-open-register-org-wizard'
const PROVIDER_VIP_CATALOG_RESUME_KEY = 'bmaas-provider-vip-catalog-resume'

export function isProviderSetupComplete(): boolean {
  try {
    return sessionStorage.getItem(PROVIDER_SETUP_COMPLETE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setProviderSetupComplete(): void {
  try {
    sessionStorage.setItem(PROVIDER_SETUP_COMPLETE_KEY, 'true')
  } catch {
    /* demo storage unavailable */
  }
}

export function clearProviderSetupComplete(): void {
  try {
    sessionStorage.removeItem(PROVIDER_SETUP_COMPLETE_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

export function isProviderServicesSelected(): boolean {
  return getProviderSelectedServices().length > 0
}

export function getProviderSelectedServices(): ProviderServiceId[] {
  try {
    const raw = sessionStorage.getItem(PROVIDER_SELECTED_SERVICES_KEY)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (id): id is ProviderServiceId =>
        id === 'baremetal' || id === 'cluster' || id === 'models' || id === 'virtual-machine',
    )
  } catch {
    return []
  }
}

export function setProviderSelectedServices(services: ProviderServiceId[]): void {
  try {
    sessionStorage.setItem(PROVIDER_SELECTED_SERVICES_KEY, JSON.stringify(services))
  } catch {
    /* demo storage unavailable */
  }
}

export function clearProviderServicesSelected(): void {
  try {
    sessionStorage.removeItem(PROVIDER_SELECTED_SERVICES_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

export function getProviderActiveNav(): ProviderAdminNavId {
  try {
    const value = sessionStorage.getItem(PROVIDER_ACTIVE_NAV_KEY)
    if (
      value === 'overview' ||
      value === 'catalog' ||
      value === 'infrastructure-data-centers' ||
      value === 'infrastructure-hardware-inventory' ||
      value === 'infrastructure-compute-images' ||
      value === 'infrastructure-bmaas-templates' ||
      value === 'infrastructure-external-ip-pools' ||
      value === 'networking-virtual-networks' ||
      value === 'networking-subnets' ||
      value === 'networking-security-groups' ||
      value === 'administration-organizations' ||
      value === 'administration-quotas' ||
      value === 'billing-metering' ||
      value === 'system'
    ) {
      return value
    }

    if (value === 'administration-rbac' || value === 'administration-roles') {
      return 'administration-organizations'
    }

    if (value === 'infrastructure') {
      return 'infrastructure-data-centers'
    }

    if (value === 'infrastructure-virtual-networks') {
      return 'networking-virtual-networks'
    }

    if (value === 'infrastructure-subnets') {
      return 'networking-subnets'
    }

    if (value === 'infrastructure-security-groups') {
      return 'networking-security-groups'
    }

    if (value === 'administration-organizations-quotas') {
      return 'administration-quotas'
    }

    if (value === 'administration' || value === 'access-security') {
      return 'administration-organizations'
    }
  } catch {
    /* demo storage unavailable */
  }

  return 'overview'
}

export function setProviderActiveNav(navId: ProviderAdminNavId): void {
  try {
    sessionStorage.setItem(PROVIDER_ACTIVE_NAV_KEY, navId)
  } catch {
    /* demo storage unavailable */
  }
}

export type CatalogItemStatus = 'live' | 'unpublished'

export type ProviderCatalogDraft = {
  catalogItemId: string
  templateRefId: string
  templateName: string
  displayName: string
  /** Optional for items created before description existed. */
  description?: string
  scope: PublishCatalogScope
  createdAt: string
  rateCard: RateCard
  /** Optional for drafts created before the service step existed. */
  serviceId?: CatalogServiceId
  /** Present when visibility is VIP enterprise. */
  enterpriseTenantId?: string
  /** Defaults to live for items created before status existed. */
  status?: CatalogItemStatus
  /** Optional for items created before network policy existed. */
  networkPolicy?: CatalogNetworkPolicy
}

export function getCatalogItemNetworkPolicy(
  item: ProviderCatalogDraft,
): CatalogNetworkPolicy {
  return resolveCatalogNetworkPolicy(item.networkPolicy)
}

export function getCatalogItemStatus(item: ProviderCatalogDraft): CatalogItemStatus {
  return item.status === 'unpublished' ? 'unpublished' : 'live'
}

function isRateCard(value: unknown): value is RateCard {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const rateCard = value as RateCard
  return (
    typeof rateCard.hourlyRate === 'number' &&
    typeof rateCard.monthlyRate === 'number' &&
    typeof rateCard.currency === 'string' &&
    rateCard.billingUnit === 'per-instance'
  )
}

function isProviderCatalogDraft(value: unknown): value is ProviderCatalogDraft {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const draft = value as ProviderCatalogDraft
  return (
    typeof draft.catalogItemId === 'string' &&
    typeof draft.templateRefId === 'string' &&
    typeof draft.templateName === 'string' &&
    typeof draft.displayName === 'string' &&
    (draft.scope === 'global-public' || draft.scope === 'vip-enterprise') &&
    typeof draft.createdAt === 'string' &&
    isRateCard(draft.rateCard)
  )
}

function persistProviderCatalogItems(items: ProviderCatalogDraft[]): void {
  try {
    sessionStorage.setItem(PROVIDER_CATALOG_ITEMS_KEY, JSON.stringify(items))
    if (items[0]) {
      sessionStorage.setItem(PROVIDER_CATALOG_DRAFT_KEY, JSON.stringify(items[0]))
    } else {
      sessionStorage.removeItem(PROVIDER_CATALOG_DRAFT_KEY)
    }
  } catch {
    /* demo storage unavailable */
  }
}

function readLegacyProviderCatalogDraft(): ProviderCatalogDraft | null {
  try {
    const raw = sessionStorage.getItem(PROVIDER_CATALOG_DRAFT_KEY)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isProviderCatalogDraft(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

const LEGACY_CATALOG_DISPLAY_NAME =
  'Compute Node · Dell PowerEdge R750 3x · 512 GB DDR4-3200'

function migrateCatalogItemDisplayName(item: ProviderCatalogDraft): ProviderCatalogDraft {
  if (item.displayName !== LEGACY_CATALOG_DISPLAY_NAME) {
    return item
  }

  return { ...item, displayName: DEFAULT_CATALOG_ITEM_DISPLAY_NAME }
}

export function getProviderCatalogItems(): ProviderCatalogDraft[] {
  try {
    const raw = sessionStorage.getItem(PROVIDER_CATALOG_ITEMS_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const items = parsed.filter(isProviderCatalogDraft)
        const migrated = items.map(migrateCatalogItemDisplayName)
        if (migrated.some((item, index) => item.displayName !== items[index].displayName)) {
          persistProviderCatalogItems(migrated)
        }
        return migrated
      }
    }
  } catch {
    /* demo storage unavailable */
  }

  const legacyDraft = readLegacyProviderCatalogDraft()
  if (!legacyDraft) {
    return []
  }

  const migrated = migrateCatalogItemDisplayName(legacyDraft)
  persistProviderCatalogItems([migrated])
  return [migrated]
}

export function addProviderCatalogItem(item: ProviderCatalogDraft): void {
  const existing = getProviderCatalogItems().filter(
    (catalogItem) => catalogItem.catalogItemId !== item.catalogItemId,
  )
  persistProviderCatalogItems([item, ...existing])
}

function formatDuplicatedCatalogDisplayName(displayName: string): string {
  const trimmed = displayName.trim()
  if (!trimmed) {
    return 'Catalog item (copy)'
  }

  return trimmed.endsWith('(copy)') ? `${trimmed} 2` : `${trimmed} (copy)`
}

/** Clone a catalog item as an unpublished draft. Does not copy organization assignments. */
export function duplicateProviderCatalogItem(catalogItemId: string): ProviderCatalogDraft | null {
  const source = getProviderCatalogItems().find((item) => item.catalogItemId === catalogItemId)
  if (!source) {
    return null
  }

  const duplicate: ProviderCatalogDraft = {
    catalogItemId: generateCatalogItemId(),
    templateRefId: source.templateRefId,
    templateName: source.templateName,
    displayName: formatDuplicatedCatalogDisplayName(source.displayName),
    description: source.description,
    scope: source.scope,
    rateCard: { ...source.rateCard },
    serviceId: source.serviceId,
    networkPolicy: getCatalogItemNetworkPolicy(source),
    status: 'unpublished',
    createdAt: new Date().toISOString(),
    ...(source.enterpriseTenantId ? { enterpriseTenantId: source.enterpriseTenantId } : {}),
  }

  addProviderCatalogItem(duplicate)
  return duplicate
}

/** Latest catalog item — kept for tenant/org flows that still expect a single draft. */
export function getProviderCatalogDraft(): ProviderCatalogDraft | null {
  return getProviderCatalogItems()[0] ?? null
}

export function setProviderCatalogDraft(draft: ProviderCatalogDraft): void {
  const items = getProviderCatalogItems()
  if (items.length === 0) {
    persistProviderCatalogItems([draft])
    return
  }

  const index = items.findIndex((item) => item.catalogItemId === draft.catalogItemId)
  if (index >= 0) {
    const next = [...items]
    next[index] = draft
    persistProviderCatalogItems(next)
    return
  }

  persistProviderCatalogItems([draft, ...items])
}

export type CatalogItemEditableFields = {
  displayName: string
  description: string
  scope: PublishCatalogScope
  enterpriseTenantId?: string
}

/** Updates mutable commercial fields; service, template, and rate stay locked. */
export function updateProviderCatalogItem(
  catalogItemId: string,
  fields: CatalogItemEditableFields,
): ProviderCatalogDraft | null {
  const items = getProviderCatalogItems()
  const index = items.findIndex((item) => item.catalogItemId === catalogItemId)
  if (index < 0) {
    return null
  }

  const current = items[index]!
  const updated: ProviderCatalogDraft = {
    ...current,
    displayName: fields.displayName.trim(),
    description: fields.description.trim(),
    scope: fields.scope,
  }

  if (fields.scope === 'vip-enterprise' && fields.enterpriseTenantId?.trim()) {
    updated.enterpriseTenantId = fields.enterpriseTenantId.trim()
  } else {
    delete updated.enterpriseTenantId
  }

  const next = [...items]
  next[index] = updated
  persistProviderCatalogItems(next)

  try {
    const organizations = getProviderRegisteredOrganizations()
    const hasAssigned = organizations.some((org) => org.catalogItemId === catalogItemId)
    if (hasAssigned) {
      setProviderRegisteredOrganizations(
        organizations.map((org) =>
          org.catalogItemId === catalogItemId
            ? { ...org, catalogDisplayName: updated.displayName }
            : org,
        ),
      )
    }
  } catch {
    /* demo storage unavailable */
  }

  return updated
}

export function updateProviderCatalogNetworkPolicy(
  catalogItemId: string,
  networkPolicy: CatalogNetworkPolicy,
): ProviderCatalogDraft | null {
  const items = getProviderCatalogItems()
  const index = items.findIndex((item) => item.catalogItemId === catalogItemId)
  if (index < 0) {
    return null
  }

  const updated: ProviderCatalogDraft = {
    ...items[index]!,
    networkPolicy: normalizeCatalogNetworkPolicy(networkPolicy),
  }
  const next = [...items]
  next[index] = updated
  persistProviderCatalogItems(next)
  return updated
}

export function setProviderCatalogItemStatus(
  catalogItemId: string,
  status: CatalogItemStatus,
): ProviderCatalogDraft | null {
  const items = getProviderCatalogItems()
  const index = items.findIndex((item) => item.catalogItemId === catalogItemId)
  if (index < 0) {
    return null
  }

  const updated: ProviderCatalogDraft = {
    ...items[index]!,
    status,
  }
  const next = [...items]
  next[index] = updated
  persistProviderCatalogItems(next)
  return updated
}

export function deleteProviderCatalogItem(catalogItemId: string): boolean {
  const items = getProviderCatalogItems()
  const next = items.filter((item) => item.catalogItemId !== catalogItemId)
  if (next.length === items.length) {
    return false
  }

  persistProviderCatalogItems(next)

  try {
    const organizations = getProviderRegisteredOrganizations()
    const hasAssigned = organizations.some((org) => org.catalogItemId === catalogItemId)
    if (hasAssigned) {
      setProviderRegisteredOrganizations(
        organizations.map((org) =>
          org.catalogItemId === catalogItemId
            ? { ...org, catalogItemId: null, catalogDisplayName: null }
            : org,
        ),
      )
    }
  } catch {
    /* demo storage unavailable */
  }

  return true
}

export function clearProviderCatalogDraft(): void {
  try {
    sessionStorage.removeItem(PROVIDER_CATALOG_DRAFT_KEY)
    sessionStorage.removeItem(PROVIDER_CATALOG_ITEMS_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

function isSavedMasterTemplate(value: unknown): value is SavedMasterTemplate {
  if (!value || typeof value !== 'object') {
    return false
  }

  const template = value as SavedMasterTemplate
  return (
    typeof template.templateRefId === 'string' &&
    typeof template.templateName === 'string' &&
    typeof template.description === 'string' &&
    typeof template.hardwareProfileId === 'string' &&
    typeof template.osImageId === 'string' &&
    typeof template.suggestedDisplayName === 'string'
  )
}

function normalizeSavedMasterTemplate(template: SavedMasterTemplate): SavedMasterTemplate {
  return {
    ...template,
    suggestedDisplayName:
      template.suggestedDisplayName === LEGACY_CATALOG_DISPLAY_NAME
        ? DEFAULT_CATALOG_ITEM_DISPLAY_NAME
        : template.suggestedDisplayName,
    rateCard: isRateCard(template.rateCard) ? template.rateCard : DEFAULT_RATE_CARD,
  }
}

function persistProviderSavedTemplates(templates: SavedMasterTemplate[]): void {
  try {
    sessionStorage.setItem(PROVIDER_SAVED_TEMPLATES_KEY, JSON.stringify(templates))
    if (templates[0]) {
      sessionStorage.setItem(PROVIDER_SAVED_TEMPLATE_KEY, JSON.stringify(templates[0]))
    } else {
      sessionStorage.removeItem(PROVIDER_SAVED_TEMPLATE_KEY)
    }
  } catch {
    /* demo storage unavailable */
  }
}

export function getProviderSavedTemplates(): SavedMasterTemplate[] {
  try {
    const rawTemplates = sessionStorage.getItem(PROVIDER_SAVED_TEMPLATES_KEY)
    if (rawTemplates) {
      const parsed: unknown = JSON.parse(rawTemplates)
      if (Array.isArray(parsed)) {
        return parsed.filter(isSavedMasterTemplate).map(normalizeSavedMasterTemplate)
      }
    }

    const legacyTemplate = getProviderSavedTemplate()
    return legacyTemplate ? [legacyTemplate] : []
  } catch {
    return []
  }
}

export function getProviderSavedTemplate(): SavedMasterTemplate | null {
  try {
    const raw = sessionStorage.getItem(PROVIDER_SAVED_TEMPLATE_KEY)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isSavedMasterTemplate(parsed)) {
      return null
    }

    return normalizeSavedMasterTemplate(parsed)
  } catch {
    return null
  }
}

export function setProviderSavedTemplate(template: SavedMasterTemplate): void {
  const normalized = normalizeSavedMasterTemplate(template)
  const templates = getProviderSavedTemplates()

  if (templates.length === 0) {
    persistProviderSavedTemplates([normalized])
    return
  }

  persistProviderSavedTemplates([normalized, ...templates.slice(1)])
}

export function addProviderSavedTemplate(template: SavedMasterTemplate): void {
  const normalized = normalizeSavedMasterTemplate(template)
  const templates = getProviderSavedTemplates()

  if (templates.some((entry) => entry.templateRefId === normalized.templateRefId)) {
    return
  }

  persistProviderSavedTemplates([...templates, normalized])
}

export function upsertProviderSavedTemplate(template: SavedMasterTemplate): void {
  const normalized = normalizeSavedMasterTemplate(template)
  const templates = getProviderSavedTemplates()
  const index = templates.findIndex((entry) => entry.templateRefId === normalized.templateRefId)

  if (index === -1) {
    persistProviderSavedTemplates([...templates, normalized])
    return
  }

  const next = [...templates]
  next[index] = normalized
  persistProviderSavedTemplates(next)
}

/** Keep catalog “Linked template” labels in sync when a master template is renamed. */
export function syncCatalogLinkedTemplateName(template: SavedMasterTemplate): void {
  const items = getProviderCatalogItems()
  let changed = false

  const next = items.map((item) => {
    if (item.templateRefId !== template.templateRefId || item.templateName === template.templateName) {
      return item
    }

    changed = true
    return { ...item, templateName: template.templateName }
  })

  if (changed) {
    persistProviderCatalogItems(next)
  }
}

export function clearProviderSavedTemplate(): void {
  try {
    sessionStorage.removeItem(PROVIDER_SAVED_TEMPLATE_KEY)
    sessionStorage.removeItem(PROVIDER_SAVED_TEMPLATES_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

function normalizeRegisteredOrganization(org: RegisteredOrganization): RegisteredOrganization {
  const emailDomain = org.tenantAdminEmail.includes('@')
    ? org.tenantAdminEmail.split('@')[1]?.toLowerCase() ?? ''
    : ''

  return {
    ...org,
    primaryDomain:
      typeof org.primaryDomain === 'string' && org.primaryDomain.trim()
        ? org.primaryDomain.trim().toLowerCase()
        : emailDomain,
    catalogItemId: org.catalogItemId ?? null,
    catalogDisplayName: org.catalogDisplayName ?? null,
    externalIpPoolId: org.externalIpPoolId ?? null,
    externalIpPoolName: org.externalIpPoolName ?? null,
    externalIpPoolCidr: org.externalIpPoolCidr ?? null,
    identityProviderName:
      typeof org.identityProviderName === 'string' && org.identityProviderName.trim()
        ? org.identityProviderName.trim()
        : null,
    identityProviderDisplayName:
      typeof org.identityProviderDisplayName === 'string' && org.identityProviderDisplayName.trim()
        ? org.identityProviderDisplayName.trim()
        : null,
    identityProviderProtocol:
      org.identityProviderProtocol === 'OIDC' || org.identityProviderProtocol === 'SAML'
        ? org.identityProviderProtocol
        : null,
    identityProviderIssuerUrl:
      typeof org.identityProviderIssuerUrl === 'string' && org.identityProviderIssuerUrl.trim()
        ? org.identityProviderIssuerUrl.trim()
        : null,
    identityProviderClientId:
      typeof org.identityProviderClientId === 'string' && org.identityProviderClientId.trim()
        ? org.identityProviderClientId.trim()
        : null,
    // Name is the source of truth — clears stub-only "connected" flags from earlier demos.
    identityProviderConnected:
      typeof org.identityProviderName === 'string' && Boolean(org.identityProviderName.trim()),
    additionalTenantAdmins: Array.isArray(org.additionalTenantAdmins)
      ? org.additionalTenantAdmins
          .filter(
            (admin): admin is { name: string; email: string } =>
              typeof admin === 'object' &&
              admin !== null &&
              typeof admin.name === 'string' &&
              typeof admin.email === 'string' &&
              Boolean(admin.email.trim()),
          )
          .map((admin) => ({
            name: admin.name.trim(),
            email: admin.email.trim().toLowerCase(),
          }))
      : [],
    invitedTenantUserEmails: Array.isArray(org.invitedTenantUserEmails)
      ? org.invitedTenantUserEmails
          .filter((email): email is string => typeof email === 'string' && Boolean(email.trim()))
          .map((email) => email.trim().toLowerCase())
      : [],
    rbacConfigured:
      typeof org.identityProviderName === 'string' &&
      Boolean(org.identityProviderName.trim()) &&
      Boolean(org.rbacConfigured),
  }
}

function isRegisteredOrganization(value: unknown): value is RegisteredOrganization {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const org = value as Partial<RegisteredOrganization>
  return (
    typeof org.id === 'string' &&
    typeof org.name === 'string' &&
    typeof org.tenantId === 'string' &&
    typeof org.slug === 'string' &&
    typeof org.billingAccountId === 'string' &&
    typeof org.billingAccountName === 'string' &&
    typeof org.maxInstances === 'number' &&
    typeof org.tenantAdminName === 'string' &&
    typeof org.tenantAdminEmail === 'string' &&
    (org.primaryDomain === undefined || typeof org.primaryDomain === 'string') &&
    (org.status === 'Pending activation' || org.status === 'Active') &&
    typeof org.createdAt === 'string'
  )
}

export function getProviderRegisteredOrganizations(): RegisteredOrganization[] {
  try {
    const raw = sessionStorage.getItem(PROVIDER_REGISTERED_ORGS_KEY)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isRegisteredOrganization).map(normalizeRegisteredOrganization)
  } catch {
    return []
  }
}

/**
 * Seeds North Summit Bank as the Organizations page baseline:
 * Active, IdP connected, roles defined with multiple admins and users.
 */
export function ensureProviderDemoOrganizations(): RegisteredOrganization[] {
  try {
    const current = getProviderRegisteredOrganizations()
    const catalogItems = getProviderCatalogItems()
    const denseGpu =
      catalogItems.find((item) => item.catalogItemId === 'cat_BM_AI_INFERENCE') ??
      catalogItems.find((item) => item.displayName === 'Bare Metal - Dense GPU Node') ??
      null
    const catalogDraft = denseGpu ?? getProviderCatalogDraft()
    const pools = getProviderExternalIpPools()
    const pool =
      getExternalIpPoolById(pools, DEFAULT_REGISTER_ORGANIZATION_FORM.externalIpPoolId) ??
      pools.find((item) => item.assignedOrganizationId === DEMO_NORTH_SUMMIT_BANK_ORG_ID) ??
      pools[0] ??
      null

    const demo = createDemoNorthSummitBankOrganization({
      catalogItemId: catalogDraft?.catalogItemId ?? null,
      catalogDisplayName: catalogDraft?.displayName ?? null,
      externalIpPoolId: pool?.id ?? DEFAULT_REGISTER_ORGANIZATION_FORM.externalIpPoolId,
      externalIpPoolName: pool?.name ?? null,
      externalIpPoolCidr: pool?.cidr ?? null,
    })

    const replacedIds = new Set(
      current
        .filter(
          (organization) =>
            organization.id === demo.id || organization.slug === demo.slug,
        )
        .map((organization) => organization.id),
    )
    const withoutNorthSummit = current.filter(
      (organization) => !replacedIds.has(organization.id),
    )

    if (replacedIds.size > 0) {
      setProviderExternalIpPools(
        pools.map((item) =>
          item.assignedOrganizationId && replacedIds.has(item.assignedOrganizationId)
            ? {
                ...item,
                assignedOrganizationId: null,
                assignedOrganizationName: null,
              }
            : item,
        ),
      )
    }

    setProviderRegisteredOrganizations([demo, ...withoutNorthSummit])

    if (pool) {
      assignExternalIpPoolToRegisteredOrganization(pool.id, demo.id)
    }

    return getProviderRegisteredOrganizations()
  } catch {
    return getProviderRegisteredOrganizations()
  }
}

export function addProviderRegisteredOrganization(org: RegisteredOrganization): void {
  try {
    const current = getProviderRegisteredOrganizations()
    sessionStorage.setItem(PROVIDER_REGISTERED_ORGS_KEY, JSON.stringify([...current, org]))
  } catch {
    /* demo storage unavailable */
  }
}

export function updateProviderRegisteredOrganization(
  organizationId: string,
  patch: Partial<RegisteredOrganization>,
): RegisteredOrganization | null {
  try {
    const organizations = getProviderRegisteredOrganizations()
    const current = organizations.find((item) => item.id === organizationId)
    if (!current) {
      return null
    }

    const updated = normalizeRegisteredOrganization({ ...current, ...patch, id: current.id })
    setProviderRegisteredOrganizations(
      organizations.map((item) => (item.id === organizationId ? updated : item)),
    )
    return updated
  } catch {
    return null
  }
}

export function removeProviderRegisteredOrganization(organizationId: string): boolean {
  try {
    const organizations = getProviderRegisteredOrganizations()
    const next = organizations.filter((organization) => organization.id !== organizationId)
    if (next.length === organizations.length) {
      return false
    }

    setProviderRegisteredOrganizations(next)

    const pools = getProviderExternalIpPools()
    const hasAssignedPool = pools.some((pool) => pool.assignedOrganizationId === organizationId)
    if (hasAssignedPool) {
      setProviderExternalIpPools(
        pools.map((pool) =>
          pool.assignedOrganizationId === organizationId
            ? {
                ...pool,
                assignedOrganizationId: null,
                assignedOrganizationName: null,
              }
            : pool,
        ),
      )
    }

    return true
  } catch {
    return false
  }
}

export function getOrganizationsAssignedToCatalogItem(
  catalogItemId: string,
): RegisteredOrganization[] {
  return getProviderRegisteredOrganizations().filter(
    (organization) => organization.catalogItemId === catalogItemId,
  )
}

export function assignCatalogToRegisteredOrganization(
  organizationId: string,
  catalog: ProviderCatalogDraft,
): boolean {
  try {
    const organizations = getProviderRegisteredOrganizations()
    const organization = organizations.find((item) => item.id === organizationId)
    if (!organization) {
      return false
    }

    if (organization.catalogItemId && organization.catalogItemId !== catalog.catalogItemId) {
      return false
    }

    if (
      organization.catalogItemId === catalog.catalogItemId &&
      organization.catalogDisplayName === catalog.displayName
    ) {
      return true
    }

    setProviderRegisteredOrganizations(
      organizations.map((item) =>
        item.id === organizationId
          ? {
              ...item,
              catalogItemId: catalog.catalogItemId,
              catalogDisplayName: catalog.displayName,
            }
          : item,
      ),
    )

    return true
  } catch {
    return false
  }
}

export function activateProviderRegisteredOrganizationBySlug(slug: string): void {
  try {
    const organizations = getProviderRegisteredOrganizations()
    const updated = organizations.map((organization) =>
      organization.slug === slug && organization.status === 'Pending activation'
        ? { ...organization, status: 'Active' as const }
        : organization,
    )

    sessionStorage.setItem(PROVIDER_REGISTERED_ORGS_KEY, JSON.stringify(updated))
  } catch {
    /* demo storage unavailable */
  }
}

export function clearProviderRegisteredOrganizations(): void {
  try {
    sessionStorage.removeItem(PROVIDER_REGISTERED_ORGS_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

function isExternalIpPool(value: unknown): value is ExternalIpPool {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const pool = value as ExternalIpPool
  return (
    typeof pool.id === 'string' &&
    typeof pool.name === 'string' &&
    typeof pool.cidr === 'string' &&
    typeof pool.dataCenter === 'string' &&
    typeof pool.totalAddresses === 'number' &&
    (pool.assignedOrganizationId === null || typeof pool.assignedOrganizationId === 'string') &&
    (pool.assignedOrganizationName === null || typeof pool.assignedOrganizationName === 'string') &&
    typeof pool.createdAt === 'string'
  )
}

export function getProviderExternalIpPools(): ExternalIpPool[] {
  try {
    const raw = sessionStorage.getItem(PROVIDER_EXTERNAL_IP_POOLS_KEY)
    if (!raw) {
      sessionStorage.setItem(
        PROVIDER_EXTERNAL_IP_POOLS_KEY,
        JSON.stringify(DEFAULT_EXTERNAL_IP_POOLS),
      )
      return [...DEFAULT_EXTERNAL_IP_POOLS]
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_EXTERNAL_IP_POOLS]
    }

    const pools = parsed.filter(isExternalIpPool)
    return pools.length > 0 ? pools : [...DEFAULT_EXTERNAL_IP_POOLS]
  } catch {
    return [...DEFAULT_EXTERNAL_IP_POOLS]
  }
}

export function setProviderExternalIpPools(pools: ExternalIpPool[]): void {
  try {
    sessionStorage.setItem(PROVIDER_EXTERNAL_IP_POOLS_KEY, JSON.stringify(pools))
  } catch {
    /* demo storage unavailable */
  }
}

export function addProviderExternalIpPool(pool: ExternalIpPool): void {
  const current = getProviderExternalIpPools()
  setProviderExternalIpPools([...current, pool])
}

export function assignExternalIpPoolToOrganization(
  poolId: string,
  organizationId: string,
  organizationName: string,
): void {
  const pools = getProviderExternalIpPools()
  const updated = pools.map((pool) =>
    pool.id === poolId
      ? {
          ...pool,
          assignedOrganizationId: organizationId,
          assignedOrganizationName: organizationName,
        }
      : pool,
  )

  setProviderExternalIpPools(updated)
}

function setProviderRegisteredOrganizations(organizations: RegisteredOrganization[]): void {
  try {
    sessionStorage.setItem(PROVIDER_REGISTERED_ORGS_KEY, JSON.stringify(organizations))
  } catch {
    /* demo storage unavailable */
  }
}

export function assignExternalIpPoolToRegisteredOrganization(
  poolId: string,
  organizationId: string,
): boolean {
  try {
    const pools = getProviderExternalIpPools()
    const pool = pools.find((item) => item.id === poolId)
    if (!pool) {
      return false
    }

    const organizations = getProviderRegisteredOrganizations()
    const organization = organizations.find((item) => item.id === organizationId)
    if (!organization) {
      return false
    }

    if (organization.externalIpPoolId && organization.externalIpPoolId !== poolId) {
      return false
    }

    if (
      pool.assignedOrganizationId !== null &&
      pool.assignedOrganizationId !== organizationId
    ) {
      return false
    }

    if (
      pool.assignedOrganizationId === organizationId &&
      organization.externalIpPoolId === poolId
    ) {
      return true
    }

    assignExternalIpPoolToOrganization(poolId, organization.id, organization.name)
    setProviderRegisteredOrganizations(
      organizations.map((item) =>
        item.id === organizationId
          ? {
              ...item,
              externalIpPoolId: pool.id,
              externalIpPoolName: pool.name,
              externalIpPoolCidr: pool.cidr,
            }
          : item,
      ),
    )

    return true
  } catch {
    return false
  }
}

export function clearProviderExternalIpPools(): void {
  try {
    sessionStorage.removeItem(PROVIDER_EXTERNAL_IP_POOLS_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

function isProviderVirtualNetwork(value: unknown): value is ProviderVirtualNetwork {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const network = value as ProviderVirtualNetwork
  return (
    typeof network.id === 'string' &&
    typeof network.name === 'string' &&
    typeof network.detail === 'string' &&
    typeof network.cidr === 'string' &&
    (network.ipv6Cidr === undefined || typeof network.ipv6Cidr === 'string') &&
    (network.dataCenter === undefined || typeof network.dataCenter === 'string') &&
    typeof network.createdAt === 'string'
  )
}

function normalizeProviderVirtualNetwork(network: ProviderVirtualNetwork): ProviderVirtualNetwork {
  return {
    ...network,
    ipv6Cidr: network.ipv6Cidr?.trim() ?? '',
    status: getNetworkInventoryStatus(network),
  }
}

function isProviderSubnet(value: unknown): value is ProviderSubnet {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const subnet = value as ProviderSubnet
  return (
    typeof subnet.id === 'string' &&
    typeof subnet.name === 'string' &&
    typeof subnet.detail === 'string' &&
    typeof subnet.cidr === 'string' &&
    typeof subnet.vlan === 'string' &&
    typeof subnet.virtualNetworkId === 'string' &&
    typeof subnet.createdAt === 'string'
  )
}

function normalizeProviderSubnet(subnet: ProviderSubnet): ProviderSubnet {
  return {
    ...subnet,
    status: getNetworkInventoryStatus(subnet),
  }
}

function isProviderSecurityGroup(value: unknown): value is ProviderSecurityGroup & {
  virtualNetworkId?: string
  inboundRules?: string
  outboundRules?: string
} {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const group = value as Record<string, unknown>
  return (
    typeof group.id === 'string' &&
    typeof group.name === 'string' &&
    typeof group.detail === 'string' &&
    typeof group.createdAt === 'string' &&
    (group.virtualNetworkId === undefined || typeof group.virtualNetworkId === 'string') &&
    (group.inboundRules === undefined || typeof group.inboundRules === 'string') &&
    (group.outboundRules === undefined || typeof group.outboundRules === 'string')
  )
}

function normalizeProviderSecurityGroup(
  group: ProviderSecurityGroup & {
    virtualNetworkId?: string
    inboundRules?: string
    outboundRules?: string
  },
): ProviderSecurityGroup {
  return {
    id: group.id,
    name: group.name,
    detail: group.detail,
    virtualNetworkId: group.virtualNetworkId?.trim()
      ? group.virtualNetworkId
      : (DEFAULT_PROVIDER_VIRTUAL_NETWORKS[0]?.id ?? ''),
    inboundRules: group.inboundRules?.trim() ? group.inboundRules : 'None',
    outboundRules: group.outboundRules?.trim() ? group.outboundRules : 'Allow all',
    status: getNetworkInventoryStatus(group),
    createdAt: group.createdAt,
  }
}

export function getProviderVirtualNetworks(): ProviderVirtualNetwork[] {
  try {
    const raw = sessionStorage.getItem(PROVIDER_VIRTUAL_NETWORKS_KEY)
    if (!raw) {
      sessionStorage.setItem(
        PROVIDER_VIRTUAL_NETWORKS_KEY,
        JSON.stringify(DEFAULT_PROVIDER_VIRTUAL_NETWORKS),
      )
      return [...DEFAULT_PROVIDER_VIRTUAL_NETWORKS]
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_PROVIDER_VIRTUAL_NETWORKS]
    }

    const networks = parsed.filter(isProviderVirtualNetwork).map(normalizeProviderVirtualNetwork)
    if (networks.length === 0) {
      return [...DEFAULT_PROVIDER_VIRTUAL_NETWORKS]
    }

    const needsPersist = parsed.some((item, index) => {
      if (!item || typeof item !== 'object') {
        return true
      }
      const original = item as { ipv6Cidr?: unknown }
      return original.ipv6Cidr !== networks[index]?.ipv6Cidr
    })
    if (needsPersist) {
      sessionStorage.setItem(PROVIDER_VIRTUAL_NETWORKS_KEY, JSON.stringify(networks))
    }

    return networks
  } catch {
    return [...DEFAULT_PROVIDER_VIRTUAL_NETWORKS]
  }
}

export function setProviderVirtualNetworks(networks: ProviderVirtualNetwork[]): void {
  try {
    sessionStorage.setItem(PROVIDER_VIRTUAL_NETWORKS_KEY, JSON.stringify(networks))
  } catch {
    /* demo storage unavailable */
  }
}

export function addProviderVirtualNetwork(network: ProviderVirtualNetwork): void {
  setProviderVirtualNetworks([...getProviderVirtualNetworks(), network])
}

export function getProviderSubnets(): ProviderSubnet[] {
  try {
    const raw = sessionStorage.getItem(PROVIDER_SUBNETS_KEY)
    if (!raw) {
      sessionStorage.setItem(PROVIDER_SUBNETS_KEY, JSON.stringify(DEFAULT_PROVIDER_SUBNETS))
      return [...DEFAULT_PROVIDER_SUBNETS]
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_PROVIDER_SUBNETS]
    }

    const subnets = parsed.filter(isProviderSubnet).map(normalizeProviderSubnet)
    return subnets.length > 0 ? subnets : [...DEFAULT_PROVIDER_SUBNETS]
  } catch {
    return [...DEFAULT_PROVIDER_SUBNETS]
  }
}

export function setProviderSubnets(subnets: ProviderSubnet[]): void {
  try {
    sessionStorage.setItem(PROVIDER_SUBNETS_KEY, JSON.stringify(subnets))
  } catch {
    /* demo storage unavailable */
  }
}

export function addProviderSubnet(subnet: ProviderSubnet): void {
  setProviderSubnets([...getProviderSubnets(), subnet])
}

export function getProviderSecurityGroups(): ProviderSecurityGroup[] {
  try {
    const raw = sessionStorage.getItem(PROVIDER_SECURITY_GROUPS_KEY)
    if (!raw) {
      sessionStorage.setItem(
        PROVIDER_SECURITY_GROUPS_KEY,
        JSON.stringify(DEFAULT_PROVIDER_SECURITY_GROUPS),
      )
      return [...DEFAULT_PROVIDER_SECURITY_GROUPS]
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_PROVIDER_SECURITY_GROUPS]
    }

    const groups = parsed.filter(isProviderSecurityGroup).map(normalizeProviderSecurityGroup)
    if (groups.length === 0) {
      return [...DEFAULT_PROVIDER_SECURITY_GROUPS]
    }

    const needsPersist = parsed.some((item, index) => {
      if (!item || typeof item !== 'object') {
        return true
      }
      const original = item as {
        virtualNetworkId?: unknown
        inboundRules?: unknown
        outboundRules?: unknown
      }
      const normalized = groups[index]
      return (
        original.virtualNetworkId !== normalized?.virtualNetworkId ||
        original.inboundRules !== normalized?.inboundRules ||
        original.outboundRules !== normalized?.outboundRules
      )
    })
    if (needsPersist) {
      sessionStorage.setItem(PROVIDER_SECURITY_GROUPS_KEY, JSON.stringify(groups))
    }

    return groups
  } catch {
    return [...DEFAULT_PROVIDER_SECURITY_GROUPS]
  }
}

export function setProviderSecurityGroups(groups: ProviderSecurityGroup[]): void {
  try {
    sessionStorage.setItem(PROVIDER_SECURITY_GROUPS_KEY, JSON.stringify(groups))
  } catch {
    /* demo storage unavailable */
  }
}

export function addProviderSecurityGroup(group: ProviderSecurityGroup): void {
  setProviderSecurityGroups([...getProviderSecurityGroups(), group])
}

export function getCatalogVirtualNetworkOptions(): CatalogNetworkResourceOption[] {
  return getProviderVirtualNetworks().map(toCatalogNetworkOption)
}

export function getCatalogSubnetOptions(virtualNetworkId?: string): CatalogNetworkResourceOption[] {
  const subnets = getProviderSubnets()
  const scoped = virtualNetworkId
    ? subnets.filter((subnet) => subnet.virtualNetworkId === virtualNetworkId)
    : subnets
  const options = (scoped.length > 0 ? scoped : subnets).map(toCatalogNetworkOption)
  return options
}

export function getCatalogSecurityGroupOptions(): CatalogNetworkResourceOption[] {
  return getProviderSecurityGroups().map(toCatalogNetworkOption)
}

function isComputeImage(value: unknown): value is ComputeImage {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const image = value as ComputeImage
  return (
    typeof image.id === 'string' &&
    typeof image.name === 'string' &&
    typeof image.abbrev === 'string' &&
    typeof image.architecture === 'string' &&
    typeof image.sizeLabel === 'string' &&
    typeof image.imageUrl === 'string' &&
    typeof image.checksum === 'string' &&
    (image.format === 'qcow2' || image.format === 'raw') &&
    typeof image.recommended === 'boolean' &&
    typeof image.createdAt === 'string'
  )
}

export function getProviderComputeImages(): ComputeImage[] {
  try {
    const raw = sessionStorage.getItem(PROVIDER_COMPUTE_IMAGES_KEY)
    if (!raw) {
      sessionStorage.setItem(PROVIDER_COMPUTE_IMAGES_KEY, JSON.stringify(DEFAULT_COMPUTE_IMAGES))
      return [...DEFAULT_COMPUTE_IMAGES]
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_COMPUTE_IMAGES]
    }

    const images = parsed.filter(isComputeImage)
    return images.length > 0 ? images : [...DEFAULT_COMPUTE_IMAGES]
  } catch {
    return [...DEFAULT_COMPUTE_IMAGES]
  }
}

export function setProviderComputeImages(images: ComputeImage[]): void {
  try {
    sessionStorage.setItem(PROVIDER_COMPUTE_IMAGES_KEY, JSON.stringify(images))
  } catch {
    /* demo storage unavailable */
  }
}

export function addProviderComputeImage(image: ComputeImage): void {
  const current = getProviderComputeImages()
  setProviderComputeImages([...current, image])
}

export function isProviderComputeImageInUse(imageId: string): boolean {
  const savedTemplate = getProviderSavedTemplate()
  return savedTemplate?.osImageId === imageId
}

export function clearProviderComputeImages(): void {
  try {
    sessionStorage.removeItem(PROVIDER_COMPUTE_IMAGES_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

export function setProviderOpenRegisterOrgWizard(): void {
  try {
    sessionStorage.setItem(PROVIDER_OPEN_REGISTER_ORG_WIZARD_KEY, 'true')
  } catch {
    /* demo storage unavailable */
  }
}

export function consumeProviderOpenRegisterOrgWizard(): boolean {
  try {
    const shouldOpen = sessionStorage.getItem(PROVIDER_OPEN_REGISTER_ORG_WIZARD_KEY) === 'true'
    sessionStorage.removeItem(PROVIDER_OPEN_REGISTER_ORG_WIZARD_KEY)
    return shouldOpen
  } catch {
    return false
  }
}

export type VipCatalogResumeIntent =
  | { kind: 'publish' }
  | { kind: 'edit'; catalogItemId: string }

export function setProviderVipCatalogResumeIntent(intent: VipCatalogResumeIntent): void {
  try {
    sessionStorage.setItem(PROVIDER_VIP_CATALOG_RESUME_KEY, JSON.stringify(intent))
  } catch {
    /* demo storage unavailable */
  }
}

export function peekProviderVipCatalogResumeIntent(): VipCatalogResumeIntent | null {
  try {
    const raw = sessionStorage.getItem(PROVIDER_VIP_CATALOG_RESUME_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as VipCatalogResumeIntent
    if (parsed?.kind === 'publish') {
      return { kind: 'publish' }
    }

    if (parsed?.kind === 'edit' && typeof parsed.catalogItemId === 'string') {
      return { kind: 'edit', catalogItemId: parsed.catalogItemId }
    }

    return null
  } catch {
    return null
  }
}

export function consumeProviderVipCatalogResumeIntent(): VipCatalogResumeIntent | null {
  const intent = peekProviderVipCatalogResumeIntent()
  try {
    sessionStorage.removeItem(PROVIDER_VIP_CATALOG_RESUME_KEY)
  } catch {
    /* demo storage unavailable */
  }
  return intent
}

export function clearProviderOnboardingState(): void {
  clearProviderSetupComplete()
  clearProviderServicesSelected()
  clearProviderCatalogDraft()
  clearProviderSavedTemplate()
  clearProviderRegisteredOrganizations()
  clearProviderExternalIpPools()
  clearProviderComputeImages()
  try {
    sessionStorage.removeItem(PROVIDER_ACTIVE_NAV_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

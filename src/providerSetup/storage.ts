import type { ProviderServiceId } from './constants'
import type { ProviderAdminNavId } from '../providerAdmin/constants'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ComputeImage } from '../providerAdmin/computeImages'
import { DEFAULT_COMPUTE_IMAGES } from '../providerAdmin/computeImages'
import type { ExternalIpPool } from '../providerAdmin/externalIpPools'
import { DEFAULT_EXTERNAL_IP_POOLS } from '../providerAdmin/externalIpPools'
import type { PublishCatalogScope, RateCard, SavedMasterTemplate } from './templateDemo'
import { DEFAULT_RATE_CARD } from './templateDemo'

const PROVIDER_SETUP_COMPLETE_KEY = 'bmaas-provider-setup-complete'
const PROVIDER_SELECTED_SERVICES_KEY = 'bmaas-provider-selected-services'
const PROVIDER_ACTIVE_NAV_KEY = 'bmaas-provider-active-nav'
const PROVIDER_CATALOG_DRAFT_KEY = 'bmaas-provider-catalog-draft'
const PROVIDER_SAVED_TEMPLATE_KEY = 'bmaas-provider-saved-template'
const PROVIDER_SAVED_TEMPLATES_KEY = 'bmaas-provider-saved-templates'
const PROVIDER_REGISTERED_ORGS_KEY = 'bmaas-provider-registered-orgs'
const PROVIDER_EXTERNAL_IP_POOLS_KEY = 'bmaas-provider-external-ip-pools'
const PROVIDER_COMPUTE_IMAGES_KEY = 'bmaas-provider-compute-images'
const PROVIDER_OPEN_REGISTER_ORG_WIZARD_KEY = 'bmaas-provider-open-register-org-wizard'

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

    return parsed.filter((id): id is ProviderServiceId => id === 'baremetal' || id === 'cluster')
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
      value === 'administration-organizations' ||
      value === 'administration-quotas' ||
      value === 'administration-rbac' ||
      value === 'billing-metering' ||
      value === 'system'
    ) {
      return value
    }

    if (value === 'infrastructure') {
      return 'infrastructure-data-centers'
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

export type ProviderCatalogDraft = {
  catalogItemId: string
  templateRefId: string
  templateName: string
  displayName: string
  scope: PublishCatalogScope
  createdAt: string
  rateCard: RateCard
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

export function getProviderCatalogDraft(): ProviderCatalogDraft | null {
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

export function setProviderCatalogDraft(draft: ProviderCatalogDraft): void {
  try {
    sessionStorage.setItem(PROVIDER_CATALOG_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* demo storage unavailable */
  }
}

export function clearProviderCatalogDraft(): void {
  try {
    sessionStorage.removeItem(PROVIDER_CATALOG_DRAFT_KEY)
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

export function clearProviderSavedTemplate(): void {
  try {
    sessionStorage.removeItem(PROVIDER_SAVED_TEMPLATE_KEY)
    sessionStorage.removeItem(PROVIDER_SAVED_TEMPLATES_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

function normalizeRegisteredOrganization(org: RegisteredOrganization): RegisteredOrganization {
  return {
    ...org,
    catalogItemId: org.catalogItemId ?? null,
    catalogDisplayName: org.catalogDisplayName ?? null,
    externalIpPoolId: org.externalIpPoolId ?? null,
    externalIpPoolName: org.externalIpPoolName ?? null,
    externalIpPoolCidr: org.externalIpPoolCidr ?? null,
  }
}

function isRegisteredOrganization(value: unknown): value is RegisteredOrganization {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const org = value as RegisteredOrganization
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

export function addProviderRegisteredOrganization(org: RegisteredOrganization): void {
  try {
    const current = getProviderRegisteredOrganizations()
    sessionStorage.setItem(PROVIDER_REGISTERED_ORGS_KEY, JSON.stringify([...current, org]))
  } catch {
    /* demo storage unavailable */
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

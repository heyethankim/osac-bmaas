import type { MeteringRecord, TenantQuotaAllocation } from './demoData'
import type { RegisteredOrganization } from './organizations'
import type { RateCard } from '../providerSetup/templateDemo'
import { DEFAULT_RATE_CARD } from '../providerSetup/templateDemo'

const FULL_MONTH_HOURS = 744

export function getBillingPeriodLabel(date = new Date()): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function buildMeteringRecords(
  organizations: RegisteredOrganization[],
  rateCard: RateCard = DEFAULT_RATE_CARD,
): MeteringRecord[] {
  const period = getBillingPeriodLabel()

  return organizations
    .filter((organization) => organization.status === 'Active')
    .map((organization) => {
      const hoursMetered = FULL_MONTH_HOURS

      return {
        id: `meter-${organization.id}`,
        orgName: organization.name,
        catalogItem: organization.catalogDisplayName ?? 'BMaaS catalog item',
        hoursMetered,
        estimatedCost: hoursMetered * rateCard.hourlyRate,
        period,
      }
    })
}

export function buildBillingSummary(records: MeteringRecord[], activeBillingAccounts: number) {
  const uniqueCatalogItems = new Set(
    records.map((record) => record.catalogItem).filter((item) => item.length > 0),
  )

  return {
    meteredHours: records.reduce((total, record) => total + record.hoursMetered, 0),
    estimatedRevenue: records.reduce((total, record) => total + record.estimatedCost, 0),
    activeAccounts: activeBillingAccounts,
    catalogItems: uniqueCatalogItems.size,
  }
}

export function buildTenantQuotaAllocations(
  organizations: RegisteredOrganization[],
): TenantQuotaAllocation[] {
  return organizations.map((organization) => {
    const usedInstances = organization.status === 'Active' ? Math.min(3, organization.maxInstances) : 0
    const maxVcpus = organization.maxInstances * 25

    return {
      orgId: organization.id,
      orgName: organization.name,
      maxInstances: organization.maxInstances,
      usedInstances,
      maxVcpus,
      usedVcpus: usedInstances * 25,
      externalIpPoolName: organization.externalIpPoolName,
      externalIpPoolCidr: organization.externalIpPoolCidr,
    }
  })
}

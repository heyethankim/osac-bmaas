export type ProviderRecentActivity = {
  id: string
  area: string
  labelColor: 'blue' | 'orange' | 'purple' | 'teal' | 'green'
  timeLabel: string
  title: string
  detail: string
}

export type ProviderTenantOrg = {
  id: string
  name: string
  tenantId: string
  status: 'Active' | 'Pending'
  billingAccountId: string | null
  billingAccountName: string | null
  usedVms: number
  users: number
  utilizationPct: number
  vcpu: { used: number; total: number }
  memoryGiB: { used: number; total: number }
  storageGiB: { used: number; total: number }
}

export type PlatformQuotaLimit = {
  id: string
  label: string
  unit: string
  allocated: number
  ceiling: number
}

export type TenantQuotaAllocation = {
  orgId: string
  orgName: string
  maxInstances: number
  usedInstances: number
  maxVcpus: number
  usedVcpus: number
  externalIpPoolName: string | null
  externalIpPoolCidr: string | null
}

export type MeteringRecord = {
  id: string
  orgName: string
  catalogItem: string
  hoursMetered: number
  estimatedCost: number
  period: string
}

export const PLATFORM_QUOTA_LIMITS: PlatformQuotaLimit[] = [
  { id: 'vcpus', label: 'vCPUs', unit: 'cores', allocated: 704, ceiling: 1200 },
  { id: 'memory', label: 'Memory', unit: 'GiB', allocated: 5632, ceiling: 10240 },
  { id: 'gpu', label: 'GPU units', unit: 'GPUs', allocated: 16, ceiling: 32 },
  { id: 'instances', label: 'BMaaS instances', unit: 'instances', allocated: 31, ceiling: 80 },
]

export const TENANT_QUOTA_ALLOCATIONS: TenantQuotaAllocation[] = [
  {
    orgId: 'northstar',
    orgName: 'Northstar Bank',
    maxInstances: 20,
    usedInstances: 12,
    maxVcpus: 500,
    usedVcpus: 310,
    externalIpPoolName: 'Northstar public edge',
    externalIpPoolCidr: '203.0.113.0/24',
  },
  {
    orgId: 'bluestone',
    orgName: 'Bluestone Financial Group',
    maxInstances: 15,
    usedInstances: 9,
    maxVcpus: 400,
    usedVcpus: 240,
    externalIpPoolName: null,
    externalIpPoolCidr: null,
  },
  {
    orgId: 'summit-peak',
    orgName: 'Summit Peak Credit Union',
    maxInstances: 10,
    usedInstances: 6,
    maxVcpus: 280,
    usedVcpus: 120,
    externalIpPoolName: null,
    externalIpPoolCidr: null,
  },
  {
    orgId: 'lighthouse',
    orgName: 'Lighthouse Capital Partners',
    maxInstances: 8,
    usedInstances: 4,
    maxVcpus: 200,
    usedVcpus: 88,
    externalIpPoolName: null,
    externalIpPoolCidr: null,
  },
]

export const METERING_RECORDS: MeteringRecord[] = [
  {
    id: 'meter-1',
    orgName: 'Northstar Bank',
    catalogItem: 'Compute Node · Dell PowerEdge R750 3x · 512 GB DDR4-3200',
    hoursMetered: 744,
    estimatedCost: 3114,
    period: 'June 2026',
  },
  {
    id: 'meter-2',
    orgName: 'Bluestone Financial Group',
    catalogItem: 'Compute Node · Dell PowerEdge R750 3x · 512 GB DDR4-3200',
    hoursMetered: 558,
    estimatedCost: 2335.5,
    period: 'June 2026',
  },
  {
    id: 'meter-3',
    orgName: 'Summit Peak Credit Union',
    catalogItem: 'Compute Node · Dell PowerEdge R750 3x · 512 GB DDR4-3200',
    hoursMetered: 372,
    estimatedCost: 1557,
    period: 'June 2026',
  },
]

export const PROVIDER_RECENT_ACTIVITIES: ProviderRecentActivity[] = [
  {
    id: 'pa-1',
    area: 'Tenant organizations',
    labelColor: 'blue',
    timeLabel: '18 min ago',
    title: 'Northstar Bank workspace verified',
    detail:
      'Post-migration health checks completed for the tenant admin console; SSO metadata rollover is scheduled for tonight.',
  },
  {
    id: 'pa-2',
    area: 'Resource allocation',
    labelColor: 'orange',
    timeLabel: '52 min ago',
    title: 'Cross-tenant vCPU pool rebalanced',
    detail:
      'Burst headroom was shifted from the DR region into production after sustained demand from two active tenants.',
  },
  {
    id: 'pa-3',
    area: 'Global templates',
    labelColor: 'purple',
    timeLabel: '2 hr ago',
    title: 'Financial services gold image promoted',
    detail:
      'RHEL 9 CIS-hardened v2026.04.2 was promoted to global catalog; downstream tenant catalogs will sync on the next window.',
  },
  {
    id: 'pa-4',
    area: 'Infrastructure',
    labelColor: 'teal',
    timeLabel: '4 hr ago',
    title: 'East region hypervisor maintenance closed',
    detail:
      'Rolling kernel updates finished with zero customer-visible incidents; capacity tags were restored on affected clusters.',
  },
  {
    id: 'pa-5',
    area: 'Tenant organizations',
    labelColor: 'blue',
    timeLabel: '6 hr ago',
    title: 'Bluestone Financial Group onboarding checklist',
    detail:
      'Identity federation and quota baselines were signed off; the tenant admin workspace is ready for first operator logins.',
  },
]

export const PROVIDER_TENANT_ORGS: ProviderTenantOrg[] = [
  {
    id: 'northstar',
    name: 'Northstar Bank',
    tenantId: 'tenant-001',
    status: 'Active',
    billingAccountId: 'ACCT-NSB-0042',
    billingAccountName: 'Northstar Bank — Enterprise Billing',
    usedVms: 12,
    users: 8,
    utilizationPct: 62,
    vcpu: { used: 310, total: 500 },
    memoryGiB: { used: 2272, total: 3200 },
    storageGiB: { used: 48, total: 80 },
  },
  {
    id: 'bluestone',
    name: 'Bluestone Financial Group',
    tenantId: 'tenant-002',
    status: 'Active',
    billingAccountId: 'ACCT-BFG-0118',
    billingAccountName: 'Bluestone Financial Group — Corporate',
    usedVms: 9,
    users: 6,
    utilizationPct: 54,
    vcpu: { used: 240, total: 400 },
    memoryGiB: { used: 1800, total: 2800 },
    storageGiB: { used: 36, total: 64 },
  },
  {
    id: 'summit-peak',
    name: 'Summit Peak Credit Union',
    tenantId: 'tenant-003',
    status: 'Active',
    billingAccountId: 'ACCT-SPCU-0206',
    billingAccountName: 'Summit Peak Credit Union',
    usedVms: 6,
    users: 4,
    utilizationPct: 41,
    vcpu: { used: 120, total: 280 },
    memoryGiB: { used: 960, total: 1600 },
    storageGiB: { used: 22, total: 48 },
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse Capital Partners',
    tenantId: 'tenant-004',
    status: 'Active',
    billingAccountId: null,
    billingAccountName: null,
    usedVms: 4,
    users: 3,
    utilizationPct: 38,
    vcpu: { used: 88, total: 200 },
    memoryGiB: { used: 704, total: 1200 },
    storageGiB: { used: 18, total: 40 },
  },
]

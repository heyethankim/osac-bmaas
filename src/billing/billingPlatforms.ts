/** Supported billing platforms for tenant onboarding / account linking. */
export type BillingPlatformId = 'm360'

export type BillingPlatformOption = {
  id: BillingPlatformId
  label: string
  shortLabel: string
  detail: string
  isAvailable: boolean
}

/**
 * MVP: M360 only. Additional platforms (and real adapters for account fetch/link)
 * can be registered here later; account lists load per selected platform.
 */
export const BILLING_PLATFORM_OPTIONS: ReadonlyArray<BillingPlatformOption> = [
  {
    id: 'm360',
    label: 'M360',
    shortLabel: 'M360',
    detail: 'Link an existing M360 billing account to this tenant.',
    isAvailable: true,
  },
]

export const DEFAULT_BILLING_PLATFORM_ID: BillingPlatformId = 'm360'

export function getBillingPlatformOption(
  id: BillingPlatformId | null | undefined,
): BillingPlatformOption | undefined {
  if (!id) {
    return undefined
  }
  return BILLING_PLATFORM_OPTIONS.find((option) => option.id === id)
}

export function formatBillingPlatformAccountSummary(
  platformId: BillingPlatformId,
  accountLabel: string | null | undefined,
): string {
  const platform = getBillingPlatformOption(platformId)
  const platformLabel = platform?.shortLabel ?? platformId.toUpperCase()
  const account = accountLabel?.trim()
  if (!account) {
    return platformLabel
  }
  return `${platformLabel} · ${account}`
}

import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getWorkspaceStepParam,
  resolveWorkspaceWizardStartIndex,
  syncWorkspaceStepParam,
} from './workspaceNavUrl'

/**
 * Sync a page-presented wizard's active step to `?step=` and hydrate `startIndex` from the URL.
 * Form state should live in the parent; remount the Wizard with a key that includes `stepKey`.
 */
export function useWorkspaceWizardStepUrl(
  enabled: boolean,
  isOpen: boolean,
  steps: readonly { id: string }[],
): {
  startIndex: number | undefined
  onStepChange: ((stepId: string) => void) | undefined
  stepKey: string
  urlStepId: string | null
} {
  const [searchParams, setSearchParams] = useSearchParams()
  const syncEnabled = enabled && isOpen
  const urlStepId = getWorkspaceStepParam(searchParams)
  const stepIdsKey = steps.map((step) => step.id).join('|')

  const startIndex = syncEnabled
    ? resolveWorkspaceWizardStartIndex(steps, urlStepId)
    : undefined

  useEffect(() => {
    if (!syncEnabled) {
      return
    }

    const stepFromUrl = getWorkspaceStepParam(searchParams)
    const isValidStep = Boolean(stepFromUrl && steps.some((step) => step.id === stepFromUrl))
    if (isValidStep) {
      return
    }

    const firstStepId = steps[0]?.id
    if (firstStepId) {
      syncWorkspaceStepParam(setSearchParams, firstStepId, { replace: true })
    }
    // stepIdsKey stands in for steps identity without depending on array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- steps captured via stepIdsKey
  }, [syncEnabled, searchParams, setSearchParams, stepIdsKey])

  const onStepChange = syncEnabled
    ? (stepId: string) => {
        syncWorkspaceStepParam(setSearchParams, stepId, { replace: true })
      }
    : undefined

  const stepKey = syncEnabled ? (urlStepId ?? steps[0]?.id ?? 'start') : 'static'

  return { startIndex, onStepChange, stepKey, urlStepId }
}

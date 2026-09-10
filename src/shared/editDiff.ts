import type { EditChangeRow } from './editChangeRow'

export type EditSnapshotValue = {
  compare: string
  display: string
}

export type EditChangeWithStep<TStepId extends string> = EditChangeRow & {
  stepId: TStepId
}

export const EMPTY_EDIT_SNAPSHOT_VALUE: EditSnapshotValue = { compare: '', display: '—' }

export function editSnapshotValue(compare: string, display: string): EditSnapshotValue {
  const normalized = compare.trim()
  return {
    compare: normalized,
    display: display.trim() || '—',
  }
}

export function getEditChanges<
  TSnapshot extends Record<string, EditSnapshotValue>,
  TStepId extends string,
>(
  baseline: TSnapshot,
  current: TSnapshot,
  fields: ReadonlyArray<{
    id: keyof TSnapshot
    stepId: TStepId
    label: string
  }>,
): EditChangeWithStep<TStepId>[] {
  return fields.flatMap((field) => {
    const beforeValue = baseline[field.id] ?? EMPTY_EDIT_SNAPSHOT_VALUE
    const afterValue = current[field.id] ?? EMPTY_EDIT_SNAPSHOT_VALUE

    if (beforeValue.compare === afterValue.compare) {
      return []
    }

    return [
      {
        id: String(field.id),
        stepId: field.stepId,
        label: field.label,
        before: beforeValue.display,
        after: afterValue.display,
      },
    ]
  })
}

export function getEditModifiedStepIds<TStepId extends string>(
  changes: ReadonlyArray<{ stepId: TStepId }>,
): Set<TStepId> {
  return new Set(changes.map((change) => change.stepId))
}

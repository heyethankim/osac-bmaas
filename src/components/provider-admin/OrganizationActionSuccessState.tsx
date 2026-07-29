import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core'

type OrganizationActionStateProps = {
  title: string
  body: string
}

/** In-progress empty state shown before the success confirmation. */
export function OrganizationActionWorkingState({
  title,
  body,
}: OrganizationActionStateProps) {
  return (
    <EmptyState
      variant={EmptyStateVariant.sm}
      titleText={title}
      headingLevel="h2"
      icon={Spinner}
      className="provider-admin-organizations__action-progress"
    >
      <EmptyStateBody>{body}</EmptyStateBody>
    </EmptyState>
  )
}

/** Brief in-modal confirmation before an activation step closes. */
export function OrganizationActionSuccessState({
  title,
  body,
}: OrganizationActionStateProps) {
  return (
    <EmptyState
      variant={EmptyStateVariant.sm}
      status="success"
      titleText={title}
      headingLevel="h2"
      className="provider-admin-organizations__action-progress"
    >
      <EmptyStateBody>{body}</EmptyStateBody>
    </EmptyState>
  )
}

export type OrganizationActionCompletionPhase = 'idle' | 'working' | 'success'

/** Time on the loading empty state before success appears. */
export const ORGANIZATION_ACTION_WORKING_MS = 1400

/** Time on the success empty state before the modal auto-closes. */
export const ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS = 1600

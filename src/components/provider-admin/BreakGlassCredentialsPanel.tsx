import { ClipboardCopy, Content, FormGroup } from '@patternfly/react-core'
import {
  hasBreakGlassAccount,
  resolveBreakGlassUsername,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'

export type IssuedBreakGlass = {
  username: string
  password: string
}

export function issuedBreakGlassFromOrganization(
  organization: RegisteredOrganization,
): IssuedBreakGlass | null {
  if (!hasBreakGlassAccount(organization) || !organization.breakGlassPassword) {
    return null
  }

  return {
    username: resolveBreakGlassUsername(organization),
    password: organization.breakGlassPassword,
  }
}

export function BreakGlassCredentialsPanel({
  credentials,
  sentLabel,
}: {
  credentials: IssuedBreakGlass
  sentLabel?: string
}) {
  return (
    <div className="provider-admin-organizations__idp-break-glass">
      <Content component="p" className="provider-admin-organizations__idp-pending-label">
        Break-glass account
      </Content>
      {sentLabel ? (
        <Content component="p" className="provider-admin-organizations__roles-section-help">
          {sentLabel}
        </Content>
      ) : null}
      <FormGroup label="Username" fieldId="break-glass-username">
        <ClipboardCopy
          id="break-glass-username"
          isReadOnly
          hoverTip="Copy username"
          clickTip="Username copied"
          textAriaLabel="Break-glass username"
        >
          {credentials.username}
        </ClipboardCopy>
      </FormGroup>
      <FormGroup label="Password" fieldId="break-glass-password">
        <ClipboardCopy
          id="break-glass-password"
          isReadOnly
          hoverTip="Copy password"
          clickTip="Password copied"
          textAriaLabel="Break-glass password"
        >
          {credentials.password}
        </ClipboardCopy>
      </FormGroup>
    </div>
  )
}

import { Content } from '@patternfly/react-core'
import { Link } from 'react-router-dom'
import {
  getOrganizationTenantLoginPath,
  getOrganizationTenantLoginRoute,
  type OrganizationTenantLoginRole,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'

const LOGIN_ROLES: OrganizationTenantLoginRole[] = ['tenant-admin', 'tenant-user']

type OrganizationReadyForLoginLinksProps = {
  organization: RegisteredOrganization
  className?: string
  /** When false, only the path links are shown (e.g. under an existing step label). */
  showHeading?: boolean
}

/** Full login paths shown when activation setup is complete and login is next. */
export function OrganizationReadyForLoginLinks({
  organization,
  className,
  showHeading = true,
}: OrganizationReadyForLoginLinksProps) {
  return (
    <div
      className={['provider-admin-organizations__ready-login', className].filter(Boolean).join(' ')}
    >
      {showHeading ? (
        <Content component="p" className="provider-admin-organizations__setup-signal">
          Ready for login
        </Content>
      ) : null}
      <ul className="provider-admin-organizations__ready-login-paths">
        {LOGIN_ROLES.map((role) => {
          const route = getOrganizationTenantLoginRoute(role, organization.slug)
          const path = getOrganizationTenantLoginPath(role, organization.slug)

          return (
            <li key={role}>
              <Link
                to={route}
                className="provider-admin-organizations__ready-login-link"
                title={`Open ${role === 'tenant-admin' ? 'tenant admin' : 'tenant user'} login`}
              >
                <code>{path}</code>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

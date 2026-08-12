import { Button, Card, CardBody, Content, Icon, Label, Title } from '@patternfly/react-core'
import { CogIcon } from '@patternfly/react-icons/dist/esm/icons/cog-icon'
import { CrownIcon } from '@patternfly/react-icons/dist/esm/icons/crown-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import { UsersIcon } from '@patternfly/react-icons/dist/esm/icons/users-icon'
import type { ReactNode } from 'react'
import { RouterButton } from '../components/RouterButton'
import { BMAAS_LANDING_LAST_UPDATED } from '../bmaasLandingLastUpdated'
import {
  getIdpManagerSetupRoute,
  getPendingIdpManagerInvites,
} from '../providerAdmin/organizations'
import { getProviderRegisteredOrganizations } from '../providerSetup/storage'
import redHatHatLogoUrl from '../assets/Logo-RedHat-Hat-Color-RGB.svg?url'

type PrototypeLink = {
  label: string
  to: string
  statusLabel?: string
}

type RoleBlockProps = {
  id: string
  title: string
  description: string
  icon: ReactNode
  actions: ReactNode
  prototypeLinks?: PrototypeLink[]
}

function RoleBlock({ id, title, description, icon, actions, prototypeLinks = [] }: RoleBlockProps) {
  return (
    <section className="bmaas-role-landing__role-block" aria-labelledby={id}>
      <div className="bmaas-role-landing__icon-wrap" aria-hidden>
        {icon}
      </div>
      <Title id={id} headingLevel="h2" size="lg" className="bmaas-role-landing__card-title">
        {title}
      </Title>
      <Content component="p" className="bmaas-role-landing__card-copy">
        {description}
      </Content>
      <div className="bmaas-role-landing__tenant-user-actions">{actions}</div>
      <div className="bmaas-role-landing__prototype-links">
        {prototypeLinks.length > 0 ? (
          <ul className="bmaas-role-landing__prototype-link-list">
            {prototypeLinks.map((link) => (
              <li key={`${link.label}-${link.to}`} className="bmaas-role-landing__prototype-link-item">
                <RouterButton
                  variant="link"
                  isInline
                  to={link.to}
                  className="bmaas-role-landing__prototype-link"
                >
                  {link.label}
                </RouterButton>
                {link.statusLabel ? (
                  <Label
                    color="orange"
                    isCompact
                    className="bmaas-role-landing__prototype-status"
                  >
                    {link.statusLabel}
                  </Label>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Content component="p" className="bmaas-role-landing__prototype-empty">
            Prototype versions coming soon
          </Content>
        )}
      </div>
    </section>
  )
}

function SingleEnterActions({
  to,
  disabled = false,
  ariaLabel,
}: {
  to?: string
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <>
      {disabled || !to ? (
        <Button
          variant="primary"
          className="bmaas-role-landing__action"
          isDisabled
          aria-label={ariaLabel}
        >
          Enter
        </Button>
      ) : (
        <RouterButton
          variant="primary"
          to={to}
          className="bmaas-role-landing__action"
          aria-label={ariaLabel}
        >
          Enter
        </RouterButton>
      )}
    </>
  )
}

export function BmaasLandingPage() {
  const pendingInvites = getPendingIdpManagerInvites(getProviderRegisteredOrganizations())
  const providerPrototypeLinks: PrototypeLink[] = [
    {
      label: 'Catalog',
      to: '/provider/workspace?nav=catalog',
      statusLabel: 'Not approved yet',
    },
    ...pendingInvites.map((invite) => ({
      label: 'IdP manager',
      to: getIdpManagerSetupRoute(invite.token),
      statusLabel: `Email invite · ${invite.organization.name}`,
    })),
  ]

  return (
    <div className="bmaas-role-landing bmaas-role-landing--light">
      <div className="bmaas-role-landing__wrap">
        <header className="bmaas-role-landing__header">
          <img
            src={redHatHatLogoUrl}
            alt="Red Hat"
            width={192}
            height={145}
            className="bmaas-role-landing__brand-logo"
          />
          <Title headingLevel="h1" size="4xl" className="bmaas-role-landing__title">
            Red Hat OSAC Prototypes 0.2
          </Title>
          <Content component="p" className="bmaas-role-landing__lede">
            Select a role to access the customized interface.
          </Content>
        </header>

        <Card className="bmaas-role-landing__combined-card" component="article">
          <CardBody className="bmaas-role-landing__combined-card-body">
            <div className="bmaas-role-landing__roles">
              <RoleBlock
                id="bmaas-landing-role-infra-admin-title"
                title="Infra Admin"
                description="Bootstrap the environment, manage bare metal, and make Red Hat cloud-ready."
                icon={
                  <Icon size="md">
                    <CogIcon className="bmaas-role-landing__icon-svg" />
                  </Icon>
                }
                actions={
                  <SingleEnterActions
                    disabled
                    ariaLabel="Infra Admin — not available in this demo"
                  />
                }
              />

              <RoleBlock
                id="bmaas-landing-role-provider-title"
                title="Provider Admin"
                description="Manage platform services, tenants, and global policies for the OSAC environment."
                icon={
                  <Icon size="md">
                    <CrownIcon className="bmaas-role-landing__icon-svg" />
                  </Icon>
                }
                actions={
                  <SingleEnterActions to="/provider" ariaLabel="Enter Provider Admin demo" />
                }
                prototypeLinks={providerPrototypeLinks}
              />

              <RoleBlock
                id="bmaas-landing-role-tenant-admin-title"
                title="Tenant Admin"
                description="Configure organization resources, users, quotas, and shared services."
                icon={
                  <Icon size="md">
                    <UserIcon className="bmaas-role-landing__icon-svg" />
                  </Icon>
                }
                actions={
                  <SingleEnterActions
                    to="/tenant-admin/northstar"
                    ariaLabel="Enter Tenant Admin demo"
                  />
                }
                prototypeLinks={[
                  {
                    label: 'Catalog',
                    to: '/tenant-admin/northstar/workspace?nav=catalog',
                    statusLabel: 'Not approved yet',
                  },
                ]}
              />

              <RoleBlock
                id="bmaas-landing-role-tenant-user-title"
                title="Tenant User"
                description="Provision and manage Bare Metal, Cluster, VM, and Models workloads."
                icon={
                  <Icon size="md">
                    <UsersIcon className="bmaas-role-landing__icon-svg" />
                  </Icon>
                }
                actions={
                  <SingleEnterActions
                    to="/tenant-user/northstar"
                    ariaLabel="Enter Tenant User demo"
                  />
                }
                prototypeLinks={[
                  {
                    label: 'Catalog',
                    to: '/tenant-user/northstar/workspace?nav=catalog',
                    statusLabel: 'Not approved yet',
                  },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        <footer className="bmaas-role-landing__footer">
          <div className="bmaas-role-landing__footer-issues">
            <Button
              variant="link"
              component="a"
              isInline
              href="https://docs.google.com/spreadsheets/d/1Gw4zbnim9oCjHkvqREvoNyViHgLd4JBZcBmtaFrO0xE/edit?gid=1297446303#gid=1297446303"
              target="_blank"
              rel="noopener noreferrer"
            >
              OSAC Delivery Overview
            </Button>
          </div>
          <Content component="p" className="bmaas-role-landing__footer-meta">
            Created by{' '}
            <Button
              variant="link"
              component="a"
              isInline
              href="https://redhat.enterprise.slack.com/archives/D021Q4YKTBR"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ethan Kim
            </Button>
            {' & '}
            <Button
              variant="link"
              component="a"
              isInline
              href="https://redhat.enterprise.slack.com/archives/D08ABCFSWGW"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kyle Baker
            </Button>
            {' - OpenShift UXD'}
          </Content>
          <Content component="p" className="bmaas-role-landing__footer-updated">
            Last updated: {BMAAS_LANDING_LAST_UPDATED}
          </Content>
        </footer>
      </div>
    </div>
  )
}

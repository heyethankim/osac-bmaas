import { Button, Card, CardBody, Content, Icon, Title } from '@patternfly/react-core'
import { CogIcon } from '@patternfly/react-icons/dist/esm/icons/cog-icon'
import { CrownIcon } from '@patternfly/react-icons/dist/esm/icons/crown-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import { UsersIcon } from '@patternfly/react-icons/dist/esm/icons/users-icon'
import type { ReactNode } from 'react'
import { RouterButton } from '../components/RouterButton'
import { BMAAS_LANDING_LAST_UPDATED } from '../bmaasLandingLastUpdated'
import { DEMO_TENANT_LABEL } from '../demoTenant'
import redHatHatLogoUrl from '../assets/Logo-RedHat-Hat-Color-RGB.svg?url'

type RoleBlockProps = {
  id: string
  title: string
  description: string
  icon: ReactNode
  actions: ReactNode
}

function RoleBlock({ id, title, description, icon, actions }: RoleBlockProps) {
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
      <div className="bmaas-role-landing__action-spacer-slot" aria-hidden />
    </>
  )
}

function TenantActions({
  role,
  ariaLabelPrefix,
}: {
  role: 'tenant-admin' | 'tenant-user'
  ariaLabelPrefix: string
}) {
  return (
    <>
      <RouterButton
        variant="primary"
        to={`/${role}/northstar`}
        className="bmaas-role-landing__action"
        aria-label={`${ariaLabelPrefix} ${DEMO_TENANT_LABEL.northstar}`}
      >
        {DEMO_TENANT_LABEL.northstar}
      </RouterButton>
      <div className="bmaas-role-landing__action-spacer-slot" aria-hidden />
    </>
  )
}

export function BmaasLandingPage() {
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
            Bare Metal as a Service
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
                description="Manage platform services, tenants, and global policies for the BMaaS environment."
                icon={
                  <Icon size="md">
                    <CrownIcon className="bmaas-role-landing__icon-svg" />
                  </Icon>
                }
                actions={
                  <SingleEnterActions to="/provider" ariaLabel="Enter Provider Admin demo" />
                }
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
                  <TenantActions
                    role="tenant-admin"
                    ariaLabelPrefix="Enter Tenant Admin for"
                  />
                }
              />

              <RoleBlock
                id="bmaas-landing-role-tenant-user-title"
                title="Tenant User"
                description="Access the Bare Metal-as-a-Service workspace to provision and manage your servers."
                icon={
                  <Icon size="md">
                    <UsersIcon className="bmaas-role-landing__icon-svg" />
                  </Icon>
                }
                actions={
                  <TenantActions
                    role="tenant-user"
                    ariaLabelPrefix="Enter Tenant User workspace for"
                  />
                }
              />
            </div>
          </CardBody>
        </Card>

        <footer className="bmaas-role-landing__footer">
          <Content component="p" className="bmaas-role-landing__footer-meta">
            Bare Metal as a Service — OpenShift UXD prototype
          </Content>
          <Content component="p" className="bmaas-role-landing__footer-updated">
            Last updated: {BMAAS_LANDING_LAST_UPDATED}
          </Content>
        </footer>
      </div>
    </div>
  )
}

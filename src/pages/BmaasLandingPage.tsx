import {
  Brand,
  Bullseye,
  Button,
  Card,
  CardBody,
  Content,
  Divider,
  Flex,
  FlexItem,
  Icon,
  Label,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { css } from '@patternfly/react-styles'
import alignmentStyles from '@patternfly/react-styles/css/utilities/Alignment/alignment'
import { CogIcon } from '@patternfly/react-icons/dist/esm/icons/cog-icon'
import { CrownIcon } from '@patternfly/react-icons/dist/esm/icons/crown-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import { UsersIcon } from '@patternfly/react-icons/dist/esm/icons/users-icon'
import { Fragment, type ReactNode } from 'react'
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
    <Flex
      component="section"
      direction={{ default: 'column' }}
      alignItems={{ default: 'alignItemsCenter' }}
      gap={{ default: 'gapLg' }}
      fullWidth={{ default: 'fullWidth' }}
      className={css(alignmentStyles.textAlignCenter)}
      aria-labelledby={id}
    >
      <span className="bmaas-role-landing__icon-wrap" aria-hidden>
        <Icon size="lg">{icon}</Icon>
      </span>
      <Title id={id} headingLevel="h2" size="lg">
        {title}
      </Title>
      <Content component="p">{description}</Content>
      <FlexItem fullWidth={{ default: 'fullWidth' }}>{actions}</FlexItem>
      <FlexItem>
        {prototypeLinks.length > 0 ? (
          <Stack hasGutter>
            {prototypeLinks.map((link) => (
              <StackItem key={`${link.label}-${link.to}`}>
                <Flex
                  gap={{ default: 'gapSm' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                  justifyContent={{ default: 'justifyContentCenter' }}
                  flexWrap={{ default: 'wrap' }}
                >
                  <RouterButton variant="link" isInline to={link.to}>
                    {link.label}
                  </RouterButton>
                  {link.statusLabel ? (
                    <Label color="orange" isCompact>
                      {link.statusLabel}
                    </Label>
                  ) : null}
                </Flex>
              </StackItem>
            ))}
          </Stack>
        ) : (
          <Content component="p">Prototype versions coming soon</Content>
        )}
      </FlexItem>
    </Flex>
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
  if (disabled || !to) {
    return (
      <Button variant="primary" isBlock isDisabled aria-label={ariaLabel}>
        Enter
      </Button>
    )
  }

  return (
    <RouterButton variant="primary" isBlock to={to} aria-label={ariaLabel}>
      Enter
    </RouterButton>
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
      statusLabel: `OSAC link · ${invite.organization.name}`,
    })),
  ]

  const roles: RoleBlockProps[] = [
    {
      id: 'bmaas-landing-role-infra-admin-title',
      title: 'Infra Admin',
      description: 'Bootstrap the environment, manage bare metal, and make Red Hat cloud-ready.',
      icon: <CogIcon />,
      actions: (
        <SingleEnterActions disabled ariaLabel="Infra Admin — not available in this demo" />
      ),
    },
    {
      id: 'bmaas-landing-role-provider-title',
      title: 'Provider Admin',
      description: 'Manage platform services, tenants, and global policies for the OSAC environment.',
      icon: <CrownIcon />,
      actions: <SingleEnterActions to="/provider" ariaLabel="Enter Provider Admin demo" />,
      prototypeLinks: providerPrototypeLinks,
    },
    {
      id: 'bmaas-landing-role-tenant-admin-title',
      title: 'Tenant Admin',
      description: 'Configure organization resources, users, quotas, and shared services.',
      icon: <UserIcon />,
      actions: (
        <SingleEnterActions to="/tenant-admin/northstar" ariaLabel="Enter Tenant Admin demo" />
      ),
      prototypeLinks: [
        {
          label: 'Catalog',
          to: '/tenant-admin/northstar/workspace?nav=catalog',
          statusLabel: 'Not approved yet',
        },
      ],
    },
    {
      id: 'bmaas-landing-role-tenant-user-title',
      title: 'Tenant User',
      description: 'Provision and manage Bare Metal, Cluster, VM, and Models workloads.',
      icon: <UsersIcon />,
      actions: (
        <SingleEnterActions to="/tenant-user/northstar" ariaLabel="Enter Tenant User demo" />
      ),
      prototypeLinks: [
        {
          label: 'Catalog',
          to: '/tenant-user/northstar/workspace?nav=catalog',
          statusLabel: 'Not approved yet',
        },
      ],
    },
  ]

  return (
    <Bullseye className="bmaas-role-landing">
      <Flex
        className="bmaas-role-landing__wrap"
        direction={{ default: 'column' }}
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gap2xl' }}
        flexWrap={{ default: 'nowrap' }}
      >
        <FlexItem>
          <Flex
            component="header"
            direction={{ default: 'column' }}
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapMd' }}
            className={css(alignmentStyles.textAlignCenter)}
          >
            <Brand src={redHatHatLogoUrl} alt="Red Hat" heights={{ default: '52px' }} />
            <Title headingLevel="h1" size="4xl">
              Red Hat OSAC Prototypes 0.2
            </Title>
            <Content component="p">Select a role to access the customized interface.</Content>
          </Flex>
        </FlexItem>

        <FlexItem alignSelf={{ default: 'alignSelfStretch' }}>
          <Card component="article">
            <CardBody>
              <Flex
                direction={{ default: 'column', lg: 'row' }}
                alignItems={{ default: 'alignItemsStretch' }}
                gap={{ default: 'gapLg' }}
              >
                {roles.map((role, index) => (
                  <Fragment key={role.id}>
                    {index > 0 ? (
                      <Divider
                        orientation={{
                          default: 'horizontal',
                          lg: 'vertical',
                        }}
                      />
                    ) : null}
                    <FlexItem flex={{ default: 'flex_1' }}>
                      <RoleBlock {...role} />
                    </FlexItem>
                  </Fragment>
                ))}
              </Flex>
            </CardBody>
          </Card>
        </FlexItem>

        <FlexItem>
          <Flex
            component="footer"
            direction={{ default: 'column' }}
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapMd' }}
            className={css(alignmentStyles.textAlignCenter)}
          >
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
            <Content component="p">
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
            <Content component="p">Last updated: {BMAAS_LANDING_LAST_UPDATED}</Content>
          </Flex>
        </FlexItem>
      </Flex>
    </Bullseye>
  )
}

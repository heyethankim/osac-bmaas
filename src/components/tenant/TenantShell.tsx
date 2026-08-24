import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarsIcon } from '@patternfly/react-icons/dist/esm/icons/bars-icon'
import { CogIcon } from '@patternfly/react-icons/dist/esm/icons/cog-icon'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-question-circle-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import {
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  MenuToggle,
  Nav,
  NavExpandable,
  NavGroup,
  NavItem,
  NavList,
  Page,
  PageSection,
  PageSidebar,
  PageSidebarBody,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core'
import type { TenantNavGroup, TenantNavItem } from '../../tenantShell/constants'
import { flattenTenantNavItems } from '../../tenantShell/constants'
import { UserPreferencesModal } from '../shared/UserPreferencesModal'
import { BlueSolaceMastheadLogo } from './BlueSolaceMastheadLogo'
import { NorthstarBankMastheadLogo } from './NorthstarBankMastheadLogo'

type TenantShellRole = 'tenant-admin' | 'tenant-user' | 'idp-manager'

type TenantShellProps = {
  role: TenantShellRole
  displayName: string
  accountRoleLabel?: string
  navItems?: TenantNavItem[]
  navGroups?: TenantNavGroup[]
  children?: ReactNode
  showNavigation?: boolean
  activeNavId?: string
  onNavChange?: (navId: string) => void
  disabledNavIds?: string[]
  isOnboardingLayout?: boolean
  companyLogoSrc?: string | null
  companyLogoAlt?: string
}

const roleLabels: Record<TenantShellRole, string> = {
  'tenant-admin': 'Tenant Admin',
  'tenant-user': 'Tenant user',
  'idp-manager': 'IdP manager',
}

export function TenantShell({
  role,
  displayName,
  accountRoleLabel,
  navItems = [],
  navGroups = [],
  children,
  showNavigation = true,
  activeNavId: activeNavIdProp,
  onNavChange,
  disabledNavIds = [],
  isOnboardingLayout = false,
  companyLogoSrc = null,
  companyLogoAlt,
}: TenantShellProps) {
  const navigate = useNavigate()
  const flattenedNavItems =
    navGroups.length > 0
      ? flattenTenantNavItems(navGroups.flatMap((group) => group.items))
      : flattenTenantNavItems(navItems)
  const [internalActiveNavId, setInternalActiveNavId] = useState(flattenedNavItems[0]?.id ?? '')
  const activeNavId = activeNavIdProp ?? internalActiveNavId
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false)

  const renderNavItem = (item: TenantNavItem) => {
    if (item.children?.length) {
      const isSectionActive = item.children.some((child) => child.id === activeNavId)

      return (
        <NavExpandable
          key={item.id}
          id={`tenant-${role}-nav-${item.id}`}
          title={item.label}
          isExpanded
          isActive={isSectionActive}
        >
          {item.children.map((child) => (
            <NavItem
              key={child.id}
              itemId={child.id}
              isActive={activeNavId === child.id}
              className={disabledNavIds.includes(child.id) ? 'pf-m-disabled' : undefined}
              to="#"
              preventDefault
              onClick={() => {
                if (disabledNavIds.includes(child.id) || activeNavId !== child.id) {
                  return
                }
                if (onNavChange) {
                  onNavChange(child.id)
                } else {
                  setInternalActiveNavId(child.id)
                }
              }}
            >
              {child.label}
            </NavItem>
          ))}
        </NavExpandable>
      )
    }

    return (
      <NavItem
        key={item.id}
        itemId={item.id}
        isActive={activeNavId === item.id}
        className={disabledNavIds.includes(item.id) ? 'pf-m-disabled' : undefined}
        to="#"
        preventDefault
        onClick={() => {
          if (disabledNavIds.includes(item.id) || activeNavId !== item.id) {
            return
          }
          if (onNavChange) {
            onNavChange(item.id)
          } else {
            setInternalActiveNavId(item.id)
          }
        }}
      >
        {item.label}
      </NavItem>
    )
  }

  const roleLabel = accountRoleLabel ?? roleLabels[role]

  const masthead = (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton variant="plain" aria-label="Global navigation">
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadLogo
          className={
            companyLogoSrc || role === 'idp-manager'
              ? 'bluesolace-masthead-logo'
              : 'northstar-masthead-logo'
          }
        >
          <MastheadBrand>
            {companyLogoSrc ? (
              <div
                className="bluesolace-masthead-brand"
                role="img"
                aria-label={companyLogoAlt || 'Tenant'}
              >
                <img
                  src={companyLogoSrc}
                  alt=""
                  className="bluesolace-masthead-brand__img"
                  draggable={false}
                />
              </div>
            ) : role === 'idp-manager' ? (
              <BlueSolaceMastheadLogo />
            ) : (
              <NorthstarBankMastheadLogo />
            )}
          </MastheadBrand>
        </MastheadLogo>
      </MastheadMain>

      <MastheadContent className="northstar-masthead-content">
        <Toolbar ouiaId="tenant-masthead-utilities-toolbar" className="northstar-masthead-utilities-toolbar">
          <ToolbarContent alignItems="center">
            <ToolbarGroup
              align={{ default: 'alignEnd' }}
              variant="action-group-plain"
              gap={{ default: 'gapSm' }}
            >
              <ToolbarItem>
                <Button variant="plain" aria-label="Help">
                  <OutlinedQuestionCircleIcon />
                </Button>
              </ToolbarItem>
              <ToolbarItem>
                <Dropdown
                  isOpen={isUserMenuOpen}
                  onSelect={() => setIsUserMenuOpen(false)}
                  onOpenChange={setIsUserMenuOpen}
                  popperProps={{ position: 'right' }}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      isExpanded={isUserMenuOpen}
                      onClick={() => setIsUserMenuOpen((open) => !open)}
                      icon={<UserIcon />}
                      className="osac-masthead-account-menu-toggle"
                      aria-label={`${displayName}, ${roleLabel}`}
                    >
                      <span className="osac-masthead-account-toggle">
                        <span className="osac-masthead-account-toggle__name">{displayName}</span>
                        <Label color="grey" isCompact className="osac-masthead-account-toggle__role-label">
                          {roleLabel}
                        </Label>
                      </span>
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem
                      value="user-preferences"
                      icon={<CogIcon />}
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        setIsPreferencesModalOpen(true)
                      }}
                    >
                      User preferences
                    </DropdownItem>
                    <Divider />
                    <DropdownItem
                      value="logout"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        navigate('/')
                      }}
                    >
                      Log out
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  )

  const sidebar = (
    <PageSidebar>
      <PageSidebarBody isFilled>
        <Nav
          className="osac-app-shell-nav"
          aria-label="Primary"
          onSelect={(_event, item) => {
            const nextNavId = String(item.itemId)
            if (disabledNavIds.includes(nextNavId)) {
              return
            }
            if (onNavChange) {
              onNavChange(nextNavId)
            } else {
              setInternalActiveNavId(nextNavId)
            }
          }}
        >
          {navGroups.length > 0 ? (
            navGroups.map((group) => (
              <NavGroup key={group.id} title={group.label}>
                {group.items.map((item) => renderNavItem(item))}
              </NavGroup>
            ))
          ) : (
            <NavList>{navItems.map((item) => renderNavItem(item))}</NavList>
          )}
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  )

  return (
    <>
      <Page
        masthead={masthead}
        sidebar={showNavigation ? sidebar : undefined}
        isManagedSidebar={showNavigation}
        className={[
          'tenant-shell-page',
          isOnboardingLayout ? 'tenant-shell-page--onboarding' : undefined,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <PageSection
          isWidthLimited={isOnboardingLayout}
          isCenterAligned={isOnboardingLayout}
          className="tenant-shell-page__main osac-page-main-section"
        >
          {children}
        </PageSection>
      </Page>
      <UserPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
      />
    </>
  )
}

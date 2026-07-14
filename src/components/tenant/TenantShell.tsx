import type { ReactNode } from 'react'
import { useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarsIcon } from '@patternfly/react-icons/dist/esm/icons/bars-icon'
import { MoonIcon } from '@patternfly/react-icons/dist/esm/icons/moon-icon'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-question-circle-icon'
import { SunIcon } from '@patternfly/react-icons/dist/esm/icons/sun-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import {
  Button,
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
import { NorthstarBankMastheadLogo } from './NorthstarBankMastheadLogo'

type TenantShellRole = 'tenant-admin' | 'tenant-user'

type TenantShellProps = {
  role: TenantShellRole
  displayName: string
  navItems?: TenantNavItem[]
  navGroups?: TenantNavGroup[]
  children?: ReactNode
  showNavigation?: boolean
  activeNavId?: string
  onNavChange?: (navId: string) => void
  disabledNavIds?: string[]
  isOnboardingLayout?: boolean
}

const roleLabels: Record<TenantShellRole, string> = {
  'tenant-admin': 'Admin',
  'tenant-user': 'User',
}

export function TenantShell({
  role,
  displayName,
  navItems = [],
  navGroups = [],
  children,
  showNavigation = true,
  activeNavId: activeNavIdProp,
  onNavChange,
  disabledNavIds = [],
  isOnboardingLayout = false,
}: TenantShellProps) {
  const navigate = useNavigate()
  const flattenedNavItems = navGroups.length > 0 ? navGroups.flatMap((group) => group.items) : navItems
  const [internalActiveNavId, setInternalActiveNavId] = useState(flattenedNavItems[0]?.id ?? '')
  const activeNavId = activeNavIdProp ?? internalActiveNavId
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('pf-v6-theme-dark', isDarkTheme)
    return () => {
      root.classList.remove('pf-v6-theme-dark')
    }
  }, [isDarkTheme])

  const roleLabel = roleLabels[role]

  const masthead = (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton variant="plain" aria-label="Global navigation">
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadLogo className="northstar-masthead-logo">
          <MastheadBrand>
            <NorthstarBankMastheadLogo />
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
                <Button
                  variant="plain"
                  aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
                  onClick={() => setIsDarkTheme((dark) => !dark)}
                >
                  {isDarkTheme ? <SunIcon /> : <MoonIcon />}
                </Button>
              </ToolbarItem>
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
        <div className="osac-shell-sidebar-inner">
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
                  {group.items.map((item) => (
                    <NavItem
                      key={item.id}
                      itemId={item.id}
                      isActive={activeNavId === item.id}
                      className={disabledNavIds.includes(item.id) ? 'pf-m-disabled' : undefined}
                      to="#"
                      preventDefault
                    >
                      {item.label}
                    </NavItem>
                  ))}
                </NavGroup>
              ))
            ) : (
              <NavList>
                {navItems.map((item) => (
                  <NavItem
                    key={item.id}
                    itemId={item.id}
                    isActive={activeNavId === item.id}
                    className={disabledNavIds.includes(item.id) ? 'pf-m-disabled' : undefined}
                    to="#"
                    preventDefault
                  >
                    {item.label}
                  </NavItem>
                ))}
              </NavList>
            )}
          </Nav>
          <div className="osac-shell-sidebar-footer">
            <div className="osac-shell-sidebar-sticker">
              <span className="osac-shell-sidebar-sticker__label">Conceptual design</span>
            </div>
          </div>
        </div>
      </PageSidebarBody>
    </PageSidebar>
  )

  return (
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
  )
}

import type { ReactNode } from 'react'
import { useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  MenuToggle,
  Nav,
  NavExpandable,
  NavItem,
  NavList,
  Page,
  PageSection,
  PageSidebar,
  PageSidebarBody,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core'
import {
  PROVIDER_ADMIN_ADMINISTRATION_NAV_ITEMS,
  PROVIDER_ADMIN_INFRASTRUCTURE_NAV_ITEMS,
  PROVIDER_ADMIN_NETWORKING_NAV_ITEMS,
  PROVIDER_ADMIN_SERVICES_NAV_ITEMS,
  isAdministrationNavId,
  isInfrastructureNavId,
  isNetworkingNavId,
  isServicesNavId,
  type ProviderAdminNavId,
} from '../../providerAdmin/constants'
import { clearProviderOnboardingState } from '../../providerSetup/storage'
import type { WorkspaceTransition } from '../../providerAdmin/workspace'
import { VertexaCloudMastheadLogo } from './VertexaCloudMastheadLogo'
import { ConceptualDesignSticker } from '../ConceptualDesignSticker'

type ProviderAdminShellProps = {
  children: ReactNode
  showNavigation?: boolean
  activeNavId?: ProviderAdminNavId
  onNavChange?: (navId: ProviderAdminNavId) => void
  workspaceTransition?: WorkspaceTransition
}

export function ProviderAdminShell({
  children,
  showNavigation = false,
  activeNavId = 'overview',
  onNavChange,
  workspaceTransition = 'idle',
}: ProviderAdminShellProps) {
  const navigate = useNavigate()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('pf-v6-theme-dark', isDarkTheme)
    return () => {
      root.classList.remove('pf-v6-theme-dark')
    }
  }, [isDarkTheme])

  const header = (
    <Masthead>
      <MastheadMain>
        <MastheadLogo className="vertexa-masthead-logo">
          <MastheadBrand>
            <VertexaCloudMastheadLogo />
          </MastheadBrand>
        </MastheadLogo>
      </MastheadMain>

      <MastheadContent className="provider-admin-masthead-content">
        <span className="provider-admin-masthead-content__spacer" aria-hidden />

        <Toolbar ouiaId="provider-admin-masthead-utilities" className="provider-admin-masthead-utilities">
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
                  onOpenChange={setIsUserMenuOpen}
                  onSelect={() => setIsUserMenuOpen(false)}
                  popperProps={{ position: 'right' }}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      isExpanded={isUserMenuOpen}
                      onClick={() => setIsUserMenuOpen((open) => !open)}
                      icon={<UserIcon />}
                      className="provider-admin-masthead-account-toggle"
                      aria-label="Alex Johnson, Provider Admin"
                    >
                      <span className="provider-admin-masthead-account">
                        <span className="provider-admin-masthead-account__name">Alex Johnson</span>
                        <Label color="grey" isCompact className="provider-admin-masthead-account__role">
                          Provider Admin
                        </Label>
                      </span>
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem
                      value="logout"
                      onClick={() => {
                        clearProviderOnboardingState()
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

  const sidebar = showNavigation ? (
    <PageSidebar>
      <PageSidebarBody isFilled>
        <Nav
          aria-label="Provider admin"
          onSelect={(_event, item) => {
            const navId = String(item.itemId) as ProviderAdminNavId
            onNavChange?.(navId)
          }}
        >
          <NavList>
            <NavItem
              itemId="overview"
              isActive={activeNavId === 'overview'}
              to="#"
              preventDefault
            >
              Overview
            </NavItem>
            <NavItem itemId="catalog" isActive={activeNavId === 'catalog'} to="#" preventDefault>
              Catalog
            </NavItem>
            <NavExpandable
              id="provider-admin-services-nav"
              title="Services"
              isExpanded
              isActive={isServicesNavId(activeNavId)}
            >
              {PROVIDER_ADMIN_SERVICES_NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.id}
                  itemId={item.id}
                  isActive={activeNavId === item.id}
                  to="#"
                  preventDefault
                >
                  {item.label}
                </NavItem>
              ))}
            </NavExpandable>
            <NavExpandable
              id="provider-admin-administration-nav"
              title="Administration"
              isExpanded
              isActive={isAdministrationNavId(activeNavId)}
            >
              {PROVIDER_ADMIN_ADMINISTRATION_NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.id}
                  itemId={item.id}
                  isActive={activeNavId === item.id}
                  to="#"
                  preventDefault
                >
                  {item.label}
                </NavItem>
              ))}
            </NavExpandable>
            <NavExpandable
              id="provider-admin-networking-nav"
              title="Networking"
              isExpanded
              isActive={isNetworkingNavId(activeNavId)}
            >
              {PROVIDER_ADMIN_NETWORKING_NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.id}
                  itemId={item.id}
                  isActive={activeNavId === item.id}
                  to="#"
                  preventDefault
                >
                  {item.label}
                </NavItem>
              ))}
            </NavExpandable>
            <NavExpandable
              id="provider-admin-infrastructure-nav"
              title="Infrastructure"
              isExpanded
              isActive={isInfrastructureNavId(activeNavId)}
            >
              {PROVIDER_ADMIN_INFRASTRUCTURE_NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.id}
                  itemId={item.id}
                  isActive={activeNavId === item.id}
                  to="#"
                  preventDefault
                >
                  {item.label}
                </NavItem>
              ))}
            </NavExpandable>
            <NavItem
              itemId="billing-metering"
              isActive={activeNavId === 'billing-metering'}
              to="#"
              preventDefault
            >
              Billing & metering
            </NavItem>
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  ) : undefined

  return (
    <Page
      masthead={header}
      sidebar={sidebar}
      isManagedSidebar={showNavigation}
      className={[
        showNavigation ? 'provider-admin-shell-page' : undefined,
        workspaceTransition === 'entering' ? 'provider-admin-shell-page--entering' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PageSection
        isWidthLimited={!showNavigation}
        isCenterAligned={!showNavigation}
        className="provider-admin-shell__main"
      >
        {workspaceTransition !== 'idle' ? (
          <div
            className={`provider-admin-publishing-overlay provider-admin-publishing-overlay--${workspaceTransition}`}
            aria-live="polite"
            aria-busy="true"
          >
            <Spinner size="xl" aria-label="Publishing catalog item" />
          </div>
        ) : null}
        <div className="provider-admin-shell__content">{children}</div>
      </PageSection>
      <ConceptualDesignSticker />
    </Page>
  )
}

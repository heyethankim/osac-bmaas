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
import { BarsIcon } from '@patternfly/react-icons/dist/esm/icons/bars-icon'
import { CogIcon } from '@patternfly/react-icons/dist/esm/icons/cog-icon'
import { MoonIcon } from '@patternfly/react-icons/dist/esm/icons/moon-icon'
import { OutlinedBellIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-bell-icon'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-question-circle-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import { useState, type ReactNode } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import redHatHatLogoUrl from '../../assets/Logo-RedHat-Hat-Color-RGB.svg?url'
import { useThemePreferences } from '../../theme/themePreferences'
import { UserPreferencesModal } from '../shared/UserPreferencesModal'

const M360_NAV_ITEMS = [
  'MBrix',
  'Billing Dashboard',
  'Charge Estimator',
  'Deals',
  'Disputes',
  'Catalog',
  'Deal Manager',
  'Usage & Metering',
  'Wallet',
  'Billing',
  'Usage',
  'Users & roles',
  'Agent Huddle',
  'Intelligence Hub',
  'Analytics',
  'Settings',
  'Accounts',
  'Invoices',
] as const

type M360ShellProps = {
  title: string
  children: ReactNode
}

export function M360Shell({ title, children }: M360ShellProps) {
  const navigate = useNavigate()
  const isAccountsListActive = useMatch('/m360/accounts') !== null
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false)
  const { colorSchemePreference, setColorSchemePreference } = useThemePreferences()

  const toggleColorScheme = () => {
    const isDark =
      colorSchemePreference === 'dark' ||
      (colorSchemePreference === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    setColorSchemePreference(isDark ? 'light' : 'dark')
  }

  const header = (
    <Masthead className="m360-portal__masthead">
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton variant="plain" aria-label="Global navigation">
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand>
          <MastheadLogo className="m360-portal__masthead-logo">
            <div className="m360-portal__masthead-brand" aria-label="Red Hat">
              <img className="m360-portal__masthead-brand-logo" src={redHatHatLogoUrl} alt="" />
              <span className="m360-portal__masthead-brand-wordmark">Red Hat</span>
            </div>
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent className="m360-portal__masthead-content">
        <span className="m360-portal__masthead-content__spacer" aria-hidden />
        <Toolbar ouiaId="m360-portal-masthead-utilities" className="m360-portal__masthead-utilities">
          <ToolbarContent alignItems="center">
            <ToolbarGroup
              align={{ default: 'alignEnd' }}
              variant="action-group-plain"
              gap={{ default: 'gapSm' }}
            >
              <ToolbarItem>
                <Button
                  variant="plain"
                  aria-label="Toggle color scheme"
                  icon={<MoonIcon />}
                  onClick={toggleColorScheme}
                />
              </ToolbarItem>
              <ToolbarItem>
                <Button variant="plain" aria-label="Notifications" icon={<OutlinedBellIcon />} />
              </ToolbarItem>
              <ToolbarItem>
                <Button
                  variant="plain"
                  aria-label="Help"
                  icon={<OutlinedQuestionCircleIcon />}
                />
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
                      className="m360-portal__masthead-account-toggle"
                      aria-label="Alex Johnson, M360 Billing"
                    >
                      <span className="m360-portal__masthead-account">
                        <span className="m360-portal__masthead-account__name">Alex Johnson</span>
                        <Label color="grey" isCompact className="m360-portal__masthead-account__role">
                          M360 Billing
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
    <PageSidebar className="m360-portal__sidebar">
      <div className="m360-portal__sidebar-inner">
        <PageSidebarBody className="m360-portal__sidebar-nav">
          <Nav aria-label="M360">
            <NavList>
              {M360_NAV_ITEMS.map((item) => (
                <NavItem
                  key={item}
                  itemId={item}
                  isActive={item === 'Accounts' && isAccountsListActive}
                  disabled={item !== 'Accounts'}
                  to={item === 'Accounts' ? '/m360/accounts' : '#'}
                  component={item === 'Accounts' ? Link : undefined}
                  onClick={
                    item === 'Accounts'
                      ? (event) => {
                          event.preventDefault()
                          navigate('/m360/accounts')
                        }
                      : undefined
                  }
                >
                  {item}
                </NavItem>
              ))}
            </NavList>
          </Nav>
        </PageSidebarBody>
      </div>
    </PageSidebar>
  )

  return (
    <>
      <Page className="m360-portal" masthead={header} sidebar={sidebar} isManagedSidebar>
        <PageSection className="m360-portal__content">
          <h1 className="m360-portal__title">{title}</h1>
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

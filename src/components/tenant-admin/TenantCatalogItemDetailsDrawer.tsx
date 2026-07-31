import type { ReactNode } from 'react'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  FormSelect,
  FormSelectOption,
  Icon,
  Label,
  Title,
} from '@patternfly/react-core'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { getCatalogSpecsSectionLabel } from '../../catalog/catalogSpecs'
import { formatCatalogFieldPolicyMode } from '../../catalog/catalogPublishConfig'
import { CatalogVmDefaultsSections } from '../catalog/CatalogVmDefaultsSections'
import { NetworkFieldLockButton } from '../catalog/NetworkFieldLockButton'
import { CatalogPublishScopeIcon } from '../provider-admin/CatalogPublishScopeIcon'
import {
  TENANT_CATALOG_MANAGER_DEMO,
  getTenantCatalogItemDetailSpecRows,
  getTenantCatalogProjectsLinkLabel,
  type TenantCatalogGovernanceItemWithNetworking,
} from '../../tenantAdmin/catalogManager'
import {
  getTenantCatalogNetworkFieldSummaries,
  getTenantNetworkOverrides,
  getTenantNetworkResourceMeta,
  type TenantNetworkResourceKind,
} from '../../tenantAdmin/networking'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'

function getVisibilityLabel(scope: TenantCatalogGovernanceItemWithNetworking['scope']): string {
  return scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global public'
}

type TenantCatalogItemDetailsDrawerProps = {
  isExpanded: boolean
  onClose: () => void
  item: TenantCatalogGovernanceItemWithNetworking | null
  organizationSlug: string
  projectCount: number
  onNavigateToProjectsTeams: () => void
  onChangeNetworkField: (kind: TenantNetworkResourceKind, optionId: string) => void
  onChangeLockForUsers: (kind: TenantNetworkResourceKind, locked: boolean) => void
  onLaunch?: () => void
  children: ReactNode
}

export function TenantCatalogItemDetailsDrawer({
  isExpanded,
  onClose,
  item,
  organizationSlug,
  projectCount,
  onNavigateToProjectsTeams,
  onChangeNetworkField,
  onChangeLockForUsers,
  onLaunch,
  children,
}: TenantCatalogItemDetailsDrawerProps) {
  const overrides = getTenantNetworkOverrides(organizationSlug)
  const networkFields = item
    ? getTenantCatalogNetworkFieldSummaries(item.networkPolicy, overrides)
    : []
  const virtualNetworkId = item?.networkPolicy.virtualNetwork.id
  const specRows = item ? getTenantCatalogItemDetailSpecRows(item) : []
  const displaySpecRows =
    item?.instanceTypeLabel || item?.diskImageLabel
      ? specRows.filter(
          (row) => row.label !== 'Instance type' && row.label !== 'Disk image',
        )
      : specRows
  const isVirtualMachine = item?.serviceId === 'virtual-machine'
  const specsSectionLabel = item
    ? getCatalogSpecsSectionLabel(item.serviceId)
    : 'Hardware specifications'

  const panelContent = item ? (
    <DrawerPanelContent
      className="tenant-admin-catalog-manager__drawer-panel"
      defaultSize="28rem"
      minSize="22rem"
      focusTrap={{ enabled: true }}
    >
      <DrawerHead>
        <div className="tenant-admin-catalog-manager__drawer-title-row">
          <span className="tenant-admin-catalog-manager__drawer-icon-wrap" aria-hidden>
            <Icon size="lg" isInline>
              {getCatalogServiceIcon(item.serviceId)}
            </Icon>
          </span>
          <Title
            headingLevel="h2"
            size="xl"
            id="tenant-catalog-item-details-title"
            className="tenant-admin-catalog-manager__drawer-title"
          >
            {item.displayName}
          </Title>
        </div>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="tenant-admin-catalog-manager__drawer-body">
        <Content component="p" className="tenant-admin-catalog-manager__drawer-lede">
          {item.description?.trim() || TENANT_CATALOG_MANAGER_DEMO.drawerAccessLede}
        </Content>

        {onLaunch ? (
          <Button
            variant="primary"
            icon={<RocketIcon />}
            onClick={onLaunch}
            className="tenant-admin-catalog-manager__drawer-launch"
          >
            {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
          </Button>
        ) : null}

        <Divider className="tenant-admin-catalog-manager__drawer-divider" />

        <DescriptionList
          isCompact
          className="tenant-admin-catalog-manager__drawer-dl"
          aria-label="Catalog item details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Service</DescriptionListTerm>
            <DescriptionListDescription>{item.service}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color={item.status === 'Unpublished' ? 'grey' : 'green'} isCompact>
                {item.status}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Visibility</DescriptionListTerm>
            <DescriptionListDescription>
              <span className="tenant-admin-catalog-manager__scope">
                <CatalogPublishScopeIcon
                  scope={item.scope}
                  className="tenant-admin-catalog-manager__scope-icon"
                />
                <span>{getVisibilityLabel(item.scope)}</span>
              </span>
            </DescriptionListDescription>
          </DescriptionListGroup>
          {item.instanceTypeLabel ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Instance type</DescriptionListTerm>
              <DescriptionListDescription>{item.instanceTypeLabel}</DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
          {item.diskImageLabel ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Disk image</DescriptionListTerm>
              <DescriptionListDescription>{item.diskImageLabel}</DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
        </DescriptionList>

        {item.fieldPolicies && item.fieldPolicies.length > 0 ? (
          <>
            <Divider className="tenant-admin-catalog-manager__drawer-divider" />
            <DescriptionList
              isCompact
              className="tenant-admin-catalog-manager__drawer-dl"
              aria-label="Launch field policies"
            >
              {item.fieldPolicies.map((policy) => (
                <DescriptionListGroup key={policy.id}>
                  <DescriptionListTerm>{policy.label}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <span className="tenant-admin-catalog-manager__field-policy-value">
                      <span>{policy.defaultValue}</span>
                      <Label color={policy.mode === 'exposed' ? 'blue' : 'grey'} isCompact>
                        {formatCatalogFieldPolicyMode(policy.mode)}
                      </Label>
                    </span>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          </>
        ) : null}

        {isVirtualMachine ? (
          <>
            <Divider className="tenant-admin-catalog-manager__drawer-divider" />
            <CatalogVmDefaultsSections idPrefix="tenant-admin-catalog-vm" />
          </>
        ) : displaySpecRows.length > 0 ? (
          <>
            <Divider className="tenant-admin-catalog-manager__drawer-divider" />
            <DescriptionList
              isCompact
              className="tenant-admin-catalog-manager__drawer-dl"
              aria-label={specsSectionLabel}
            >
              {displaySpecRows.map((row) => (
                <DescriptionListGroup key={row.label}>
                  <DescriptionListTerm>{row.label}</DescriptionListTerm>
                  <DescriptionListDescription>{row.value}</DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          </>
        ) : null}

        <Divider className="tenant-admin-catalog-manager__drawer-divider" />

        <div className="tenant-admin-catalog-manager__drawer-section">
          <Content component="p" className="tenant-admin-catalog-manager__drawer-section-title">
            {TENANT_CATALOG_MANAGER_DEMO.networkingLabel}
          </Content>
          {!item.networkPolicy.enabled ? (
            <Content component="p" className="tenant-admin-catalog-manager__drawer-section-lede">
              Networking is off for this catalog item. Provider has not enabled network defaults.
            </Content>
          ) : (
            <>
              <Content component="p" className="tenant-admin-catalog-manager__drawer-section-lede">
                {TENANT_CATALOG_MANAGER_DEMO.networkingSectionLede}
              </Content>
              <DescriptionList
                isCompact
                className="tenant-admin-catalog-manager__drawer-dl"
                aria-label="Networking configuration"
              >
                {networkFields.map((field) => {
                  const meta = getTenantNetworkResourceMeta(field.kind, virtualNetworkId)

                  return (
                    <DescriptionListGroup key={field.kind}>
                      <DescriptionListTerm>
                        <span className="tenant-admin-catalog-manager__drawer-network-term">
                          <span>{field.label}</span>
                          {field.providerLocked ? (
                            <Label color="grey" isCompact icon={<LockIcon />}>
                              Locked by provider
                            </Label>
                          ) : field.lockedForUsers ? (
                            <Label color="grey" isCompact icon={<LockIcon />}>
                              Locked for users
                            </Label>
                          ) : (
                            <Label color="blue" isCompact>
                              Editable for users
                            </Label>
                          )}
                        </span>
                      </DescriptionListTerm>
                      <DescriptionListDescription>
                        {field.providerLocked ? (
                          field.value
                        ) : (
                          <div className="tenant-admin-catalog-manager__drawer-network-controls">
                            <FormSelect
                              id={`tenant-catalog-network-${field.kind}`}
                              className="tenant-admin-catalog-manager__drawer-network-select"
                              value={field.selectedId}
                              isDisabled={field.lockedForUsers}
                              aria-label={field.label}
                              onChange={(_event, value) => onChangeNetworkField(field.kind, value)}
                            >
                              {meta.options.map((option) => (
                                <FormSelectOption
                                  key={option.id}
                                  value={option.id}
                                  label={`${option.name} · ${option.detail}`}
                                />
                              ))}
                            </FormSelect>
                            <NetworkFieldLockButton
                              isLocked={field.lockedForUsers}
                              aria-label={`Lock ${field.label} for tenant users`}
                              lockTooltip="Lock value — unlock to change"
                              unlockTooltip="Unlock to change this value"
                              onToggle={(locked) => onChangeLockForUsers(field.kind, locked)}
                            />
                          </div>
                        )}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )
                })}
              </DescriptionList>
            </>
          )}
        </div>

        <Divider className="tenant-admin-catalog-manager__drawer-divider" />

        <div className="tenant-admin-catalog-manager__drawer-section">
          <Content component="p" className="tenant-admin-catalog-manager__drawer-section-title">
            {TENANT_CATALOG_MANAGER_DEMO.accessLabel}
          </Content>
          <Content component="p" className="tenant-admin-catalog-manager__org-access-note">
            {TENANT_CATALOG_MANAGER_DEMO.accessDetailNote}
          </Content>
          <Button variant="link" isInline onClick={onNavigateToProjectsTeams}>
            {getTenantCatalogProjectsLinkLabel(projectCount)}
          </Button>
        </div>
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer isExpanded={isExpanded} onExpand={() => undefined}>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  )
}

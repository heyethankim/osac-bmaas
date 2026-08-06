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
  Icon,
  Label,
  Title,
} from '@patternfly/react-core'
import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { getCatalogSpecsSectionLabel, resolveClusterCatalogHighlightRows, resolveVmCatalogHighlightRows } from '../../catalog/catalogSpecs'
import { formatCatalogFieldPolicyMode } from '../../catalog/catalogPublishConfig'
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import { CatalogNetworkingLocksSection } from '../catalog/CatalogNetworkingLocksSection'
import { CatalogVmDefaultsSections } from '../catalog/CatalogVmDefaultsSections'
import { CatalogPublishScopeIcon } from '../provider-admin/CatalogPublishScopeIcon'
import {
  TENANT_CATALOG_MANAGER_DEMO,
  getTenantCatalogItemDetailSpecRows,
  getTenantCatalogProjectsLinkLabel,
  type TenantCatalogGovernanceItemWithNetworking,
} from '../../tenantAdmin/catalogManager'
import {
  applyTenantLocksForUsers,
  getTenantNetworkOverrides,
  type TenantNetworkResourceKind,
} from '../../tenantAdmin/networking'
import {
  getCatalogExternalIpPoolOptions,
  getCatalogSecurityGroupOptions,
  getCatalogSubnetOptions,
  getCatalogVirtualNetworkOptions,
} from '../../providerSetup/storage'
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
  onChangeLockForUsers,
  onLaunch,
  children,
}: TenantCatalogItemDetailsDrawerProps) {
  const overrides = getTenantNetworkOverrides(organizationSlug, item?.catalogItemId)
  const networkPolicy = item
    ? applyTenantLocksForUsers(item.networkPolicy, overrides)
    : null
  const providerLocked = item
    ? {
        virtualNetwork: item.networkPolicy.virtualNetwork.locked,
        subnet: item.networkPolicy.subnet.locked,
        securityGroup: item.networkPolicy.securityGroup.locked,
        externalIpPool: item.networkPolicy.externalIpPool.locked,
      }
    : undefined
  const specRows = item ? getTenantCatalogItemDetailSpecRows(item) : []
  const isVirtualMachine = item?.serviceId === 'virtual-machine'
  const isCluster = item?.serviceId === 'cluster'
  const vmHighlightRows = item
    ? resolveVmCatalogHighlightRows({
        serviceId: item.serviceId,
        templateRefId: item.templateRefId,
        templateName: item.templateName,
        instanceTypeLabel: item.instanceTypeLabel,
        diskImageLabel: item.diskImageLabel,
      })
    : []
  const clusterHighlightRows = item
    ? resolveClusterCatalogHighlightRows({
        serviceId: item.serviceId,
        templateRefId: item.templateRefId,
        templateName: item.templateName,
        instanceTypeLabel: item.instanceTypeLabel,
        diskImageLabel: item.diskImageLabel,
      })
    : []
  const displaySpecRows =
    item?.instanceTypeLabel || item?.diskImageLabel
      ? specRows.filter(
          (row) =>
            row.label !== 'Instance type' &&
            row.label !== 'Cluster size' &&
            row.label !== 'Disk image' &&
            row.label !== 'Platform' &&
            row.label !== 'Cluster version' &&
            row.label !== 'Size' &&
            row.label !== 'OS image',
        )
      : item?.serviceId === 'virtual-machine'
        ? specRows.filter(
            (row) =>
              row.label !== 'Instance type' &&
              row.label !== 'Size' &&
              row.label !== 'OS image',
          )
        : isCluster
          ? specRows.filter((row) => row.label !== 'Cluster version' && row.label !== 'Cluster size')
          : specRows
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

        {onLaunch && item.status !== 'Unpublished' ? (
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
          {isVirtualMachine
            ? vmHighlightRows.map((row) => (
                <DescriptionListGroup key={row.label}>
                  <DescriptionListTerm>{row.label}</DescriptionListTerm>
                  <DescriptionListDescription>{row.value}</DescriptionListDescription>
                </DescriptionListGroup>
              ))
            : null}
          {!isVirtualMachine && !isCluster && item.instanceTypeLabel ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Instance type</DescriptionListTerm>
              <DescriptionListDescription>{item.instanceTypeLabel}</DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
          {!isVirtualMachine && !isCluster && item.diskImageLabel ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Disk image</DescriptionListTerm>
              <DescriptionListDescription>{item.diskImageLabel}</DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
        </DescriptionList>

        {isCluster && clusterHighlightRows.length > 0 ? (
          <>
            <Divider className="tenant-admin-catalog-manager__drawer-divider" />
            <DescriptionList
              isCompact
              className="tenant-admin-catalog-manager__drawer-dl"
              aria-label="Cluster offering summary"
            >
              {clusterHighlightRows.map((row) => (
                <DescriptionListGroup key={row.label}>
                  <DescriptionListTerm>{row.label}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {row.label === 'Cluster version' ? (
                      <CatalogClusterVersionValue>{row.value}</CatalogClusterVersionValue>
                    ) : (
                      row.value
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          </>
        ) : null}

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
            {isCluster ? null : (
              <Divider className="tenant-admin-catalog-manager__drawer-divider" />
            )}
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

        {networkPolicy ? (
          <div className="catalog-networking-step">
            <CatalogNetworkingLocksSection
              idPrefix={`tenant-admin-catalog-${item.catalogItemId}`}
              policy={networkPolicy}
              lede={TENANT_CATALOG_MANAGER_DEMO.networkingSectionLede}
              providerLocked={providerLocked}
              virtualNetworkOptions={getCatalogVirtualNetworkOptions()}
              subnetOptions={getCatalogSubnetOptions(networkPolicy.virtualNetwork.id)}
              securityGroupOptions={getCatalogSecurityGroupOptions()}
              externalIpPoolOptions={getCatalogExternalIpPoolOptions()}
              onChange={(next) => {
                const fields: Array<{
                  key: 'virtualNetwork' | 'subnet' | 'securityGroup' | 'externalIpPool'
                  kind: TenantNetworkResourceKind
                }> = [
                  { key: 'virtualNetwork', kind: 'virtual-network' },
                  { key: 'subnet', kind: 'subnet' },
                  { key: 'securityGroup', kind: 'security-group' },
                  { key: 'externalIpPool', kind: 'external-ip-pool' },
                ]
                for (const { key, kind } of fields) {
                  if (next[key].locked !== networkPolicy[key].locked) {
                    onChangeLockForUsers(kind, next[key].locked)
                  }
                }
              }}
            />
          </div>
        ) : null}

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

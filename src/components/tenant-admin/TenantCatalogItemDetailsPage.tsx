import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Icon,
  Label,
  Title,
} from '@patternfly/react-core'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  getCatalogSpecsSectionLabel,
  resolveClusterCatalogHighlightRows,
  resolveVmCatalogHighlightRows,
} from '../../catalog/catalogSpecs'
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

type TenantCatalogItemDetailsPageProps = {
  item: TenantCatalogGovernanceItemWithNetworking
  organizationSlug: string
  projectCount: number
  onBack: () => void
  onNavigateToProjectsTeams: () => void
  onChangeLockForUsers: (kind: TenantNetworkResourceKind, locked: boolean) => void
  onLaunch?: () => void
}

export function TenantCatalogItemDetailsPage({
  item,
  organizationSlug,
  projectCount,
  onBack,
  onNavigateToProjectsTeams,
  onChangeLockForUsers,
  onLaunch,
}: TenantCatalogItemDetailsPageProps) {
  const overrides = getTenantNetworkOverrides(organizationSlug, item.catalogItemId)
  const networkPolicy = applyTenantLocksForUsers(item.networkPolicy, overrides)
  const providerLocked = {
    virtualNetwork: item.networkPolicy.virtualNetwork.locked,
    subnet: item.networkPolicy.subnet.locked,
    securityGroup: item.networkPolicy.securityGroup.locked,
    externalIpPool: item.networkPolicy.externalIpPool.locked,
  }
  const specRows = getTenantCatalogItemDetailSpecRows(item)
  const isVirtualMachine = item.serviceId === 'virtual-machine'
  const isCluster = item.serviceId === 'cluster'
  const vmHighlightRows = isVirtualMachine
    ? resolveVmCatalogHighlightRows({
        serviceId: item.serviceId,
        templateRefId: item.templateRefId,
        templateName: item.templateName,
        instanceTypeLabel: item.instanceTypeLabel,
        diskImageLabel: item.diskImageLabel,
      })
    : []
  const clusterHighlightRows = isCluster
    ? resolveClusterCatalogHighlightRows({
        serviceId: item.serviceId,
        templateRefId: item.templateRefId,
        templateName: item.templateName,
        instanceTypeLabel: item.instanceTypeLabel,
        diskImageLabel: item.diskImageLabel,
      })
    : []
  const displaySpecRows =
    item.instanceTypeLabel || item.diskImageLabel
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
      : isVirtualMachine
        ? specRows.filter(
            (row) =>
              row.label !== 'Instance type' &&
              row.label !== 'Size' &&
              row.label !== 'OS image',
          )
        : isCluster
          ? specRows.filter((row) => row.label !== 'Cluster version' && row.label !== 'Cluster size')
          : specRows
  const specsSectionLabel = getCatalogSpecsSectionLabel(item.serviceId)

  return (
    <EntityDetailsPageShell
      parentLabel="Catalog"
      onBack={onBack}
      title={item.displayName}
      titleId="tenant-catalog-item-details-title"
      description={item.description?.trim() || TENANT_CATALOG_MANAGER_DEMO.drawerAccessLede}
      icon={
        <Icon size="lg" isInline>
          {getCatalogServiceIcon(item.serviceId)}
        </Icon>
      }
      actions={
        onLaunch && item.status !== 'Unpublished' ? (
          <Button variant="primary" icon={<RocketIcon />} onClick={onLaunch}>
            {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
          </Button>
        ) : undefined
      }
    >
      <div className="entity-details-page__columns">
        <div className="entity-details-page__column">
          <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
            Overview
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="Catalog item overview"
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
        </div>

        <div className="entity-details-page__column">
          <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
            Access
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="Catalog item access"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>{TENANT_CATALOG_MANAGER_DEMO.accessLabel}</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color="grey" isCompact>
                  {TENANT_CATALOG_MANAGER_DEMO.accessDefaultLabel}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
          <Content component="p" className="tenant-admin-catalog-manager__org-access-note">
            {TENANT_CATALOG_MANAGER_DEMO.accessDetailNote}
          </Content>
          <Button variant="link" isInline onClick={onNavigateToProjectsTeams}>
            {getTenantCatalogProjectsLinkLabel(projectCount)}
          </Button>

          {isCluster && clusterHighlightRows.length > 0 ? (
            <>
              <Title
                headingLevel="h2"
                size="lg"
                className="entity-details-page__section-title"
              >
                Cluster summary
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
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
              <Title
                headingLevel="h2"
                size="lg"
                className="entity-details-page__section-title"
              >
                Field policies
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
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
        </div>

        <div className="entity-details-page__column entity-details-page__column--config entity-details-page__column--span-rows">
          {isVirtualMachine && vmHighlightRows.length > 0 ? (
            <>
              <Title
                headingLevel="h2"
                size="md"
                className="entity-details-page__section-title entity-details-page__section-title--config"
              >
                Instance configuration
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Instance configuration"
              >
                {vmHighlightRows.map((row) => (
                  <DescriptionListGroup key={row.label}>
                    <DescriptionListTerm>{row.label}</DescriptionListTerm>
                    <DescriptionListDescription>{row.value}</DescriptionListDescription>
                  </DescriptionListGroup>
                ))}
              </DescriptionList>
            </>
          ) : null}

          {isVirtualMachine ? (
            <CatalogVmDefaultsSections idPrefix="tenant-admin-catalog-vm" />
          ) : displaySpecRows.length > 0 ? (
            <>
              <Title
                headingLevel="h2"
                size="md"
                className="entity-details-page__section-title entity-details-page__section-title--config"
              >
                {specsSectionLabel}
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
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
        </div>

        <section
          className="entity-details-page__column entity-details-page__column--span-2"
          aria-label="Networking"
        >
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
        </section>
      </div>
    </EntityDetailsPageShell>
  )
}

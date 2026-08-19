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
import { BareMetalCatalogItemDetailsBody } from '../catalog/BareMetalCatalogItemDetailsBody'
import { ClusterCatalogItemDetailsBody } from '../catalog/ClusterCatalogItemDetailsBody'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { formatCatalogItemCreatedAt } from '../../catalog/catalogDetails'
import { getCatalogItemUserDescription } from '../../catalog/catalogItemDescriptions'
import {
  getCatalogSpecsSectionLabel,
  resolveCatalogSpecRows,
  resolveClusterCatalogHighlightRows,
  resolveVmCatalogHighlightRows,
} from '../../catalog/catalogSpecs'
import { formatRateCardSummary } from '../../providerSetup/templateDemo'
import { formatCatalogFieldPolicyMode } from '../../catalog/catalogPublishConfig'
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import { CatalogVmDefaultsSections } from '../catalog/CatalogVmDefaultsSections'
import { CatalogPublishScopeIcon } from '../provider-admin/CatalogPublishScopeIcon'
import {
  TENANT_CATALOG_MANAGER_DEMO,
  getTenantCatalogItemDetailSpecRows,
  getTenantCatalogProjectsLinkLabel,
  type TenantCatalogGovernanceItemWithNetworking,
} from '../../tenantAdmin/catalogManager'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'

function getVisibilityLabel(scope: TenantCatalogGovernanceItemWithNetworking['scope']): string {
  return scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global public'
}

type TenantCatalogItemDetailsPageProps = {
  item: TenantCatalogGovernanceItemWithNetworking
  projectCount: number
  onBack: () => void
  onNavigateToProjectsTeams: () => void
  onLaunch?: () => void
}

export function TenantCatalogItemDetailsPage({
  item,
  projectCount,
  onBack,
  onNavigateToProjectsTeams,
  onLaunch,
}: TenantCatalogItemDetailsPageProps) {
  const specRows = getTenantCatalogItemDetailSpecRows(item)
  const isBareMetal = item.serviceId === 'baremetal'
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
        diskImageId: item.diskImageId,
        clusterVersionMode: item.clusterVersionMode,
        nodeSetId: item.nodeSetId,
        nodeSetLabel: item.nodeSetLabel,
        hostTypeId: item.hostTypeId,
        hostTypeLabel: item.hostTypeLabel,
        clusterNodeTopologyMode: item.clusterNodeTopologyMode,
      })
    : []
  const displaySpecRows =
    item.instanceTypeLabel || item.diskImageLabel || item.diskImageId
      ? specRows.filter(
          (row) =>
            row.label !== 'Instance type' &&
            row.label !== 'Cluster size' &&
            row.label !== 'Disk image' &&
            row.label !== 'Platform' &&
            row.label !== 'Cluster version' &&
            row.label !== 'Node set' &&
            row.label !== 'Host type' &&
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
          ? specRows.filter(
              (row) =>
                row.label !== 'Cluster version' &&
                row.label !== 'Node set' &&
                row.label !== 'Host type' &&
                row.label !== 'Cluster size',
            )
          : specRows
  const specsSectionLabel = getCatalogSpecsSectionLabel(item.serviceId)
  const description = getCatalogItemUserDescription({
    catalogItemId: item.catalogItemId ?? item.id,
    serviceId: item.serviceId,
    description: item.description,
  })

  return (
    <EntityDetailsPageShell
      parentLabel="Catalog"
      onBack={onBack}
      title={item.displayName}
      titleId="tenant-catalog-item-details-title"
      description={description}
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
      {isBareMetal ? (
        <BareMetalCatalogItemDetailsBody
          variant="entity"
          content={{
            service: item.service,
            statusLabel: item.status,
            statusColor: item.status === 'Unpublished' ? 'grey' : 'green',
            rateSummary: formatRateCardSummary(item.rateCard),
            scope: item.scope,
            visibilityLabel: getVisibilityLabel(item.scope),
            createdAtLabel: formatCatalogItemCreatedAt(item.createdAt),
            hardwareSpecRows: resolveCatalogSpecRows({
              serviceId: item.serviceId,
              templateRefId: item.templateRefId,
              templateName: item.templateName,
              instanceTypeId: item.instanceTypeId,
              instanceTypeLabel: item.instanceTypeLabel,
              diskImageLabel: item.diskImageLabel,
              diskImageId: item.diskImageId,
              hardwareOsMode: item.hardwareOsMode,
            }),
          }}
        />
      ) : isCluster ? (
        <ClusterCatalogItemDetailsBody
          variant="entity"
          content={{
            service: item.service,
            statusLabel: item.status,
            statusColor: item.status === 'Unpublished' ? 'grey' : 'green',
            rateSummary: formatRateCardSummary(item.rateCard),
            scope: item.scope,
            visibilityLabel: getVisibilityLabel(item.scope),
            createdAtLabel: formatCatalogItemCreatedAt(item.createdAt),
            clusterVersionMode: item.clusterVersionMode,
            configurationRows: resolveCatalogSpecRows(
              {
                serviceId: item.serviceId,
                templateRefId: item.templateRefId,
                templateName: item.templateName,
                instanceTypeLabel: item.instanceTypeLabel,
                diskImageLabel: item.diskImageLabel,
                diskImageId: item.diskImageId,
                clusterVersionMode: item.clusterVersionMode,
                nodeSetId: item.nodeSetId,
                nodeSetLabel: item.nodeSetLabel,
                hostTypeId: item.hostTypeId,
                hostTypeLabel: item.hostTypeLabel,
                clusterNodeTopologyMode: item.clusterNodeTopologyMode,
              },
              { includeDetails: true },
            ),
          }}
        />
      ) : (
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
                        <CatalogClusterVersionValue
                          badge={row.badge}
                          mode={item.clusterVersionMode}
                        >
                          {row.value}
                        </CatalogClusterVersionValue>
                      ) : row.badge ? (
                        <span className="catalog-spec-row-value-with-badge">
                          <span>{row.value}</span>
                          <Label color={row.badge.color} isCompact>
                            {row.badge.text}
                          </Label>
                        </span>
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
                    <DescriptionListDescription>
                      {row.badge ? (
                        <span className="catalog-spec-row-value-with-badge">
                          <span>{row.value}</span>
                          <Label color={row.badge.color} isCompact>
                            {row.badge.text}
                          </Label>
                        </span>
                      ) : (
                        row.value
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ))}
              </DescriptionList>
            </>
          ) : null}
        </div>
      </div>
      )}
    </EntityDetailsPageShell>
  )
}

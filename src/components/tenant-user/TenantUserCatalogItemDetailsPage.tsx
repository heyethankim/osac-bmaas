import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import {
  Button,
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
  resolveCatalogSpecRows,
  resolveClusterCatalogHighlightRows,
  resolveVmCatalogHighlightRows,
} from '../../catalog/catalogSpecs'
import { formatCatalogFieldPolicyMode } from '../../catalog/catalogPublishConfig'
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import { CatalogNetworkingLocksSection } from '../catalog/CatalogNetworkingLocksSection'
import { CatalogVmDefaultsSections } from '../catalog/CatalogVmDefaultsSections'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  getCatalogExternalIpPoolOptions,
  getCatalogSecurityGroupOptions,
  getCatalogSubnetOptions,
  getCatalogVirtualNetworkOptions,
} from '../../providerSetup/storage'
import { formatRateCardSummary } from '../../providerSetup/templateDemo'
import type { TenantUserCatalogCard } from '../../tenantUser/catalog'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import { resolveLaunchNetworkContext } from '../../tenantUser/launchNetworking'

type TenantUserCatalogItemDetailsPageProps = {
  catalogItem: TenantUserCatalogCard
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  preferCatalogDraft?: boolean
  onBack: () => void
  onLaunch: () => void
}

export function TenantUserCatalogItemDetailsPage({
  catalogItem,
  organization,
  catalogDraft,
  preferCatalogDraft = false,
  onBack,
  onLaunch,
}: TenantUserCatalogItemDetailsPageProps) {
  const networkContext = resolveLaunchNetworkContext(
    organization,
    catalogDraft,
    preferCatalogDraft,
    catalogItem.catalogItemId,
  )
  const specRows = resolveCatalogSpecRows(
    {
      serviceId: catalogItem.serviceId,
      templateRefId: catalogItem.templateRefId,
      templateName: catalogItem.templateName,
      instanceTypeLabel: catalogItem.instanceTypeLabel,
      diskImageLabel: catalogItem.diskImageLabel,
      diskImageId: catalogItem.diskImageId,
      clusterVersionMode: catalogItem.clusterVersionMode,
      nodeSetId: catalogItem.nodeSetId,
      nodeSetLabel: catalogItem.nodeSetLabel,
      hostTypeId: catalogItem.hostTypeId,
      hostTypeLabel: catalogItem.hostTypeLabel,
      clusterNodeTopologyMode: catalogItem.clusterNodeTopologyMode,
    },
    { includeDetails: catalogItem.serviceId !== 'baremetal' },
  )
  const isVirtualMachine = catalogItem.serviceId === 'virtual-machine'
  const isCluster = catalogItem.serviceId === 'cluster'
  const vmHighlightRows = isVirtualMachine
    ? resolveVmCatalogHighlightRows({
        serviceId: catalogItem.serviceId,
        templateRefId: catalogItem.templateRefId,
        templateName: catalogItem.templateName,
        instanceTypeLabel: catalogItem.instanceTypeLabel,
        diskImageLabel: catalogItem.diskImageLabel,
      })
    : []
  const clusterHighlightRows = isCluster
    ? resolveClusterCatalogHighlightRows({
        serviceId: catalogItem.serviceId,
        templateRefId: catalogItem.templateRefId,
        templateName: catalogItem.templateName,
        instanceTypeLabel: catalogItem.instanceTypeLabel,
        diskImageLabel: catalogItem.diskImageLabel,
        diskImageId: catalogItem.diskImageId,
        clusterVersionMode: catalogItem.clusterVersionMode,
        nodeSetId: catalogItem.nodeSetId,
        nodeSetLabel: catalogItem.nodeSetLabel,
        hostTypeId: catalogItem.hostTypeId,
        hostTypeLabel: catalogItem.hostTypeLabel,
        clusterNodeTopologyMode: catalogItem.clusterNodeTopologyMode,
      })
    : []
  const displaySpecRows =
    catalogItem.instanceTypeLabel || catalogItem.diskImageLabel || catalogItem.diskImageId
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
  const specsSectionLabel = getCatalogSpecsSectionLabel(catalogItem.serviceId)
  const description =
    catalogItem.description?.trim() ||
    (catalogItem.serviceId === 'cluster'
      ? 'Review the cluster configuration before you launch.'
      : catalogItem.serviceId === 'virtual-machine'
        ? 'Review the instance configuration before you launch.'
        : 'Review the hardware configured for this offering before you launch.')

  return (
    <EntityDetailsPageShell
      parentLabel="Catalog"
      onBack={onBack}
      title={catalogItem.displayName}
      titleId="tenant-user-catalog-item-details-title"
      description={description}
      icon={
        <Icon size="lg" isInline>
          {getCatalogServiceIcon(catalogItem.serviceId)}
        </Icon>
      }
      actions={
        <Button variant="primary" icon={<RocketIcon />} onClick={onLaunch}>
          {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
        </Button>
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
              <DescriptionListDescription>{catalogItem.service}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color="green" isCompact>
                  {catalogItem.status}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            {!isVirtualMachine && !isCluster && catalogItem.instanceTypeLabel ? (
              <DescriptionListGroup>
                <DescriptionListTerm>Instance type</DescriptionListTerm>
                <DescriptionListDescription>
                  {catalogItem.instanceTypeLabel}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ) : null}
            {!isVirtualMachine && !isCluster && catalogItem.diskImageLabel ? (
              <DescriptionListGroup>
                <DescriptionListTerm>Disk image</DescriptionListTerm>
                <DescriptionListDescription>{catalogItem.diskImageLabel}</DescriptionListDescription>
              </DescriptionListGroup>
            ) : null}
          </DescriptionList>
        </div>

        <div className="entity-details-page__column">
          {isCluster ? (
            <>
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
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
                          mode={catalogItem.clusterVersionMode}
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
                <DescriptionListGroup>
                  <DescriptionListTerm>Rate</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatRateCardSummary(catalogItem.rateCard)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </>
          ) : null}

          {catalogItem.fieldPolicies && catalogItem.fieldPolicies.length > 0 ? (
            <>
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Field policies
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Launch field policies"
              >
                {catalogItem.fieldPolicies.map((policy) => (
                  <DescriptionListGroup key={policy.id}>
                    <DescriptionListTerm>{policy.label}</DescriptionListTerm>
                    <DescriptionListDescription>
                      <span className="tenant-user-catalog__field-policy-value">
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
            <CatalogVmDefaultsSections idPrefix="tenant-user-catalog-vm" />
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

        {networkContext.enabled ? (
          <section
            className="entity-details-page__column entity-details-page__column--span-2"
            aria-label="Networking"
          >
            <CatalogNetworkingLocksSection
              idPrefix={`tenant-user-catalog-${catalogItem.catalogItemId}`}
              policy={networkContext.policy}
              lede="Locked fields are fixed for launch. Unlocked fields can be chosen when you create an instance."
              readOnly
              virtualNetworkOptions={getCatalogVirtualNetworkOptions()}
              subnetOptions={getCatalogSubnetOptions(networkContext.policy.virtualNetwork.id)}
              securityGroupOptions={getCatalogSecurityGroupOptions()}
              externalIpPoolOptions={getCatalogExternalIpPoolOptions()}
            />
          </section>
        ) : null}
      </div>
    </EntityDetailsPageShell>
  )
}

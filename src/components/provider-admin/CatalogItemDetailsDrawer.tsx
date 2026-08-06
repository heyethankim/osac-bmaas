import { useEffect, useState, type ReactNode } from 'react'
import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
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
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import { CatalogNetworkingLocksSection } from '../catalog/CatalogNetworkingLocksSection'
import { CatalogPublishScopeIcon } from './CatalogPublishScopeIcon'
import { formatVipEnterpriseVisibilityLabel, getCatalogEnterpriseTenantIds } from './VipEnterpriseOrganizationField'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  getCatalogItemNetworkPolicy,
  getCatalogItemStatus,
  getCatalogExternalIpPoolOptions,
  getCatalogSecurityGroupOptions,
  getCatalogSubnetOptions,
  getCatalogVirtualNetworkOptions,
  getProviderRegisteredOrganizations,
} from '../../providerSetup/storage'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  CATALOG_SERVICE_FILTER_LABELS,
  formatRateCardSummary,
  type CatalogServiceId,
} from '../../providerSetup/templateDemo'
import {
  resolveCatalogNetworkPolicyField,
  type CatalogNetworkPolicy,
  type CatalogNetworkResourceOption,
} from '../../providerAdmin/catalogNetworkPolicy'
import {
  getCatalogSpecsSectionLabel,
  getDraftServiceId,
  parseCatalogInstanceTypeParts,
  resolveCatalogSpecRows,
  resolveClusterCatalogHighlightRows,
  resolveVmCatalogHighlightRows,
} from '../../catalog/catalogSpecs'
import {
  formatCatalogFieldPolicyMode,
  getProvisioningTemplatePresentation,
} from '../../catalog/catalogPublishConfig'
import { findCatalogLinkedTemplate } from '../../catalog/hardwareSpecs'
import { CatalogVmDefaultsSections } from '../catalog/CatalogVmDefaultsSections'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'

type CatalogItemDetailsDrawerProps = {
  isExpanded: boolean
  onClose: () => void
  catalog: ProviderCatalogDraft | null
  serviceId: CatalogServiceId
  templateDescription: string
  onPublish?: () => void
  onLaunch?: () => void
  onNetworkPolicyChange?: (networkPolicy: CatalogNetworkPolicy) => void
  onNavigateToLinkedTemplate?: (template: {
    templateRefId: string
    templateName: string
  }) => void
  children: ReactNode
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CatalogItemDetailsDrawer({
  isExpanded,
  onClose,
  catalog,
  serviceId,
  templateDescription,
  onPublish,
  onLaunch,
  onNetworkPolicyChange,
  onNavigateToLinkedTemplate,
  children,
}: CatalogItemDetailsDrawerProps) {
  const organizations = getProviderRegisteredOrganizations()
  const scopeLabel = catalog?.scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global public'
  const isLive = catalog ? getCatalogItemStatus(catalog) === 'live' : false
  const catalogServiceId = catalog ? getDraftServiceId(catalog) : serviceId
  const isVirtualMachine = catalogServiceId === 'virtual-machine'
  const isCluster = catalogServiceId === 'cluster'
  const parsedInstanceType = catalog?.instanceTypeLabel
    ? parseCatalogInstanceTypeParts(catalog.instanceTypeLabel)
    : null
  const specRows = catalog
    ? resolveCatalogSpecRows(catalog, { includeDetails: true })
    : []
  const vmHighlightRows = catalog && isVirtualMachine ? resolveVmCatalogHighlightRows(catalog) : []
  const clusterHighlightRows =
    catalog && isCluster ? resolveClusterCatalogHighlightRows(catalog) : []
  const displaySpecRows =
    catalog?.instanceTypeLabel || catalog?.diskImageLabel
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
  const specsSectionLabel = getCatalogSpecsSectionLabel(catalogServiceId)
  const canLinkToBareMetalTemplate =
    Boolean(onNavigateToLinkedTemplate) && catalogServiceId === 'baremetal'
  const [networkPolicy, setNetworkPolicy] = useState<CatalogNetworkPolicy | null>(null)
  const [virtualNetworkOptions, setVirtualNetworkOptions] = useState<CatalogNetworkResourceOption[]>(
    () => getCatalogVirtualNetworkOptions(),
  )
  const [subnetOptions, setSubnetOptions] = useState<CatalogNetworkResourceOption[]>(() =>
    getCatalogSubnetOptions(),
  )
  const [securityGroupOptions, setSecurityGroupOptions] = useState<CatalogNetworkResourceOption[]>(
    () => getCatalogSecurityGroupOptions(),
  )
  const [externalIpPoolOptions, setExternalIpPoolOptions] = useState<CatalogNetworkResourceOption[]>(
    () => getCatalogExternalIpPoolOptions(),
  )

  useEffect(() => {
    setNetworkPolicy(catalog ? getCatalogItemNetworkPolicy(catalog) : null)
    setVirtualNetworkOptions(getCatalogVirtualNetworkOptions())
    setSecurityGroupOptions(getCatalogSecurityGroupOptions())
    setExternalIpPoolOptions(getCatalogExternalIpPoolOptions())
  }, [catalog])

  useEffect(() => {
    if (!networkPolicy?.enabled) {
      return
    }
    setSubnetOptions(getCatalogSubnetOptions(networkPolicy.virtualNetwork.id))
  }, [networkPolicy?.enabled, networkPolicy?.virtualNetwork.id])

  const updateNetworkPolicy = (next: CatalogNetworkPolicy) => {
    setNetworkPolicy(next)
    onNetworkPolicyChange?.(next)
  }

  const handleVirtualNetworkChange = (value: string, nextBase: CatalogNetworkPolicy) => {
    const nextSubnets = getCatalogSubnetOptions(value)
    setSubnetOptions(nextSubnets)
    const nextSubnetId =
      nextSubnets.find((option) => option.id === nextBase.subnet.id)?.id ??
      nextSubnets[0]?.id ??
      nextBase.subnet.id

    updateNetworkPolicy({
      ...nextBase,
      virtualNetwork: resolveCatalogNetworkPolicyField(
        virtualNetworkOptions,
        value,
        nextBase.virtualNetwork.locked,
      ),
      subnet: resolveCatalogNetworkPolicyField(
        nextSubnets,
        nextSubnetId,
        nextBase.subnet.locked,
      ),
    })
  }

  const panelContent = catalog ? (
    <DrawerPanelContent
      className="provider-admin-catalog-items__drawer-panel"
      defaultSize="28rem"
      minSize="22rem"
      focusTrap={{ enabled: true }}
    >
      <DrawerHead>
        <div className="provider-admin-catalog-items__drawer-title-row">
          <span className="provider-admin-catalog-items__drawer-icon-wrap" aria-hidden>
            <Icon size="lg" isInline>
              {getCatalogServiceIcon(serviceId)}
            </Icon>
          </span>
          <Title
            headingLevel="h2"
            size="xl"
            id="catalog-item-details-title"
            className="provider-admin-catalog-items__drawer-title"
          >
            {catalog.displayName}
          </Title>
        </div>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="provider-admin-catalog-items__drawer-body">
        <Content component="p" className="provider-admin-catalog-items__drawer-lede">
          {catalog.description?.trim() || templateDescription}
        </Content>

        {onLaunch && isLive ? (
          <Button
            variant="primary"
            icon={<RocketIcon />}
            onClick={onLaunch}
            className="provider-admin-catalog-items__drawer-launch"
          >
            {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
          </Button>
        ) : null}

        {!isLive ? (
          <div className="provider-admin-catalog-items__drawer-actions">
            <Button
              variant="secondary"
              className="provider-admin-catalog-items__drawer-action"
              onClick={onPublish}
            >
              Publish
            </Button>
          </div>
        ) : null}

        <Divider className="provider-admin-catalog-items__drawer-divider" />

        <DescriptionList
          isCompact
          className="provider-admin-catalog-items__drawer-dl"
          aria-label="Catalog item details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Service</DescriptionListTerm>
            <DescriptionListDescription>
              {CATALOG_SERVICE_FILTER_LABELS[serviceId]}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color={isLive ? 'green' : 'grey'} isCompact>
                {isLive ? 'Live' : 'Unpublished'}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Catalog item ID</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{catalog.catalogItemId}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Visibility</DescriptionListTerm>
            <DescriptionListDescription>
              <span className="provider-admin-catalog-items__scope">
                <CatalogPublishScopeIcon
                  scope={catalog.scope}
                  className="provider-admin-catalog__scope-icon"
                />
                <span>{scopeLabel}</span>
              </span>
            </DescriptionListDescription>
          </DescriptionListGroup>
          {catalog.scope === 'vip-enterprise' &&
          getCatalogEnterpriseTenantIds(catalog).length > 0 ? (
            <DescriptionListGroup>
              <DescriptionListTerm>
                {getCatalogEnterpriseTenantIds(catalog).length > 1
                  ? 'Enterprise organizations'
                  : 'Enterprise organization'}
              </DescriptionListTerm>
              <DescriptionListDescription>
                {formatVipEnterpriseVisibilityLabel(
                  organizations,
                  getCatalogEnterpriseTenantIds(catalog),
                ).replace(/^VIP enterprise · /, '')}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : catalog.scope === 'vip-enterprise' ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Enterprise organizations</DescriptionListTerm>
              <DescriptionListDescription>Restricted — unassigned</DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
        </DescriptionList>

        {isVirtualMachine && vmHighlightRows.length > 0 ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <DescriptionList
              isCompact
              className="provider-admin-catalog-items__drawer-dl"
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

        {isCluster ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <DescriptionList
              isCompact
              className="provider-admin-catalog-items__drawer-dl"
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

        {isVirtualMachine ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <CatalogVmDefaultsSections idPrefix="provider-admin-catalog-vm" />
            <Divider className="provider-admin-catalog-items__drawer-divider" />
          </>
        ) : displaySpecRows.length > 0 ? (
          <>
            {isCluster ? null : (
              <Divider className="provider-admin-catalog-items__drawer-divider" />
            )}
            <DescriptionList
              isCompact
              className="provider-admin-catalog-items__drawer-dl"
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

        {catalog.fieldPolicies && catalog.fieldPolicies.length > 0 ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <DescriptionList
              isCompact
              className="provider-admin-catalog-items__drawer-dl"
              aria-label="Launch field policies"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Field policies</DescriptionListTerm>
                <DescriptionListDescription>
                  <ul className="provider-admin-catalog-items__field-policy-list">
                    {catalog.fieldPolicies.map((policy) => (
                      <li key={policy.id}>
                        <span>{policy.label}</span>
                        <Label color={policy.mode === 'exposed' ? 'blue' : 'grey'} isCompact>
                          {formatCatalogFieldPolicyMode(policy.mode)}
                        </Label>
                      </li>
                    ))}
                  </ul>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </>
        ) : null}

        {!isVirtualMachine && !isCluster && (catalog.instanceTypeLabel || catalog.diskImageLabel) ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <DescriptionList
              isCompact
              className="provider-admin-catalog-items__drawer-dl"
              aria-label="Published hardware"
            >
              {catalog.instanceTypeLabel && parsedInstanceType ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Instance type</DescriptionListTerm>
                  <DescriptionListDescription>{catalog.instanceTypeLabel}</DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              {catalog.diskImageLabel ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Disk image</DescriptionListTerm>
                  <DescriptionListDescription>{catalog.diskImageLabel}</DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
            </DescriptionList>
          </>
        ) : null}

        <Divider className="provider-admin-catalog-items__drawer-divider" />
        <DescriptionList
          isCompact
          className="provider-admin-catalog-items__drawer-dl"
          aria-label="Catalog item publishing details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Template</DescriptionListTerm>
            <DescriptionListDescription>
              {canLinkToBareMetalTemplate && onNavigateToLinkedTemplate ? (
                <Button
                  variant="link"
                  isInline
                  className="provider-admin-catalog-items__inline-link"
                  onClick={() =>
                    onNavigateToLinkedTemplate({
                      templateRefId: catalog.templateRefId,
                      templateName: catalog.templateName,
                    })
                  }
                >
                  {
                    getProvisioningTemplatePresentation(
                      findCatalogLinkedTemplate(catalog.templateRefId, catalog.templateName),
                      catalogServiceId,
                    ).title
                  }
                </Button>
              ) : (
                getProvisioningTemplatePresentation(
                  findCatalogLinkedTemplate(catalog.templateRefId, catalog.templateName),
                  catalogServiceId,
                ).title
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Rate</DescriptionListTerm>
            <DescriptionListDescription>
              {formatRateCardSummary(catalog.rateCard)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              {formatCreatedAt(catalog.createdAt)}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        {networkPolicy ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <div className="catalog-networking-step">
              <CatalogNetworkingLocksSection
                idPrefix={`catalog-detail-${catalog.catalogItemId}`}
                policy={networkPolicy}
                lede="Locked fields cannot be changed by tenants."
                virtualNetworkOptions={virtualNetworkOptions}
                subnetOptions={subnetOptions}
                securityGroupOptions={securityGroupOptions}
                externalIpPoolOptions={externalIpPoolOptions}
                onVirtualNetworkChange={handleVirtualNetworkChange}
                onChange={updateNetworkPolicy}
              />
            </div>
          </>
        ) : null}
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer
      isExpanded={isExpanded && catalog !== null}
      position="end"
      onExpand={() => undefined}
      className="provider-admin-catalog-items__drawer"
    >
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  )
}

import { useEffect, useState } from 'react'
import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Icon,
  Label,
  MenuToggle,
  Title,
} from '@patternfly/react-core'
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import { CatalogNetworkingLocksSection } from '../catalog/CatalogNetworkingLocksSection'
import { CatalogVmDefaultsSections } from '../catalog/CatalogVmDefaultsSections'
import { CatalogPublishScopeIcon } from './CatalogPublishScopeIcon'
import {
  formatVipEnterpriseVisibilityLabel,
  getCatalogEnterpriseTenantIds,
} from './VipEnterpriseOrganizationField'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  getCatalogExternalIpPoolOptions,
  getCatalogItemNetworkPolicy,
  getCatalogItemStatus,
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
  resolveVmCatalogHighlightRows,
} from '../../catalog/catalogSpecs'
import {
  formatCatalogFieldPolicyMode,
  getProvisioningTemplatePresentation,
} from '../../catalog/catalogPublishConfig'
import { findCatalogLinkedTemplate } from '../../catalog/hardwareSpecs'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'

type CatalogItemDetailsPageProps = {
  catalog: ProviderCatalogDraft
  templateDescription: string
  onBackToCatalog: () => void
  onPublish: () => void
  onUnpublish: () => void
  onLaunch: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onNetworkPolicyChange?: (networkPolicy: CatalogNetworkPolicy) => void
  onNavigateToNetworking?: () => void
  onNavigateToLinkedTemplate?: (template: {
    templateRefId: string
    templateName: string
  }) => void
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

export function CatalogItemDetailsPage({
  catalog,
  templateDescription,
  onBackToCatalog,
  onPublish,
  onUnpublish,
  onLaunch,
  onEdit,
  onDuplicate,
  onDelete,
  onNetworkPolicyChange,
  onNavigateToNetworking,
  onNavigateToLinkedTemplate,
}: CatalogItemDetailsPageProps) {
  const organizations = getProviderRegisteredOrganizations()
  const serviceId: CatalogServiceId = getDraftServiceId(catalog)
  const scopeLabel = catalog.scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global public'
  const isLive = getCatalogItemStatus(catalog) === 'live'
  const isVirtualMachine = serviceId === 'virtual-machine'
  const isCluster = serviceId === 'cluster'
  const parsedInstanceType = catalog.instanceTypeLabel
    ? parseCatalogInstanceTypeParts(catalog.instanceTypeLabel)
    : null
  const specRows = resolveCatalogSpecRows(catalog, { includeDetails: true })
  const vmHighlightRows = isVirtualMachine ? resolveVmCatalogHighlightRows(catalog) : []
  const displaySpecRows =
    catalog.instanceTypeLabel || catalog.diskImageLabel
      ? specRows.filter((row) => {
          if (isCluster) {
            return (
              row.label !== 'Instance type' &&
              row.label !== 'Disk image' &&
              row.label !== 'Platform' &&
              row.label !== 'Size' &&
              row.label !== 'OS image'
            )
          }
          return (
            row.label !== 'Instance type' &&
            row.label !== 'Cluster size' &&
            row.label !== 'Disk image' &&
            row.label !== 'Platform' &&
            row.label !== 'Cluster version' &&
            row.label !== 'Size' &&
            row.label !== 'OS image'
          )
        })
      : isVirtualMachine
        ? specRows.filter(
            (row) =>
              row.label !== 'Instance type' &&
              row.label !== 'Size' &&
              row.label !== 'OS image',
          )
        : specRows
  const specsSectionLabel = getCatalogSpecsSectionLabel(serviceId)
  const canLinkToBareMetalTemplate =
    Boolean(onNavigateToLinkedTemplate) && serviceId === 'baremetal'
  const templatePresentation = getProvisioningTemplatePresentation(
    findCatalogLinkedTemplate(catalog.templateRefId, catalog.templateName),
    serviceId,
  )

  const [isActionsOpen, setIsActionsOpen] = useState(false)
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
    setNetworkPolicy(getCatalogItemNetworkPolicy(catalog))
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

  return (
    <div className="provider-admin-catalog-item-details">
      <Breadcrumb aria-label="Catalog item breadcrumb">
        <BreadcrumbItem to="#" onClick={(event) => {
          event.preventDefault()
          onBackToCatalog()
        }}>
          Catalog
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{catalog.displayName}</BreadcrumbItem>
      </Breadcrumb>

      <Flex
        className="provider-admin-catalog-item-details__header"
        alignItems={{ default: 'alignItemsFlexStart' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        gap={{ default: 'gapMd' }}
      >
        <FlexItem>
          <div className="provider-admin-catalog-item-details__title-row">
            <span className="provider-admin-catalog-item-details__icon-wrap" aria-hidden>
              <Icon size="lg" isInline>
                {getCatalogServiceIcon(serviceId)}
              </Icon>
            </span>
            <div>
              <Title
                headingLevel="h1"
                size="3xl"
                id="catalog-item-details-title"
                className="provider-admin-catalog-item-details__title"
              >
                {catalog.displayName}
              </Title>
              <Content component="p" className="provider-admin-catalog-item-details__lede">
                {catalog.description?.trim() || templateDescription}
              </Content>
            </div>
          </div>
        </FlexItem>
        <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
          <div className="provider-admin-catalog-item-details__actions">
            {isLive ? (
              <Button variant="primary" icon={<RocketIcon />} onClick={onLaunch}>
                {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
              </Button>
            ) : (
              <Button variant="primary" onClick={onPublish}>
                Publish
              </Button>
            )}
            <Dropdown
              isOpen={isActionsOpen}
              onOpenChange={setIsActionsOpen}
              onSelect={() => setIsActionsOpen(false)}
              popperProps={{ position: 'right' }}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  variant="secondary"
                  isExpanded={isActionsOpen}
                  onClick={() => setIsActionsOpen((open) => !open)}
                  aria-label="Actions"
                >
                  Actions
                </MenuToggle>
              )}
            >
              <DropdownList>
                <DropdownItem value="edit" onClick={onEdit}>
                  Edit
                </DropdownItem>
                <DropdownItem value="duplicate" onClick={onDuplicate}>
                  Duplicate
                </DropdownItem>
                <Divider component="li" key="separator" />
                {isLive ? (
                  <DropdownItem value="unpublish" onClick={onUnpublish}>
                    Unpublish
                  </DropdownItem>
                ) : null}
                <DropdownItem value="delete" isDanger onClick={onDelete}>
                  Delete
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </div>
        </FlexItem>
      </Flex>

      <div className="provider-admin-catalog-item-details__body">
        <Divider className="provider-admin-catalog-item-details__band-divider" />
        <section
          className="provider-admin-catalog-item-details__details-band"
          aria-label="Catalog item details"
        >
          <div className="provider-admin-catalog-item-details__columns">
            <div className="provider-admin-catalog-item-details__column">
              <Title
                headingLevel="h2"
                size="lg"
                className="provider-admin-catalog-item-details__section-title"
              >
                Overview
              </Title>
              <DescriptionList
                isCompact
                className="provider-admin-catalog-item-details__dl"
                aria-label="Catalog item overview"
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
                        {templatePresentation.title}
                      </Button>
                    ) : (
                      templatePresentation.title
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Rate</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatRateCardSummary(catalog.rateCard)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>

            <div className="provider-admin-catalog-item-details__column">
              <Title
                headingLevel="h2"
                size="lg"
                className="provider-admin-catalog-item-details__section-title"
              >
                Publishing
              </Title>
              <DescriptionList
                isCompact
                className="provider-admin-catalog-item-details__dl"
                aria-label="Catalog item publishing details"
              >
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
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatCreatedAt(catalog.createdAt)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>

              {catalog.fieldPolicies && catalog.fieldPolicies.length > 0 ? (
                <>
                  <Title
                    headingLevel="h2"
                    size="lg"
                    className="provider-admin-catalog-item-details__section-title"
                  >
                    Field policies
                  </Title>
                  <DescriptionList
                    isCompact
                    className="provider-admin-catalog-item-details__dl"
                    aria-label="Launch field policies"
                  >
                    <DescriptionListGroup>
                      <DescriptionListTerm>Policies</DescriptionListTerm>
                      <DescriptionListDescription>
                        <ul className="provider-admin-catalog-items__field-policy-list">
                          {catalog.fieldPolicies.map((policy) => (
                            <li key={policy.id}>
                              <span>{policy.label}</span>
                              <Label
                                color={policy.mode === 'exposed' ? 'blue' : 'grey'}
                                isCompact
                              >
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
            </div>

            <div
              className={`provider-admin-catalog-item-details__column provider-admin-catalog-item-details__column--config${
                networkPolicy
                  ? ' provider-admin-catalog-item-details__column--span-rows'
                  : ''
              }`}
            >
              {isVirtualMachine && vmHighlightRows.length > 0 ? (
                <>
                  <Title
                    headingLevel="h2"
                    size="md"
                    className="provider-admin-catalog-item-details__section-title provider-admin-catalog-item-details__section-title--config"
                  >
                    Instance configuration
                  </Title>
                  <DescriptionList
                    isCompact
                    className="provider-admin-catalog-item-details__dl"
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
                <CatalogVmDefaultsSections idPrefix="provider-admin-catalog-vm" />
              ) : displaySpecRows.length > 0 ? (
                <>
                  <Title
                    headingLevel="h2"
                    size="md"
                    className="provider-admin-catalog-item-details__section-title provider-admin-catalog-item-details__section-title--config"
                  >
                    {specsSectionLabel}
                  </Title>
                  <DescriptionList
                    isCompact
                    className="provider-admin-catalog-item-details__dl"
                    aria-label={specsSectionLabel}
                  >
                    {displaySpecRows.map((row) => (
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

              {!isVirtualMachine &&
              !isCluster &&
              (catalog.instanceTypeLabel || catalog.diskImageLabel) ? (
                <>
                  {displaySpecRows.length === 0 ? (
                    <Title
                      headingLevel="h2"
                      size="md"
                      className="provider-admin-catalog-item-details__section-title provider-admin-catalog-item-details__section-title--config"
                    >
                      Hardware specifications
                    </Title>
                  ) : null}
                  <DescriptionList
                    isCompact
                    className="provider-admin-catalog-item-details__dl"
                    aria-label="Published hardware"
                  >
                    {catalog.instanceTypeLabel && parsedInstanceType ? (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Instance type</DescriptionListTerm>
                        <DescriptionListDescription>
                          {catalog.instanceTypeLabel}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : null}
                    {catalog.diskImageLabel ? (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Disk image</DescriptionListTerm>
                        <DescriptionListDescription>
                          {catalog.diskImageLabel}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : null}
                  </DescriptionList>
                </>
              ) : null}
            </div>

            {networkPolicy ? (
              <section
                className="provider-admin-catalog-item-details__column provider-admin-catalog-item-details__column--span-2"
                aria-label="Networking"
              >
                <CatalogNetworkingLocksSection
                  idPrefix={`catalog-detail-${catalog.catalogItemId}`}
                  policy={networkPolicy}
                  lede="Locked fields cannot be changed by tenants."
                  ledeDescription={
                    <>
                      Create and edit network objects in{' '}
                      {onNavigateToNetworking ? (
                        <Button
                          variant="link"
                          isInline
                          className="provider-admin-catalog-items__inline-link"
                          onClick={onNavigateToNetworking}
                        >
                          Networking
                        </Button>
                      ) : (
                        'Networking'
                      )}
                      .
                    </>
                  }
                  virtualNetworkOptions={virtualNetworkOptions}
                  subnetOptions={subnetOptions}
                  securityGroupOptions={securityGroupOptions}
                  externalIpPoolOptions={externalIpPoolOptions}
                  onVirtualNetworkChange={handleVirtualNetworkChange}
                  onChange={updateNetworkPolicy}
                />
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

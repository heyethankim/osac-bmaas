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
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Icon,
  Label,
  Switch,
  Title,
} from '@patternfly/react-core'
import { CatalogPublishScopeIcon } from './CatalogPublishScopeIcon'
import { NetworkFieldLockButton } from '../catalog/NetworkFieldLockButton'
import { formatVipEnterpriseVisibilityLabel, getCatalogEnterpriseTenantIds } from './VipEnterpriseOrganizationField'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
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
  getCatalogNetworkOptionLabel,
  resolveCatalogNetworkPolicyField,
  type CatalogNetworkPolicy,
  type CatalogNetworkResourceOption,
} from '../../providerAdmin/catalogNetworkPolicy'
import {
  getCatalogProfileFieldLabel,
  getCatalogSpecsSectionLabel,
  getDraftServiceId,
  resolveCatalogSpecRows,
} from '../../catalog/catalogSpecs'
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
  const specRows = catalog
    ? resolveCatalogSpecRows(catalog, { includeDetails: true })
    : []
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

  useEffect(() => {
    setNetworkPolicy(catalog ? getCatalogItemNetworkPolicy(catalog) : null)
    setVirtualNetworkOptions(getCatalogVirtualNetworkOptions())
    setSecurityGroupOptions(getCatalogSecurityGroupOptions())
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

  const handleVirtualNetworkChange = (value: string) => {
    if (!networkPolicy) {
      return
    }

    const nextSubnets = getCatalogSubnetOptions(value)
    setSubnetOptions(nextSubnets)
    const nextSubnetId =
      nextSubnets.find((option) => option.id === networkPolicy.subnet.id)?.id ??
      nextSubnets[0]?.id ??
      networkPolicy.subnet.id

    updateNetworkPolicy({
      ...networkPolicy,
      virtualNetwork: resolveCatalogNetworkPolicyField(
        virtualNetworkOptions,
        value,
        networkPolicy.virtualNetwork.locked,
      ),
      subnet: resolveCatalogNetworkPolicyField(
        nextSubnets,
        nextSubnetId,
        networkPolicy.subnet.locked,
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

        {onLaunch ? (
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

        {isVirtualMachine ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <CatalogVmDefaultsSections idPrefix="provider-admin-catalog-vm" />
            <Divider className="provider-admin-catalog-items__drawer-divider" />
          </>
        ) : specRows.length > 0 ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <DescriptionList
              isCompact
              className="provider-admin-catalog-items__drawer-dl"
              aria-label={specsSectionLabel}
            >
              {specRows.map((row) => (
                <DescriptionListGroup key={row.label}>
                  <DescriptionListTerm>{row.label}</DescriptionListTerm>
                  <DescriptionListDescription>{row.value}</DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
          </>
        ) : null}

        <DescriptionList
          isCompact
          className="provider-admin-catalog-items__drawer-dl"
          aria-label="Catalog item publishing details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>
              {getCatalogProfileFieldLabel(catalogServiceId)}
            </DescriptionListTerm>
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
                  {catalog.templateName}
                </Button>
              ) : (
                catalog.templateName
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
            <div className="provider-admin-catalog-items__drawer-network-header">
              <div>
                <Content
                  component="p"
                  className="provider-admin-catalog-items__drawer-section-title"
                >
                  Networking
                </Content>
                <Content
                  component="p"
                  className="provider-admin-catalog-items__drawer-section-lede"
                >
                  Turn on to set defaults for this offering. Locked fields cannot be changed by
                  tenant admins.
                </Content>
              </div>
              <Switch
                id={`catalog-detail-network-enabled-${catalog.catalogItemId}`}
                label={networkPolicy.enabled ? 'On' : 'Off'}
                aria-label="Networking"
                hasCheckIcon
                isChecked={networkPolicy.enabled}
                onChange={(_event, checked) =>
                  updateNetworkPolicy({
                    ...networkPolicy,
                    enabled: checked,
                  })
                }
              />
            </div>
            {networkPolicy.enabled ? (
              <Form
                autoComplete="off"
                className="provider-admin-catalog-items__drawer-network-form"
              >
                <div className="provider-admin-catalog-items__drawer-network-field">
                  <FormGroup
                    label="Virtual network"
                    fieldId={`catalog-detail-vnet-${catalog.catalogItemId}`}
                    className="provider-admin-catalog-items__drawer-network-field-group"
                  >
                    <FormSelect
                      id={`catalog-detail-vnet-${catalog.catalogItemId}`}
                      value={networkPolicy.virtualNetwork.id}
                      isDisabled={networkPolicy.virtualNetwork.locked}
                      onChange={(_event, value) => handleVirtualNetworkChange(value)}
                      aria-label="Virtual network"
                    >
                      {virtualNetworkOptions.map((option) => (
                        <FormSelectOption
                          key={option.id}
                          value={option.id}
                          label={getCatalogNetworkOptionLabel(option)}
                        />
                      ))}
                    </FormSelect>
                  </FormGroup>
                  <NetworkFieldLockButton
                    isLocked={networkPolicy.virtualNetwork.locked}
                    aria-label="Lock virtual network for tenant admins"
                    lockTooltip="Lock value — unlock to change"
                    unlockTooltip="Unlock to change this value"
                    onToggle={(locked) =>
                      updateNetworkPolicy({
                        ...networkPolicy,
                        virtualNetwork: {
                          ...networkPolicy.virtualNetwork,
                          locked,
                        },
                      })
                    }
                  />
                </div>
                <div className="provider-admin-catalog-items__drawer-network-field">
                  <FormGroup
                    label="Subnet"
                    fieldId={`catalog-detail-subnet-${catalog.catalogItemId}`}
                    className="provider-admin-catalog-items__drawer-network-field-group"
                  >
                    <FormSelect
                      id={`catalog-detail-subnet-${catalog.catalogItemId}`}
                      value={networkPolicy.subnet.id}
                      isDisabled={networkPolicy.subnet.locked}
                      onChange={(_event, value) =>
                        updateNetworkPolicy({
                          ...networkPolicy,
                          subnet: resolveCatalogNetworkPolicyField(
                            subnetOptions,
                            value,
                            networkPolicy.subnet.locked,
                          ),
                        })
                      }
                      aria-label="Subnet"
                    >
                      {subnetOptions.map((option) => (
                        <FormSelectOption
                          key={option.id}
                          value={option.id}
                          label={getCatalogNetworkOptionLabel(option)}
                        />
                      ))}
                    </FormSelect>
                  </FormGroup>
                  <NetworkFieldLockButton
                    isLocked={networkPolicy.subnet.locked}
                    aria-label="Lock subnet for tenant admins"
                    lockTooltip="Lock value — unlock to change"
                    unlockTooltip="Unlock to change this value"
                    onToggle={(locked) =>
                      updateNetworkPolicy({
                        ...networkPolicy,
                        subnet: { ...networkPolicy.subnet, locked },
                      })
                    }
                  />
                </div>
                <div className="provider-admin-catalog-items__drawer-network-field">
                  <FormGroup
                    label="Security group"
                    fieldId={`catalog-detail-sg-${catalog.catalogItemId}`}
                    className="provider-admin-catalog-items__drawer-network-field-group"
                  >
                    <FormSelect
                      id={`catalog-detail-sg-${catalog.catalogItemId}`}
                      value={networkPolicy.securityGroup.id}
                      isDisabled={networkPolicy.securityGroup.locked}
                      onChange={(_event, value) =>
                        updateNetworkPolicy({
                          ...networkPolicy,
                          securityGroup: resolveCatalogNetworkPolicyField(
                            securityGroupOptions,
                            value,
                            networkPolicy.securityGroup.locked,
                          ),
                        })
                      }
                      aria-label="Security group"
                    >
                      {securityGroupOptions.map((option) => (
                        <FormSelectOption
                          key={option.id}
                          value={option.id}
                          label={getCatalogNetworkOptionLabel(option)}
                        />
                      ))}
                    </FormSelect>
                  </FormGroup>
                  <NetworkFieldLockButton
                    isLocked={networkPolicy.securityGroup.locked}
                    aria-label="Lock security group for tenant admins"
                    lockTooltip="Lock value — unlock to change"
                    unlockTooltip="Unlock to change this value"
                    onToggle={(locked) =>
                      updateNetworkPolicy({
                        ...networkPolicy,
                        securityGroup: {
                          ...networkPolicy.securityGroup,
                          locked,
                        },
                      })
                    }
                  />
                </div>
              </Form>
            ) : null}
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

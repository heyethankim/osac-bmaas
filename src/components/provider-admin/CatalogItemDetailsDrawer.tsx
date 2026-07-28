import { useEffect, useState, type ReactNode } from 'react'
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
import { formatVipEnterpriseVisibilityLabel } from './VipEnterpriseOrganizationField'
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
import { resolveHardwareSpecsForCatalogItem } from '../../catalog/hardwareSpecs'

type CatalogItemDetailsDrawerProps = {
  isExpanded: boolean
  onClose: () => void
  catalog: ProviderCatalogDraft | null
  serviceId: CatalogServiceId
  templateDescription: string
  canAssign: boolean
  onAssignToOrganization: () => void
  onPublish?: () => void
  onNetworkPolicyChange?: (networkPolicy: CatalogNetworkPolicy) => void
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
  canAssign,
  onAssignToOrganization,
  onPublish,
  onNetworkPolicyChange,
  children,
}: CatalogItemDetailsDrawerProps) {
  const organizations = getProviderRegisteredOrganizations()
  const scopeLabel = catalog?.scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global public'
  const isLive = catalog ? getCatalogItemStatus(catalog) === 'live' : false
  const hardwareSpecs = catalog ? resolveHardwareSpecsForCatalogItem(catalog) : null
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

        {!isLive ? (
          <div className="provider-admin-catalog-items__drawer-actions">
            <Button
              variant="primary"
              className="provider-admin-catalog-items__drawer-action"
              onClick={onPublish}
            >
              Publish
            </Button>
          </div>
        ) : catalog.scope === 'global-public' ? null : (
          <div className="provider-admin-catalog-items__drawer-actions">
            <Button
              variant="primary"
              className="provider-admin-catalog-items__drawer-action"
              isDisabled={!canAssign}
              onClick={onAssignToOrganization}
            >
              Assign to organization
            </Button>
          </div>
        )}

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
          {catalog.scope === 'vip-enterprise' && catalog.enterpriseTenantId ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Enterprise organization</DescriptionListTerm>
              <DescriptionListDescription>
                {formatVipEnterpriseVisibilityLabel(organizations, catalog.enterpriseTenantId).replace(
                  /^VIP enterprise · /,
                  '',
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : catalog.scope === 'vip-enterprise' ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Enterprise organization</DescriptionListTerm>
              <DescriptionListDescription>Restricted — unassigned</DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
        </DescriptionList>

        {hardwareSpecs ? (
          <>
            <Divider className="provider-admin-catalog-items__drawer-divider" />
            <DescriptionList
              isCompact
              className="provider-admin-catalog-items__drawer-dl"
              aria-label="Hardware specifications"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>CPU</DescriptionListTerm>
                <DescriptionListDescription>{hardwareSpecs.cpu}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>RAM</DescriptionListTerm>
                <DescriptionListDescription>{hardwareSpecs.ram}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>GPU</DescriptionListTerm>
                <DescriptionListDescription>{hardwareSpecs.gpu}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>OS image</DescriptionListTerm>
                <DescriptionListDescription>{hardwareSpecs.osImage}</DescriptionListDescription>
              </DescriptionListGroup>
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
            <DescriptionListTerm>Linked template</DescriptionListTerm>
            <DescriptionListDescription>{catalog.templateName}</DescriptionListDescription>
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

import type { ReactNode } from 'react'
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
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  getCatalogSpecsSectionLabel,
  resolveCatalogSpecRows,
  resolveClusterCatalogHighlightRows,
  resolveVmCatalogHighlightRows,
} from '../../catalog/catalogSpecs'
import { formatCatalogFieldPolicyMode } from '../../catalog/catalogPublishConfig'
import { CatalogExternalIpPoolSection } from '../catalog/CatalogExternalIpPoolSection'
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import { CatalogNetworkingLocksSection } from '../catalog/CatalogNetworkingLocksSection'
import { CatalogVmDefaultsSections } from '../catalog/CatalogVmDefaultsSections'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { getProviderExternalIpPools } from '../../providerSetup/storage'
import { formatRateCardSummary } from '../../providerSetup/templateDemo'
import type { TenantUserCatalogCard } from '../../tenantUser/catalog'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import { resolveLaunchNetworkContext } from '../../tenantUser/launchNetworking'

type TenantUserCatalogItemDetailsDrawerProps = {
  isExpanded: boolean
  onClose: () => void
  catalogItem: TenantUserCatalogCard | null
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  preferCatalogDraft?: boolean
  onLaunch: () => void
  children: ReactNode
}

export function TenantUserCatalogItemDetailsDrawer({
  isExpanded,
  onClose,
  catalogItem,
  organization,
  catalogDraft,
  preferCatalogDraft = false,
  onLaunch,
  children,
}: TenantUserCatalogItemDetailsDrawerProps) {
  const networkContext = catalogItem
    ? resolveLaunchNetworkContext(
        organization,
        catalogDraft,
        preferCatalogDraft,
        catalogItem.catalogItemId,
      )
    : null
  const specRows = catalogItem
    ? resolveCatalogSpecRows(
        {
          serviceId: catalogItem.serviceId,
          templateRefId: catalogItem.templateRefId,
          templateName: catalogItem.templateName,
          instanceTypeLabel: catalogItem.instanceTypeLabel,
          diskImageLabel: catalogItem.diskImageLabel,
        },
        { includeDetails: catalogItem.serviceId !== 'baremetal' },
      )
    : []
  const isVirtualMachine = catalogItem?.serviceId === 'virtual-machine'
  const isCluster = catalogItem?.serviceId === 'cluster'
  const vmHighlightRows = catalogItem
    ? resolveVmCatalogHighlightRows({
        serviceId: catalogItem.serviceId,
        templateRefId: catalogItem.templateRefId,
        templateName: catalogItem.templateName,
        instanceTypeLabel: catalogItem.instanceTypeLabel,
        diskImageLabel: catalogItem.diskImageLabel,
      })
    : []
  const clusterHighlightRows = catalogItem
    ? resolveClusterCatalogHighlightRows({
        serviceId: catalogItem.serviceId,
        templateRefId: catalogItem.templateRefId,
        templateName: catalogItem.templateName,
        instanceTypeLabel: catalogItem.instanceTypeLabel,
        diskImageLabel: catalogItem.diskImageLabel,
      })
    : []
  const displaySpecRows =
    catalogItem?.instanceTypeLabel || catalogItem?.diskImageLabel
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
      : catalogItem?.serviceId === 'virtual-machine'
        ? specRows.filter(
            (row) =>
              row.label !== 'Instance type' &&
              row.label !== 'Size' &&
              row.label !== 'OS image',
          )
        : isCluster
          ? specRows.filter((row) => row.label !== 'Cluster version' && row.label !== 'Cluster size')
          : specRows
  const specsSectionLabel = catalogItem
    ? getCatalogSpecsSectionLabel(catalogItem.serviceId)
    : 'Hardware specifications'

  const panelContent = catalogItem ? (
    <DrawerPanelContent
      className="tenant-user-catalog__drawer-panel"
      defaultSize="28rem"
      minSize="22rem"
      focusTrap={{ enabled: true }}
    >
      <DrawerHead>
        <div className="tenant-user-catalog__drawer-title-row">
          <span className="tenant-user-catalog__drawer-icon-wrap" aria-hidden>
            <Icon size="lg" isInline>
              {getCatalogServiceIcon(catalogItem.serviceId)}
            </Icon>
          </span>
          <Title
            headingLevel="h2"
            size="xl"
            id="tenant-user-catalog-item-details-title"
            className="tenant-user-catalog__drawer-title"
          >
            {catalogItem.displayName}
          </Title>
        </div>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="tenant-user-catalog__drawer-body">
        <Button
          variant="primary"
          icon={<RocketIcon />}
          onClick={onLaunch}
          className="tenant-user-catalog__drawer-launch"
        >
          {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
        </Button>

        <Content component="p" className="tenant-user-catalog__drawer-lede">
          {catalogItem.description?.trim() ||
            (catalogItem.serviceId === 'cluster'
              ? 'Review the cluster configuration before you launch.'
              : catalogItem.serviceId === 'virtual-machine'
                ? 'Review the instance configuration before you launch.'
                : 'Review the hardware configured for this offering before you launch.')}
        </Content>

        <Divider className="tenant-user-catalog__drawer-divider" />

        <DescriptionList
          isCompact
          className="tenant-user-catalog__drawer-dl"
          aria-label="Catalog item details"
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
          {isVirtualMachine
            ? vmHighlightRows.map((row) => (
                <DescriptionListGroup key={row.label}>
                  <DescriptionListTerm>{row.label}</DescriptionListTerm>
                  <DescriptionListDescription>{row.value}</DescriptionListDescription>
                </DescriptionListGroup>
              ))
            : null}
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

        {isCluster ? (
          <>
            <Divider className="tenant-user-catalog__drawer-divider" />
            <DescriptionList
              isCompact
              className="tenant-user-catalog__drawer-dl"
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
            <Divider className="tenant-user-catalog__drawer-divider" />
            <DescriptionList
              isCompact
              className="tenant-user-catalog__drawer-dl"
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

        {isVirtualMachine ? (
          <>
            <Divider className="tenant-user-catalog__drawer-divider" />
            <CatalogVmDefaultsSections idPrefix="tenant-user-catalog-vm" />
          </>
        ) : displaySpecRows.length > 0 ? (
          <>
            {isCluster ? null : (
              <Divider className="tenant-user-catalog__drawer-divider" />
            )}
            <DescriptionList
              isCompact
              className="tenant-user-catalog__drawer-dl"
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

        {networkContext?.enabled ? (
          <>
            <Divider className="tenant-user-catalog__drawer-divider" />
            <div className="catalog-networking-step">
              <CatalogNetworkingLocksSection
                idPrefix={`tenant-user-catalog-${catalogItem.catalogItemId}`}
                policy={networkContext.policy}
                lede="Locked fields are fixed for launch. Unlocked fields can be chosen when you create an instance."
                readOnly
              />
              <CatalogExternalIpPoolSection
                idPrefix={`tenant-user-catalog-${catalogItem.catalogItemId}`}
                policy={networkContext.policy.externalIpPool}
                pools={getProviderExternalIpPools()}
                readOnly
                showDivider
              />
            </div>
          </>
        ) : null}
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

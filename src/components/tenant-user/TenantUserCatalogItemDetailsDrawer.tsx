import type { ReactNode } from 'react'
import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
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
  getCatalogProfileFieldLabel,
  getCatalogSpecsSectionLabel,
  resolveCatalogSpecRows,
} from '../../catalog/catalogSpecs'
import type { TenantUserCatalogCard } from '../../tenantUser/catalog'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import type { LaunchNetworkContext } from '../../tenantUser/launchNetworking'

type TenantUserCatalogItemDetailsDrawerProps = {
  isExpanded: boolean
  onClose: () => void
  catalogItem: TenantUserCatalogCard | null
  networkContext: LaunchNetworkContext
  onLaunch: () => void
  children: ReactNode
}

export function TenantUserCatalogItemDetailsDrawer({
  isExpanded,
  onClose,
  catalogItem,
  networkContext,
  onLaunch,
  children,
}: TenantUserCatalogItemDetailsDrawerProps) {
  const specRows = catalogItem
    ? resolveCatalogSpecRows(
        {
          serviceId: catalogItem.serviceId,
          templateRefId: catalogItem.templateRefId,
          templateName: catalogItem.templateName,
        },
        { includeDetails: catalogItem.serviceId !== 'baremetal' },
      )
    : []
  const specsSectionLabel = catalogItem
    ? getCatalogSpecsSectionLabel(catalogItem.serviceId)
    : 'Hardware specifications'
  const profileLabel = catalogItem
    ? getCatalogProfileFieldLabel(catalogItem.serviceId)
    : 'Linked template'

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
              ? 'Review the cluster configuration and networking before you launch.'
              : catalogItem.serviceId === 'virtual-machine'
                ? 'Review the instance configuration and networking before you launch.'
                : 'Review the hardware and networking configured for this offering before you launch.')}
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
          <DescriptionListGroup>
            <DescriptionListTerm>{profileLabel}</DescriptionListTerm>
            <DescriptionListDescription>{catalogItem.templateName}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        {specRows.length > 0 ? (
          <>
            <Divider className="tenant-user-catalog__drawer-divider" />
            <DescriptionList
              isCompact
              className="tenant-user-catalog__drawer-dl"
              aria-label={specsSectionLabel}
            >
              {specRows.map((row) => (
                <DescriptionListGroup key={row.label}>
                  <DescriptionListTerm>{row.label}</DescriptionListTerm>
                  <DescriptionListDescription>{row.value}</DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          </>
        ) : null}

        <Divider className="tenant-user-catalog__drawer-divider" />

        <div className="tenant-user-catalog__drawer-section">
          <Content component="p" className="tenant-user-catalog__drawer-section-title">
            Networking
          </Content>
          {!networkContext.enabled ? (
            <Content component="p" className="tenant-user-catalog__drawer-section-lede">
              Networking is off for this catalog item.
            </Content>
          ) : (
            <>
              <Content component="p" className="tenant-user-catalog__drawer-section-lede">
                Network placement set for your organization. Locked values cannot be changed at
                launch.
              </Content>
              <DescriptionList
                isCompact
                className="tenant-user-catalog__drawer-dl"
                aria-label="Networking configuration"
              >
                {networkContext.fields.map((field) => (
                  <DescriptionListGroup key={field.kind}>
                    <DescriptionListTerm>
                      <span className="tenant-user-catalog__drawer-network-term">
                        <span>{field.label}</span>
                        {field.locked ? (
                          <Label color="grey" isCompact icon={<LockIcon />}>
                            Locked
                          </Label>
                        ) : (
                          <Label color="blue" isCompact>
                            Selectable at launch
                          </Label>
                        )}
                      </span>
                    </DescriptionListTerm>
                    <DescriptionListDescription>{field.value}</DescriptionListDescription>
                  </DescriptionListGroup>
                ))}
              </DescriptionList>
            </>
          )}
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

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
  FormSelect,
  FormSelectOption,
  Icon,
  Label,
  Title,
} from '@patternfly/react-core'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  TENANT_CATALOG_MANAGER_DEMO,
  type TenantCatalogGovernanceItemWithNetworking,
} from '../../tenantAdmin/catalogManager'
import {
  getTenantCatalogNetworkFieldSummaries,
  getTenantNetworkResourceMeta,
  type TenantNetworkResourceKind,
} from '../../tenantAdmin/networking'

type TenantCatalogItemDetailsDrawerProps = {
  isExpanded: boolean
  onClose: () => void
  item: TenantCatalogGovernanceItemWithNetworking | null
  authorizedTeams: string[]
  onNavigateToProjectsTeams: () => void
  onChangeNetworkField: (kind: TenantNetworkResourceKind, optionId: string) => void
  children: ReactNode
}

export function TenantCatalogItemDetailsDrawer({
  isExpanded,
  onClose,
  item,
  authorizedTeams,
  onNavigateToProjectsTeams,
  onChangeNetworkField,
  children,
}: TenantCatalogItemDetailsDrawerProps) {
  const networkFields = item ? getTenantCatalogNetworkFieldSummaries(item.networkPolicy) : []
  const virtualNetworkId = item?.networkPolicy.virtualNetwork.id

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
          Review provider-configured hardware and networking for this offering, and manage
          authorized teams.
        </Content>

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
        </DescriptionList>

        <Divider className="tenant-admin-catalog-manager__drawer-divider" />

        <DescriptionList
          isCompact
          className="tenant-admin-catalog-manager__drawer-dl"
          aria-label="Hardware specifications"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>CPU</DescriptionListTerm>
            <DescriptionListDescription>{item.cpu}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>RAM</DescriptionListTerm>
            <DescriptionListDescription>{item.ram}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>GPU</DescriptionListTerm>
            <DescriptionListDescription>{item.gpu}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>OS image</DescriptionListTerm>
            <DescriptionListDescription>{item.osImage}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <Divider className="tenant-admin-catalog-manager__drawer-divider" />

        <div className="tenant-admin-catalog-manager__drawer-section">
          <Content component="p" className="tenant-admin-catalog-manager__drawer-section-title">
            {TENANT_CATALOG_MANAGER_DEMO.networkingLabel}
          </Content>
          {!item.networkPolicy.enabled ? (
            <Content component="p" className="tenant-admin-catalog-manager__drawer-section-lede">
              Networking is off for this catalog item. Provider has not enabled network defaults.
            </Content>
          ) : (
            <>
              <Content component="p" className="tenant-admin-catalog-manager__drawer-section-lede">
                {TENANT_CATALOG_MANAGER_DEMO.networkingSectionLede}
              </Content>
              <DescriptionList
                isCompact
                className="tenant-admin-catalog-manager__drawer-dl"
                aria-label="Networking configuration"
              >
                {networkFields.map((field) => {
                  const meta = getTenantNetworkResourceMeta(field.kind, virtualNetworkId)

                  return (
                    <DescriptionListGroup key={field.kind}>
                      <DescriptionListTerm>
                        <span className="tenant-admin-catalog-manager__drawer-network-term">
                          <span>{field.label}</span>
                          {field.locked ? (
                            <Label color="grey" isCompact icon={<LockIcon />}>
                              Locked
                            </Label>
                          ) : null}
                        </span>
                      </DescriptionListTerm>
                      <DescriptionListDescription>
                        {field.locked ? (
                          field.value
                        ) : (
                          <FormSelect
                            id={`tenant-catalog-network-${field.kind}`}
                            className="tenant-admin-catalog-manager__drawer-network-select"
                            value={field.selectedId}
                            aria-label={field.label}
                            onChange={(_event, value) => onChangeNetworkField(field.kind, value)}
                          >
                            {meta.options.map((option) => (
                              <FormSelectOption
                                key={option.id}
                                value={option.id}
                                label={`${option.name} · ${option.detail}`}
                              />
                            ))}
                          </FormSelect>
                        )}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  )
                })}
              </DescriptionList>
            </>
          )}
        </div>

        <Divider className="tenant-admin-catalog-manager__drawer-divider" />

        <div className="tenant-admin-catalog-manager__drawer-section">
          <Content component="p" className="tenant-admin-catalog-manager__drawer-section-title">
            {TENANT_CATALOG_MANAGER_DEMO.authorizedTeamsLabel}
          </Content>
          {authorizedTeams.length > 0 ? (
            <div className="tenant-admin-catalog-manager__drawer-team-list">
              {authorizedTeams.map((teamName) => (
                <Label key={teamName} color="teal" isCompact>
                  {teamName}
                </Label>
              ))}
            </div>
          ) : null}
          <Button variant="link" isInline onClick={onNavigateToProjectsTeams}>
            {TENANT_CATALOG_MANAGER_DEMO.addProjectTeamsLinkLabel}
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

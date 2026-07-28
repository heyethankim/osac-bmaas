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
  Label,
  Title,
} from '@patternfly/react-core'
import { getOsImageLabel } from '../../providerAdmin/osImageLabels'
import {
  getBmaasTemplateStatus,
  getTemplateNetworkDefaults,
  type BmaasTemplateStatus,
} from '../../providerAdmin/bmaasTemplates'
import {
  formatRateCardSummary,
  getHardwareProfileLabel,
  getSwitchPortProfileLabel,
  resolveRateCard,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'
import { resolveHardwareSpecsFromTemplate } from '../../catalog/hardwareSpecs'
import { getProviderCatalogItems, getProviderSavedTemplates } from '../../providerSetup/storage'

type BmaasTemplateDetailsDrawerProps = {
  isExpanded: boolean
  template: SavedMasterTemplate | null
  onClose: () => void
  onEdit?: () => void
  onPublish?: () => void
  isPublishing?: boolean
  children: ReactNode
}

function statusLabel(status: BmaasTemplateStatus): { color: 'green' | 'grey'; text: string } {
  if (status === 'published') {
    return { color: 'green', text: 'Published' }
  }
  if (status === 'private') {
    return { color: 'grey', text: 'Private' }
  }
  return { color: 'grey', text: 'Draft' }
}

export function BmaasTemplateDetailsDrawer({
  isExpanded,
  template,
  onClose,
  onEdit,
  onPublish,
  isPublishing = false,
  children,
}: BmaasTemplateDetailsDrawerProps) {
  const status = template
    ? getBmaasTemplateStatus(template, getProviderSavedTemplates(), getProviderCatalogItems())
    : null
  const statusMeta = status ? statusLabel(status) : null
  const network = template ? getTemplateNetworkDefaults(template.hardwareProfileId) : null
  const hardwareSpecs = template ? resolveHardwareSpecsFromTemplate(template) : null
  const canPublish = Boolean(status && status !== 'published' && !isPublishing)

  const panelContent = template ? (
    <DrawerPanelContent
      className="provider-admin-bmaas-templates__drawer-panel"
      defaultSize="28rem"
      minSize="22rem"
      focusTrap={{ enabled: true }}
    >
      <DrawerHead>
        <Title
          headingLevel="h2"
          size="xl"
          id="bmaas-template-details-title"
          className="provider-admin-bmaas-templates__drawer-title"
        >
          {template.templateName}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="provider-admin-bmaas-templates__drawer-body">
        <Content component="p" className="provider-admin-bmaas-templates__drawer-lede">
          {template.description.trim() ||
            'Private master template for Bare Metal catalog offerings.'}
        </Content>

        {onEdit || onPublish ? (
          <div className="provider-admin-bmaas-templates__drawer-actions">
            {onEdit ? (
              <Button
                variant="secondary"
                className="provider-admin-bmaas-templates__drawer-action"
                onClick={onEdit}
              >
                Edit template
              </Button>
            ) : null}
            {onPublish ? (
              <Button
                variant="primary"
                className="provider-admin-bmaas-templates__drawer-action"
                isDisabled={!canPublish}
                onClick={onPublish}
              >
                Publish to catalog
              </Button>
            ) : null}
          </div>
        ) : null}

        <Divider className="provider-admin-bmaas-templates__drawer-divider" />

        <DescriptionList
          isCompact
          className="provider-admin-bmaas-templates__drawer-dl"
          aria-label="Template identity"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              {statusMeta ? (
                <Label color={statusMeta.color} isCompact>
                  {statusMeta.text}
                </Label>
              ) : null}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Template ID</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{template.templateRefId}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Rate card</DescriptionListTerm>
            <DescriptionListDescription>
              {formatRateCardSummary(resolveRateCard(template))}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        {hardwareSpecs ? (
          <>
            <Divider className="provider-admin-bmaas-templates__drawer-divider" />
            <Content component="p" className="provider-admin-bmaas-templates__drawer-section-title">
              Hardware &amp; image
            </Content>
            <DescriptionList
              isCompact
              className="provider-admin-bmaas-templates__drawer-dl"
              aria-label="Hardware and image"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Hardware profile</DescriptionListTerm>
                <DescriptionListDescription>
                  {getHardwareProfileLabel(template.hardwareProfileId)}
                </DescriptionListDescription>
              </DescriptionListGroup>
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
                <DescriptionListDescription>
                  {getOsImageLabel(template.osImageId)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </>
        ) : null}

        {network ? (
          <>
            <Divider className="provider-admin-bmaas-templates__drawer-divider" />
            <Content component="p" className="provider-admin-bmaas-templates__drawer-section-title">
              Network defaults
            </Content>
            <DescriptionList
              isCompact
              className="provider-admin-bmaas-templates__drawer-dl"
              aria-label="Network defaults"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Subnet CIDR</DescriptionListTerm>
                <DescriptionListDescription>{network.subnetCidr}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>VLAN ID</DescriptionListTerm>
                <DescriptionListDescription>{network.vlanId}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Default gateway</DescriptionListTerm>
                <DescriptionListDescription>{network.defaultGateway}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>MTU</DescriptionListTerm>
                <DescriptionListDescription>{network.mtu}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Switch port profile</DescriptionListTerm>
                <DescriptionListDescription>
                  {getSwitchPortProfileLabel(network.switchPortProfile)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </>
        ) : null}
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer
      isExpanded={isExpanded && template !== null}
      position="end"
      onExpand={() => undefined}
      className="provider-admin-bmaas-templates__drawer"
    >
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  )
}

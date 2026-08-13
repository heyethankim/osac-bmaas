import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from '@patternfly/react-core'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import { getOsImageLabel } from '../../providerAdmin/osImageLabels'
import {
  getBmaasTemplateStatus,
  getTemplateNetworkDefaults,
  isClusterTemplate,
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

type BmaasTemplateDetailsPageProps = {
  template: SavedMasterTemplate
  onBack: () => void
  onEdit?: () => void
  onPublish?: () => void
  isPublishing?: boolean
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

export function BmaasTemplateDetailsPage({
  template,
  onBack,
  onEdit,
  onPublish,
  isPublishing = false,
}: BmaasTemplateDetailsPageProps) {
  const status = getBmaasTemplateStatus(template, getProviderSavedTemplates(), getProviderCatalogItems())
  const statusMeta = statusLabel(status)
  const network = getTemplateNetworkDefaults(template.hardwareProfileId)
  const hardwareSpecs = resolveHardwareSpecsFromTemplate(template)
  const canPublish = Boolean(status !== 'published' && !isPublishing)
  const isCluster = isClusterTemplate(template)
  const linkedCatalog = getProviderCatalogItems().find(
    (item) => item.templateRefId === template.templateRefId,
  )

  return (
    <EntityDetailsPageShell
      parentLabel="Profiles & templates"
      onBack={onBack}
      title={template.templateName}
      titleId="bmaas-template-details-title"
      description={
        template.description.trim() ||
        (isCluster
          ? 'Cluster profile used when publishing OpenShift catalog offerings.'
          : 'Private master template for Bare Metal catalog offerings.')
      }
      actions={
        !isCluster && (onEdit || onPublish) ? (
          <>
            {onEdit ? (
              <Button variant="secondary" onClick={onEdit}>
                Edit template
              </Button>
            ) : null}
            {onPublish ? (
              <Button variant="primary" isDisabled={!canPublish} onClick={onPublish}>
                Create catalog item
              </Button>
            ) : null}
          </>
        ) : undefined
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
            aria-label="Template identity"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color={statusMeta.color} isCompact>
                  {statusMeta.text}
                </Label>
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
        </div>

        {isCluster ? (
          <div className="entity-details-page__column">
            <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
              Cluster defaults
            </Title>
            <DescriptionList
              isCompact
              className="entity-details-page__dl"
              aria-label="Cluster defaults"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Suggested catalog item</DescriptionListTerm>
                <DescriptionListDescription>
                  {template.suggestedDisplayName}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Cluster version</DescriptionListTerm>
                <DescriptionListDescription>
                  {linkedCatalog?.diskImageLabel ?? 'OpenShift 4.19'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Instance type</DescriptionListTerm>
                <DescriptionListDescription>
                  {linkedCatalog?.instanceTypeLabel ?? 'OpenShift small'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>
        ) : (
          <div className="entity-details-page__column">
            <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
              Hardware &amp; image
            </Title>
            <DescriptionList
              isCompact
              className="entity-details-page__dl"
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
          </div>
        )}

        {isCluster ? (
          <div className="entity-details-page__column">
            <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
              Provisioning
            </Title>
            <DescriptionList
              isCompact
              className="entity-details-page__dl"
              aria-label="Cluster provisioning"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Path</DescriptionListTerm>
                <DescriptionListDescription>
                  Assisted Installer / Hive
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Control plane</DescriptionListTerm>
                <DescriptionListDescription>3× master · highly available</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>CNI</DescriptionListTerm>
                <DescriptionListDescription>OVN-Kubernetes</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>
        ) : (
          <div className="entity-details-page__column">
            <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
              Network defaults
            </Title>
            <DescriptionList
              isCompact
              className="entity-details-page__dl"
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
          </div>
        )}
      </div>
    </EntityDetailsPageShell>
  )
}

import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Content,
  Label,
  Title,
} from '@patternfly/react-core'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import { TenantUserLaunchInstanceWizard } from '../../components/tenant-user/TenantUserLaunchInstanceWizard'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { getTenantUserCatalogCard } from '../../tenantUser/catalog'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import { TENANT_USER_CATALOG_PAGE } from '../../tenantUser/constants'
import type { TenantInstance } from '../../tenantUser/instances'

type TenantUserCatalogPageProps = {
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  projectName: string
  onProvisioningStarted: (instance: TenantInstance) => void
  onDismissDuringProvisioning: (instanceId: string) => void
  onWizardFinished: (instanceId: string) => void
}

export function TenantUserCatalogPage({
  organization,
  catalogDraft,
  projectName,
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: TenantUserCatalogPageProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const catalogItem = useMemo(
    () => getTenantUserCatalogCard(organization, catalogDraft),
    [organization, catalogDraft],
  )

  return (
    <div className="tenant-user-workspace-page tenant-user-catalog">
      <Title headingLevel="h1" size="3xl" className="tenant-user-catalog__title">
        Catalog
      </Title>
      <Content component="p" className="tenant-user-catalog__lede">
        {TENANT_USER_CATALOG_PAGE.lede}
      </Content>

      <Card isCompact={false} className="tenant-user-catalog__card">
        <CardBody>
          <div className="tenant-user-catalog__header">
            <span className="tenant-user-catalog__icon" aria-hidden>
              <CubesIcon />
            </span>
            <div className="tenant-user-catalog__header-copy">
              <div className="tenant-user-catalog__meta-row">
                <Label color="blue" isCompact>
                  {catalogItem.service}
                </Label>
                <Label color="green" isCompact>
                  {catalogItem.status}
                </Label>
              </div>
              <Content component="p" className="tenant-user-catalog__display-name">
                {catalogItem.displayName}
              </Content>
              <Content component="p" className="tenant-user-catalog__category-label">
                {catalogItem.categoryLabel}
              </Content>
            </div>
          </div>

          <dl className="tenant-user-catalog__specs-list">
            <div className="tenant-user-catalog__spec-row">
              <dt className="tenant-user-catalog__spec-label">CPU</dt>
              <dd className="tenant-user-catalog__spec-value">{catalogItem.cpu}</dd>
            </div>
            <div className="tenant-user-catalog__spec-row">
              <dt className="tenant-user-catalog__spec-label">RAM</dt>
              <dd className="tenant-user-catalog__spec-value">{catalogItem.ram}</dd>
            </div>
            <div className="tenant-user-catalog__spec-row">
              <dt className="tenant-user-catalog__spec-label">GPU</dt>
              <dd className="tenant-user-catalog__spec-value">{catalogItem.gpu}</dd>
            </div>
            <div className="tenant-user-catalog__spec-row">
              <dt className="tenant-user-catalog__spec-label">OS image</dt>
              <dd className="tenant-user-catalog__spec-value">{catalogItem.osImage}</dd>
            </div>
          </dl>

          <div className="tenant-user-catalog__footer-note">
            <LockIcon aria-hidden />
            <span>{catalogItem.footerNote}</span>
          </div>

          <Button
            variant="primary"
            icon={<RocketIcon />}
            isBlock
            onClick={() => setIsWizardOpen(true)}
            className="tenant-user-catalog__launch-button"
          >
            {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
          </Button>
        </CardBody>
      </Card>

      <TenantUserLaunchInstanceWizard
        isOpen={isWizardOpen}
        catalogItem={catalogItem}
        projectName={projectName}
        onClose={() => setIsWizardOpen(false)}
        onProvisioningStarted={onProvisioningStarted}
        onDismissDuringProvisioning={(instanceId) => {
          setIsWizardOpen(false)
          onDismissDuringProvisioning(instanceId)
        }}
        onWizardFinished={(instanceId) => {
          setIsWizardOpen(false)
          onWizardFinished(instanceId)
        }}
      />
    </div>
  )
}

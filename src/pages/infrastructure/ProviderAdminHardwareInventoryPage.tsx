import { useCallback } from 'react'
import { RedoIcon } from '@patternfly/react-icons/dist/esm/icons/redo-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
} from '@patternfly/react-core'
import { ProviderSetupDiscoverInventoryTable } from '../../components/provider-setup/ProviderSetupDiscoverInventoryTable'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { MOCK_DISCOVERED_HOSTS } from '../../providerSetup/constants'

const HOST_TOTALS = {
  total: MOCK_DISCOVERED_HOSTS.length,
  available: MOCK_DISCOVERED_HOSTS.length,
  dell: MOCK_DISCOVERED_HOSTS.filter((host) => host.vendor === 'Dell').length,
  hpe: MOCK_DISCOVERED_HOSTS.filter((host) => host.vendor === 'HPE').length,
}

export function ProviderAdminHardwareInventoryPage() {
  const handleRescan = useCallback(() => {
    /* demo: inventory already complete */
  }, [])

  return (
    <div className="provider-admin-workspace-page">
      <ProviderAdminWorkspacePageHeader
        kicker="Infrastructure"
        title="Hardware inventory"
        lede="Discovered bare metal hosts registered through Metal3 discovery."
      />

      <Grid hasGutter className="provider-admin-infrastructure-summary">
        <GridItem sm={6} md={3}>
          <Card className="provider-admin-infrastructure-summary__card">
            <CardBody>
              <Content component="p" className="provider-admin-infrastructure-summary__value">
                {HOST_TOTALS.total}
              </Content>
              <Content component="p" className="provider-admin-infrastructure-summary__label">
                Total hosts
              </Content>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem sm={6} md={3}>
          <Card className="provider-admin-infrastructure-summary__card">
            <CardBody>
              <Content component="p" className="provider-admin-infrastructure-summary__value">
                {HOST_TOTALS.available}
              </Content>
              <Content component="p" className="provider-admin-infrastructure-summary__label">
                Available
              </Content>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem sm={6} md={3}>
          <Card className="provider-admin-infrastructure-summary__card">
            <CardBody>
              <Content component="p" className="provider-admin-infrastructure-summary__value">
                {HOST_TOTALS.dell}
              </Content>
              <Content component="p" className="provider-admin-infrastructure-summary__label">
                Dell
              </Content>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem sm={6} md={3}>
          <Card className="provider-admin-infrastructure-summary__card">
            <CardBody>
              <Content component="p" className="provider-admin-infrastructure-summary__value">
                {HOST_TOTALS.hpe}
              </Content>
              <Content component="p" className="provider-admin-infrastructure-summary__label">
                HPE
              </Content>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      <Flex
        className="provider-admin-infrastructure-toolbar"
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        gap={{ default: 'gapMd' }}
      >
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <FlexItem className="provider-admin-infrastructure-toolbar__status-group">
              Balance Operator{' '}
              <Label color="green" isCompact>
                Running
              </Label>
            </FlexItem>
            <FlexItem className="provider-admin-infrastructure-toolbar__status-group">
              Metal3{' '}
              <Label color="green" isCompact>
                Running
              </Label>
            </FlexItem>
          </Flex>
        </FlexItem>
        <FlexItem>
          <Button variant="secondary" icon={<RedoIcon />} onClick={handleRescan}>
            Re-scan
          </Button>
        </FlexItem>
      </Flex>

      <div className="provider-admin-infrastructure-inventory">
        <ProviderSetupDiscoverInventoryTable
          revealedHostCount={MOCK_DISCOVERED_HOSTS.length}
          availableHostCount={MOCK_DISCOVERED_HOSTS.length}
        />
      </div>
    </div>
  )
}

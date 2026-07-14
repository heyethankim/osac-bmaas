import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  Progress,
  ProgressMeasureLocation,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { BoltIcon } from '@patternfly/react-icons/dist/esm/icons/bolt-icon'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { RedoIcon } from '@patternfly/react-icons/dist/esm/icons/redo-icon'
import { SearchIcon } from '@patternfly/react-icons/dist/esm/icons/search-icon'
import {
  getDiscoveryLiveMessage,
  ProviderSetupDiscoverInventoryTable,
} from '../../components/provider-setup/ProviderSetupDiscoverInventoryTable'
import {
  DISCOVER_HEADER_COPY,
  MOCK_DISCOVERED_HOSTS,
  type DiscoveryScanPhase,
} from '../../providerSetup/constants'
import {
  scheduleDiscoveryScan,
  type DiscoveryScanSnapshot,
} from '../../providerSetup/discoveryScan'

const IDLE_SCAN_SNAPSHOT: DiscoveryScanSnapshot = {
  revealedHostCount: 0,
  availableHostCount: 0,
  scanProgress: 0,
  activeHost: null,
}

type ProviderSetupDiscoverStepProps = {
  embedded?: boolean
  scanPhase: DiscoveryScanPhase
  scanSnapshot?: DiscoveryScanSnapshot
  onTriggerScan: () => void
  onCreateTemplate?: () => void
}

export function ProviderSetupDiscoverScanProgress({
  scanProgress,
  activeHost,
}: {
  scanProgress: number
  activeHost: DiscoveryScanSnapshot['activeHost']
}) {
  const progressDetail = activeHost
    ? `Reading manifest for ${activeHost.serial} on ${activeHost.rack}…`
    : 'Reading server manifests... Metal3 discovery in progress'

  return (
    <Progress
      className="provider-setup-discover__scan-progress"
      value={scanProgress}
      measureLocation={ProgressMeasureLocation.top}
      hideStatusIcon
      title={
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
          <FlexItem>
            <Spinner size="sm" aria-label="Scanning hardware inventory" />
          </FlexItem>
          <FlexItem>{progressDetail}</FlexItem>
        </Flex>
      }
      aria-label="Discovery scan progress"
    />
  )
}

export function ProviderSetupDiscoverAlert({
  scanPhase,
}: {
  scanPhase: DiscoveryScanPhase
}) {
  if (scanPhase !== 'complete') {
    return null
  }

  return (
    <Alert variant="success" isInline title="Scan complete." customIcon={<CheckCircleIcon />}>
      7 physical hosts onboarded. All nodes placed in stanby mode to conserve power.
    </Alert>
  )
}

function DiscoverHeaderText({ scanPhase }: { scanPhase: DiscoveryScanPhase }) {
  if (scanPhase === 'complete') {
    return (
      <Flex
        className="provider-setup-discover__header-text provider-setup-discover__header-status"
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapSm' }}
      >
        <FlexItem className="provider-setup-discover__header-status-group">
          Balance Operator{' '}
          <Label color="green" isCompact>
            Running
          </Label>
          ,
        </FlexItem>
        <FlexItem className="provider-setup-discover__header-status-group">
          Metal3{' '}
          <Label color="green" isCompact>
            Running
          </Label>
        </FlexItem>
      </Flex>
    )
  }

  return (
    <Content component="p" className="provider-setup-discover__header-text">
      {DISCOVER_HEADER_COPY[scanPhase === 'scanning' ? 'scanning' : 'idle']}
    </Content>
  )
}

export function ProviderSetupDiscoverStep({
  embedded = false,
  scanPhase,
  scanSnapshot: scanSnapshotProp,
  onTriggerScan,
  onCreateTemplate,
}: ProviderSetupDiscoverStepProps) {
  const [localScanPhase, setLocalScanPhase] = useState<DiscoveryScanPhase>('idle')
  const [localScanSnapshot, setLocalScanSnapshot] = useState<DiscoveryScanSnapshot>(IDLE_SCAN_SNAPSHOT)
  const cancelScanRef = useRef<(() => void) | null>(null)
  const [recentlyRevealedHostId, setRecentlyRevealedHostId] = useState<string | null>(null)
  const [recentlyResolvedHostId, setRecentlyResolvedHostId] = useState<string | null>(null)
  const previousSnapshotRef = useRef<DiscoveryScanSnapshot>(IDLE_SCAN_SNAPSHOT)

  const isControlled = scanSnapshotProp != null
  const activeScanPhase = isControlled ? scanPhase : localScanPhase
  const scanSnapshot = scanSnapshotProp ?? localScanSnapshot

  const isScanning = activeScanPhase === 'scanning'
  const isComplete = activeScanPhase === 'complete'
  const showInventoryTable = scanSnapshot.revealedHostCount > 0

  useEffect(
    () => () => {
      cancelScanRef.current?.()
    },
    [],
  )

  useEffect(() => {
    const previous = previousSnapshotRef.current

    if (scanSnapshot.revealedHostCount > previous.revealedHostCount) {
      const latestHost = MOCK_DISCOVERED_HOSTS[scanSnapshot.revealedHostCount - 1]
      setRecentlyRevealedHostId(latestHost?.id ?? null)
      window.setTimeout(() => setRecentlyRevealedHostId(null), 720)
    }

    if (scanSnapshot.availableHostCount > previous.availableHostCount) {
      const resolvedHost = MOCK_DISCOVERED_HOSTS[scanSnapshot.availableHostCount - 1]
      setRecentlyResolvedHostId(resolvedHost?.id ?? null)
      window.setTimeout(() => setRecentlyResolvedHostId(null), 720)
    }

    previousSnapshotRef.current = scanSnapshot
  }, [scanSnapshot])

  const handleTriggerScan = () => {
    if (isControlled) {
      onTriggerScan()
      return
    }

    cancelScanRef.current?.()
    setLocalScanPhase('scanning')
    setLocalScanSnapshot({
      revealedHostCount: 0,
      availableHostCount: 0,
      scanProgress: 4,
      activeHost: null,
    })

    cancelScanRef.current = scheduleDiscoveryScan(
      (snapshot) => setLocalScanSnapshot(snapshot),
      () => {
        setLocalScanSnapshot((current) => ({
          ...current,
          scanProgress: 100,
          activeHost: null,
        }))
        setLocalScanPhase('complete')
        cancelScanRef.current = null
      },
    )
  }

  const liveMessage = getDiscoveryLiveMessage(scanSnapshot)

  function renderScanActionButton({ isBlock = false }: { isBlock?: boolean } = {}) {
    if (isComplete) {
      return (
        <Button
          variant="secondary"
          icon={<RedoIcon />}
          isBlock={isBlock}
          onClick={handleTriggerScan}
        >
          Re-scan
        </Button>
      )
    }

    return (
      <Button
        variant="primary"
        icon={<BoltIcon />}
        isBlock={isBlock}
        onClick={handleTriggerScan}
        isDisabled={isScanning}
      >
        {isScanning ? 'Scanning…' : 'Trigger discovery scan'}
      </Button>
    )
  }

  function renderInventoryContent() {
    if (showInventoryTable) {
      return (
        <div className="provider-setup-discover__inventory-panel">
          <ProviderSetupDiscoverInventoryTable
            revealedHostCount={scanSnapshot.revealedHostCount}
            availableHostCount={scanSnapshot.availableHostCount}
            recentlyRevealedHostId={recentlyRevealedHostId}
            recentlyResolvedHostId={recentlyResolvedHostId}
          />
          {isScanning ? (
            <Content component="p" className="provider-setup-discover-table__meta">
              {scanSnapshot.availableHostCount} of {MOCK_DISCOVERED_HOSTS.length} hosts catalogued ·{' '}
              {scanSnapshot.revealedHostCount - scanSnapshot.availableHostCount} inspecting
            </Content>
          ) : null}
        </div>
      )
    }

    return (
      <Card isCompact={false} className="provider-setup-discover__inventory-card">
        <CardBody>
          <EmptyState
            variant={embedded ? 'xs' : 'lg'}
            className="provider-setup-discover__empty"
            titleText="No hosts registered"
            headingLevel={embedded ? 'h3' : 'h2'}
            icon={SearchIcon}
            status="info"
          >
            {!embedded && !isScanning && !isComplete ? (
              <Button variant="primary" icon={<BoltIcon />} onClick={handleTriggerScan}>
                Trigger discovery scan
              </Button>
            ) : null}
          </EmptyState>
        </CardBody>
      </Card>
    )
  }

  function renderSidePanel() {
    return (
      <Stack hasGutter>
        <StackItem>
          <Card isCompact={false}>
            <CardBody>
              <Title headingLevel="h3" size="md">
                System health
              </Title>
              <DescriptionList isCompact isHorizontal className="provider-setup-page__health">
                <DescriptionListGroup>
                  <DescriptionListTerm>Balance Operator</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color={isComplete ? 'green' : 'orange'} isCompact>
                      {isComplete ? 'Healthy' : isScanning ? 'Scanning' : 'Pending scan'}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Metal3</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color={isComplete ? 'green' : 'orange'} isCompact>
                      {isComplete ? 'Healthy' : isScanning ? 'Scanning' : 'Pending scan'}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </StackItem>
        <StackItem>
          {renderScanActionButton({ isBlock: true })}
        </StackItem>
      </Stack>
    )
  }

  return (
    <Stack hasGutter>
      {!embedded && activeScanPhase === 'complete' ? (
        <StackItem>
          <ProviderSetupDiscoverAlert scanPhase={activeScanPhase} />
        </StackItem>
      ) : null}

      {!embedded ? (
        <StackItem>
          <Label color="green">Connection established</Label>
          <Title headingLevel="h1" size="2xl">
            Discover inventory
          </Title>
          <Content component="p" className="provider-setup-page__lede">
            Scan your racks to register bare metal hosts. Discovery results appear in the inventory
            table below.
          </Content>
        </StackItem>
      ) : (
        <StackItem>
          <Flex
            className="provider-setup-discover__header"
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            gap={{ default: 'gapMd' }}
          >
            <FlexItem grow={{ default: 'grow' }} className="provider-setup-discover__header-text-wrap">
              <DiscoverHeaderText scanPhase={activeScanPhase} />
            </FlexItem>
            <FlexItem alignSelf={{ default: 'alignSelfCenter' }} className="provider-setup-discover__header-action">
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  {renderScanActionButton()}
                </FlexItem>
                {isComplete && onCreateTemplate ? (
                  <FlexItem>
                    <Button variant="primary" type="button" onClick={onCreateTemplate}>
                      Create first template
                    </Button>
                  </FlexItem>
                ) : null}
              </Flex>
            </FlexItem>
          </Flex>
        </StackItem>
      )}

      {isScanning ? (
        <StackItem>
          <ProviderSetupDiscoverScanProgress
            scanProgress={scanSnapshot.scanProgress}
            activeHost={scanSnapshot.activeHost}
          />
        </StackItem>
      ) : null}

      {liveMessage ? (
        <StackItem className="provider-setup-discover__live-region-wrap">
          <span className="pf-v6-u-screen-reader" aria-live="polite">
            {liveMessage}
          </span>
        </StackItem>
      ) : null}

      <StackItem className="provider-setup-discover__inventory-wrap">
        {!embedded ? (
          <Grid hasGutter>
            <GridItem span={12} md={8}>
              {renderInventoryContent()}
            </GridItem>
            <GridItem span={12} md={4}>
              {renderSidePanel()}
            </GridItem>
          </Grid>
        ) : (
          renderInventoryContent()
        )}
      </StackItem>
    </Stack>
  )
}

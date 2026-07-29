import {
  Button,
  Content,
  Label,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import {
  getHostScanStatus,
  type DiscoveryScanSnapshot,
} from '../../providerSetup/discoveryScan'
import {
  MOCK_DISCOVERED_HOSTS,
  type DiscoveredHost,
  type HostScanStatus,
} from '../../providerSetup/constants'

type ProviderSetupDiscoverInventoryTableProps = {
  revealedHostCount: number
  availableHostCount: number
  recentlyRevealedHostId?: string | null
  recentlyResolvedHostId?: string | null
  /** Use shared catalog list table styling (provider admin inventory). */
  useCatalogStyle?: boolean
}

function HostStatusLabel({ status }: { status: HostScanStatus }) {
  if (status === 'available') {
    return (
      <Label color="green" isCompact className="provider-setup-discover-table__status">
        Available
      </Label>
    )
  }

  return (
    <Label color="orange" isCompact className="provider-setup-discover-table__status">
      Inspecting
    </Label>
  )
}

function SpecCell({
  status,
  inspectingText,
  value,
}: {
  status: HostScanStatus
  inspectingText?: string
  value: string
}) {
  if (status === 'inspecting') {
    return (
      <Content component="p" className="provider-setup-discover-table__scanning">
        {inspectingText ?? '—'}
      </Content>
    )
  }

  return <Content component="p">{value}</Content>
}

function InventoryRow({
  host,
  status,
  isEntering,
  isResolving,
  useCatalogStyle,
}: {
  host: DiscoveredHost
  status: HostScanStatus
  isEntering: boolean
  isResolving: boolean
  useCatalogStyle: boolean
}) {
  const rowClassName = [
    isEntering ? 'provider-setup-discover-table__row--enter' : '',
    isResolving ? 'provider-setup-discover-table__row--resolve' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tr className={rowClassName || undefined}>
      <Td dataLabel="Serial number">
        <Button
          variant="link"
          isInline
          className={
            useCatalogStyle
              ? 'catalog-table-name-link'
              : 'provider-setup-discover-table__serial'
          }
        >
          {host.serial}
        </Button>
      </Td>
      <Td dataLabel="Status">
        <HostStatusLabel status={status} />
      </Td>
      <Td dataLabel="Vendor / model">
        <Content component="p" className={useCatalogStyle ? 'provider-setup-discover-table__primary-cell' : undefined}>
          <strong>{host.vendor}</strong>
        </Content>
        <Content
          component={useCatalogStyle ? 'p' : 'small'}
          className={useCatalogStyle ? 'provider-setup-discover-table__meta-cell' : undefined}
        >
          {host.model}
        </Content>
      </Td>
      <Td dataLabel="Rack / port">
        <Content component="p" className={useCatalogStyle ? 'provider-setup-discover-table__primary-cell' : undefined}>
          <strong>{host.rack}</strong>
        </Content>
        <Content
          component={useCatalogStyle ? 'p' : 'small'}
          className={useCatalogStyle ? 'provider-setup-discover-table__meta-cell' : undefined}
        >
          {host.port}
        </Content>
      </Td>
      <Td dataLabel="CPU">
        <SpecCell status={status} inspectingText="scanning…" value={host.cpu} />
      </Td>
      <Td dataLabel="Memory">
        <SpecCell status={status} value={host.memory} />
      </Td>
      <Td dataLabel="GPU">
        <SpecCell status={status} value={host.gpu ?? '—'} />
      </Td>
    </Tr>
  )
}

export function ProviderSetupDiscoverInventoryTable({
  revealedHostCount,
  availableHostCount,
  recentlyRevealedHostId,
  recentlyResolvedHostId,
  useCatalogStyle = false,
}: ProviderSetupDiscoverInventoryTableProps) {
  const visibleHosts = MOCK_DISCOVERED_HOSTS.slice(0, revealedHostCount)

  return (
    <Table
      aria-label="Discovered bare metal hosts"
      variant={useCatalogStyle ? undefined : 'compact'}
      borders={useCatalogStyle ? undefined : true}
      isStickyHeader={!useCatalogStyle}
      className={
        useCatalogStyle
          ? 'catalog-data-table provider-setup-discover-table'
          : 'provider-setup-discover-table'
      }
    >
      <Thead>
        <Tr>
          <Th width={15}>Serial number</Th>
          <Th width={10}>Status</Th>
          <Th width={20}>Vendor / model</Th>
          <Th width={15}>Rack / port</Th>
          <Th width={20}>CPU</Th>
          <Th width={10}>Memory</Th>
          <Th width={10}>GPU</Th>
        </Tr>
      </Thead>
      <Tbody>
        {visibleHosts.map((host, index) => (
          <InventoryRow
            key={host.id}
            host={host}
            status={getHostScanStatus(index, availableHostCount)}
            isEntering={host.id === recentlyRevealedHostId}
            isResolving={host.id === recentlyResolvedHostId}
            useCatalogStyle={useCatalogStyle}
          />
        ))}
      </Tbody>
    </Table>
  )
}

export function getDiscoveryLiveMessage(snapshot: DiscoveryScanSnapshot): string {
  if (snapshot.activeHost && snapshot.availableHostCount < snapshot.revealedHostCount) {
    return `Inspecting ${snapshot.activeHost.serial} on ${snapshot.activeHost.rack}.`
  }

  if (snapshot.activeHost) {
    return `Reading manifest for ${snapshot.activeHost.serial}.`
  }

  if (snapshot.availableHostCount === MOCK_DISCOVERED_HOSTS.length) {
    return 'All discovered hosts are available for provisioning.'
  }

  return ''
}

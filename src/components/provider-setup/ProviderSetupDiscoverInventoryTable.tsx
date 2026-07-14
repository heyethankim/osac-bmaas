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
}: {
  host: DiscoveredHost
  status: HostScanStatus
  isEntering: boolean
  isResolving: boolean
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
        <Button variant="link" isInline className="provider-setup-discover-table__serial">
          {host.serial}
        </Button>
      </Td>
      <Td dataLabel="Vendor / model">
        <Content component="p">
          <strong>{host.vendor}</strong>
        </Content>
        <Content component="small">{host.model}</Content>
      </Td>
      <Td dataLabel="Rack / port">
        <Content component="p">
          <strong>{host.rack}</strong>
        </Content>
        <Content component="small">{host.port}</Content>
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
      <Td dataLabel="Status">
        <HostStatusLabel status={status} />
      </Td>
    </Tr>
  )
}

export function ProviderSetupDiscoverInventoryTable({
  revealedHostCount,
  availableHostCount,
  recentlyRevealedHostId,
  recentlyResolvedHostId,
}: ProviderSetupDiscoverInventoryTableProps) {
  const visibleHosts = MOCK_DISCOVERED_HOSTS.slice(0, revealedHostCount)

  return (
    <Table
      aria-label="Discovered bare metal hosts"
      variant="compact"
      borders
      isStickyHeader
      className="provider-setup-discover-table"
    >
      <Thead>
        <Tr>
          <Th width={15}>Serial number</Th>
          <Th width={20}>Vendor / model</Th>
          <Th width={15}>Rack / port</Th>
          <Th width={20}>CPU</Th>
          <Th width={15}>Memory</Th>
          <Th width={15}>GPU</Th>
          <Th width={10}>Status</Th>
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

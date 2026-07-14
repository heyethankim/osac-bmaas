import { MOCK_DISCOVERED_HOSTS, type DiscoveredHost, type HostScanStatus } from './constants'

export const DISCOVERY_SCAN_REVEAL_MS = 680
export const DISCOVERY_SCAN_RESOLVE_MS = 980
export const DISCOVERY_SCAN_INITIAL_DELAY_MS = 480
export const DISCOVERY_SCAN_COMPLETE_HOLD_MS = 520

export type DiscoveryScanSnapshot = {
  revealedHostCount: number
  availableHostCount: number
  scanProgress: number
  activeHost: DiscoveredHost | null
}

export function getHostScanStatus(index: number, availableHostCount: number): HostScanStatus {
  return index < availableHostCount ? 'available' : 'inspecting'
}

export function getVisibleHosts(revealedHostCount: number): DiscoveredHost[] {
  return MOCK_DISCOVERED_HOSTS.slice(0, revealedHostCount)
}

export function getScanProgress(revealedHostCount: number, availableHostCount: number): number {
  const total = MOCK_DISCOVERED_HOSTS.length
  const revealWeight = (revealedHostCount / total) * 42
  const resolveWeight = (availableHostCount / total) * 58
  return Math.min(100, Math.round(revealWeight + resolveWeight))
}

export function scheduleDiscoveryScan(
  onUpdate: (snapshot: DiscoveryScanSnapshot) => void,
  onComplete: () => void,
): () => void {
  const timeouts: number[] = []
  const total = MOCK_DISCOVERED_HOSTS.length
  let revealedHostCount = 0
  let availableHostCount = 0

  const publish = (activeHost: DiscoveredHost | null = null) => {
    onUpdate({
      revealedHostCount,
      availableHostCount,
      scanProgress: getScanProgress(revealedHostCount, availableHostCount),
      activeHost,
    })
  }

  const schedule = (delay: number, fn: () => void) => {
    timeouts.push(window.setTimeout(fn, delay))
  }

  publish(MOCK_DISCOVERED_HOSTS[0] ?? null)

  for (let index = 0; index < total; index += 1) {
    const revealAt =
      DISCOVERY_SCAN_INITIAL_DELAY_MS + index * DISCOVERY_SCAN_REVEAL_MS
    const resolveAt = revealAt + DISCOVERY_SCAN_RESOLVE_MS

    schedule(revealAt, () => {
      revealedHostCount = index + 1
      publish(MOCK_DISCOVERED_HOSTS[index] ?? null)
    })

    schedule(resolveAt, () => {
      availableHostCount = index + 1
      const nextHost = MOCK_DISCOVERED_HOSTS[index + 1] ?? null
      publish(nextHost)
    })
  }

  const completeAt =
    DISCOVERY_SCAN_INITIAL_DELAY_MS +
    (total - 1) * DISCOVERY_SCAN_REVEAL_MS +
    DISCOVERY_SCAN_RESOLVE_MS +
    DISCOVERY_SCAN_COMPLETE_HOLD_MS

  schedule(completeAt, () => {
    revealedHostCount = total
    availableHostCount = total
    publish(null)
    onComplete()
  })

  return () => {
    timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
  }
}

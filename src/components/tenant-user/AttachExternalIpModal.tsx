import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Content,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core'
import type { ExternalIp } from '../../providerAdmin/externalIps'
import {
  createAllocatedExternalIp,
  getUsedExternalIpAddresses,
} from '../../providerAdmin/externalIps'
import {
  getTenantExternalIps,
  resolveTenantAssignedExternalIpPools,
  setTenantExternalIps,
} from '../../tenantAdmin/networkInventoryStorage'
import {
  formatTenantInstanceName,
  getTenantInstanceServiceId,
  type TenantInstance,
} from '../../tenantUser/instances'

type AttachExternalIpModalProps = {
  isOpen: boolean
  instance: TenantInstance | null
  tenantSlug: string
  onClose: () => void
  onAttach: (instance: TenantInstance, ip: ExternalIp) => void
}

function buildAttachCandidates(tenantSlug: string): ExternalIp[] {
  const existing = getTenantExternalIps(tenantSlug)
  const available = existing.filter((ip) => ip.status === 'Available')
  if (available.length > 0) {
    return available
  }

  const pools = resolveTenantAssignedExternalIpPools(tenantSlug)
  const used = getUsedExternalIpAddresses(existing)
  const generated: ExternalIp[] = []

  for (const pool of pools) {
    try {
      const next = createAllocatedExternalIp(pool, used)
      used.add(next.address)
      generated.push(next)
      if (generated.length >= 3) {
        break
      }
    } catch {
      /* pool exhausted in demo */
    }
  }

  return generated
}

function helperCopyForInstance(instance: TenantInstance): string {
  const serviceId = getTenantInstanceServiceId(instance)
  if (serviceId === 'virtual-machine') {
    return 'Reach this VM over SSH from outside the private network.'
  }
  if (serviceId === 'baremetal') {
    return 'Reach this host over SSH from outside the private network.'
  }
  return 'Reach this instance from outside the private network.'
}

export function AttachExternalIpModal({
  isOpen,
  instance,
  tenantSlug,
  onClose,
  onAttach,
}: AttachExternalIpModalProps) {
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const [selectedIpId, setSelectedIpId] = useState('')
  const [candidates, setCandidates] = useState<ExternalIp[]>([])

  useEffect(() => {
    if (!isOpen || !instance) {
      setIsSelectOpen(false)
      setSelectedIpId('')
      setCandidates([])
      return
    }

    const nextCandidates = buildAttachCandidates(tenantSlug)
    setCandidates(nextCandidates)
    setSelectedIpId(nextCandidates[0]?.id ?? '')
    setIsSelectOpen(false)
  }, [instance, isOpen, tenantSlug])

  const selectedIp = useMemo(
    () => candidates.find((ip) => ip.id === selectedIpId) ?? candidates[0] ?? null,
    [candidates, selectedIpId],
  )

  const handleAttach = () => {
    if (!instance || !selectedIp) {
      return
    }

    const existing = getTenantExternalIps(tenantSlug)
    const serviceId = getTenantInstanceServiceId(instance)
    const serviceLabel =
      serviceId === 'virtual-machine'
        ? 'Virtual machine'
        : serviceId === 'baremetal'
          ? 'Bare metal'
          : serviceId === 'cluster'
            ? 'Cluster'
            : 'Instance'
    const attachedTo = `${serviceLabel} · ${formatTenantInstanceName(instance.name)}`
    const nextIp: ExternalIp = {
      ...selectedIp,
      status: 'In use',
      attachedTo,
    }

    const withoutSelected = existing.filter((ip) => ip.id !== nextIp.id && ip.address !== nextIp.address)
    setTenantExternalIps(tenantSlug, [nextIp, ...withoutSelected])
    onAttach(instance, nextIp)
  }

  if (!instance) {
    return null
  }

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="attach-public-ip-title"
      aria-describedby="attach-public-ip-description"
    >
      <ModalHeader title="Attach external IP" labelId="attach-public-ip-title" />
      <ModalBody>
        <div className="attach-external-ip-modal__body">
          <Select
            id="attach-public-ip-select"
            isOpen={isSelectOpen}
            selected={selectedIp?.id}
            onOpenChange={setIsSelectOpen}
            onSelect={(_event, value) => {
              if (value == null) {
                return
              }
              setSelectedIpId(String(value))
              setIsSelectOpen(false)
            }}
            popperProps={{ appendTo: () => document.body }}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                id="attach-public-ip-toggle"
                isExpanded={isSelectOpen}
                onClick={() => setIsSelectOpen((open) => !open)}
                isFullWidth
                isDisabled={candidates.length === 0}
                aria-label={
                  selectedIp
                    ? `External IP ${selectedIp.address}, pool ${selectedIp.poolName ?? 'unassigned'}`
                    : 'Select external IP'
                }
                className="attach-external-ip-modal__toggle bmaas-dropdown-toggle"
              >
                {selectedIp ? (
                  <span className="attach-external-ip-modal__toggle-copy">
                    <span className="attach-external-ip-modal__toggle-address">
                      {selectedIp.address}
                    </span>
                    <span className="attach-external-ip-modal__toggle-pool">
                      Pool {selectedIp.poolName ?? 'unassigned'}
                    </span>
                  </span>
                ) : (
                  'No available external IPs'
                )}
              </MenuToggle>
            )}
          >
            <SelectList>
              {candidates.map((ip) => (
                <SelectOption
                  key={ip.id}
                  value={ip.id}
                  isSelected={ip.id === selectedIp?.id}
                  description={`Pool ${ip.poolName ?? 'unassigned'}`}
                >
                  {ip.address}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
          <Content
            component="p"
            id="attach-public-ip-description"
            className="attach-external-ip-modal__helper"
          >
            {helperCopyForInstance(instance)}
          </Content>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleAttach} isDisabled={!selectedIp}>
          Attach
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

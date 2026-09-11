import { Button, Content } from '@patternfly/react-core'
import {
  findTenantInstanceForExternalIpAttachment,
  getExternalIpAttachmentMeta,
  type ExternalIp,
} from '../../providerAdmin/externalIps'
import type { TenantInstance } from '../../tenantUser/instances'

export function ExternalIpAttachmentMeta({
  ip,
  className,
  serviceInstances,
  onNavigateToServiceInstance,
}: {
  ip: ExternalIp
  className?: string
  serviceInstances?: readonly TenantInstance[]
  onNavigateToServiceInstance?: (instance: TenantInstance) => void
}) {
  const meta = getExternalIpAttachmentMeta(ip)
  if (!meta) {
    return null
  }

  const linkedInstance =
    serviceInstances && onNavigateToServiceInstance
      ? findTenantInstanceForExternalIpAttachment(serviceInstances, meta)
      : null

  return (
    <Content component="p" className={className} aria-label={`${meta.kindLabel}: ${meta.name}`}>
      <span className="provider-admin-external-networks-hub__attachment-meta">
        <span>{meta.kindLabel}</span>
        <span aria-hidden> · </span>
        {linkedInstance && onNavigateToServiceInstance ? (
          <Button
            variant="link"
            isInline
            className="provider-admin-external-networks-hub__attachment-link"
            aria-label={`${meta.kindLabel}: ${meta.name}`}
            onClick={() => onNavigateToServiceInstance(linkedInstance)}
          >
            {meta.name}
          </Button>
        ) : (
          <span>{meta.name}</span>
        )}
      </span>
    </Content>
  )
}

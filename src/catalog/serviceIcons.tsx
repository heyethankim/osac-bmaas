import type { ReactNode } from 'react'
import { RhUiAiModelIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-ai-model-icon'
import { RhUiClusterIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-cluster-icon'
import { RhUiServerStackIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-server-stack-icon'
import { RhUiVirtualServerIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-virtual-server-icon'
import type { CatalogServiceId } from '../providerSetup/templateDemo'

/** Shared RH UI icons for Bare Metal, Cluster, Models, and Virtual Machine services. */
export const CATALOG_SERVICE_ICONS: Record<CatalogServiceId, ReactNode> = {
  baremetal: <RhUiServerStackIcon />,
  cluster: <RhUiClusterIcon />,
  models: <RhUiAiModelIcon />,
  'virtual-machine': <RhUiVirtualServerIcon />,
}

export function getCatalogServiceIcon(serviceId: CatalogServiceId): ReactNode {
  return CATALOG_SERVICE_ICONS[serviceId]
}

import type { ReactNode } from 'react'
import { RhUiAiModelIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-ai-model-icon'
import { RhUiClusterIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-cluster-icon'
import { RhUiVirtualMachineCenterIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-virtual-machine-center-icon'
import { RhUiVirtualServerIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-virtual-server-icon'
import type { CatalogServiceId } from '../providerSetup/templateDemo'

/** Shared RH UI icons for Bare Metal, Cluster, Models, and Virtual Machine services. */
export const CATALOG_SERVICE_ICONS: Record<CatalogServiceId, ReactNode> = {
  baremetal: <RhUiVirtualServerIcon />,
  cluster: <RhUiClusterIcon />,
  models: <RhUiAiModelIcon />,
  'virtual-machine': <RhUiVirtualMachineCenterIcon />,
}

export function getCatalogServiceIcon(serviceId: CatalogServiceId): ReactNode {
  return CATALOG_SERVICE_ICONS[serviceId]
}

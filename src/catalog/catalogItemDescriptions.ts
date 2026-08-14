import type { CatalogServiceId } from '../providerSetup/templateDemo'

export const DEMO_CATALOG_ITEM_IDS = {
  bareMetalGpuTraining: 'cat-bm-gpu-training',
  bareMetalDenseGpu: 'cat-bm-dense-gpu',
  clusterNodeSets: 'cat-node-sets-fc430',
  vmNetworkAttachments: 'cat-vm-net-attach',
} as const

/** User-facing guidance shown on catalog detail pages and demo catalog seeds. */
export const CATALOG_ITEM_DESCRIPTIONS_BY_ID: Readonly<Record<string, string>> = {
  [DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining]:
    'Use this server when you need dedicated compute for training or batch jobs. Review the hardware below, then launch when you are ready.',
  [DEMO_CATALOG_ITEM_IDS.bareMetalDenseGpu]:
    'Use this GPU server for model training or inference workloads that need accelerators.',
  [DEMO_CATALOG_ITEM_IDS.clusterNodeSets]:
    'Use this offering to launch an OpenShift cluster. Confirm the cluster settings below, then launch when you are ready.',
  [DEMO_CATALOG_ITEM_IDS.vmNetworkAttachments]:
    'Use this virtual machine for apps, testing, or development. You can adjust networking when you launch.',
}

export const CATALOG_ITEM_DESCRIPTIONS_BY_SERVICE: Readonly<Record<CatalogServiceId, string>> = {
  baremetal:
    'Use this bare metal server when you need dedicated hardware. Review the configuration below, then launch when you are ready.',
  cluster:
    'Use this cluster offering to run containerized applications. Review the settings below, then launch when you are ready.',
  'virtual-machine':
    'Use this virtual machine for apps, testing, or development. Review the configuration below, then launch when you are ready.',
  models:
    'Use this model endpoint when you need managed AI inference. Review the details below, then launch when you are ready.',
}

export function getCatalogItemUserDescription(
  item: {
    catalogItemId: string
    serviceId?: CatalogServiceId | null
    description?: string
  },
  options?: { templateDescription?: string },
): string {
  const byCatalogItemId = CATALOG_ITEM_DESCRIPTIONS_BY_ID[item.catalogItemId]
  if (byCatalogItemId) {
    return byCatalogItemId
  }

  const customDescription = item.description?.trim()
  if (customDescription) {
    return customDescription
  }

  const templateDescription = options?.templateDescription?.trim()
  if (templateDescription) {
    return templateDescription
  }

  return CATALOG_ITEM_DESCRIPTIONS_BY_SERVICE[item.serviceId ?? 'baremetal']
}

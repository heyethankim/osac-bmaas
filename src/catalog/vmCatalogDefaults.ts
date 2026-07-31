export type VmCatalogConfigFieldMode = 'editable' | 'fixed'

export type VmCatalogDefaultResource = {
  value: string
  label: string
}

export type VmCatalogConfigField = {
  id: string
  label: string
  value: string
  mode: VmCatalogConfigFieldMode
}

/** Summary chips shown under Default resources in VM catalog drawers. */
export const VM_CATALOG_DEFAULT_RESOURCES: ReadonlyArray<VmCatalogDefaultResource> = [
  { value: '120', label: 'Boot Disk Size (GiB)' },
]

export const VM_CATALOG_CONFIGURATION_DEFAULTS_LEDE =
  'Editable fields can be changed when creating from this catalog item. Fixed fields use the default value shown.'

/** Field-level defaults for Virtual Machine catalog offerings. */
export const VM_CATALOG_CONFIGURATION_DEFAULTS: ReadonlyArray<VmCatalogConfigField> = [
  {
    id: 'boot-disk-size',
    label: 'Boot Disk Size (GiB)',
    value: '120',
    mode: 'editable',
  },
  {
    id: 'container-disk-image',
    label: 'Container Disk Image',
    value: 'quay.io/containerdisks/fedora:latest',
    mode: 'editable',
  },
  {
    id: 'image-source-type',
    label: 'Image Source Type',
    value: 'registry',
    mode: 'fixed',
  },
  {
    id: 'run-strategy',
    label: 'Run Strategy',
    value: 'Always',
    mode: 'editable',
  },
  {
    id: 'cloud-init-user-data',
    label: 'Cloud Init User Data',
    value: '—',
    mode: 'editable',
  },
]

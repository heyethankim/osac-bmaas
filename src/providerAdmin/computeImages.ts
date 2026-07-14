export type OsImageOption = {
  id: string
  abbrev: string
  name: string
  arch: string
  size: string
  recommended?: boolean
}

export type ComputeImageFormat = 'qcow2' | 'raw'

export type ComputeImage = {
  id: string
  name: string
  abbrev: string
  architecture: string
  sizeLabel: string
  imageUrl: string
  checksum: string
  format: ComputeImageFormat
  recommended: boolean
  createdAt: string
}

export const COMPUTE_IMAGE_ARCHITECTURES = ['x86_64', 'aarch64'] as const

export const COMPUTE_IMAGE_FORMATS: ComputeImageFormat[] = ['qcow2', 'raw']

export const DEFAULT_COMPUTE_IMAGES: ComputeImage[] = [
  {
    id: 'rhel-9.4',
    abbrev: 'RE',
    name: 'Red Hat Enterprise Linux 9.4',
    architecture: 'x86_64',
    sizeLabel: '9.2 GB',
    imageUrl: 'https://images.provider.local/bmaas/rhel-9.4-x86_64.qcow2',
    checksum: 'sha256:8f14e45fceea167a5a36dedd4bea2543d3f8b5c7c9c0e2a1d4b6f8a3c7e9d2f1',
    format: 'qcow2',
    recommended: true,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'ubuntu-24.04',
    abbrev: 'UB',
    name: 'Ubuntu 24.04 LTS (Noble)',
    architecture: 'x86_64',
    sizeLabel: '4.7 GB',
    imageUrl: 'https://images.provider.local/bmaas/ubuntu-24.04-noble-amd64.qcow2',
    checksum: 'sha256:2c26b46b68ffc68ff99b453c1d304fed1345946322cfb40db9583c6948b3e3e71',
    format: 'qcow2',
    recommended: false,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'rocky-9.3',
    abbrev: 'RO',
    name: 'Rocky Linux 9.3',
    architecture: 'x86_64',
    sizeLabel: '8.8 GB',
    imageUrl: 'https://images.provider.local/bmaas/rocky-9.3-x86_64.qcow2',
    checksum: 'sha256:4a8b15d23ef2a876b7cdd1c0ff246f486a8a7bc7f9b496e6da4f938c4d27b6f3',
    format: 'qcow2',
    recommended: false,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'alma-9.2',
    abbrev: 'AL',
    name: 'AlmaLinux 9.2',
    architecture: 'x86_64',
    sizeLabel: '8.5 GB',
    imageUrl: 'https://images.provider.local/bmaas/alma-9.2-x86_64.qcow2',
    checksum: 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    format: 'qcow2',
    recommended: false,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
]

export function generateComputeImageId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `cimg_${suffix}`
}

export function getComputeImageById(
  images: ComputeImage[],
  imageId: string,
): ComputeImage | null {
  return images.find((image) => image.id === imageId) ?? null
}

export function getComputeImageLabel(images: ComputeImage[], imageId: string): string {
  return getComputeImageById(images, imageId)?.name ?? imageId
}

export function toOsImageOption(image: ComputeImage): OsImageOption {
  return {
    id: image.id,
    abbrev: image.abbrev,
    name: image.name,
    arch: image.architecture,
    size: image.sizeLabel,
    recommended: image.recommended,
  }
}

export function buildAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return 'IM'
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

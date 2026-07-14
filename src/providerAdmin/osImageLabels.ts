import { getComputeImageLabel } from './computeImages'
import { getProviderComputeImages } from '../providerSetup/storage'

export function getOsImageLabel(osImageId: string): string {
  return getComputeImageLabel(getProviderComputeImages(), osImageId)
}

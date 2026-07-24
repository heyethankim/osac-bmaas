import { getOsImageLabel } from '../providerAdmin/osImageLabels'
import {
  DEFAULT_BLUEPRINT_FORM,
  DISCOVERED_HARDWARE_PROFILES,
  DEMO_EXISTING_MASTER_TEMPLATES,
  parseRateCardFromForm,
  type SavedMasterTemplate,
} from '../providerSetup/templateDemo'
import { getProviderSavedTemplates } from '../providerSetup/storage'

export type CatalogHardwareSpecs = {
  cpu: string
  ram: string
  gpu: string
  osImage: string
  categoryLabel: string
}

function getDefaultTemplateFallback(): SavedMasterTemplate {
  return {
    templateRefId: 'bm_pending',
    templateName: DEFAULT_BLUEPRINT_FORM.templateName,
    description: DEFAULT_BLUEPRINT_FORM.description,
    hardwareProfileId: DEFAULT_BLUEPRINT_FORM.hardwareProfileId,
    osImageId: DEFAULT_BLUEPRINT_FORM.osImage,
    suggestedDisplayName: DEFAULT_BLUEPRINT_FORM.templateName,
    rateCard: parseRateCardFromForm(DEFAULT_BLUEPRINT_FORM)!,
  }
}

export function findCatalogLinkedTemplate(
  templateRefId: string,
  templateName?: string,
): SavedMasterTemplate {
  const templates = [
    ...getProviderSavedTemplates(),
    ...DEMO_EXISTING_MASTER_TEMPLATES,
    getDefaultTemplateFallback(),
  ]

  return (
    templates.find((template) => template.templateRefId === templateRefId) ??
    (templateName
      ? templates.find((template) => template.templateName === templateName)
      : undefined) ??
    getDefaultTemplateFallback()
  )
}

export function resolveHardwareSpecsFromTemplate(
  template: Pick<SavedMasterTemplate, 'hardwareProfileId' | 'osImageId'>,
): CatalogHardwareSpecs {
  const profile =
    DISCOVERED_HARDWARE_PROFILES.find((item) => item.id === template.hardwareProfileId) ??
    DISCOVERED_HARDWARE_PROFILES[0]!

  return {
    cpu: profile.cpu,
    ram: profile.memory,
    gpu: profile.gpu,
    osImage: getOsImageLabel(template.osImageId),
    categoryLabel: `${profile.categoryLabel} · Standard`,
  }
}

export function resolveHardwareSpecsForCatalogItem(item: {
  templateRefId: string
  templateName: string
}): CatalogHardwareSpecs {
  return resolveHardwareSpecsFromTemplate(
    findCatalogLinkedTemplate(item.templateRefId, item.templateName),
  )
}

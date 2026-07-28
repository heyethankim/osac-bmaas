import {
  DEFAULT_BLUEPRINT_FORM,
  DEMO_EXISTING_MASTER_TEMPLATES,
  getBlueprintFormForHardwareProfile,
  parseRateCardFromForm,
  resolveRateCard,
  type BlueprintFormState,
  type SavedMasterTemplate,
} from '../providerSetup/templateDemo'
import { getProviderCatalogItems, getProviderSavedTemplates } from '../providerSetup/storage'

/** Matches the catalog prototype seed (`createDefaultCatalogDraft`). */
export const DEFAULT_MASTER_TEMPLATE_REF_ID = 'bm_dell_r750'

export type BmaasTemplateStatus = 'published' | 'private' | 'draft'

export type BmaasTemplateLookup = {
  templateRefId?: string
  templateName?: string
}

export function getDefaultMasterTemplate(): SavedMasterTemplate {
  return {
    templateRefId: DEFAULT_MASTER_TEMPLATE_REF_ID,
    templateName: DEFAULT_BLUEPRINT_FORM.templateName,
    description: DEFAULT_BLUEPRINT_FORM.description,
    hardwareProfileId: DEFAULT_BLUEPRINT_FORM.hardwareProfileId,
    osImageId: DEFAULT_BLUEPRINT_FORM.osImage,
    suggestedDisplayName: DEFAULT_BLUEPRINT_FORM.templateName,
    rateCard: parseRateCardFromForm(DEFAULT_BLUEPRINT_FORM)!,
  }
}

export function mergeAvailableTemplates(
  savedTemplates: SavedMasterTemplate[] = getProviderSavedTemplates(),
): SavedMasterTemplate[] {
  const templates =
    savedTemplates.length > 0
      ? savedTemplates
      : [getDefaultMasterTemplate(), ...DEMO_EXISTING_MASTER_TEMPLATES]
  const seen = new Set<string>()

  return templates.filter((item) => {
    if (seen.has(item.templateRefId)) {
      return false
    }

    seen.add(item.templateRefId)
    return true
  })
}

export function findBmaasTemplate(
  key: BmaasTemplateLookup,
  templates: SavedMasterTemplate[] = mergeAvailableTemplates(),
): SavedMasterTemplate | null {
  if (key.templateRefId) {
    const byRef = templates.find((template) => template.templateRefId === key.templateRefId)
    if (byRef) {
      return byRef
    }
  }

  if (key.templateName) {
    const byName = templates.find((template) => template.templateName === key.templateName)
    if (byName) {
      return byName
    }
  }

  return null
}

export function isTemplatePublished(
  template: SavedMasterTemplate,
  catalogItems = getProviderCatalogItems(),
): boolean {
  return catalogItems.some((item) => item.templateRefId === template.templateRefId)
}

export function getBmaasTemplateStatus(
  template: SavedMasterTemplate,
  savedTemplates: SavedMasterTemplate[] = getProviderSavedTemplates(),
  catalogItems = getProviderCatalogItems(),
): BmaasTemplateStatus {
  if (isTemplatePublished(template, catalogItems)) {
    return 'published'
  }

  const isSaved = savedTemplates.some((item) => item.templateRefId === template.templateRefId)
  return isSaved ? 'private' : 'draft'
}

export function getTemplateNetworkDefaults(hardwareProfileId: string): BlueprintFormState {
  return getBlueprintFormForHardwareProfile(hardwareProfileId)
}

export function toBlueprintFormFromTemplate(template: SavedMasterTemplate): BlueprintFormState {
  const networkDefaults = getBlueprintFormForHardwareProfile(template.hardwareProfileId)
  const rateCard = resolveRateCard(template)

  return {
    ...networkDefaults,
    templateName: template.templateName,
    description: template.description,
    hardwareProfileId: template.hardwareProfileId,
    osImage: template.osImageId,
    hourlyRate: String(rateCard.hourlyRate),
    monthlyRate: String(rateCard.monthlyRate),
    currency: rateCard.currency,
  }
}

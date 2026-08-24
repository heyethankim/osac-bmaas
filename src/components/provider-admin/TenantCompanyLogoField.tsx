import { useState } from 'react'
import {
  FileUpload,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core'

const COMPANY_LOGO_MAX_BYTES = 1024 * 1024

const COMPANY_LOGO_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/svg+xml': ['.svg'],
}

type TenantCompanyLogoFieldProps = {
  id: string
  logoSrc: string
  logoFileName: string
  onLogoChange: (patch: { logoSrc?: string; logoFileName?: string }) => void
  helperText?: string
  hideLabel?: boolean
}

export function TenantCompanyLogoField({
  id,
  logoSrc,
  logoFileName,
  onLogoChange,
  helperText,
  hideLabel = false,
}: TenantCompanyLogoFieldProps) {
  const [rejected, setRejected] = useState(false)
  const helper = rejected ? 'Use a PNG, SVG, or JPEG up to 1 MB.' : helperText

  return (
    <FormGroup label={hideLabel ? undefined : 'Company logo'} fieldId={id}>
      <FileUpload
        id={id}
        type="dataURL"
        value={logoSrc}
        filename={logoFileName}
        filenamePlaceholder="PNG, SVG, or JPEG"
        filenameAriaLabel="Company logo"
        browseButtonText="Upload"
        clearButtonText="Remove"
        hideDefaultPreview
        dropzoneProps={{
          accept: COMPANY_LOGO_ACCEPT,
          maxSize: COMPANY_LOGO_MAX_BYTES,
          onDropRejected: () => setRejected(true),
        }}
        validated={rejected ? 'error' : 'default'}
        onFileInputChange={(_event, file) => {
          setRejected(false)
          onLogoChange({ logoFileName: file.name })
        }}
        onDataChange={(_event, data) => {
          onLogoChange({ logoSrc: data })
        }}
        onClearClick={() => {
          setRejected(false)
          onLogoChange({ logoSrc: '', logoFileName: '' })
        }}
      >
        {logoSrc ? (
          <div className="provider-admin-organizations__logo-preview">
            <img src={logoSrc} alt="" />
          </div>
        ) : null}
      </FileUpload>
      {helper ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={rejected ? 'error' : 'default'}>{helper}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </FormGroup>
  )
}

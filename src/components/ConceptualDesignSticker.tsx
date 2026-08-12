import { createPortal } from 'react-dom'

/** Fixed bottom-left badge on every route; portaled to body above app chrome. */
export function ConceptualDesignSticker() {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="bmaas-conceptual-design-sticker--floating"
      aria-hidden
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 2147483646,
        pointerEvents: 'none',
      }}
    >
      <span
        className="osac-shell-sidebar-sticker__label"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '1.45rem',
          padding: '0.2rem 0.65rem',
          borderRadius: '0.2rem',
          background: '#ee00ea',
          color: '#fff',
          fontSize: '0.72rem',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '0.015em',
          whiteSpace: 'nowrap',
        }}
      >
        Conceptual design
      </span>
    </div>,
    document.body,
  )
}

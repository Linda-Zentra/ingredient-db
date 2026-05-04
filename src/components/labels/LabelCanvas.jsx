import { createPortal } from 'react-dom'
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TEMPLATES, DEFAULT_TEMPLATE, DEFAULT_THEME, PFT_SECTIONS, FLIP_SIZE, mm } from '../../lib/labelTemplates'
import { measureSectionHeights, computeLayout } from '../../lib/labelLayout'
import PFT from './PFT'

const DEFAULT_PDP = {
  product_name:   { visible: true, fontSize: 9 },
  dosage_form:    { visible: true, fontSize: 7 },
  npn:            { visible: true, fontSize: 6.5 },
  net_quantity:   { visible: true, fontSize: 7 },
  licence_holder: { visible: true, fontSize: 6 },
  logo:           { size: 12 },
  image:          { size: 20 },
}

function pdp(config, key, pdpScale) {
  const base = { ...DEFAULT_PDP[key], ...config?.[key] }
  if (pdpScale !== 1 && base.fontSize) {
    return { ...base, fontSize: +(base.fontSize * pdpScale).toFixed(1) }
  }
  if (pdpScale !== 1 && base.size) {
    return { ...base, size: +(base.size * pdpScale).toFixed(1) }
  }
  return base
}

const LabelCanvas = forwardRef(function LabelCanvas(
  { data, contact = null, templateKey = DEFAULT_TEMPLATE, theme: themeProp = null, logoUrl = null, imageUrl = null, canvasScale = 1, onModeChange, pdpConfig = null, netQuantity = null, productName = null },
  ref
) {
  const tpl     = TEMPLATES[templateKey]
  const theme   = { ...DEFAULT_THEME, ...themeProp }
  const s       = tpl.pdpScale
  const canvasW = mm(tpl.w)
  const canvasH = mm(tpl.h)

  const pft1H = mm(tpl.pft1.h)
  const pft2H = mm(tpl.pft2.h)
  const zoneW = mm(tpl.pft1.w)

  const [mode, setMode]         = useState('bilingual')
  const [pft1Keys, setPft1Keys] = useState(PFT_SECTIONS)
  const [pft2Keys, setPft2Keys] = useState([])
  const [enKeys, setEnKeys]     = useState({ pft1: PFT_SECTIONS, pft2: [] })
  const [frKeys, setFrKeys]     = useState({ pft1: PFT_SECTIONS, pft2: [] })

  const [logoPos,  setLogoPos]  = useState(null)
  const [imagePos, setImagePos] = useState(null)

  useEffect(() => { setLogoPos(null); setImagePos(null) }, [templateKey])

  const internalRef = useRef(null)
  function setRefs(el) {
    internalRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  const LOGO_SIZE  = mm(pdp(pdpConfig, 'logo', s).size)
  const IMAGE_SIZE = mm(pdp(pdpConfig, 'image', s).size)

  function logoDefault() {
    const cx = mm(tpl.center.x) + mm(tpl.center.w) / 2
    return { x: cx - LOGO_SIZE / 2, y: mm(tpl.center.y) + mm(6 * s) }
  }
  function imageDefault() {
    const cx = mm(tpl.center.x) + mm(tpl.center.w) / 2
    return { x: cx - IMAGE_SIZE / 2, y: canvasH / 2 + mm(2) }
  }

  function makeDrag(setter, getPos) {
    return (e) => {
      e.preventDefault()
      const pos = getPos()
      const rect = internalRef.current?.getBoundingClientRect()
      if (!rect) return
      const ox = (e.clientX - rect.left) / canvasScale - pos.x
      const oy = (e.clientY - rect.top)  / canvasScale - pos.y

      function onMove(ev) {
        const r = internalRef.current?.getBoundingClientRect()
        if (!r) return
        setter({
          x: (ev.clientX - r.left) / canvasScale - ox,
          y: (ev.clientY - r.top)  / canvasScale - oy,
        })
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  const handleLogoDrag  = makeDrag(setLogoPos,  () => logoPos  ?? logoDefault())
  const handleImageDrag = makeDrag(setImagePos, () => imagePos ?? imageDefault())

  const measureBiRef = useRef(null)
  const measureEnRef = useRef(null)
  const measureFrRef = useRef(null)

  useLayoutEffect(() => {
    if (!data) {
      setMode('bilingual')
      setPft1Keys(PFT_SECTIONS)
      setPft2Keys([])
      return
    }
    if (!measureBiRef.current) return

    const biHeights = measureSectionHeights(measureBiRef.current)
    const biLayout = computeLayout(biHeights, pft1H, pft2H)

    if (biLayout.fits) {
      setMode('bilingual')
      onModeChange?.('bilingual', biLayout)
      setPft1Keys(biLayout.pft1Keys.length > 0 ? biLayout.pft1Keys : PFT_SECTIONS)
      setPft2Keys(biLayout.pft2Keys)
      return
    }

    if (!measureEnRef.current || !measureFrRef.current) return

    const enHeights = measureSectionHeights(measureEnRef.current)
    const frHeights = measureSectionHeights(measureFrRef.current)
    const enLayout = computeLayout(enHeights, pft1H, pft2H)
    const frLayout = computeLayout(frHeights, pft1H, pft2H)

    setMode('split')
    onModeChange?.('split', { en: enLayout, fr: frLayout })
    setEnKeys({ pft1: enLayout.pft1Keys.length > 0 ? enLayout.pft1Keys : PFT_SECTIONS, pft2: enLayout.pft2Keys })
    setFrKeys({ pft1: frLayout.pft1Keys.length > 0 ? frLayout.pft1Keys : PFT_SECTIONS, pft2: frLayout.pft2Keys })
  }, [data, contact, tpl, pft1H, pft2H])

  function zone(z) {
    return {
      position: 'absolute',
      left:     mm(z.x),
      top:      mm(z.y),
      width:    mm(z.w),
      height:   mm(z.h),
      overflow: 'hidden',
      display:  'flex',
      flexDirection: 'column',
    }
  }

  function FlipIndicator() {
    const size = mm(FLIP_SIZE * s)
    return (
      <div style={{
        position: 'absolute', right: 0, bottom: 0,
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 7 * s, color: '#64748b', lineHeight: 1,
      }}>↻</div>
    )
  }

  function DraggableOverlays({ draggable = false }) {
    const lp = logoPos  ?? logoDefault()
    const ip = imagePos ?? imageDefault()

    return (
      <>
        <div
          onMouseDown={draggable ? handleLogoDrag : undefined}
          style={{
            position: 'absolute', left: lp.x, top: lp.y,
            width: LOGO_SIZE, height: LOGO_SIZE,
            cursor: draggable ? 'grab' : 'default',
            userSelect: 'none',
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} alt="logo" />
          ) : (
            <div style={{ width: '100%', height: '100%', border: '1px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 7 * s, color: '#94a3b8', pointerEvents: 'none' }}>Logo</span>
            </div>
          )}
        </div>

        {imageUrl && (
          <div
            onMouseDown={draggable ? handleImageDrag : undefined}
            style={{
              position: 'absolute', left: ip.x, top: ip.y,
              width: IMAGE_SIZE, height: IMAGE_SIZE,
              cursor: draggable ? 'grab' : 'default',
              userSelect: 'none',
            }}
          >
            <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} alt="product" />
          </div>
        )}
      </>
    )
  }

  function renderLabel({ labelRef, pftLeft, pftRight, lang, bilingual, isSecond = false, showFlip = false }) {
    return (
      <div
        ref={labelRef}
        style={{
          position: 'relative', width: canvasW, height: canvasH,
          background: theme.canvasBg, boxSizing: 'border-box',
          outline: isSecond ? '1px dashed #cbd5e1' : undefined,
        }}
      >
        <div style={zone(tpl.pft1)}>
          {data && pftLeft.length > 0 && (
            <PFT data={data} contact={!isSecond ? contact : null} lang={lang} bilingual={bilingual} sectionKeys={pftLeft} isContinued={isSecond} fontFamily={theme.pftFontFamily} />
          )}
        </div>

        <div style={{
          ...zone(tpl.center),
          background: theme.centerBg,
          alignItems: 'center', justifyContent: 'center', gap: mm(1 * s),
        }}>
          {pdp(pdpConfig, 'product_name', s).visible && (
            <div style={{ position: 'relative', textAlign: 'center', fontSize: pdp(pdpConfig, 'product_name', s).fontSize, fontWeight: 700, lineHeight: 1.2, maxWidth: '90%', color: theme.centerTextColor }}>
              {productName || data?.product_name || 'Product Name'}
            </div>
          )}
          {pdp(pdpConfig, 'dosage_form', s).visible && data?.dosage_form_type && (
            <div style={{ position: 'relative', fontSize: pdp(pdpConfig, 'dosage_form', s).fontSize, color: theme.centerSubColor, textAlign: 'center' }}>
              {[data.dosage_form_type, data.dosage_form_subtype].filter(Boolean).join(' · ')}
            </div>
          )}
          {pdp(pdpConfig, 'npn', s).visible && data?.npn && (
            <div style={{ position: 'relative', fontSize: pdp(pdpConfig, 'npn', s).fontSize, color: theme.centerSubColor }}>
              NPN {data.npn}
            </div>
          )}
          {pdp(pdpConfig, 'net_quantity', s).visible && netQuantity && (
            <div style={{ position: 'relative', fontSize: pdp(pdpConfig, 'net_quantity', s).fontSize, color: theme.centerSubColor }}>
              {netQuantity}
            </div>
          )}
        </div>

        {data && pftRight.length > 0 && (
          <div style={{
            position: 'absolute', left: mm(tpl.pft2.x), top: mm(tpl.pft2.y),
            width: mm(tpl.pft2.w), maxHeight: mm(tpl.pft2.h),
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <PFT data={data} contact={null} lang={lang} bilingual={bilingual} sectionKeys={pftRight} isContinued={true} fontFamily={theme.pftFontFamily} />
            {showFlip && <FlipIndicator />}
          </div>
        )}

        <DraggableOverlays draggable={!isSecond} />
      </div>
    )
  }

  const measureStyle = {
    position: 'fixed', top: -9999, left: -9999,
    width: zoneW, visibility: 'hidden', pointerEvents: 'none',
    fontFamily: theme.pftFontFamily,
  }

  const measurePortal = data ? createPortal(
    <>
      <div ref={measureBiRef} style={measureStyle}>
        <PFT data={data} contact={contact} lang="en" bilingual sectionKeys={PFT_SECTIONS} fontFamily={theme.pftFontFamily} />
      </div>
      <div ref={measureEnRef} style={measureStyle}>
        <PFT data={data} contact={contact} lang="en" bilingual={false} sectionKeys={PFT_SECTIONS} fontFamily={theme.pftFontFamily} />
      </div>
      <div ref={measureFrRef} style={measureStyle}>
        <PFT data={data} contact={null} lang="fr" bilingual={false} sectionKeys={PFT_SECTIONS} fontFamily={theme.pftFontFamily} />
      </div>
    </>,
    document.body
  ) : null

  return (
    <>
      {measurePortal}

      {mode === 'bilingual' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: mm(2) }}>
          {renderLabel({ labelRef: setRefs, pftLeft: pft1Keys, pftRight: pft2Keys, lang: 'en', bilingual: true })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: mm(2) }}>
          {renderLabel({ labelRef: setRefs, pftLeft: enKeys.pft1, pftRight: enKeys.pft2, lang: 'en', bilingual: false, showFlip: true })}
          {renderLabel({ labelRef: null, pftLeft: frKeys.pft1, pftRight: frKeys.pft2, lang: 'fr', bilingual: false, isSecond: true })}
        </div>
      )}
    </>
  )
})

export default LabelCanvas
export { DEFAULT_PDP }

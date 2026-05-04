export const PX_PER_MM = 96 / 25.4

export const PFT_SECTIONS = ['medicinal', 'uses', 'warnings', 'directions', 'otherInfo', 'nonMedicinal', 'contact']

export const BLEED    = 0
export const BLEED_LR = 0
export const FLIP_SIZE = 10

const PFT1_RATIO = 0.31
const PFT2_RATIO = 0.31

function makeLayout(w, h) {
  const pft1W = Math.round(w * PFT1_RATIO)
  const pft2W = Math.round(w * PFT2_RATIO)
  return {
    pft1:   { x: BLEED_LR, y: BLEED, w: pft1W, h },
    center: { x: BLEED_LR + pft1W, y: 0, w: w - 2 * BLEED_LR - pft1W - pft2W, h },
    pft2:   { x: w - BLEED_LR - pft2W, y: BLEED, w: pft2W, h },
  }
}

const BASE_W = 145

function sizeTemplate(label, w, h) {
  return {
    label,
    w,
    h,
    ...makeLayout(w, h),
    pdpScale: w / BASE_W,
  }
}

export const TEMPLATES = {
  xs: sizeTemplate('80 × 45 mm',   80,  45),
  sm: sizeTemplate('110 × 60 mm', 110,  60),
  md: sizeTemplate('145 × 80 mm', 145,  80),
  lg: sizeTemplate('180 × 100 mm', 180, 100),
  xl: sizeTemplate('220 × 120 mm', 220, 120),
}

export const DEFAULT_TEMPLATE = 'md'

export const DEFAULT_THEME = {
  canvasBg:        '#ffffff',
  centerBg:        '#ffffff',
  centerTextColor: '#0f172a',
  centerSubColor:  '#64748b',
  pftFontFamily:   'Arial, Helvetica, sans-serif',
  decorations:     [],
}

export function mm(val) {
  return val * PX_PER_MM
}

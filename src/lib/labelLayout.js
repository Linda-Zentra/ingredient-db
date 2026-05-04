import { PFT_SECTIONS } from './labelTemplates'

const REQUIRED_ON_LABEL = new Set([
  'medicinal',
  'warnings',
  'directions',
  'contact',
])

const DISPLACEMENT_ORDER = [
  'nonMedicinal',
  'otherInfo',
  'uses',
]

export function measureSectionHeights(container) {
  const heights = {}
  heights._title = container.querySelector('[data-pft-title]')?.getBoundingClientRect().height ?? 0
  for (const key of PFT_SECTIONS) {
    const el = container.querySelector(`[data-section="${key}"]`)
    heights[key] = el ? el.getBoundingClientRect().height : 0
  }
  return heights
}

function fitSections(keys, heights, pft1MaxH, pft2MaxH) {
  const titleH = heights._title ?? 0
  let acc = titleH
  const pft1 = []
  const pft2 = []
  const spill = []
  let inPft2 = false
  let pft2Acc = titleH

  for (const key of keys) {
    const h = heights[key] ?? 0
    if (h === 0) continue

    if (!inPft2 && acc + h <= pft1MaxH) {
      acc += h
      pft1.push(key)
    } else {
      inPft2 = true
      if (pft2Acc + h <= pft2MaxH) {
        pft2Acc += h
        pft2.push(key)
      } else {
        spill.push(key)
      }
    }
  }

  return { pft1, pft2, spill }
}

export function computeLayout(heights, pft1MaxH, pft2MaxH) {
  const allKeys = PFT_SECTIONS.filter(k => (heights[k] ?? 0) > 0)

  const full = fitSections(allKeys, heights, pft1MaxH, pft2MaxH)
  if (full.spill.length === 0) {
    return { pft1Keys: full.pft1, pft2Keys: full.pft2, displaced: [], fits: true }
  }

  let remaining = [...allKeys]
  const displaced = []

  for (const key of DISPLACEMENT_ORDER) {
    if (!remaining.includes(key)) continue
    remaining = remaining.filter(k => k !== key)
    displaced.push(key)

    const attempt = fitSections(remaining, heights, pft1MaxH, pft2MaxH)
    if (attempt.spill.length === 0) {
      return { pft1Keys: attempt.pft1, pft2Keys: attempt.pft2, displaced, fits: true }
    }
  }

  const final = fitSections(remaining, heights, pft1MaxH, pft2MaxH)
  return {
    pft1Keys: final.pft1,
    pft2Keys: final.pft2,
    displaced,
    fits: false,
  }
}

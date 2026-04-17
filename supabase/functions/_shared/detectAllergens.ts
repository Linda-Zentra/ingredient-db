/**
 * detectAllergens.ts
 *
 * Detects HC-defined food allergens from a natural health product ingredient name.
 * Covers both medicinal ingredients (use name + source_material combined)
 * and non-medicinal ingredients (use name only).
 *
 * HC allergen categories (subsection 91.2 of NHP Regulations):
 *   milk, egg, peanut, tree_nuts, sesame, wheat_gluten,
 *   soy, possible_soy, shellfish, mollusc, fish, mustard, sulphites
 *
 * Usage:
 *   detectAllergens("Lactose")
 *   → ["milk"]
 *
 *   detectAllergens("Lecithin")
 *   → ["possible_soy"]   // source unknown, flag for confirmation
 *
 *   detectAllergens("Soy lecithin")
 *   → ["soy"]
 */

export type AllergenType =
  | 'milk'
  | 'egg'
  | 'peanut'
  | 'tree_nuts'
  | 'sesame'
  | 'wheat_gluten'
  | 'soy'
  | 'possible_soy'
  | 'shellfish'
  | 'mollusc'
  | 'fish'
  | 'mustard'
  | 'sulphites'

type AllergenRule = {
  type: AllergenType
  patterns: RegExp[]
}

const ALLERGEN_RULES: AllergenRule[] = [
  {
    type: 'milk',
    patterns: [
      /\bmilk\b/i,
      /\bdairy\b/i,
      /\blactose\b/i,
      /\bcasein\b/i,
      /\bwhey\b/i,
      /\blactalbumin\b/i,
      /\blactoglobulin\b/i,
      /\banhydrous milk\b/i,
      /\bskim milk\b/i,
      /\buttermilk\b/i,
      /\bsodium caseinate\b/i,
      /\bcalcium caseinate\b/i,
    ],
  },
  {
    type: 'egg',
    patterns: [
      /\begg(shell)?\b/i,
      /\bovalbumin\b/i,
      /\bovomucin\b/i,
      /\begg white\b/i,
      /\begg yolk\b/i,
      /\begg albumin\b/i,
    ],
  },
  {
    type: 'peanut',
    patterns: [
      /\bpeanut\b/i,
      /\bgroundnut\b/i,
      /\barachis\b/i,
    ],
  },
  {
    type: 'tree_nuts',
    patterns: [
      /\balmond\b/i,
      /\bcashew\b/i,
      /\bwalnut\b/i,
      /\bhazelnut\b/i,
      /\bpecan\b/i,
      /\bpistachio\b/i,
      /\bmacadamia\b/i,
      /\bbrazil nut\b/i,
      /\bpine nut\b/i,
    ],
  },
  {
    type: 'sesame',
    patterns: [
      /\bsesame\b/i,
      /\btahini\b/i,
    ],
  },
  {
    type: 'wheat_gluten',
    patterns: [
      /\bwheat\b/i,
      /\bgluten\b/i,
      /\btriticale\b/i,
      /\bspelt\b/i,
      /\bkamut\b/i,
      /\bfarro\b/i,
      /\bbarley\b/i,
      /\brye\b/i,
      /\boats?\b/i,
      /\bavena\b/i,
    ],
  },
  {
    type: 'shellfish',
    patterns: [
      /\bshrimp\b/i,
      /\bcrab\b/i,
      /\blobster\b/i,
      /\bprawn\b/i,
      /\bkrill\b/i,
      /\bcrayfish\b/i,
      /\bcrustacean\b/i,
      /\bshellfish\b/i,
    ],
  },
  {
    type: 'mollusc',
    patterns: [
      /\bclam\b/i,
      /\boyster\b/i,
      /\bmussel\b/i,
      /\bscallop\b/i,
      /\bsquid\b/i,
      /\boctopus\b/i,
      /\bmollusc\b/i,
      /\bmollusk\b/i,
      /\babalone\b/i,
    ],
  },
  {
    type: 'fish',
    patterns: [
      /\bfish\b/i,
      /\bsalmon\b/i,
      /\btuna\b/i,
      /\bcod\b/i,
      /\banchov/i,
      /\bsardine\b/i,
      /\bherring\b/i,
      /\bhalibut\b/i,
      /\btilapia\b/i,
      /\btrout\b/i,
      /\bmackerel\b/i,
      /\bpollock\b/i,
    ],
  },
  {
    type: 'mustard',
    patterns: [
      /\bmustard\b/i,
      /\bsinapis\b/i,
    ],
  },
  {
    type: 'sulphites',
    patterns: [
      /\bsulfit/i,
      /\bsulfite/i,
      /\bsulphit/i,
      /\bsulphur dioxide\b/i,
      /\bsulfur dioxide\b/i,
    ],
  },
]

export function detectAllergens(
  name: string,
  sourceMaterial?: string
): AllergenType[] {
  const text = [name, sourceMaterial ?? ''].join(' ').toLowerCase()
  const found = new Set<AllergenType>()

  const hasSoyKeyword = /\bsoy\b|\bsoya\b|\bsoybean\b|\bglycine (max|soja)\b/i.test(text)
  const hasLecithin = /\blecithin\b/i.test(text)
  const hasSunflower = /\bsunflower\b/i.test(text)

  if (hasSoyKeyword) {
    found.add('soy')
  } else if (hasLecithin && !hasSunflower) {
    found.add('possible_soy')
  }

  for (const rule of ALLERGEN_RULES) {
    if (rule.patterns.some(p => p.test(text))) {
      found.add(rule.type)
    }
  }

  return Array.from(found)
}

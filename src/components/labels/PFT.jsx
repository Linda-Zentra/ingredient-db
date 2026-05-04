import { useMemo } from 'react'
import { PFT_SECTIONS } from '../../lib/labelTemplates'
import {
  formatMedicinalIngredient,
  sortMedicinalIngredients,
  formatAllergenStatement,
  formatExcipientWithAllergen,
  buildPerDoseStatement,
  splitPurposes,
  collectAllergens,
} from '../../lib/ingredientFormatters'

const L = {
  title:        { en: 'Product Facts',             fr: 'Info-produit' },
  medicinal:    { en: 'Medicinal ingredients',     fr: 'Ingrédient(s) médicinal (médicinaux)' },
  uses:         { en: 'Uses',                      fr: 'Usage(s)' },
  warnings:     { en: 'Warnings',                  fr: 'Mise(s) en garde' },
  directions:   { en: 'Directions',                fr: "Mode d'emploi" },
  otherInfo:    { en: 'Other information',          fr: 'Autres renseignements' },
  nonMedicinal: { en: 'Non-medicinal ingredients', fr: 'Ingrédient(s) non médicinal (médicinaux)' },
  keepOut:      { en: 'Keep out of reach of children.', fr: 'Gardez hors de la portée des enfants.' },
  questions:    { en: 'Questions?',                fr: 'Questions?' },
  sub: {
    do_not_use:        { en: 'Do not use',                                                fr: "Ne pas utiliser" },
    ask_before_use:    { en: 'Ask a health care practitioner before use if',              fr: "Consultez un praticien de soins de santé avant l'utilisation (si)" },
    when_using:        { en: 'When using this product',                                   fr: "Lorsque vous utilisez ce produit" },
    stop_use:          { en: 'Stop use and ask a health care practitioner if',            fr: "Cessez d'utiliser et consultez un praticien de soins de santé (si)" },
    known_adverse:     { en: 'Known adverse reactions',                                   fr: 'Réactions indésirables connues' },
  },
}

function SectionHeading({ en, fr, bilingual, inline }) {
  return (
    <div className="px-1 py-px" style={{ borderTop: '1.5pt solid black' }}>
      <div className="font-bold text-[7pt] leading-tight">
        {bilingual ? `${en} / ${fr}` : en}{inline ? ` ${inline}` : ''}
      </div>
    </div>
  )
}

function WarnLines({ items }) {
  return items.map((s, i) => (
    <div key={i} className="px-1 py-px text-[6pt] leading-tight">{s}</div>
  ))
}

function WarnBucket({ en, fr, bilingual, items }) {
  if (!items?.length) return null
  const heading = bilingual && fr ? `${en} / ${fr}` : en
  return (
    <div className="px-1 py-px text-[6pt] leading-tight" style={{ borderTop: '0.375pt solid black', marginLeft: '1em', marginRight: '1em' }}>
      <span className="font-bold">{heading}</span>
      {items.map((s, i) => (
        <span key={i}> &bull; {s}</span>
      ))}
    </div>
  )
}

export default function PFT({ data, contact = null, lang = 'en', bilingual = false, sectionKeys = PFT_SECTIONS, isContinued = false, scale = 1, fontFamily = 'sans-serif' }) {
  const d = data ?? {}

  const medicinalRows = useMemo(
    () => sortMedicinalIngredients(d.product_ingredients ?? []),
    [d.product_ingredients]
  )

  const excipients = useMemo(
    () => [...(d.product_excipients ?? [])].sort((a, b) =>
      (a.excipients?.name ?? '').localeCompare(b.excipients?.name ?? '')
    ),
    [d.product_excipients]
  )

  const perDoseStatement = buildPerDoseStatement(d)

  function formatDirections() {
    if (!d.dose_amount) return null
    const amount  = `${d.dose_amount} ${d.dose_unit ?? ''}`.trim()
    const freqMin = d.dose_freq_min ?? ''
    const freqMax = d.dose_freq_max ?? ''
    const unit    = d.dose_freq_unit ?? ''
    const timesStr = freqMax && freqMax !== freqMin ? `${freqMin}-${freqMax}` : freqMin
    const maxNum   = Number(freqMax || freqMin)
    const freq     = timesStr
      ? (timesStr === '1' ? unit : `${timesStr} time${maxNum > 1 ? 's' : ''} ${unit}`).trim()
      : ''
    const subpop = d.dose_population ? `${d.dose_population}: ` : ''
    return `${subpop}Take ${amount} ${freq}`.trim()
  }

  const directionsText = formatDirections()
  const purposesEn = splitPurposes(d.purposes_en)
  const purposesFr = splitPurposes(d.purposes_fr)

  // Warnings
  const warnSubs = [
    { key: 'do_not_use',     items: d.do_not_use_en     ?? [] },
    { key: 'ask_before_use', items: d.ask_before_use_en ?? [] },
    { key: 'when_using',     items: d.when_using_en     ?? [] },
    { key: 'stop_use',       items: d.stop_use_en       ?? [] },
    { key: 'known_adverse',  items: d.known_adverse_en  ?? [] },
  ].filter(s => s.items.length > 0)

  const allergenTypes = collectAllergens(d.product_ingredients, d.product_excipients)
  const allergenStatement = formatAllergenStatement(allergenTypes)

  const preSubWarnings = [
    ...(d.for_external_use_en ? [d.for_external_use_en] : []),
  ]
  const postSubWarnings = [...(d.other_warnings_en ?? [])]
  const hasWarnings = preSubWarnings.length > 0 || allergenStatement || warnSubs.length > 0 || postSubWarnings.length > 0

  const otherInfoItems = d.other_information_en ?? []
  const has = key => sectionKeys.includes(key)

  return (
    <div className="bg-white text-[#0f172a] w-full overflow-hidden" style={{ fontFamily: 'Arial, Helvetica, sans-serif', border: '1.5pt solid black', ...(scale !== 1 ? { zoom: scale } : {}) }}>

      <div data-pft-title className="px-1 py-px" style={{ borderBottom: '1.5pt solid black' }}>
        {bilingual ? (
          <div className="font-bold text-[8pt] leading-tight">
            {L.title.en}{isContinued ? ' (continued)' : ''} / {L.title.fr}{isContinued ? ' (suite)' : ''}
          </div>
        ) : (
          <div className="font-bold text-[8pt] leading-tight">
            {L.title[lang] ?? L.title.en}{isContinued ? (lang === 'fr' ? ' (suite)' : ' (continued)') : ''}
          </div>
        )}
      </div>

      {has('medicinal') && (
        <div data-section="medicinal">
          <SectionHeading en={L.medicinal.en} fr={L.medicinal.fr} bilingual={bilingual} inline={perDoseStatement} />
          <div className="px-1 py-px space-y-px">
            {medicinalRows.filter(row => row.ingredients).map((row, i) => {
              const { nameCol, qtyCol, line2 } = formatMedicinalIngredient(row)
              return (
                <div key={i} className="text-[6pt] leading-tight">
                  <div className="flex justify-between items-baseline gap-1">
                    <span>{nameCol}</span>
                    <span className="shrink-0 tabular-nums">{qtyCol}</span>
                  </div>
                  {line2 && <div className="text-[5.5pt] leading-tight pl-2">{line2}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {has('uses') && purposesEn.length > 0 && (
        <div data-section="uses">
          <SectionHeading en={L.uses.en} fr={L.uses.fr} bilingual={bilingual} />
          <div className="px-1 py-px text-[6pt] leading-tight space-y-px">
            {purposesEn.map((p, i) => <div key={i}>{p}</div>)}
            {bilingual && purposesFr.length > 0 && (
              <div className="mt-px">
                {purposesFr.map((p, i) => <div key={i}>{p}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {has('warnings') && hasWarnings && (
        <div data-section="warnings">
          <SectionHeading en={L.warnings.en} fr={L.warnings.fr} bilingual={bilingual} />
          {preSubWarnings.length > 0 && <WarnLines items={preSubWarnings} />}
          {allergenStatement && (
            <div className="px-1 py-px text-[6pt] leading-tight font-bold" style={{ borderTop: '0.375pt solid black', marginLeft: '1em', marginRight: '1em' }}>
              {allergenStatement}
            </div>
          )}
          {warnSubs.map(s => (
            <WarnBucket key={s.key} en={L.sub[s.key].en} fr={L.sub[s.key].fr} bilingual={bilingual} items={s.items} />
          ))}
          <div className="px-1 py-px text-[6pt] leading-tight font-bold" style={{ borderTop: '0.375pt solid black', marginLeft: '1em', marginRight: '1em' }}>
            {bilingual ? `${L.keepOut.en} / ${L.keepOut.fr}` : L.keepOut[lang] ?? L.keepOut.en}
          </div>
          {d.keep_out_overdose_en && (
            <div className="px-1 pb-px text-[6pt] leading-tight">{d.keep_out_overdose_en}</div>
          )}
          {postSubWarnings.length > 0 && <WarnLines items={postSubWarnings} />}
        </div>
      )}

      {has('directions') && directionsText && (
        <div data-section="directions">
          <SectionHeading en={L.directions.en} fr={L.directions.fr} bilingual={bilingual} />
          <div className="px-1 py-px text-[6pt] leading-tight">{directionsText}</div>
        </div>
      )}

      {has('otherInfo') && otherInfoItems.length > 0 && (
        <div data-section="otherInfo">
          <SectionHeading en={L.otherInfo.en} fr={L.otherInfo.fr} bilingual={bilingual} />
          <div className="px-1 py-px text-[6pt] leading-tight">
            {otherInfoItems.map((item, i) => (
              <span key={i}>{i > 0 ? ' · ' : ''}{item}</span>
            ))}
          </div>
        </div>
      )}

      {has('nonMedicinal') && excipients.length > 0 && (
        <div data-section="nonMedicinal">
          <SectionHeading en={L.nonMedicinal.en} fr={L.nonMedicinal.fr} bilingual={bilingual} />
          <div className="px-1 py-px text-[5.5pt] leading-tight">
            {excipients.map((row, i) => (
              <span key={i}>
                {i > 0 ? ', ' : ''}
                {formatExcipientWithAllergen(row, lang)}
              </span>
            ))}
          </div>
        </div>
      )}

      {has('contact') && (
        <div data-section="contact">
          <div className="px-1 py-px text-[5.5pt] leading-tight" style={{ borderTop: '1.5pt solid black' }}>
            {contact ? (
              <div>
                {contact.is_distributor && (
                  <div>Distributed by: {contact.company_name}{contact.location ? `, ${contact.location}` : ''}</div>
                )}
                <span className="font-bold">{L.questions[lang] ?? L.questions.en}</span>{' '}
                {contact.email || contact.phone || contact.company_name}
              </div>
            ) : (
              <span className="text-[#94a3b8]">
                <span className="font-bold">Questions?</span> info@zentrastation.com
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

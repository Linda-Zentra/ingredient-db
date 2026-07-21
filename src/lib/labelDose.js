const FREQ_UNIT_FR = {
  daily: "par jour",
  "per day": "par jour",
  "per week": "par semaine",
  weekly: "par semaine",
  "per month": "par mois",
};

export function computeRecommendedDose(prod) {
  if (!prod?.dose_amount && !prod?.dose_amount_max) return "";
  const pop = prod.dose_population || "Adults";
  const doseMin = prod.dose_amount || 1;
  const doseMax = prod.dose_amount_max;
  const amount = doseMax && doseMax !== doseMin ? `${doseMin}-${doseMax}` : `${doseMin}`;
  const unit = prod.dose_unit || "capsule(s)";
  const freqMin = prod.dose_freq_min || "";
  const freqMax = prod.dose_freq_max || "";
  const freqUnit = prod.dose_freq_unit || "daily";
  const times = freqMax && freqMax !== freqMin ? `${freqMin}-${freqMax}` : freqMin;
  const timesStr = times
    ? (String(times) === "1" ? freqUnit : `${times} time(s) ${freqUnit}`)
    : freqUnit;
  return `${pop}: Take ${amount} ${unit} ${timesStr}, or as directed by a health care practitioner.`.trim();
}

export function computeRecommendedDoseFr(prod) {
  if (!prod?.dose_amount && !prod?.dose_amount_max) return "";
  const pop = prod.dose_population === "Adults" ? "Adultes" : (prod.dose_population || "Adultes");
  const doseMin = prod.dose_amount || 1;
  const doseMax = prod.dose_amount_max;
  const amount = doseMax && doseMax !== doseMin ? `${doseMin}-${doseMax}` : `${doseMin}`;
  const unit = prod.dose_unit || "capsule(s)";
  const freqMin = prod.dose_freq_min || "";
  const freqMax = prod.dose_freq_max || "";
  const rawUnit = prod.dose_freq_unit || "daily";
  const freqUnit = FREQ_UNIT_FR[rawUnit.toLowerCase()] || rawUnit;
  const times = freqMax && freqMax !== freqMin ? `${freqMin}-${freqMax}` : freqMin;
  const timesStr = times
    ? (String(times) === "1" ? freqUnit : `${times} fois ${freqUnit}`)
    : freqUnit;
  return `${pop} : Prendre ${amount} ${unit} ${timesStr}, ou selon les directives d'un praticien de soins de santé.`.trim();
}

// FDA Daily Values (2023) — Supplement Facts label reference
// Source: FDA "Daily Value and Percent Daily Value" August 2023
// key 全小写，用于模糊匹配成分名

export const FDA_DV = {
  "vitamin a":        { dv: 900,  unit: "mcg" },
  "vitamin c":        { dv: 90,   unit: "mg"  },
  "vitamin d":        { dv: 20,   unit: "mcg" },
  "vitamin e":        { dv: 15,   unit: "mg"  },
  "vitamin k":        { dv: 120,  unit: "mcg" },
  "thiamin":          { dv: 1.2,  unit: "mg"  },
  "vitamin b1":       { dv: 1.2,  unit: "mg"  },
  "riboflavin":       { dv: 1.3,  unit: "mg"  },
  "vitamin b2":       { dv: 1.3,  unit: "mg"  },
  "niacin":           { dv: 16,   unit: "mg"  },
  "vitamin b3":       { dv: 16,   unit: "mg"  },
  "vitamin b6":       { dv: 1.7,  unit: "mg"  },
  "folate":           { dv: 400,  unit: "mcg" },
  "folic acid":       { dv: 400,  unit: "mcg" },
  "vitamin b12":      { dv: 2.4,  unit: "mcg" },
  "biotin":           { dv: 30,   unit: "mcg" },
  "pantothenic acid": { dv: 5,    unit: "mg"  },
  "vitamin b5":       { dv: 5,    unit: "mg"  },
  "calcium":          { dv: 1300, unit: "mg"  },
  "chromium":         { dv: 35,   unit: "mcg" },
  "copper":           { dv: 0.9,  unit: "mg"  },
  "iodine":           { dv: 150,  unit: "mcg" },
  "iron":             { dv: 18,   unit: "mg"  },
  "magnesium":        { dv: 420,  unit: "mg"  },
  "manganese":        { dv: 2.3,  unit: "mg"  },
  "molybdenum":       { dv: 45,   unit: "mcg" },
  "phosphorus":       { dv: 1250, unit: "mg"  },
  "potassium":        { dv: 4700, unit: "mg"  },
  "selenium":         { dv: 55,   unit: "mcg" },
  "zinc":             { dv: 11,   unit: "mg"  },
  "chloride":         { dv: 2300, unit: "mg"  },
  "choline":          { dv: 550,  unit: "mg"  },
  "sodium":           { dv: 2300, unit: "mg"  },
};

// mg ↔ mcg 换算，其他单位（g、IU 等）返回 null
const convertUnit = (amount, from, to) => {
  const f = from.toLowerCase().trim();
  const t = to.toLowerCase().trim();
  if (f === t) return amount;
  if (f === "mg"  && t === "mcg") return amount * 1000;
  if (f === "mcg" && t === "mg")  return amount / 1000;
  return null;
};

// 返回 %DV 整数；匹配不上或单位无法换算返回 null（显示 †）
export const calcDV = (name, amount, unit) => {
  const nameLower = name.toLowerCase().trim();
  const key = Object.keys(FDA_DV).find(
    k => nameLower === k || nameLower.startsWith(k) || nameLower.includes(k)
  );
  if (!key) return null;
  const ref = FDA_DV[key];
  const converted = convertUnit(parseFloat(amount), unit, ref.unit);
  if (converted === null || isNaN(converted)) return null;
  return Math.round(converted / ref.dv * 100);
};

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import supabase from "./supabase";

async function fetchProductsForExport(productIds) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      product_brands(*),
      product_medicinal_ingredients(*, common_ingredients(id, scientific_name, name_en, name_fr)),
      product_excipients(*, excipients(id, name, name_fr)),
      product_labels(product_name_zh, recommended_use, caution, dose_population, dose_min_age, purposes_en)
    `)
    .in("id", productIds);

  if (error) throw new Error(error.message);
  return data;
}

function getDisplayName(p) {
  const brands = p.product_brands || [];
  const def = brands.find(pb => pb.is_default);
  if (def?.brand_name) return def.brand_name;
  if (brands.length && brands[0].brand_name) return brands[0].brand_name;
  return p.product_labels?.[0]?.product_name_zh || "—";
}

function getDosageForm(p) {
  const t = p.dosage_form_type || "";
  const s = p.dosage_form_subtype || "";
  if (t && s) return `${t}, ${s.toLowerCase()}`;
  return t || "";
}

function formatIngredientLine(pmi) {
  const ci = pmi.common_ingredients;
  const name =
    ci?.name_en && ci.name_en.toLowerCase() !== ci.scientific_name?.toLowerCase()
      ? ci.name_en
      : ci?.scientific_name || "Unknown";

  let line = name;
  if (pmi.amount_value != null) line += ` ${pmi.amount_value} ${pmi.amount_unit || ""}`.trimEnd();

  const details = [];
  if (pmi.extract_ratio) {
    const kind = pmi.extract_type ? pmi.extract_type.toLowerCase() + " " : "dry ";
    details.push(`${pmi.extract_ratio} ${kind}extract`);
  }
  if (pmi.dried_herb_equivalent && pmi.dhe_unit) {
    details.push(`DHE ${pmi.dried_herb_equivalent} ${pmi.dhe_unit}`);
  }
  if (pmi.source_part) details.push(pmi.source_part);
  if (details.length) line += ` (${details.join(", ")})`;

  if (pmi.potency_amount && pmi.potency_label) {
    line += ` [${pmi.potency_amount} ${pmi.potency_label}]`;
  }
  return line.trim();
}

function formatIngredients(p) {
  const items = p.product_medicinal_ingredients || [];
  const sorted = [...items].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  return sorted.map(formatIngredientLine).join("\n");
}

function getRecommendedUse(p) {
  const label = p.product_labels?.[0];
  if (label?.recommended_use) return label.recommended_use;
  if (label?.purposes_en?.length) return label.purposes_en.join("  ");
  return "";
}

// ── Excel ──────────────────────────────────────────────────────────────────

export async function exportProductsExcel(productIds) {
  const products = await fetchProductsForExport(productIds);

  const rows = products.map(p => ({
    "Product Name": getDisplayName(p),
    "NPN": p.npn ? String(p.npn) : "",
    "Dosage Form": getDosageForm(p),
    "Ingredients (amount / details)": formatIngredients(p),
    "Recommended Use": getRecommendedUse(p),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 32 },
    { wch: 12 },
    { wch: 18 },
    { wch: 65 },
    { wch: 80 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, `Products_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── PDF (table) ────────────────────────────────────────────────────────────

export async function exportProductsPDFTable(productIds) {
  const products = await fetchProductsForExport(productIds);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const body = products.map(p => [
    getDisplayName(p),
    p.npn ? String(p.npn) : "",
    getDosageForm(p),
    formatIngredients(p),
    getRecommendedUse(p),
  ]);

  doc.setFontSize(14);
  doc.text("Product Export", 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${new Date().toLocaleDateString()}  ·  ${products.length} products`, 14, 20);
  doc.setTextColor(0);

  doc.autoTable({
    startY: 26,
    head: [["Product Name", "NPN", "Dosage Form", "Ingredients", "Recommended Use"]],
    body,
    styles: { fontSize: 6.5, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { cellWidth: 85 },
      4: { cellWidth: "auto" },
    },
    didDrawPage: () => {
      const pg = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Page ${pg}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 6);
      doc.setTextColor(0);
    },
  });

  doc.save(`Products_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── PDF (catalog cards with product images) ─────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function loadImageAsDataUrl(imagePath) {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/product-images/${imagePath}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function exportProductsPDFCatalog(productIds) {
  const products = await fetchProductsForExport(productIds);

  const imageCache = new Map();
  const imagePaths = products.map(p => p.image_path).filter(Boolean);
  await Promise.all(imagePaths.map(async (path) => {
    const data = await loadImageAsDataUrl(path);
    if (data) imageCache.set(path, data);
  }));

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  const mx = 14;
  const cardW = pw - mx * 2;
  const imgW = 36;
  const imgH = 36;

  let y = 14;

  doc.setFontSize(16);
  doc.text("Product Catalog", mx, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${new Date().toLocaleDateString()}  ·  ${products.length} products`, mx, y);
  doc.setTextColor(0);
  y += 10;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const name = getDisplayName(p);
    const npn = p.npn ? `NPN ${p.npn}` : "";
    const form = getDosageForm(p);
    const ingredients = formatIngredients(p);
    const use = getRecommendedUse(p);

    const ingLines = doc.splitTextToSize(ingredients, cardW - 56);
    const useLines = doc.splitTextToSize(use || "—", cardW - 56);
    const cardH = Math.max(48, 28 + ingLines.length * 3.2 + useLines.length * 3.2 + 14);

    if (y + cardH > ph - 12) {
      doc.addPage();
      y = 14;
    }

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(mx, y, cardW, cardH, 3, 3, "FD");

    // Product image or placeholder
    const imgX = mx + 4;
    const imgY = y + 4;
    const imgData = p.image_path ? imageCache.get(p.image_path) : null;

    if (imgData) {
      doc.addImage(imgData, imgX, imgY, imgW, imgH);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, "S");
    } else {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, "FD");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("No Image", imgX + imgW / 2, imgY + imgH / 2 + 1, { align: "center" });
      doc.setTextColor(0);
    }

    // Text content (right side)
    const tx = mx + imgW + 10;
    let ty = y + 7;

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(name, tx, ty);
    doc.setFont(undefined, "normal");

    ty += 5;
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    const meta = [npn, form].filter(Boolean).join("  ·  ");
    doc.text(meta, tx, ty);
    doc.setTextColor(0);

    ty += 6;
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.text("Ingredients:", tx, ty);
    doc.setFont(undefined, "normal");
    ty += 3.5;
    doc.setFontSize(6.5);
    doc.text(ingLines, tx, ty);
    ty += ingLines.length * 3.2 + 2;

    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.text("Recommended Use:", tx, ty);
    doc.setFont(undefined, "normal");
    ty += 3.5;
    doc.setFontSize(6.5);
    doc.text(useLines, tx, ty);

    y += cardH + 4;
  }

  doc.save(`Product_Catalog_${new Date().toISOString().slice(0, 10)}.pdf`);
}

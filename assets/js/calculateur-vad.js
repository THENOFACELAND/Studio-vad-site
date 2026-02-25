// Calculateur VAD: TDEE + Macros + Export PDF (front only)

const form = document.getElementById("calcForm");
const resultsBox = document.getElementById("resultsBox");

const outBmr = document.getElementById("outBmr");
const outTdee = document.getElementById("outTdee");
const outCals = document.getElementById("outCals");
const outP = document.getElementById("outP");
const outC = document.getElementById("outC");
const outF = document.getElementById("outF");

const btnPdf = document.getElementById("btnPdf");
const btnReset = document.getElementById("btnReset");

let lastResult = null;

function round(n) {
  return Math.round(n);
}

function bmrMifflin({ sex, weight, height, age }) {
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return sex === "male" ? base + 5 : base - 161;
}

function computeMacros({ weight, goal, proFactor, fatFactor, caloriesTarget }) {
  const pFactor = (proFactor === "auto")
    ? (goal === "bulk" ? 1.8 : 2.0)
    : Number(proFactor);

  const fFactor = (fatFactor === "auto")
    ? (goal === "bulk" ? 1.0 : 0.9)
    : Number(fatFactor);

  const proteinG = pFactor * weight;
  const fatG = fFactor * weight;

  const proteinCals = proteinG * 4;
  const fatCals = fatG * 9;
  const carbCals = Math.max(0, caloriesTarget - proteinCals - fatCals);
  const carbG = carbCals / 4;

  return { proteinG, fatG, carbG };
}

function getFormData() {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  data.age = Number(data.age);
  data.height = Number(data.height);
  data.weight = Number(data.weight);
  data.activity = Number(data.activity);
  data.adjust = Number(data.adjust);

  return data;
}

function calculate() {
  const d = getFormData();
  if (!d.age || !d.height || !d.weight) return null;

  const bmr = bmrMifflin(d);
  const tdee = bmr * d.activity;
  const target = tdee * (1 + d.adjust);

  const macros = computeMacros({
    weight: d.weight,
    goal: d.goal,
    proFactor: d.proFactor,
    fatFactor: d.fatFactor,
    caloriesTarget: target
  });

  return {
    client: d.client || "",
    sex: d.sex,
    age: d.age,
    height: d.height,
    weight: d.weight,
    activity: d.activity,
    goal: d.goal,
    adjust: d.adjust,
    bmr,
    tdee,
    target,
    ...macros
  };
}

function render(r) {
  resultsBox.style.display = "grid";
  outBmr.textContent = `${round(r.bmr)} kcal`;
  outTdee.textContent = `${round(r.tdee)} kcal`;
  outCals.textContent = `${round(r.target)} kcal`;
  outP.textContent = `${round(r.proteinG)} g`;
  outF.textContent = `${round(r.fatG)} g`;
  outC.textContent = `${round(r.carbG)} g`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const r = calculate();
  if (!r) return;
  lastResult = r;
  render(r);
});

btnReset.addEventListener("click", () => {
  form.reset();
  resultsBox.style.display = "none";
  lastResult = null;
});

async function buildPdfBlob(result) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const client = result.client && result.client.trim() ? result.client.trim() : "Client";
  const goalLabel = result.goal === "cut" ? "Perte" : (result.goal === "bulk" ? "Prise" : "Maintien");

  const black = [7, 7, 10];
  const card = [15, 16, 24];
  const gold = [212, 175, 55];
  const goldSoft = [241, 210, 122];
  const text = [233, 233, 238];
  const muted = [183, 183, 199];

  doc.setFillColor(...black);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(...card);
  doc.roundedRect(28, 28, pageWidth - 56, 110, 12, 12, "F");

  let textStartX = 42;
  const logoAsset = await loadLogoDataUrl();
  if (logoAsset) {
    const maxW = 58;
    const maxH = 58;
    const ratio = logoAsset.width / logoAsset.height;
    let drawW = maxW;
    let drawH = drawW / ratio;

    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * ratio;
    }

    const drawX = 40;
    const drawY = 44 + ((maxH - drawH) / 2);
    doc.addImage(logoAsset.dataUrl, "PNG", drawX, drawY, drawW, drawH);
    textStartX = 108;
  }

  doc.setTextColor(...goldSoft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("STUDIO VAD COACHING", textStartX, 62);

  doc.setTextColor(...text);
  doc.setFontSize(18);
  doc.text("Bilan TDEE + Macros", textStartX, 84);

  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, textStartX, 104);
  doc.text(`Client: ${client}`, textStartX, 120);

  doc.setFillColor(...card);
  doc.roundedRect(28, 154, pageWidth - 56, 96, 10, 10, "F");
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  doc.line(42, 185, pageWidth - 42, 185);

  doc.setTextColor(...goldSoft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Profil", 42, 174);
  doc.text("Objectif", 300, 174);

  doc.setTextColor(...text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Sexe: ${result.sex === "male" ? "Homme" : "Femme"}`, 42, 204);
  doc.text(`Age: ${result.age} ans`, 42, 223);
  doc.text(`Taille: ${result.height} cm`, 160, 204);
  doc.text(`Poids: ${result.weight} kg`, 160, 223);
  doc.text(`Niveau d'activite: x${result.activity}`, 300, 204);
  doc.text(`Objectif: ${goalLabel}`, 300, 223);

  doc.setFillColor(...card);
  doc.roundedRect(28, 268, pageWidth - 56, 126, 10, 10, "F");
  doc.setTextColor(...goldSoft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Energie quotidienne", 42, 292);
  drawMetricRow(doc, 42, 316, "BMR", `${round(result.bmr)} kcal`, text, gold);
  drawMetricRow(doc, 42, 342, "TDEE (maintenance)", `${round(result.tdee)} kcal`, text, gold);
  drawMetricRow(doc, 42, 368, "Calories cible", `${round(result.target)} kcal`, text, gold);

  doc.setFillColor(...card);
  doc.roundedRect(28, 412, pageWidth - 56, 164, 10, 10, "F");
  doc.setTextColor(...goldSoft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Repartition macros", 42, 436);

  const macros = [
    { label: "Proteines", grams: round(result.proteinG), kcal: round(result.proteinG * 4) },
    { label: "Glucides", grams: round(result.carbG), kcal: round(result.carbG * 4) },
    { label: "Lipides", grams: round(result.fatG), kcal: round(result.fatG * 9) }
  ];

  let y = 462;
  macros.forEach((m) => {
    drawMetricRow(doc, 42, y, m.label, `${m.grams} g (${m.kcal} kcal)`, text, gold);
    y += 30;
  });

  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(
    "Formule Mifflin-St Jeor. Les macros sont une base a ajuster selon contraintes et progression.",
    28,
    802
  );

  const blob = doc.output("blob");
  return { blob, filename: `TDEE_Macros_${safeFilePart(client)}.pdf` };
}

btnPdf.addEventListener("click", async () => {
  if (!lastResult) {
    const r = calculate();
    if (!r) return;
    lastResult = r;
    render(r);
  }

  const { blob, filename } = await buildPdfBlob(lastResult);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});

function drawMetricRow(doc, x, y, label, value, textColor, accentColor) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(label, x, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentColor);
  doc.text(value, 300, y);
}

function loadLogoDataUrl() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = () => resolve(null);
    img.src = "assets/img/logoVAD.png";
  });
}

function safeFilePart(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Client";
}

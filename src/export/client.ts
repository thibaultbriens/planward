// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PlanwardDocument } from "@/core/format";

const filename = (suffix: string) => `planward_${new Date().toISOString().slice(0, 10)}.${suffix}`;

export async function exportSpreadsheet(document: PlanwardDocument): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const activityRows = Object.values(document.activities).map((activity) => ({ WBS: activity.wbs, Activité: activity.name, Code: activity.code, Début: activity.start, Fin: activity.end, "Durée (j)": activity.dur, "Estimé (h)": activity.estimate, Statut: activity.status }));
  const assignmentRows = Object.values(document.activities).flatMap((activity) => Object.entries(activity.assign).map(([resourceId, assignment]) => ({ Activité: activity.name, Ressource: document.resources[resourceId]?.name ?? resourceId, "Prévu (h)": assignment.planned, "Réel (h)": assignment.actual, "Reste (h)": assignment.remaining })));
  const dependencyRows = Object.values(document.deps).map((dependency) => ({ Prédécesseur: document.activities[dependency.from]?.name ?? document.milestones[dependency.from]?.name ?? dependency.from, Successeur: document.activities[dependency.to]?.name ?? document.milestones[dependency.to]?.name ?? dependency.to, "Décalage (j)": dependency.lag }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityRows), "Activités");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(assignmentRows), "Affectations");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dependencyRows), "Dépendances");
  XLSX.writeFile(workbook, filename("xlsx"));
}

export async function exportTimelinePdf(document: PlanwardDocument): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const activities = Object.values(document.activities).sort((a, b) => a.start.localeCompare(b.start));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(`Timeline · ${document.meta.project.name}`, 14, 16);
  pdf.setFont("courier", "normal");
  pdf.setFontSize(8);
  let y = 25;
  for (const activity of activities) {
    if (y > 195) { pdf.addPage(); y = 16; }
    const label = `${activity.wbs.padEnd(8)} ${activity.name.slice(0, 75).padEnd(78)} ${activity.start} → ${activity.end} · ${activity.estimate} h`;
    pdf.text(label, 14, y);
    y += 5;
  }
  pdf.save(filename("pdf"));
}

import jsPDF from "jspdf";
import type { Clip } from "./types";

export function exportClipPdf(clip: Clip, ruleSetName: string | null) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addLine = (text: string, size: number, style: "normal" | "bold" = "normal", gap = size * 1.4) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += gap;
    }
    return y;
  };

  addLine(clip.title, 20, "bold", 26);
  addLine(
    `Runtime: ${clip.runtime}${ruleSetName ? `   ·   Genre: ${ruleSetName}` : ""}   ·   Status: ${clip.status}`,
    10,
    "normal",
    18,
  );
  y += 12;

  addLine("SCRIPT", 13, "bold", 20);
  addLine(clip.script?.trim() || "(no script yet)", 11, "normal", 15);
  y += 16;

  addLine("AI VIDEO PROMPTS", 13, "bold", 20);
  addLine(clip.prompts?.trim() || "(no prompts yet)", 11, "normal", 15);

  const filename = `${clip.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "clip"}.pdf`;
  doc.save(filename);
}

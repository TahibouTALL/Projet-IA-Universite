// Conversion d'une présentation générée en fichier PowerPoint
import PptxGenJS from "pptxgenjs";
import type { Deck } from "./generate";

const ACCENT = "0F766E";
const INK = "1C1917";

export async function deckToPptx(deck: Deck, appName: string): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.title;

  const cover = pptx.addSlide();
  cover.background = { color: "FFFFFF" };
  cover.addShape("rect", { x: 0.6, y: 2.2, w: 0.12, h: 2.2, fill: { color: ACCENT }, line: { color: ACCENT } });
  cover.addText(deck.title, { x: 1, y: 2.1, w: 11, h: 1.4, fontSize: 40, bold: true, color: INK, fontFace: "Calibri" });
  if (deck.subtitle)
    cover.addText(deck.subtitle, { x: 1, y: 3.5, w: 11, h: 0.9, fontSize: 20, color: "57534E", fontFace: "Calibri" });

  deck.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addText(s.title, { x: 0.6, y: 0.4, w: 12, h: 0.9, fontSize: 30, bold: true, color: INK, fontFace: "Calibri" });
    slide.addShape("line", { x: 0.6, y: 1.3, w: 1.2, h: 0, line: { color: ACCENT, width: 3 } });
    slide.addText(
      s.points.map((p) => ({ text: p, options: { bullet: { indent: 18 }, paraSpaceAfter: 10 } })),
      { x: 0.6, y: 1.6, w: 12, h: 5, fontSize: 20, color: INK, fontFace: "Calibri", valign: "top" },
    );
    slide.addText(`${appName} · ${i + 2}`, { x: 10.5, y: 7, w: 2.5, h: 0.3, fontSize: 10, color: "A8A29E", align: "right" });
    if (s.notes) slide.addNotes(s.notes);
  });

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}

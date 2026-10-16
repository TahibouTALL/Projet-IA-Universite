// Extraction du texte des documents pour la recherche et le contexte de l'IA
export async function extractText(data: Buffer, mimeType: string, fileName: string): Promise<string> {
  const name = fileName.toLowerCase();
  try {
    if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(data));
      const { text } = await pdfText(pdf, { mergePages: true });
      return clean(Array.isArray(text) ? text.join("\n") : text);
    }
    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: data });
      return clean(value);
    }
    if (mimeType.startsWith("text/") || /\.(md|txt|tex|csv|py|m|c|cpp|java|js|ts)$/.test(name)) {
      return clean(data.toString("utf8"));
    }
  } catch (e) {
    console.error("Extraction impossible pour", fileName, e);
  }
  return "";
}

function clean(s: string) {
  return s.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Découpe un texte en morceaux d'environ `size` caractères, avec chevauchement. */
export function chunkText(text: string, size = 1400, overlap = 200): string[] {
  if (!text) return [];
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > size && current) {
      chunks.push(current.trim());
      current = current.slice(-overlap);
    }
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size - overlap) {
        const piece = p.slice(i, i + size);
        if ((current + " " + piece).length > size && current) {
          chunks.push(current.trim());
          current = current.slice(-overlap);
        }
        current += " " + piece;
      }
    } else {
      current += "\n\n" + p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

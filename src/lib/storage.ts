// Stockage des fichiers sur disque. Pour passer à S3/MinIO, il suffit de réimplémenter ces trois fonctions.
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.env.UPLOAD_DIR || "./storage");
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024;

function resolveKey(key: string) {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Clé de stockage invalide");
  return full;
}

export async function saveFile(data: Buffer, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 10);
  const now = new Date();
  const key = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}${ext}`;
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function loadFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

export async function removeFile(key: string): Promise<void> {
  await unlink(resolveKey(key)).catch(() => undefined);
}

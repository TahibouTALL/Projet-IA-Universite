// Stockage des fichiers déposés.
//  - STORAGE_DRIVER=local (défaut) : disque du serveur (Docker, serveur de l'université)
//  - STORAGE_DRIVER=s3 : stockage objet compatible S3 (Cloudflare R2, MinIO, AWS S3), obligatoire sur Vercel
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { S3Client } from "@aws-sdk/client-s3";

const DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase();
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024;

function newKey(originalName: string) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 10);
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}${ext}`;
}

// ---------- Disque local ----------

const ROOT = path.resolve(process.env.UPLOAD_DIR || "./storage");

function resolveKey(key: string) {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Clé de stockage invalide");
  return full;
}

// ---------- S3 / R2 ----------

let s3: S3Client | null = null;
const BUCKET = process.env.S3_BUCKET || "";

async function client() {
  if (s3) return s3;
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3 = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  return s3;
}

// ---------- API commune ----------

export async function saveFile(data: Buffer, originalName: string, contentType = "application/octet-stream"): Promise<string> {
  const key = newKey(originalName);
  if (DRIVER === "s3") {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await client()).send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: data, ContentType: contentType }));
    return key;
  }
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function loadFile(key: string): Promise<Buffer> {
  if (DRIVER === "s3") {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const res = await (await client()).send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!res.Body) throw new Error("Fichier introuvable");
    return Buffer.from(await res.Body.transformToByteArray());
  }
  return readFile(resolveKey(key));
}

export async function removeFile(key: string): Promise<void> {
  if (DRIVER === "s3") {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await client()).send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => undefined);
    return;
  }
  await unlink(resolveKey(key)).catch(() => undefined);
}

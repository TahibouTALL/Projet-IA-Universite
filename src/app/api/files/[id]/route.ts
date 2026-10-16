import { NextResponse } from "next/server";
import { canManageCourse, canViewCourse, getCurrentUser } from "@/lib/access";
import { getDocument } from "@/lib/documents";
import { loadFile } from "@/lib/storage";

const INLINE = /^(application\/pdf|image\/|text\/plain)/;

export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non connecté", { status: 401 });
  const doc = await getDocument((await params).id);
  if (!doc || !doc.course) return new NextResponse("Introuvable", { status: 404 });

  const manager = canManageCourse(user, doc.course);
  // Les documents réservés à l'IA ne sont téléchargeables que par leur auteur et les enseignants du cours
  const allowed =
    manager ||
    doc.uploaderId === user.id ||
    (!doc.aiOnly && doc.status === "PUBLISHED" && canViewCourse(user, doc.course));
  if (!allowed) return new NextResponse("Accès refusé", { status: 403 });

  const data = await loadFile(doc.storageKey).catch(() => null);
  if (!data) return new NextResponse("Fichier manquant", { status: 404 });

  const download = new URL(req.url).searchParams.has("download") || !INLINE.test(doc.mimeType);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": doc.mimeType,
      "content-length": String(data.length),
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/access";
import { deckToPptx } from "@/lib/ai/pptx";
import type { Deck } from "@/lib/ai/generate";
import { APP_NAME } from "@/lib/appname";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non connecté", { status: 401 });
  const g = await db.query.generations.findFirst({
    where: and(eq(schema.generations.id, (await params).id), eq(schema.generations.userId, user.id)),
  });
  if (!g || g.type !== "PRESENTATION") return new NextResponse("Introuvable", { status: 404 });
  const deck = JSON.parse(g.content) as Deck;
  const buffer = await deckToPptx(deck, APP_NAME);
  const name = `${deck.title.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 60) || "presentation"}.pptx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}

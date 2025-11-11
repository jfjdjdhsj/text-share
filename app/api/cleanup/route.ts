import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { deleteFromBlob } from "@/src/lib/blob";

export async function GET() {
  const now = new Date();

  // 找出过期的 Upload
  const expired = await prisma.upload.findMany({
    where: { expiresAt: { lte: now } },
    select: { id: true, blobPath: true }
  });

  let deleted = 0;
  for (const u of expired) {
    try {
      if (u.blobPath) await deleteFromBlob(u.blobPath);
    } catch (e) {
      console.error("[cleanup] blob delete failed:", u.blobPath, e);
    }
    await prisma.upload.delete({ where: { id: u.id } });
    deleted++;
  }

  return NextResponse.json({ ok: true, deleted });
}

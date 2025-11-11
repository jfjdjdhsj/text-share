import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { deleteFromBlob } from "@/src/lib/blob";

export async function GET() {
  const now = new Date();

  let deletedUploads = 0;
  let deletedPastes = 0;
  let blobErrors: Array<{ path: string; error: string }> = [];

  // A) 清理：过期的 Upload（24h）
  const expiredUploads = await prisma.upload.findMany({
    where: { expiresAt: { lte: now } },
    select: { id: true, blobPath: true }
  });

  for (const u of expiredUploads) {
    try {
      if (u.blobPath) await deleteFromBlob(u.blobPath);
    } catch (e: any) {
      blobErrors.push({ path: String(u.blobPath), error: String(e?.message || e) });
    }
    await prisma.upload.delete({ where: { id: u.id } });
    deletedUploads++;
  }

  // B) 清理：到期的 Paste（7 天默认或自定义分钟）
  //   需要先删除其仍存在的 Blob，再删 Paste（Upload 记录有 onDelete: Cascade，但 Blob 需要手动删）
  const expiredPastes = await prisma.paste.findMany({
    where: { expiresAt: { lte: now } },
    include: { uploads: { select: { id: true, blobPath: true } } }
  });

  for (const p of expiredPastes) {
    // 尝试删除其文件的 Blob
    for (const u of p.uploads) {
      try {
        if (u.blobPath) await deleteFromBlob(u.blobPath);
      } catch (e: any) {
        blobErrors.push({ path: String(u.blobPath), error: String(e?.message || e) });
      }
    }
    // 删除 Paste（配置 onDelete: Cascade 时会级联删 Upload 记录）
    await prisma.paste.delete({ where: { id: p.id } });
    deletedPastes++;
  }

  return NextResponse.json({
    ok: true,
    deletedUploads,
    deletedPastes,
    blobErrors
  });
}

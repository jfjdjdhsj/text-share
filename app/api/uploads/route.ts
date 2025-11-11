export const runtime = "nodejs"; // 需要 Node 运行时处理 Buffer

import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/src/lib/blob";
import { prisma } from "@/src/lib/db";

const MAX_FILES = 10;
const MAX_TOTAL = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as unknown as File[];

    if (!files.length) return NextResponse.json({ message: "请选择文件" }, { status: 400 });
    if (files.length > MAX_FILES)
      return NextResponse.json({ message: `最多上传 ${MAX_FILES} 个文件` }, { status: 400 });

    let total = 0;
    for (const f of files) total += f.size || 0;
    if (total > MAX_TOTAL)
      return NextResponse.json({ message: "总大小不能超过 50MB" }, { status: 400 });

    const now = Date.now();
    const expiresAt = new Date(now + 24 * 60 * 60 * 1000); // 24h

    const results: { id: string; filename: string; url: string; size: number }[] = [];

    for (const f of files) {
      const ab = await f.arrayBuffer();
      const buf = Buffer.from(ab);

      const safeName = (f.name || "file").replace(/[^\w.\-]/g, "_");
      const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

      const putRes = await uploadToBlob(key, buf, f.type || "application/octet-stream");

      const rec = await prisma.upload.create({
        data: {
          filename: f.name || "file",
          url: putRes.url,
          blobPath: putRes.pathname,
          size: putRes.size ?? buf.length,
          mime: f.type || null,
          expiresAt,
        },
        select: { id: true, filename: true, url: true, size: true },
      });
      results.push(rec);
    }

    return NextResponse.json({ uploads: results }, { status: 201 });
  } catch (err: any) {
    console.error("[/api/uploads] error:", err);
    const msg = err?.message?.includes("BLOB_READ_WRITE_TOKEN")
      ? "后端未配置 BLOB_READ_WRITE_TOKEN"
      : err?.message || "服务器错误";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

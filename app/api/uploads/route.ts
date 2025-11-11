export const runtime = "nodejs";
export const preferredRegion = ["iad1"];

import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/src/lib/blob";
import { prisma } from "@/src/lib/db";

const MAX_FILES = 10;
const MAX_TOTAL = 10 * 1024 * 1024; // 10MB

// 允许的文本扩展名（小写）
const ALLOWED_EXT = new Set([
  "txt","md","markdown","csv","tsv","json","jsonl","log","xml",
  "yaml","yml","ini","conf","cfg","properties","env",
  "sh","bash","zsh","bat","cmd","ps1",
  "py","js","ts","tsx","jsx","mjs","cjs",
  "java","kt","go","rs","rb","php",
  "c","h","cpp","hpp","cs","swift",
  "sql"
]);

function isTextLike(filename: string, mime?: string | null) {
  const lower = (mime || "").toLowerCase();
  if (lower.startsWith("text/")) return true;
  if (lower === "application/json" || lower === "application/xml") return true;
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/i);
  const ext = m ? m[1] : "";
  return ALLOWED_EXT.has(ext);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as unknown as File[];

    if (!files.length) return NextResponse.json({ message: "请选择文件" }, { status: 400 });
    if (files.length > MAX_FILES)
      return NextResponse.json({ message: `最多上传 ${MAX_FILES} 个文件` }, { status: 400 });

    // 类型 + 总大小校验
    let total = 0;
    for (const f of files) {
      if (!isTextLike(f.name || "", (f as any).type)) {
        return NextResponse.json({ message: "仅支持文本文件" }, { status: 415 });
      }
      total += f.size || 0;
    }
    if (total > MAX_TOTAL)
      return NextResponse.json({ message: "文件总大小不能超过 10MB" }, { status: 400 });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 附件 24h

    // 并发上传 + 入库
    const results = await Promise.all(
      files.map(async (f) => {
        const ab = await f.arrayBuffer();
        const buf = Buffer.from(ab);
        const safeName = (f.name || "file").replace(/[^\w.\-]/g, "_");
        const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
        const putRes = await uploadToBlob(key, buf, (f as any).type || "text/plain");

        const rec = await prisma.upload.create({
          data: {
            filename: f.name || "file",
            url: putRes.url,
            blobPath: putRes.pathname,
            size: buf.length,
            mime: (f as any).type || "text/plain",
            expiresAt,
          },
          select: { id: true, filename: true, url: true, size: true },
        });
        return rec;
      })
    );

    return NextResponse.json({ uploads: results }, { status: 201 });
  } catch (err: any) {
    console.error("[/api/uploads] error:", err);
    const msg = err?.message?.includes("BLOB_READ_WRITE_TOKEN")
      ? "后端未配置 BLOB_READ_WRITE_TOKEN"
      : err?.message || "服务器错误";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

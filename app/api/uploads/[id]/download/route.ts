import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // 查库拿上传记录
  const u = await prisma.upload.findUnique({
    where: { id },
    select: { url: true, filename: true, expiresAt: true },
  });
  if (!u) return NextResponse.json({ message: "文件不存在" }, { status: 404 });

  // 过期校验（与 24 小时清理一致）
  if (u.expiresAt && u.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ message: "文件已过期" }, { status: 410 });
  }

  // 使用 302 跳转到 Blob，附带 download 查询用于触发下载
  // （Vercel Blob 会下发合适的 Content-Disposition；即使不支持，也只是正常打开）
  const url = new URL(u.url);
  url.searchParams.set("download", "1");
  // 可选：指定文件名（大多数浏览器会尊重服务端返回的 Content-Disposition）
  url.searchParams.set("filename", encodeURIComponent(u.filename || "download"));

  return NextResponse.redirect(url.toString(), 302);
}
